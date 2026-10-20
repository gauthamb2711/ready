import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { generateAndSaveTemplateQuestions } from "@/lib/services/teacher.service";

export async function POST(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decision = evaluatePermission(authContext, PERMISSIONS.QUESTION_CREATE);

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to generate questions.",
          reason: decision.reason,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { topicTitle, topicId, subjectId, unitId, count } = body;

    if (!topicTitle || !topicId || !subjectId) {
      return NextResponse.json(
        { error: "topicTitle, topicId, and subjectId are required." },
        { status: 400 }
      );
    }

    const questions = await generateAndSaveTemplateQuestions(authContext.userId, {
      topicTitle,
      topicId,
      subjectId,
      unitId,
      count: Number(count) || 4,
    });

    return NextResponse.json({ success: true, questions }, { status: 201 });
  } catch (err: unknown) {
    console.error("[TeacherQuestionGenerateAPI] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
