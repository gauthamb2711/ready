import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { MockService } from "@/lib/services/mock.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await validateEcosystemAccess("STUDENT", "/api/student/mock");
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
    const dashboard = await MockService.getMockDashboard(userId, subjectId);
    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error("Failed to load mock dashboard:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error loading mock dashboard." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await validateEcosystemAccess("STUDENT", "/api/student/mock");
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { subjectId, title, totalQuestions, durationMinutes, difficulty, topicDistribution } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required to create a mock exam." },
        { status: 400 }
      );
    }

    const mockExam = await MockService.createMockExam(userId, {
      subjectId,
      title,
      totalQuestions: totalQuestions ? Number(totalQuestions) : 10,
      durationMinutes: durationMinutes ? Number(durationMinutes) : 20,
      difficulty,
      topicDistribution,
    });

    return NextResponse.json(mockExam);
  } catch (error: any) {
    console.error("Failed to create mock exam:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error creating mock exam." },
      { status: 500 }
    );
  }
}
