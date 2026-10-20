import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { approveFacultyRequest } from "@/lib/services/organization.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId, requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const { assignedDepartmentId } = body;

    const result = await approveFacultyRequest(
      organizationId,
      requestId,
      authContext.userId,
      assignedDepartmentId
    );

    if (!result.success) {
      const isForbidden = result.error?.includes("Forbidden") || result.error?.includes("cannot approve your own");
      return NextResponse.json({ error: result.error }, { status: isForbidden ? 403 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Faculty member approved successfully and active membership granted.",
    });
  } catch (err: any) {
    console.error("[FacultyApproveAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
