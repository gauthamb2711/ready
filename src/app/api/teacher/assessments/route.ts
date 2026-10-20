import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  createTeacherAssessment,
  getTeacherAssessments,
  getTeacherSubjectDetails,
} from "@/lib/services/teacher.service";
import type { TeacherAssessmentStatus, TeacherAssessmentType } from "@/types/database.types";

export async function GET(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const status = (searchParams.get("status") as TeacherAssessmentStatus) || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;

    const assessments = await getTeacherAssessments(authContext.userId, {
      subjectId,
      status,
      organizationId,
    });
    return NextResponse.json({ success: true, assessments });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentsAPI] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      subject_id,
      title,
      description,
      instructions,
      assessment_type,
      duration_minutes,
      total_marks,
      pass_percentage,
      scheduled_start,
      scheduled_end,
      attempt_limit,
      shuffle_questions,
      shuffle_options,
      organization_id,
    } = body;

    if (!subject_id || !title || !title.trim()) {
      return NextResponse.json(
        { error: "Subject ID and assessment title are required." },
        { status: 400 }
      );
    }

    let targetOrgId: string | null = null;
    if (organization_id && typeof organization_id === "string" && organization_id.trim()) {
      targetOrgId = organization_id.trim();
    }

    // 1. First check base permission so unauthorized roles (e.g. STUDENT) are rejected with 403
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
      organizationId: targetOrgId,
    });

    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to create assessments.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    // 2. Resolve subject to enforce ownership / organization boundary
    const subject = await getTeacherSubjectDetails(authContext.userId, subject_id);
    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found or access denied." },
        { status: 404 }
      );
    }

    // 3. Organization is derived from subject or verified parameter
    const effectiveOrgId = subject.organization_id || targetOrgId || null;

    if (targetOrgId && subject.organization_id && targetOrgId !== subject.organization_id) {
      return NextResponse.json(
        { error: "Forbidden: Assessment organization does not match subject organization." },
        { status: 403 }
      );
    }

    // If subject belongs to an organization, ensure caller has org-scoped permission
    if (effectiveOrgId && effectiveOrgId !== targetOrgId) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.ASSESSMENT_CREATE, {
        organizationId: effectiveOrgId,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to create assessments in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    const assessment = await createTeacherAssessment(authContext.userId, {
      subject_id,
      title,
      description,
      instructions,
      assessment_type: assessment_type as TeacherAssessmentType,
      duration_minutes: duration_minutes ? Number(duration_minutes) : undefined,
      total_marks: total_marks ? Number(total_marks) : undefined,
      pass_percentage: pass_percentage ? Number(pass_percentage) : undefined,
      scheduled_start,
      scheduled_end,
      attempt_limit: attempt_limit ? Number(attempt_limit) : undefined,
      shuffle_questions: Boolean(shuffle_questions),
      shuffle_options: Boolean(shuffle_options),
      organization_id: effectiveOrgId,
    });

    return NextResponse.json({ success: true, assessment }, { status: 201 });
  } catch (err: unknown) {
    console.error("[TeacherAssessmentsAPI] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 400 }
    );
  }
}
