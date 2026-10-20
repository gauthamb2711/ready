import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, NotFoundState } from "@/components/ui/states";
import { LearningWorkspaceService } from "@/lib/services/learning-workspace.service";
import { LearningGainResultView } from "@/components/student/learn/LearningGainResultView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Gain Verified | READY",
  description: "Verified capability change and learning gain evaluation.",
};

export default async function LearningGainResultPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/student/learn/${itemId}/result`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Learning Gain Verification"
          description={access.reason || "You must be an authenticated student to view this learning gain verification."}
          backUrl="/student/plan"
        />
      </AppShell>
    );
  }

  const result = await LearningWorkspaceService.getLearningGainResult(userId, itemId);

  if (!result) {
    return (
      <AppShell profile={profile} roles={roles}>
        <NotFoundState
          title="Learning Gain Record Not Found"
          description="The requested learning action result could not be found or has not been completed yet."
          backUrl="/student/plan"
        />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <LearningGainResultView
        item={result.item}
        subject={result.subject}
        topic={result.topic}
        learningGain={result.learningGain}
      />
    </AppShell>
  );
}
