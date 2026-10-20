import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { PlatformAdminOverviewView } from "@/components/admin/PlatformAdminOverviewView";
import { UnauthorizedState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import {
  getPlatformGlobalAnalytics,
  checkIsPlatformAdmin,
  getPlatformOrganizationsForReview,
} from "@/lib/services/organization.service";
import type { Organization, PlatformGlobalAnalytics } from "@/types/database.types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Overview & Analytics | READY Superadmin",
  description: "Aggregated platform-wide operational metrics, organization verification review, and ecosystem health.",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell profile={null} roles={[]}>
        <UnauthorizedState
          title="Authentication Required"
          description="You must be logged in to view platform administration."
          backUrl="/login"
        />
      </AppShell>
    );
  }

  // Fetch Profile & Roles
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id);

  // Authorize Platform Admin
  const isPlatformAdmin = await checkIsPlatformAdmin(supabase, user.id);
  if (!isPlatformAdmin) {
    return (
      <AppShell profile={profile} roles={roles || []}>
        <UnauthorizedState
          title="Access Restricted: Platform Administration"
          description="Only authorized READY Platform Administrators can access the platform overview."
          backUrl="/"
        />
      </AppShell>
    );
  }

  // Fetch Global Aggregated Analytics (Strictly Operational - Zero Student Private Data)
  const analyticsRes = await getPlatformGlobalAnalytics(user.id);
  const fallbackAnalytics: PlatformGlobalAnalytics = {
    totalUsers: 0,
    activeUsers: 0,
    totalOrganizations: 0,
    verifiedOrganizations: 0,
    pendingOrganizations: 0,
    activeColleges: 0,
    activeCompanies: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalAssessments: 0,
    totalQuestions: 0,
    totalMockExams: 0,
    accountStates: { ACTIVE: 0, PENDING: 0, SUSPENDED: 0 },
  };

  // Fetch all organizations for review with verification dossier & creator profile
  const orgsRes = await getPlatformOrganizationsForReview(user.id);

  return (
    <AppShell profile={profile} roles={roles || []}>
      <PlatformAdminOverviewView
        profile={profile}
        initialAnalytics={analyticsRes.analytics || fallbackAnalytics}
        initialOrganizations={orgsRes.organizations || []}
      />
    </AppShell>
  );
}
