import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, NotFoundState } from "@/components/ui/states";
import { LearningWorkspaceService } from "@/lib/services/learning-workspace.service";
import { LearningWorkspaceShell } from "@/components/student/learn/LearningWorkspaceShell";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Action Workspace | READY",
  description: "Interactive learning execution with verified capability gain tracking.",
};

export default async function LearningWorkspacePage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/student/learn/${itemId}`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Learning Workspace"
          description={access.reason || "You must be an authenticated student to enter this learning workspace."}
          backUrl="/student/plan"
        />
      </AppShell>
    );
  }

  const context = await LearningWorkspaceService.getWorkspaceContext(userId, itemId);

  if (!context) {
    return (
      <AppShell profile={profile} roles={roles}>
        <NotFoundState
          title="Learning Action Not Found"
          description="The requested learning action could not be found or does not belong to your active curriculum plan."
          backUrl="/student/plan"
        />
      </AppShell>
    );
  }

  // If already completed, redirect to the learning gain result view
  if (context.item.status === "COMPLETED" && context.learningGain) {
    redirect(`/student/learn/${itemId}/result`);
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <LearningWorkspaceShell initialContext={context} />
    </AppShell>
  );
}
