import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { removeFacultyMember } from "@/lib/services/organization.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId, requestId: memberId } = await params;

    const result = await removeFacultyMember(
      organizationId,
      memberId,
      authContext.userId
    );

    if (!result.success) {
      const isForbidden = result.error?.includes("Forbidden");
      return NextResponse.json({ error: result.error }, { status: isForbidden ? 403 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Faculty membership removed successfully.",
    });
  } catch (err: any) {
    console.error("[FacultyRemoveAPI] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
