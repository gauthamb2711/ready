import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { RetentionService } from "@/lib/services/retention.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/retention/${id}`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const workspace = await RetentionService.getRetentionCheckWorkspace(userId, id);

    if (!workspace) {
      return NextResponse.json(
        { error: "Retention check not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error: any) {
    console.error("Failed to load retention workspace:", error);
    return NextResponse.json(
      { error: "Internal server error loading retention check." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/retention/${id}`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const submissions = body.submissions || [];
    const actualMinutesSpent = body.actualMinutesSpent;

    const result = await RetentionService.submitRetentionCheck(
      userId,
      id,
      submissions,
      actualMinutesSpent
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to submit retention check:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process retention submission." },
      { status: 400 }
    );
  }
}
