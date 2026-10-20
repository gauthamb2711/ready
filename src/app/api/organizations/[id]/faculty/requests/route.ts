import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import {
  submitFacultyJoinRequest,
  getOrganizationFacultyRequests,
  getTeacherJoinRequests,
} from "@/lib/services/organization.service";

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
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "true";

    if (mine) {
      const res = await getTeacherJoinRequests(authContext.userId);
      return NextResponse.json(res);
    }

    const res = await getOrganizationFacultyRequests(organizationId, authContext.userId);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 403 });
    }

    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[FacultyRequestsAPI] GET error:", err);
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
      message: "Join request submitted successfully.",
    });
  } catch (err: any) {
    console.error("[FacultyRequestsAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
