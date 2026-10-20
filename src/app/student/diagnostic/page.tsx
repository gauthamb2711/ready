import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getStudentSubjects } from "@/lib/services/student-subject.service";
import { DiagnosticIntakeForm } from "@/components/student/DiagnosticIntakeForm";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Current-State Intake | READY Diagnostic",
  description: "Configure study timing, target baseline, and self-confidence before beginning diagnostic.",
};

export default async function DiagnosticIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const access = await validateEcosystemAccess("STUDENT", "/student/diagnostic");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You must be authenticated to take a diagnostic assessment."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const { subjectId } = await searchParams;
  const subjects = await getStudentSubjects(userId);

  return (
    <AppShell profile={profile} roles={roles}>
      <div className="max-w-2xl mx-auto space-y-6 py-2">
        <div className="flex items-center gap-3">
          <Link href={subjectId ? `/student/subjects/${subjectId}` : "/student/subjects"}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              Current-State Intake & Diagnostic
            </h1>
            <p className="text-xs text-slate-400">
              Where are you right now? Set your intake context before launching the diagnostic assessment.
            </p>
          </div>
        </div>

        <DiagnosticIntakeForm subjects={subjects} preselectedSubjectId={subjectId} />
      </div>
    </AppShell>
  );
}
