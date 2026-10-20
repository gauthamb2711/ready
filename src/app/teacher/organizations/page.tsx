import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { TeacherOrganizationsView } from "@/components/teacher/TeacherOrganizationsView";
import { UnauthorizedState } from "@/components/ui/states";
import {
  getTeacherOrganizations,
  getTeacherJoinRequests,
  getVerifiedOrganizations,
} from "@/lib/services/organization.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Institutional Memberships | READY",
  description: "Browse verified colleges and manage faculty memberships.",
};

export default async function TeacherOrganizationsPage() {
  const access = await validateEcosystemAccess("TEACHER", "/teacher/organizations");
  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You do not have authorization to view this workspace."}
          backUrl="/teacher"
        />
      </AppShell>
    );
  }

  const [myOrgsRes, myReqsRes, verifiedOrgs] = await Promise.all([
    getTeacherOrganizations(profile?.id || ""),
    getTeacherJoinRequests(profile?.id || ""),
    getVerifiedOrganizations(),
  ]);

  return (
    <AppShell profile={profile} roles={roles}>
      <TeacherOrganizationsView
        profile={profile}
        initialOrganizations={myOrgsRes.organizations || []}
        initialRequests={myReqsRes.requests || []}
        verifiedOrganizations={verifiedOrgs || []}
      />
    </AppShell>
  );
}
