import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { rejectFacultyRequest } from "@/lib/services/organization.service";

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
    const { reason } = body;

    const result = await rejectFacultyRequest(
      organizationId,
      requestId,
      authContext.userId,
      reason
    );

    if (!result.success) {
      const isForbidden = result.error?.includes("Forbidden");
      return NextResponse.json({ error: result.error }, { status: isForbidden ? 403 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Faculty request rejected.",
    });
  } catch (err: any) {
    console.error("[FacultyRejectAPI] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
