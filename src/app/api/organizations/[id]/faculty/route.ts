import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  checkIsOrganizationAdmin,
  getOrganizationFacultyRequests,
  submitFacultyJoinRequest,
} from "@/lib/services/organization.service";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;
    const supabase = await createClient();

    // Authorize: Caller must have College Admin authority
    const auth = await checkIsOrganizationAdmin(supabase, authContext.userId, organizationId);
    if (!auth.isOrgAdmin) {
      return NextResponse.json({ error: "Forbidden: Only authorized College Administrators can view faculty." }, { status: 403 });
    }

    // Active faculty members
    const { data: members, error: membersError } = await supabase
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
      .eq("organization_id", organizationId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Pending requests
    const reqResult = await getOrganizationFacultyRequests(organizationId, authContext.userId);

    return NextResponse.json({
      success: true,
      faculty: members || [],
      requests: reqResult.requests || [],
    });
  } catch (err: any) {
    console.error("[FacultyAPI] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;
    const body = await request.json().catch(() => ({}));
    const { departmentId, institutionEmail, notes } = body;

    const result = await submitFacultyJoinRequest(authContext.userId, {
      organizationId,
      departmentId,
      institutionEmail,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      request: result.request,
      message: "Join request submitted successfully. Awaiting College Admin approval.",
    });
  } catch (err: any) {
    console.error("[FacultyAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
