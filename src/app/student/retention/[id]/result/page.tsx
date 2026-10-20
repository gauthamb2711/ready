import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState, NotFoundState } from "@/components/ui/states";
import { RetentionService } from "@/lib/services/retention.service";
import { RetentionResultView } from "@/components/student/retention/RetentionResultView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Retention Result | READY",
  description: "Verified retention evidence and capability persistence tracking.",
};

export default async function RetentionResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/student/retention/${id}/result`);
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Retention Result"
          description={access.reason || "You must be an authenticated student to view this retention result."}
          backUrl="/student/retention"
        />
      </AppShell>
    );
  }

  const result = await RetentionService.getRetentionResult(userId, id);

  if (!result) {
    return (
      <AppShell profile={profile} roles={roles}>
        <NotFoundState
          title="Retention Result Not Found"
          description="The requested retention check result could not be found or has not been completed yet."
          backUrl="/student/retention"
        />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} roles={roles}>
      <RetentionResultView data={result} />
    </AppShell>
  );
}
