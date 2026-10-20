import { createClient } from "@/lib/supabase/server";
import type {
  Organization,
  OrganizationDepartment,
  OrganizationMember,
  OrganizationMembershipRequest,
  OrganizationVerification,
  OrganizationVerificationStatus,
  MembershipRequestStatus,
  OrgType,
  PlatformGlobalAnalytics,
  OrganizationAnalytics,
} from "@/types/database.types";

// ==============================================================================
// AUDIT LOGGING HELPER
// ==============================================================================
export async function logOrganizationAuditEvent(
  supabase: any,
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  organizationId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await (supabase.from("audit_logs") as any).insert({
      actor_id: actorId,
      organization_id: organizationId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch (err) {
    console.error("[OrganizationService] Audit log write warning:", err);
  }
}

// ==============================================================================
// PLATFORM ADMIN / COLLEGE ADMIN AUTHORIZATION HELPERS
// ==============================================================================

/**
 * Checks if a user is an active Platform Administrator.
 */
export async function checkIsPlatformAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    // 1. Check user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles && roles.some((r: any) => r.role === "PLATFORM_ADMIN" || r.role === "SECURITY_ADMIN")) {
      return true;
    }

    // 2. Check profile metadata or system_role if present
    const { data: profile } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.metadata?.system_role === "PLATFORM_ADMIN" || profile?.metadata?.is_platform_admin === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if a user has College Admin / Organization Owner authority for a specific organization.
 */
export async function checkIsOrganizationAdmin(
  supabase: any,
  userId: string,
  organizationId: string
): Promise<{ isOrgAdmin: boolean; role?: string }> {
  try {
    // Platform Admins always have supervisor authority
    const isPlatformAdmin = await checkIsPlatformAdmin(supabase, userId);
    if (isPlatformAdmin) {
      return { isOrgAdmin: true, role: "PLATFORM_ADMIN" };
    }

    // Check organization creator
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", organizationId)
      .maybeSingle();

    // Check active organization member
    const { data: member } = await supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (member && member.status === "ACTIVE") {
      const adminRoles = ["ORGANIZATION_OWNER", "COLLEGE_ADMIN", "DEPARTMENT_ADMIN", "HOD"];
      if (adminRoles.includes(member.role)) {
        return { isOrgAdmin: true, role: member.role };
      }
    }

    // If org creator and org is verified, they are treated as College Admin
    if (org && org.created_by === userId) {
      return { isOrgAdmin: true, role: "COLLEGE_ADMIN" };
    }

    return { isOrgAdmin: false };
  } catch {
    return { isOrgAdmin: false };
  }
}

// ==============================================================================
// 1. ORGANIZATION REGISTRATION & VERIFICATION SUBMISSION
// ==============================================================================

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type: OrgType;
  officialEmail?: string;
  website?: string;
  accreditationNumber?: string;
  notes?: string;
  documents?: Array<{ name: string; url: string; type: string }>;
}

export async function createOrganization(
  creatorUserId: string,
  input: CreateOrganizationInput
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  const supabase = await createClient();

  if (!input.name || input.name.trim().length < 2) {
    return { success: false, error: "Valid organization name is required." };
  }

  const generatedSlug =
    input.slug ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 7);

  // 1. Create Organization in PENDING verification state
  const { data: org, error: orgError } = await (supabase.from("organizations") as any)
    .insert({
      name: input.name.trim(),
      slug: generatedSlug,
      type: input.type,
      verified: false,
      verification_status: "PENDING",
      created_by: creatorUserId,
      settings: {
        website: input.website || null,
        official_email: input.officialEmail || null,
      },
    })
    .select()
    .single();

  if (orgError || !org) {
    return { success: false, error: orgError?.message || "Failed to create organization." };
  }

  // 2. Insert initial Organization Verification Record
  const { error: verRecordErr } = await (supabase.from("organization_verifications") as any)
    .insert({
      organization_id: org.id,
      status: "PENDING",
      official_email: input.officialEmail || null,
      website: input.website || null,
      accreditation_number: input.accreditationNumber || null,
      documents: input.documents || [],
      notes: input.notes || null,
      submitted_at: new Date().toISOString(),
    });

  if (verRecordErr) {
    console.warn("[OrganizationService] Failed to insert verification record:", verRecordErr.message);
  }

  // 3. Register creator as College Admin with status PENDING (until org is verified)
  const { error: creatorMemberErr } = await (supabase.from("organization_members") as any)
    .insert({
      organization_id: org.id,
      user_id: creatorUserId,
      role: "COLLEGE_ADMIN",
      status: "PENDING",
    });

  if (creatorMemberErr) {
    console.warn("[OrganizationService] Failed to add creator to members:", creatorMemberErr.message);
  }

  // 4. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    creatorUserId,
    "organization.created",
    "organization",
    org.id,
    org.id,
    { name: org.name, type: org.type, status: "PENDING" }
  );

  return { success: true, organization: org as Organization };
}

/**
 * Submit organization verification details for review by platform admin.
 */
export async function submitOrganizationVerification(
  organizationId: string,
  userId: string,
  details: {
    officialEmail: string;
    website?: string;
    accreditationNumber?: string;
    documents?: Array<{ name: string; url: string; type: string }>;
    notes?: string;
  }
): Promise<{ success: boolean; verification?: OrganizationVerification; error?: string }> {
  const supabase = await createClient();

  // Verify ownership/college admin authorization
  const auth = await checkIsOrganizationAdmin(supabase, userId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Unauthorized: Only authorized organization administrators can submit verification." };
  }

  // Update organization status to UNDER_REVIEW
  await (supabase.from("organizations") as any)
    .update({ verification_status: "UNDER_REVIEW" })
    .eq("id", organizationId);

  // Upsert verification record
  const { data: verification, error: verError } = await (supabase.from("organization_verifications") as any)
    .upsert(
      {
        organization_id: organizationId,
        status: "UNDER_REVIEW",
        official_email: details.officialEmail,
        website: details.website || null,
        accreditation_number: details.accreditationNumber || null,
        documents: details.documents || [],
        notes: details.notes || null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    )
    .select()
    .single();

  if (verError) {
    return { success: false, error: verError.message };
  }

  await logOrganizationAuditEvent(
    supabase,
    userId,
    "organization.verification.submitted",
    "organization_verification",
    verification?.id,
    organizationId,
    { status: "UNDER_REVIEW", email: details.officialEmail }
  );

  return { success: true, verification: verification as OrganizationVerification };
}

// ==============================================================================
// 2. PLATFORM ADMIN REVIEW & STATUS MANAGEMENT
// ==============================================================================

export type PlatformAdminOrgAction = "APPROVE" | "REJECT" | "SUSPEND" | "REVOKE";

export async function reviewOrganization(
  organizationId: string,
  platformAdminUserId: string,
  action: PlatformAdminOrgAction,
  reviewNotes?: string
): Promise<{ success: boolean; status?: OrganizationVerificationStatus; error?: string }> {
  const supabase = await createClient();

  // Platform Admin verification
  const isPlatformAdmin = await checkIsPlatformAdmin(supabase, platformAdminUserId);
  if (!isPlatformAdmin) {
    return { success: false, error: "Forbidden: Only Platform Administrators can review organizations." };
  }

  let newStatus: OrganizationVerificationStatus;
  let isVerified = false;
  let auditAction: string;

  switch (action) {
    case "APPROVE":
      newStatus = "VERIFIED";
      isVerified = true;
      auditAction = "organization.verification.approved";
      break;
    case "REJECT":
      newStatus = "REJECTED";
      isVerified = false;
      auditAction = "organization.verification.rejected";
      break;
    case "SUSPEND":
      newStatus = "SUSPENDED";
      isVerified = false;
      auditAction = "organization.suspended";
      break;
    case "REVOKE":
      newStatus = "REVOKED";
      isVerified = false;
      auditAction = "organization.revoked";
      break;
    default:
      return { success: false, error: "Invalid review action." };
  }

  // 1. Update organization record
  const { error: orgError } = await (supabase.from("organizations") as any)
    .update({
      verification_status: newStatus,
      verified: isVerified,
    })
    .eq("id", organizationId);

  if (orgError) {
    return { success: false, error: orgError.message };
  }

  // 2. Update verification record
  await (supabase.from("organization_verifications") as any)
    .update({
      status: newStatus,
      reviewed_by: platformAdminUserId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq("organization_id", organizationId);

  // 3. Coordinate organization memberships, creator profile status, and verification requests
  const { data: orgData } = await (supabase
    .from("organizations") as any)
    .select("id, name, created_by")
    .eq("id", organizationId)
    .maybeSingle();

  if (action === "APPROVE") {
    // Activate organization administrators
    await (supabase.from("organization_members") as any)
      .update({ status: "ACTIVE" })
      .eq("organization_id", organizationId);

    if (orgData?.created_by) {
      // Activate creator profile
      await (supabase.from("profiles") as any)
        .update({ account_state: "ACTIVE" })
        .eq("id", orgData.created_by);

      // Update verification_requests
      await (supabase.from("verification_requests") as any)
        .update({
          status: "ACTIVE",
          reviewed_by: platformAdminUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", orgData.created_by);
    }
  } else if (action === "REJECT") {
    await (supabase.from("organization_members") as any)
      .update({ status: "REMOVED" })
      .eq("organization_id", organizationId);

    if (orgData?.created_by) {
      await (supabase.from("profiles") as any)
        .update({ account_state: "REJECTED" })
        .eq("id", orgData.created_by);

      await (supabase.from("verification_requests") as any)
        .update({
          status: "REJECTED",
          reviewed_by: platformAdminUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", orgData.created_by);
    }
  } else if (action === "SUSPEND") {
    await (supabase.from("organization_members") as any)
      .update({ status: "SUSPENDED" })
      .eq("organization_id", organizationId);

    if (orgData?.created_by) {
      await (supabase.from("profiles") as any)
        .update({ account_state: "SUSPENDED" })
        .eq("id", orgData.created_by);

      await (supabase.from("verification_requests") as any)
        .update({
          status: "SUSPENDED",
          reviewed_by: platformAdminUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", orgData.created_by);
    }
  } else if (action === "REVOKE") {
    await (supabase.from("organization_members") as any)
      .update({ status: "REMOVED" })
      .eq("organization_id", organizationId);

    if (orgData?.created_by) {
      await (supabase.from("profiles") as any)
        .update({ account_state: "REVOKED" })
        .eq("id", orgData.created_by);

      await (supabase.from("verification_requests") as any)
        .update({
          status: "REVOKED",
          reviewed_by: platformAdminUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", orgData.created_by);
    }
  }

  // 4. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    platformAdminUserId,
    auditAction,
    "organization",
    organizationId,
    organizationId,
    { action, newStatus, reviewNotes: reviewNotes || null }
  );

  return { success: true, status: newStatus };
}

// ==============================================================================
// 3. ORGANIZATION DISCOVERY (TEACHERS BROWSING VERIFIED COLLEGES)
// ==============================================================================

export async function getVerifiedOrganizations(searchTerm?: string): Promise<Organization[]> {
  const supabase = await createClient();

  let query = supabase
    .from("organizations")
    .select("id, name, slug, type, verified, verification_status, created_at")
    .eq("verified", true)
    .eq("verification_status", "VERIFIED")
    .order("name", { ascending: true });

  if (searchTerm && searchTerm.trim()) {
    query = query.ilike("name", `%${searchTerm.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as unknown as Organization[];
}

export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Organization;
}

// ==============================================================================
// 4. FACULTY / TEACHER JOIN REQUESTS
// ==============================================================================

export interface SubmitJoinRequestInput {
  organizationId: string;
  departmentId?: string | null;
  institutionEmail?: string | null;
  notes?: string | null;
}

export async function submitFacultyJoinRequest(
  teacherUserId: string,
  input: SubmitJoinRequestInput
): Promise<{ success: boolean; request?: OrganizationMembershipRequest; error?: string }> {
  const supabase = await createClient();

  // 1. Verify organization exists and is VERIFIED
  const { data: orgData, error: orgError } = await (supabase.from("organizations") as any)
    .select("id, name, verification_status, verified")
    .eq("id", input.organizationId)
    .maybeSingle();

  const org = orgData as any;
  if (orgError || !org) {
    return { success: false, error: "Organization not found." };
  }

  if (org.verification_status !== "VERIFIED" || !org.verified) {
    return { success: false, error: "Cannot request to join an unverified organization." };
  }

  // 2. Check if already an active member
  const { data: memberData } = await (supabase.from("organization_members") as any)
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("user_id", teacherUserId)
    .maybeSingle();

  const existingMember = memberData as any;
  if (existingMember && existingMember.status === "ACTIVE") {
    return { success: false, error: "You are already an active faculty member of this organization." };
  }

  // 3. Check if there's already a pending request
  const { data: reqData } = await (supabase.from("organization_membership_requests") as any)
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("user_id", teacherUserId)
    .eq("status", "PENDING")
    .maybeSingle();

  const existingReq = reqData as any;

  if (existingReq) {
    return { success: false, error: "A join request is already pending for this organization." };
  }

  const workEmail = input.institutionEmail?.trim() || "";

  // 4. Insert Membership Request
  const { data: req, error: reqError } = await (supabase.from("organization_membership_requests") as any)
    .insert({
      organization_id: input.organizationId,
      user_id: teacherUserId,
      department_id: input.departmentId || null,
      role: "TEACHER",
      status: "PENDING",
      work_email: workEmail,
      notes: input.notes || (input.institutionEmail ? `Institutional Email: ${input.institutionEmail}` : null),
    })
    .select()
    .single();

  if (reqError || !req) {
    return { success: false, error: reqError?.message || "Failed to submit membership request." };
  }

  // 5. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    teacherUserId,
    "faculty.join_request.created",
    "organization_membership_request",
    req.id,
    input.organizationId,
    { department_id: input.departmentId, status: "PENDING" }
  );

  return { success: true, request: req as OrganizationMembershipRequest };
}

/**
 * Get all membership requests for an organization (College Admin view).
 */
export async function getOrganizationFacultyRequests(
  organizationId: string,
  collegeAdminUserId: string
): Promise<{ success: boolean; requests?: any[]; error?: string }> {
  const supabase = await createClient();

  // Authorize: Caller must have College Admin authority in this organization
  const auth = await checkIsOrganizationAdmin(supabase, collegeAdminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Not authorized to view faculty requests for this organization." };
  }

  const { data, error } = await supabase
    .from("organization_membership_requests")
    .select(`
      id,
      organization_id,
      user_id,
      department_id,
      role,
      status,
      notes,
      work_email,
      submitted_at,
      created_at,
      profiles:user_id (id, display_name, email, account_type, account_state),
      departments:organization_departments!department_id (id, name, code)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, requests: data || [] };
}

/**
 * Get pending and past join requests submitted by a specific teacher.
 */
export async function getTeacherJoinRequests(
  teacherUserId: string
): Promise<{ success: boolean; requests?: any[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_membership_requests")
    .select(`
      id,
      organization_id,
      user_id,
      department_id,
      role,
      status,
      notes,
      work_email,
      submitted_at,
      created_at,
      organizations:organization_id (id, name, slug, verification_status),
      departments:organization_departments!department_id (id, name, code)
    `)
    .eq("user_id", teacherUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, requests: data || [] };
}

/**
 * Get active organization memberships for a teacher.
 */
export async function getTeacherOrganizations(
  teacherUserId: string
): Promise<{ success: boolean; organizations?: any[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      id,
      organization_id,
      user_id,
      role,
      status,
      department_id,
      created_at,
      organizations:organization_id (id, name, slug, type, verification_status),
      departments:organization_departments!department_id (id, name, code)
    `)
    .eq("user_id", teacherUserId)
    .eq("status", "ACTIVE");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, organizations: data || [] };
}

// ==============================================================================
// 5. COLLEGE ADMIN FACULTY APPROVAL / REJECTION / REMOVAL
// ==============================================================================

/**
 * Approve a teacher's join request.
 * CRITICAL RULE: Teacher cannot approve their own join request!
 */
export async function approveFacultyRequest(
  organizationId: string,
  requestId: string,
  collegeAdminUserId: string,
  assignedDepartmentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Authorize: College Admin
  const auth = await checkIsOrganizationAdmin(supabase, collegeAdminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Only authorized College Administrators can approve faculty." };
  }

  // 2. Fetch the request
  const { data: reqData, error: reqFetchError } = await (supabase.from("organization_membership_requests") as any)
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const req = reqData as any;
  if (reqFetchError || !req) {
    return { success: false, error: "Faculty membership request not found." };
  }

  // CRITICAL SECURITY RULE: Prevent teacher self-approval!
  if (req.user_id === collegeAdminUserId) {
    return { success: false, error: "Forbidden: You cannot approve your own faculty membership request." };
  }

  // 3. Mark request APPROVED
  const { error: updateReqErr } = await (supabase.from("organization_membership_requests") as any)
    .update({
      status: "APPROVED",
      reviewed_by: collegeAdminUserId,
      reviewed_at: new Date().toISOString(),
      department_id: assignedDepartmentId || req.department_id,
    })
    .eq("id", requestId);

  if (updateReqErr) {
    return { success: false, error: updateReqErr.message };
  }

  // 4. Create or activate active membership in organization_members
  const targetDepartmentId = assignedDepartmentId || req.department_id || null;
  const { error: upsertMemErr } = await (supabase.from("organization_members") as any)
    .upsert(
      {
        organization_id: organizationId,
        user_id: req.user_id,
        role: "TEACHER",
        status: "ACTIVE",
        department_id: targetDepartmentId,
      },
      { onConflict: "organization_id,user_id" }
    );

  if (upsertMemErr) {
    return { success: false, error: upsertMemErr.message };
  }

  // 5. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    collegeAdminUserId,
    "faculty.join_request.approved",
    "organization_membership_request",
    requestId,
    organizationId,
    { teacher_id: req.user_id, department_id: targetDepartmentId }
  );

  return { success: true };
}

/**
 * Reject a teacher's join request.
 */
export async function rejectFacultyRequest(
  organizationId: string,
  requestId: string,
  collegeAdminUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Authorize: College Admin
  const auth = await checkIsOrganizationAdmin(supabase, collegeAdminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Only authorized College Administrators can reject faculty requests." };
  }

  // 2. Fetch request
  const { data: reqData, error: reqFetchError } = await (supabase.from("organization_membership_requests") as any)
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const req = reqData as any;
  if (reqFetchError || !req) {
    return { success: false, error: "Membership request not found." };
  }

  // 3. Mark request REJECTED
  await (supabase.from("organization_membership_requests") as any)
    .update({
      status: "REJECTED",
      reviewed_by: collegeAdminUserId,
      reviewed_at: new Date().toISOString(),
      notes: reason ? `Rejected: ${reason}` : req.notes,
    })
    .eq("id", requestId);

  // 4. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    collegeAdminUserId,
    "faculty.join_request.rejected",
    "organization_membership_request",
    requestId,
    organizationId,
    { teacher_id: req.user_id, reason }
  );

  return { success: true };
}

/**
 * Remove a teacher's membership from an organization.
 */
export async function removeFacultyMember(
  organizationId: string,
  targetMemberIdOrUserId: string,
  collegeAdminUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Authorize: College Admin
  const auth = await checkIsOrganizationAdmin(supabase, collegeAdminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Only authorized College Administrators can remove faculty members." };
  }

  // 2. Locate membership record
  const { data: memberData } = await (supabase.from("organization_members") as any)
    .select("*")
    .eq("organization_id", organizationId)
    .or(`id.eq.${targetMemberIdOrUserId},user_id.eq.${targetMemberIdOrUserId}`)
    .maybeSingle();

  const member = memberData as any;
  if (!member) {
    return { success: false, error: "Faculty member not found in this organization." };
  }

  // 3. Deactivate membership
  await (supabase.from("organization_members") as any)
    .update({ status: "INACTIVE" })
    .eq("id", member.id);

  // 4. Audit Log
  await logOrganizationAuditEvent(
    supabase,
    collegeAdminUserId,
    "faculty.membership.removed",
    "organization_member",
    member.id,
    organizationId,
    { user_id: member.user_id, previous_role: member.role }
  );

  return { success: true };
}

// ==============================================================================
// 6. DEPARTMENTS MANAGEMENT
// ==============================================================================

export async function getOrganizationDepartments(organizationId: string): Promise<OrganizationDepartment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as OrganizationDepartment[];
}

export async function createOrganizationDepartment(
  organizationId: string,
  adminUserId: string,
  name: string,
  code?: string
): Promise<{ success: boolean; department?: OrganizationDepartment; error?: string }> {
  const supabase = await createClient();

  const auth = await checkIsOrganizationAdmin(supabase, adminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Not authorized to manage departments." };
  }

  const { data, error } = await (supabase.from("organization_departments") as any)
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create department." };
  }

  await logOrganizationAuditEvent(
    supabase,
    adminUserId,
    "department.assignment.created",
    "organization_department",
    data.id,
    organizationId,
    { name: data.name, code: data.code }
  );

  return { success: true, department: data as OrganizationDepartment };
}

// ==============================================================================
// 7. PLATFORM ADMIN GLOBAL ANALYTICS
// ==============================================================================

/**
 * Aggregates platform-wide operational statistics for Platform Admins.
 * STRICT PRIVACY REQUIREMENT: NEVER returns private student learning notes,
 * private chat logs, or detailed study sessions.
 */
export async function getPlatformGlobalAnalytics(
  platformAdminUserId: string
): Promise<{ success: boolean; analytics?: PlatformGlobalAnalytics; error?: string }> {
  const supabase = await createClient();

  // Authorize Platform Admin
  const isPlatformAdmin = await checkIsPlatformAdmin(supabase, platformAdminUserId);
  if (!isPlatformAdmin) {
    return { success: false, error: "Forbidden: Only Platform Administrators can access platform global analytics." };
  }

  try {
    // 1. Total users & Active users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("account_state", "ACTIVE");

    // 2. Organizations counts
    const { count: totalOrganizations } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true });

    const { count: verifiedOrganizations } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "VERIFIED");

    const { count: pendingOrganizations } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .in("verification_status", ["PENDING", "UNDER_REVIEW"]);

    const { count: activeColleges } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("type", "COLLEGE_UNIVERSITY")
      .eq("verification_status", "VERIFIED");

    const { count: activeCompanies } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("type", "COMPANY")
      .eq("verification_status", "VERIFIED");

    // 3. User distribution
    const { count: totalTeachers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("account_type", "TEACHER");

    const { count: totalStudents } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("account_type", "STUDENT");

    // 4. Educational assets
    const { count: totalAssessments } = await supabase
      .from("teacher_assessments")
      .select("*", { count: "exact", head: true });

    const { count: totalQuestions } = await supabase
      .from("teacher_questions")
      .select("*", { count: "exact", head: true });

    const { count: totalMockExams } = await supabase
      .from("mock_exams")
      .select("*", { count: "exact", head: true });

    const analytics: PlatformGlobalAnalytics = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalOrganizations: totalOrganizations || 0,
      verifiedOrganizations: verifiedOrganizations || 0,
      pendingOrganizations: pendingOrganizations || 0,
      activeColleges: activeColleges || 0,
      activeCompanies: activeCompanies || 0,
      totalTeachers: totalTeachers || 0,
      totalStudents: totalStudents || 0,
      totalAssessments: totalAssessments || 0,
      totalQuestions: totalQuestions || 0,
      totalMockExams: totalMockExams || 0,
      accountStates: {
        ACTIVE: activeUsers || 0,
        PENDING: (totalUsers || 0) - (activeUsers || 0),
        SUSPENDED: 0,
      },
    };

    return { success: true, analytics };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to aggregate platform analytics." };
  }
}

// ==============================================================================
// 8. ORGANIZATION-SCOPED ANALYTICS (COLLEGE ADMIN VIEW)
// ==============================================================================

/**
 * Returns aggregated statistics for an individual organization.
 * STRICT MULTI-TENANT ISOLATION: Never returns metrics from another organization.
 */
export async function getOrganizationAnalytics(
  organizationId: string,
  collegeAdminUserId: string
): Promise<{ success: boolean; analytics?: OrganizationAnalytics; error?: string }> {
  const supabase = await createClient();

  // Authorize: Caller must have College Admin authority in this organization
  const auth = await checkIsOrganizationAdmin(supabase, collegeAdminUserId, organizationId);
  if (!auth.isOrgAdmin) {
    return { success: false, error: "Forbidden: Not authorized to view analytics for this organization." };
  }

  try {
    // 1. Faculty count
    const { count: facultyCount } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "TEACHER")
      .eq("status", "ACTIVE");

    // 2. Department count
    const { count: departmentCount } = await supabase
      .from("organization_departments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    // 3. Subjects count owned by this organization
    const { count: subjectCount } = await supabase
      .from("teacher_subjects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    // 4. Assessments count
    const { count: assessmentCount } = await supabase
      .from("teacher_assessments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const analytics: OrganizationAnalytics = {
      organizationId,
      facultyCount: facultyCount || 0,
      studentCount: 0, // Placeholder for future college student roster
      departmentsCount: departmentCount || 0,
      subjectsCount: subjectCount || 0,
      assessmentsCount: assessmentCount || 0,
      questionBankSize: 0,
    };

    return { success: true, analytics };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load organization analytics." };
  }
}

// ==============================================================================
// 9. PLATFORM ADMIN ORGANIZATIONS FOR REVIEW
// ==============================================================================

export interface OrganizationWithDetails extends Organization {
  verification?: OrganizationVerification | null;
  creator?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    account_state?: string | null;
  } | null;
}

export async function getPlatformOrganizationsForReview(
  platformAdminUserId: string
): Promise<{ success: boolean; organizations: OrganizationWithDetails[]; error?: string }> {
  const supabase = await createClient();

  const isPlatformAdmin = await checkIsPlatformAdmin(supabase, platformAdminUserId);
  if (!isPlatformAdmin) {
    return { success: false, organizations: [], error: "Forbidden: Only Platform Administrators can review organizations." };
  }

  // 1. Fetch all organizations
  const { data: orgsData, error: orgsError } = await (supabase
    .from("organizations") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (orgsError || !orgsData) {
    return { success: false, organizations: [], error: orgsError?.message || "Failed to load organizations." };
  }

  const orgs = (orgsData || []) as Organization[];

  // 2. Fetch verifications and creators for these orgs
  const orgIds = orgs.map((o) => o.id);
  const { data: verificationsData } = orgIds.length > 0
    ? await (supabase.from("organization_verifications") as any).select("*").in("organization_id", orgIds)
    : { data: [] };

  const creatorIds = orgs.map((o) => o.created_by).filter(Boolean) as string[];
  const { data: creatorsData } = creatorIds.length > 0
    ? await (supabase.from("profiles") as any).select("id, email, first_name, last_name, display_name, account_state").in("id", creatorIds)
    : { data: [] };

  const verifications = (verificationsData || []) as any[];
  const creators = (creatorsData || []) as any[];

  const verificationMap = new Map(verifications.map((v) => [v.organization_id, v]));
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  const enrichedOrgs: OrganizationWithDetails[] = orgs.map((org) => ({
    ...org,
    verification: (verificationMap.get(org.id) as unknown as OrganizationVerification) || null,
    creator: org.created_by ? creatorMap.get(org.created_by) || null : null,
  }));

  return { success: true, organizations: enrichedOrgs };
}

