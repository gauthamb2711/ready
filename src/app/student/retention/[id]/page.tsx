import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, NotFoundState } from "@/components/ui/states";
import { RetentionService } from "@/lib/services/retention.service";
import { RetentionWorkspaceView } from "@/components/student/retention/RetentionWorkspaceView";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Retention Check Workspace | READY",
  description: "Active concept retrieval and capability retention verification.",
};

export default async function RetentionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/student/retention/${id}`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Retention Check"
          description={access.reason || "You must be an authenticated student to enter this retention workspace."}
          backUrl="/student/retention"
        />
      </AppShell>
    );
  }

  const context = await RetentionService.getRetentionCheckWorkspace(userId, id);

  if (!context) {
    return (
      <AppShell profile={profile} roles={roles}>
        <NotFoundState
          title="Retention Check Not Found"
          description="The requested retention check could not be found or does not belong to your account."
          backUrl="/student/retention"
        />
      </AppShell>
    );
  }

  // If already completed, redirect to result view
  if (context.check.status === "COMPLETED" && context.check.score !== null) {
    redirect(`/student/retention/${id}/result`);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <RetentionWorkspaceView initialContext={context} />
    </AppShell>
  );
}
