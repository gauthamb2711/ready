import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  getQuestionAuditLogs,
  getTeacherQuestionDetails,
  transitionTeacherQuestionStatus,
  updateTeacherQuestion,
} from "@/lib/services/teacher.service";
import type { TeacherQuestionStatus } from "@/types/database.types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: questionId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || undefined;

    const question = await getTeacherQuestionDetails(
      authContext.userId,
      questionId,
      organizationId
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found or access denied." }, { status: 404 });
    }

    const auditLogs = await getQuestionAuditLogs(questionId);

    return NextResponse.json({ success: true, question, auditLogs });
  } catch (err: unknown) {
    console.error("[TeacherQuestionDetailAPI] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decision = evaluatePermission(authContext, PERMISSIONS.QUESTION_CREATE);

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to update questions.",
          reason: decision.reason,
        },
        { status: 403 }
      );
    }

    const { id: questionId } = await params;
    const body = await request.json().catch(() => ({}));

    // If targetStatus is supplied, handle state transition
    if (body.targetStatus) {
      const targetStatus = body.targetStatus as TeacherQuestionStatus;
      const updated = await transitionTeacherQuestionStatus(
        authContext.userId,
        questionId,
        targetStatus,
        {
          rejectionReason: body.rejectionReason,
          reviewNotes: body.reviewNotes,
          organizationId: body.organizationId,
        }
      );
      return NextResponse.json({ success: true, question: updated });
    }

    // Otherwise, perform content update
    const updated = await updateTeacherQuestion(authContext.userId, questionId, {
      ...body,
      organizationId: body.organizationId,
    });
    return NextResponse.json({ success: true, question: updated });
  } catch (err: unknown) {
    console.error("[TeacherQuestionDetailAPI] PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 400 }
    );
  }
}
