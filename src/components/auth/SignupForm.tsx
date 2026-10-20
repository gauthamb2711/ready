"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Info, CheckCircle2, Lock } from "lucide-react";
import type { AccountType } from "@/types/database.types";
import {
  validateSignupInput,
  sanitizeAuthErrorMessage,
} from "@/lib/validation/auth";

export function SignupForm() {
  const router = useRouter();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType>("STUDENT");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isConfirmationRequired, setIsConfirmationRequired] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);

  const handleResendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
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
        setResendStatus("Unable to resend verification email right now. Please wait a moment.");
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
    setSuccessMsg(null);
    setIsConfirmationRequired(false);
    setResendStatus(null);

    const normalizedEmail = email.trim().toLowerCase();

    // 0. Security Guard: Prevent platform admin creation
    if ((accountType as string) === "PLATFORM_ADMIN" || (accountType as string) === "SECURITY_ADMIN") {
      setErrorMsg("Platform Administrator accounts cannot be created through public registration.");
      return;
    }

    // 1. Client-side strict validation
    const validation = validateSignupInput({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      confirmPassword,
      accountType,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const displayName = `${firstName.trim()} ${lastName.trim()}`;

      // 2. Register via Supabase Auth
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/onboarding` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: displayName,
            account_type: accountType,
          },
        },
      });

      // Safe dev diagnostics
      if (process.env.NODE_ENV === "development") {
        console.info("[Auth Diagnostics: Signup Attempt]", {
          normalizedEmail,
          accountType,
          errorCode: error?.code,
          errorMessage: error?.message,
          sessionReturned: !!data?.session,
          userReturned: !!data?.user,
        });
      }

      if (error) {
        setErrorMsg(sanitizeAuthErrorMessage(error.message, error.code));
        return;
      }

      // If user session is established immediately:
      if (data.session && data.user) {
        // Map accountType to appropriate system role
        const systemRole =
          accountType === "TEACHER"
            ? "TEACHER"
            : accountType === "COLLEGE_UNIVERSITY"
            ? "COLLEGE_ADMIN"
            : accountType === "COMPANY"
            ? "COMPANY_ADMIN"
            : accountType === "CANDIDATE"
            ? "CANDIDATE"
            : accountType === "PROFESSIONAL"
            ? "PROFESSIONAL"
            : "STUDENT";

        // Update user profile record idempotently
        await (supabase.from("profiles") as any)
          .upsert(
            {
              id: data.user.id,
              email: normalizedEmail,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name: displayName,
              account_type: accountType,
              account_state: ["TEACHER", "COLLEGE_UNIVERSITY", "COMPANY"].includes(accountType)
                ? "PENDING"
                : "ACTIVE",
            },
            { onConflict: "id" }
          );

        // Assign corresponding ecosystem role idempotently
        await (supabase.from("user_roles") as any)
          .upsert(
            {
              user_id: data.user.id,
              role: systemRole,
            },
            { onConflict: "user_id,role" }
          );

        router.push("/onboarding");
        router.refresh();
      } else {
        // Confirmation required scenario
        setIsConfirmationRequired(true);
        setSuccessMsg(
          `Your account has been registered! A confirmation email has been sent to ${normalizedEmail}. Please verify your email before signing in.`
        );
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrorMsg(sanitizeAuthErrorMessage(raw));
    } finally {
      setLoading(false);
    }
  };

  const accountTypeOptions = [
    { value: "STUDENT", label: "Student — Personalized capability & learning" },
    { value: "CANDIDATE", label: "Candidate — Benchmarking & verified skill profile" },
    { value: "PROFESSIONAL", label: "Professional — Continuous upskilling & retention" },
    { value: "TEACHER", label: "Teacher / Faculty — Independent workspace & syllabus authoring" },
    { value: "COLLEGE_UNIVERSITY", label: "College / University — Multi-tenant admin (Verification Required)" },
    { value: "COMPANY", label: "Company / Organization — Enterprise talent (Verification Required)" },
  ];

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-600/30">
          R
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Create your READY Account</h2>
        <p className="text-xs text-slate-400">
          Select your primary ecosystem to begin capability benchmarking and verification
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTitle>Registration Notice</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" className="space-y-3">
          <AlertTitle className="text-emerald-400 font-semibold">Check Your Email</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{successMsg}</p>
            {isConfirmationRequired && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
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
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  Go to Sign In
                </Link>
              </div>
            )}
            {resendStatus && (
              <p className="text-xs text-indigo-300 pt-1">{resendStatus}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="first-name-input"
            label="First Name"
            placeholder="Ada"
            required
            value={firstName}
            error={fieldErrors.firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (fieldErrors.firstName) setFieldErrors((prev) => ({ ...prev, firstName: "" }));
            }}
          />
          <Input
            id="last-name-input"
            label="Last Name"
            placeholder="Lovelace"
            required
            value={lastName}
            error={fieldErrors.lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (fieldErrors.lastName) setFieldErrors((prev) => ({ ...prev, lastName: "" }));
            }}
          />
        </div>

        <Input
          id="signup-email-input"
          label="Email Address"
          type="email"
          placeholder="name@institution.org"
          required
          value={email}
          error={fieldErrors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="signup-password-input"
            label="Password"
            type="password"
            placeholder="••••••••••••"
            required
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
            }}
          />

          <Input
            id="confirm-password-input"
            label="Confirm Password"
            type="password"
            placeholder="••••••••••••"
            required
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
          />
        </div>

        <p className="text-[11px] text-slate-400">
          Must be at least 8 characters with uppercase, lowercase, number, and special character.
        </p>

        <Select
          id="account-type-select"
          label="Requested Ecosystem"
          options={accountTypeOptions}
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
        />

        {/* Authorization & Ecosystem Policy Notice */}
        <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-3 text-[11px] text-amber-300/90 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-200">
            <Info className="h-3.5 w-3.5" />
            <span>Account Selection Policy</span>
          </div>
          <p className="leading-relaxed">
            Selecting Teacher, College, or Company registers your requested ecosystem. Privileged institutional features will remain in a <strong>PENDING</strong> verification state until identity and organization affiliations are verified.
          </p>
        </div>

        <Button
          id="signup-submit-btn"
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={loading}
        >
          Create Account
        </Button>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in to your account
          </Link>
        </div>
      </form>
    </div>
  );
}
