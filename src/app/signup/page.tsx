import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account | READY SaaS Platform",
  description: "Join the READY platform across student, candidate, professional, teacher, college, and company ecosystems.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-mesh-radial">
      <Suspense fallback={<div className="text-sm text-slate-400">Loading registration...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
