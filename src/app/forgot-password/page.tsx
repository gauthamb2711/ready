"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { validateEmail, sanitizeAuthErrorMessage } from "@/lib/validation/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailErr = validateEmail(normalizedEmail);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: callbackUrl,
      });

      if (error) {
        setErrorMsg(sanitizeAuthErrorMessage(error.message, error.code));
      } else {
        setSuccessMsg(
          `Password reset instructions have been sent to ${normalizedEmail}. Please check your inbox and click the reset link to choose a new password.`
        );
      }
    } catch {
      setErrorMsg("Unable to reach authentication service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-600/30">
            R
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
          <p className="text-xs text-slate-400">
            Enter your account email to receive a secure password recovery link
          </p>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTitle>Password Reset Notice</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="default" className="border-emerald-500/50 bg-emerald-950/40 text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <AlertTitle>Reset Email Sent</AlertTitle>
            <AlertDescription className="text-xs">{successMsg}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
          {!successMsg ? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                id="reset-email-input"
                label="Email Address"
                type="email"
                placeholder="name@institution.org"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                id="reset-submit-btn"
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={loading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center py-2 space-y-4">
              <p className="text-xs text-slate-300">
                Didn&apos;t receive the email? Check your spam folder or wait a couple minutes before retrying.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSuccessMsg(null)}
              >
                Send to a different email
              </Button>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
