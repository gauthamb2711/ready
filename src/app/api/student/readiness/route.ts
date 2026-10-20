import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { ReadinessService } from "@/lib/services/readiness.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await validateEcosystemAccess("STUDENT", "/api/student/readiness");
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId") || undefined;

  try {
    const dashboard = await ReadinessService.getReadinessDashboard(userId, subjectId);
    if (!dashboard) {
      return NextResponse.json(
        { error: "No subjects found. Please create a subject first." },
        { status: 404 }
      );
    }
    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error("Failed to load readiness dashboard:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error loading readiness dashboard." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await validateEcosystemAccess("STUDENT", "/api/student/readiness");
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required to recalculate readiness." },
        { status: 400 }
      );
    }

    const recalculated = await ReadinessService.calculateAndSaveReadiness(
      userId,
      subjectId,
      "MANUAL_RECALC"
    );

    return NextResponse.json(recalculated);
  } catch (error: any) {
    console.error("Failed to recalculate readiness:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error recalculating readiness." },
      { status: 500 }
    );
  }
}
