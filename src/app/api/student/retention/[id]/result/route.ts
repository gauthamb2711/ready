import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { RetentionService } from "@/lib/services/retention.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/retention/${id}/result`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const result = await RetentionService.getRetentionResult(userId, id);

    if (!result) {
      return NextResponse.json(
        { error: "Retention result not found or incomplete" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to load retention result:", error);
    return NextResponse.json(
      { error: "Internal server error loading retention result." },
      { status: 500 }
    );
  }
}
