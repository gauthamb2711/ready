import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { getDiagnosticSession } from "@/lib/services/diagnostic.service";
import { DiagnosticRunner } from "@/components/student/DiagnosticRunner";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Diagnostic Assessment | READY",
  description: "Interactive capability verification assessment.",
};

export default async function DiagnosticAssessmentRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await validateEcosystemAccess("STUDENT", "/student/diagnostic");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You must be authenticated to take this assessment."}
          backUrl="/student/subjects"
        />
      </AppShell>
    );
  }

  const { id } = await params;
  const session = await getDiagnosticSession(userId, id);

  if (!session) {
    notFound();
  }

  // If already completed, redirect to results view
  if (session.diagnostic.status === "COMPLETED") {
    redirect(`/student/diagnostic/${id}/results`);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <DiagnosticRunner
        initialAssessment={session.diagnostic}
        initialQuestions={session.questions}
      />
    </AppShell>
  );
}
