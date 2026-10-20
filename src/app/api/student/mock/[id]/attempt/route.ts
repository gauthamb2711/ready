import { NextRequest, NextResponse } from "next/server";
import { validateEcosystemAccess } from "@/lib/rbac/access-control";
import { MockService } from "@/lib/services/mock.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await validateEcosystemAccess("STUDENT", `/api/student/mock/${id}/attempt`);
  const { userId } = access.authContext;

  if (!access.authorized || !userId) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, attemptId, questionId, selectedAnswer } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required." },
        { status: 400 }
      );
    }

    if (action === "SAVE") {
      if (!questionId) {
        return NextResponse.json(
          { error: "questionId is required for save action." },
          { status: 400 }
        );
      }

      const saveResult = await MockService.saveAnswerResponse(
        userId,
        attemptId,
        questionId,
        selectedAnswer ?? null
      );

      return NextResponse.json(saveResult);
    }

    if (action === "SUBMIT") {
      const submissionResult = await MockService.submitMockAttempt(userId, attemptId);
      return NextResponse.json(submissionResult);
    }

    return NextResponse.json(
      { error: `Invalid action "${action}". Must be SAVE or SUBMIT.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Failed to process attempt action:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error processing attempt." },
      { status: 500 }
    );
  }
}
