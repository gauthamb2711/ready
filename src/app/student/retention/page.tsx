import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { UnauthorizedState } from "@/components/ui/states";
import { RetentionService } from "@/lib/services/retention.service";
import { RetentionDashboardView } from "@/components/student/retention/RetentionDashboardView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Spaced Retention Engine | READY",
  description: "Track 24-hour, 7-day, and 30-day concept retention and active retrieval.",
};

export default async function StudentRetentionPage() {
  const access = await validateEcosystemAccess("STUDENT", "/student/retention");
  const { profile, roles, userId } = access.authContext;

  if (!access.authorized || !userId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted: Retention Engine"
          description={access.reason || "You must be an authenticated student to access spaced retention checks."}
          backUrl="/student"
        />
      </AppShell>
    );
  }

  const dashboardData = await RetentionService.getRetentionDashboard(userId);

  return (
    <AppShell profile={profile} roles={roles}>
      <RetentionDashboardView data={dashboardData} />
    </AppShell>
  );
}
