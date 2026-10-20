import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { MockService } from "@/lib/services/mock.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/mock/${id}/result`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get("attemptId");

  if (!attemptId) {
    return NextResponse.json(
      { error: "attemptId query parameter is required." },
      { status: 400 }
    );
  }

  try {
    const resultData = await MockService.getMockExamResult(userId, attemptId);
    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error("Failed to load mock exam result:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error loading mock exam result." },
      { status: 500 }
    );
  }
}
