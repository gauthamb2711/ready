"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { sanitizeAuthErrorMessage } from "@/lib/validation/auth";
import { ACCOUNT_TYPES } from "@/lib/rbac/roles";
import type { AccountType, Profile } from "@/types/database.types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const callbackError = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isUnconfirmed, setIsUnconfirmed] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (callbackError === "auth_callback_failed") {
      setErrorMsg("The email verification link was invalid or has expired. Please sign in or request a new verification link.");
    }
  }, [callbackError]);

  const handleResendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg("Please enter your email address to resend the verification link.");
      return;
    }
    setResending(true);
    setResendStatus(null);
    try {
      const supabase = createClient();
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/onboarding` : undefined;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });
      if (error) {
        setResendStatus("Unable to resend confirmation email right now. Please wait a moment.");
      } else {
        setResendStatus("A new verification email has been sent. Please check your inbox.");
      }
    } catch {
      setResendStatus("Unable to reach authentication service. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUnconfirmed(false);
    setResendStatus(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      // Safe dev diagnostics (NEVER log passwords or tokens)
      if (process.env.NODE_ENV === "development") {
        console.info("[Auth Diagnostics: Login Attempt]", {
          normalizedEmail,
          errorCode: error?.code,
          errorMessage: error?.message,
          sessionReturned: !!data?.session,
          userReturned: !!data?.user,
          emailConfirmed: data?.user?.email_confirmed_at ? true : false,
        });
      }

      if (error) {
        const sanitized = sanitizeAuthErrorMessage(error.message, error.code);
        setErrorMsg(sanitized);
        if (
          error.code === "email_not_confirmed" ||
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not verified")
        ) {
          setIsUnconfirmed(true);
        }
        return;
      }

      if (data.session && data.user) {
        try {
          // Fetch profile to verify account status and requested ecosystem
          let { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          // Resilient self-healing: If profile missing, call RPC
          if (!profileData) {
            try {
              const { data: healed } = await supabase.rpc("ensure_current_user_profile");
              if (healed) {
                profileData = healed;
              }
            } catch {
              // RPC will be handled server-side by getServerAuthContext if not yet run
            }
          }

          const profile = profileData as unknown as Profile | null;
          const accountState = profile?.account_state || "ACTIVE";

          // 1. Fail closed on restricted states
          if (accountState === "SUSPENDED") {
            await supabase.auth.signOut();
            router.push("/account-status?state=SUSPENDED");
            return;
          }

          if (accountState === "REVOKED") {
            await supabase.auth.signOut();
            router.push("/account-status?state=REVOKED");
            return;
          }

          if (accountState === "REJECTED") {
            await supabase.auth.signOut();
            router.push("/account-status?state=REJECTED");
            return;
          }

          // 2. Check if user has PLATFORM_ADMIN role (server-verified in database)
          const { data: userRoles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id);

          const isPlatformAdmin =
            (userRoles as any[])?.some((r: any) => r.role === "PLATFORM_ADMIN" || r.role === "SECURITY_ADMIN") ||
            (profile?.metadata as any)?.system_role === "PLATFORM_ADMIN";

          if (isPlatformAdmin) {
            const target = redirectTo && redirectTo.startsWith("/") && redirectTo !== "/login" ? redirectTo : "/admin/overview";
            router.push(target);
            router.refresh();
            return;
          }

          // 3. Check if onboarding is completed
          const hasCompletedOnboarding = !!profile?.metadata?.onboarding_completed;

          if (!hasCompletedOnboarding) {
            router.push("/onboarding");
            router.refresh();
            return;
          }

          // 4. Determine target route based on requested ecosystem
          if (redirectTo && redirectTo.startsWith("/") && redirectTo !== "/login") {
            router.push(redirectTo);
          } else {
            const userEco = (profile?.account_type || "STUDENT") as AccountType;
            const targetPath = ACCOUNT_TYPES[userEco]?.defaultPath || "/student";
            router.push(targetPath);
          }

          router.refresh();
        } catch (postAuthErr) {
          console.error("[Auth] Post-login profile resolution error:", postAuthErr);
          // If session is valid, send to home/onboarding rather than falsely failing credentials
          router.push("/onboarding");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrorMsg(sanitizeAuthErrorMessage(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-600/30">
          R
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to READY</h2>
        <p className="text-xs text-slate-400">
          Enter your authorized credentials to access your verified ecosystem
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTitle>Authentication Notice</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{errorMsg}</div>
            {isUnconfirmed && (
              <div className="pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                  onClick={handleResendConfirmation}
                  isLoading={resending}
                >
                  Resend Verification Email
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {resendStatus && (
        <Alert variant="default" className="border-indigo-500/50 bg-indigo-950/40 text-indigo-200">
          <AlertTitle>Verification Request</AlertTitle>
          <AlertDescription>{resendStatus}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md"
        noValidate
      >
        <Input
          id="email-input"
          label="Email Address"
          type="email"
          placeholder="name@institution.org"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          id="password-input"
          label="Password"
          type="password"
          placeholder="••••••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          id="login-submit-btn"
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={loading}
        >
          Sign In
        </Button>

        <div className="pt-2 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign up for an ecosystem
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Secured via Supabase PostgreSQL Auth & RLS</span>
      </div>
    </div>
  );
}
