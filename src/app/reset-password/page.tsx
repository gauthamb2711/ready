"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, CheckCircle2, Lock } from "lucide-react";
import { validatePassword, sanitizeAuthErrorMessage } from "@/lib/validation/auth";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setErrorMsg(passwordErr);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(sanitizeAuthErrorMessage(error.message, error.code));
      } else {
        setSuccessMsg(
          "Your password has been successfully updated! You can now sign in with your new credentials."
        );
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      }
    } catch {
      setErrorMsg("Unable to update password. Please ensure your reset link is valid.");
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Create new password</h2>
          <p className="text-xs text-slate-400">
            Choose a strong, secure password for your account
          </p>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="default" className="border-emerald-500/50 bg-emerald-950/40 text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <AlertTitle>Password Updated</AlertTitle>
            <AlertDescription className="text-xs">
              {successMsg} Redirecting to sign in...
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="new-password-input"
              label="New Password"
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              id="confirm-password-input"
              label="Confirm New Password"
              type="password"
              placeholder="••••••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-medium text-slate-300">Password requirements:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                <li>At least 8 characters in length</li>
                <li>At least one uppercase and one lowercase letter</li>
                <li>At least one number and one special character</li>
              </ul>
            </div>

            <Button
              id="update-password-btn"
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Update Password
            </Button>
          </form>

          <div className="pt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Cancel and return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
