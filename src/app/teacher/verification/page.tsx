import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teacher Verification | READY",
  description: "Institutional faculty membership and college onboarding.",
};

export default function TeacherVerificationPage() {
  // Legacy verification route redirected to institutional membership requests
  redirect("/teacher/organizations");
}

