import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { AppShell } from "@/components/shell/AppShell";
import { CollegeFacultyManagementView } from "@/components/college/CollegeFacultyManagementView";
import { UnauthorizedState, EmptyState } from "@/components/ui/states";
import { createClient } from "@/lib/supabase/server";
import {
  getOrganizationDepartments,
  getOrganizationFacultyRequests,
} from "@/lib/services/organization.service";
import type { Organization } from "@/types/database.types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Faculty Management | READY",
  description: "Manage institutional faculty memberships, approval requests, and departmental rosters.",
};

export default async function CollegeFacultyPage() {
  const access = await validateEcosystemAccess("COLLEGE_UNIVERSITY", "/college/faculty");
  const { profile, roles } = access.authContext;

  if (!access.authorized) {
    return (
      <AppShell profile={profile} roles={roles}>
        <UnauthorizedState
          title="Access Restricted"
          description={access.reason || "You do not have authorization to view College Faculty management."}
          backUrl="/college"
        />
      </AppShell>
    );
  }

  const supabase = await createClient();

  // Find organization administered by this user
  let targetOrgId: string | null = null;

  // 1. Check organization_members
  const { data: memberRecord } = await supabase
    .from("organization_members")
    .select("organization_id, role, status")
    .eq("user_id", profile?.id || "")
    .in("role", ["COLLEGE_ADMIN", "ORGANIZATION_OWNER", "DEPARTMENT_ADMIN", "HOD"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberRecord) {
    targetOrgId = (memberRecord as any).organization_id;
  } else {
    // 2. Check if created_by this user
    const { data: createdOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("created_by", profile?.id || "")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (createdOrg) {
      targetOrgId = (createdOrg as any).id;
    }
  }

  if (!targetOrgId) {
    return (
      <AppShell profile={profile} roles={roles}>
        <EmptyState
          title="No Organization Found"
          description="You are not currently linked as an administrator of a registered College or University."
        />
      </AppShell>
    );
  }

  // Fetch organization details
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", targetOrgId)
    .single();

  if (!organization) {
    return (
      <AppShell profile={profile} roles={roles}>
        <EmptyState
          title="Organization Inactive"
          description="The institutional record could not be loaded."
        />
      </AppShell>
    );
  }

  // Fetch faculty members, requests, and departments
  const { data: facultyMembers } = await supabase
    .from("organization_members")
    .select(`
      id,
      organization_id,
      user_id,
      role,
      status,
      department_id,
      created_at,
      profiles:user_id (id, display_name, email, account_type, account_state),
      departments:organization_departments!department_id (id, name, code)
    `)
    .eq("organization_id", targetOrgId);

  const [reqsRes, departments] = await Promise.all([
    getOrganizationFacultyRequests(targetOrgId, profile?.id || ""),
    getOrganizationDepartments(targetOrgId),
  ]);

  return (
    <AppShell profile={profile} roles={roles}>
      <CollegeFacultyManagementView
        profile={profile}
        organization={organization as Organization}
        initialFaculty={facultyMembers || []}
        initialRequests={reqsRes.requests || []}
        initialDepartments={departments}
      />
    </AppShell>
  );
}
