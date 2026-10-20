import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In | READY SaaS Platform",
  description: "Secure login to access your verified capability workspace on the READY platform.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-mesh-radial">
      <Suspense fallback={<div className="text-sm text-slate-400">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
