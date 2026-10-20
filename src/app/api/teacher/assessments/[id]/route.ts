import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  attachQuestionsToAssessment,
  deleteTeacherAssessment,
  detachQuestionFromAssessment,
  getTeacherAssessmentDetails,
  reorderAssessmentQuestions,
  transitionTeacherAssessmentStatus,
  updateTeacherAssessment,
} from "@/lib/services/teacher.service";
import type { TeacherAssessmentStatus } from "@/types/database.types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || undefined;
    const isStudent = searchParams.get("student") === "true";

    const data = await getTeacherAssessmentDetails(authContext.userId, assessmentId, {
      organizationId,
      isStudent,
    });

    if (!data) {
      return NextResponse.json({ error: "Assessment not found or access denied." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assessment: data.assessment,
      questions: data.questions,
    });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentDetailAPI] GET error:", err);
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

    // 1. Check base permission so unauthorized roles (e.g. STUDENT) are rejected with 403
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE);
    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to update assessments.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    const { id: assessmentId } = await params;
    const details = await getTeacherAssessmentDetails(authContext.userId, assessmentId);
    if (!details) {
      return NextResponse.json({ error: "Assessment not found or access denied." }, { status: 404 });
    }

    if (details.assessment.organization_id) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
        organizationId: details.assessment.organization_id,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to update assessments in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));

    // If targetStatus supplied, execute state transition
    if (body.targetStatus) {
      const targetStatus = body.targetStatus as TeacherAssessmentStatus;
      const updated = await transitionTeacherAssessmentStatus(
        authContext.userId,
        assessmentId,
        targetStatus
      );
      return NextResponse.json({ success: true, assessment: updated });
    }

    // Otherwise, perform content update
    const updated = await updateTeacherAssessment(authContext.userId, assessmentId, body);
    return NextResponse.json({ success: true, assessment: updated });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentDetailAPI] PATCH error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const isAuth =
      message.toLowerCase().includes("access denied") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("forbidden");
    const isNotFound = message.toLowerCase().includes("not found");
    const status = isAuth ? 403 : isNotFound ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check base permission so unauthorized roles (e.g. STUDENT) are rejected with 403
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE);
    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to modify assessment questions.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    const { id: assessmentId } = await params;
    const details = await getTeacherAssessmentDetails(authContext.userId, assessmentId);
    if (!details) {
      return NextResponse.json({ error: "Assessment not found or access denied." }, { status: 404 });
    }

    if (details.assessment.organization_id) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
        organizationId: details.assessment.organization_id,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to modify assessments in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));

    // Handle action: detach
    if (body.action === "detach" && body.questionId) {
      await detachQuestionFromAssessment(authContext.userId, assessmentId, body.questionId);
      return NextResponse.json({ success: true, message: "Question detached successfully." });
    }

    // Handle action: reorder
    if (body.action === "reorder" && Array.isArray(body.questionIds)) {
      await reorderAssessmentQuestions(authContext.userId, assessmentId, body.questionIds);
      return NextResponse.json({ success: true, message: "Questions reordered successfully." });
    }

    // Default action: attach questions
    const questionList = body.questions || body.questionIds;
    if (!Array.isArray(questionList) || questionList.length === 0) {
      return NextResponse.json(
        { error: "questions array with at least one question is required." },
        { status: 400 }
      );
    }

    const attached = await attachQuestionsToAssessment(authContext.userId, assessmentId, questionList);
    return NextResponse.json({ success: true, attached }, { status: 200 });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentDetailAPI] POST error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const isAuth =
      message.toLowerCase().includes("access denied") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("forbidden");
    const isNotFound = message.toLowerCase().includes("not found");
    const status = isAuth ? 403 : isNotFound ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check base permission so unauthorized roles (e.g. STUDENT) are rejected with 403
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE);
    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to delete assessments.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    const { id: assessmentId } = await params;
    const details = await getTeacherAssessmentDetails(authContext.userId, assessmentId);
    if (!details) {
      return NextResponse.json({ error: "Assessment not found or access denied." }, { status: 404 });
    }

    if (details.assessment.organization_id) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
        organizationId: details.assessment.organization_id,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to delete assessments in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    await deleteTeacherAssessment(authContext.userId, assessmentId);

    return NextResponse.json({ success: true, message: "Assessment deleted successfully." });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentDetailAPI] DELETE error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const isAuth =
      message.toLowerCase().includes("access denied") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("forbidden");
    const isNotFound = message.toLowerCase().includes("not found");
    const status = isAuth ? 403 : isNotFound ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
