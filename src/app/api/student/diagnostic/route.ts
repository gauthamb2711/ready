import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/rbac/access-control";
import { initializeDiagnosticAssessment } from "@/lib/services/diagnostic.service";

export async function POST(req: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      subjectId,
      examTiming,
      targetScore,
      currentPreparation,
      availableDailyStudyTime,
      confidence,
    } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    const session = await initializeDiagnosticAssessment(
      authContext.userId,
      subjectId,
      {
        examTiming: examTiming || "WITHIN_1_MONTH",
        targetScore: targetScore || "80",
        currentPrep: currentPreparation || "SOME_PREPARATION",
        dailyStudyTime: String(availableDailyStudyTime || 60),
        confidenceLevel: confidence || "MEDIUM",
      }
    );

    return NextResponse.json(
      {
        assessment: session.diagnostic,
        questionsCount: session.questions.length,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initialize diagnostic" },
      { status: 500 }
    );
  }
}
