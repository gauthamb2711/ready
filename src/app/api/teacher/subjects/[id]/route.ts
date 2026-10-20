import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  addCurriculumObjective,
  addCurriculumSubtopic,
  addCurriculumTopic,
  addCurriculumUnit,
  getCurriculumTree,
  getTeacherSubjectDetails,
  updateTeacherSubject,
} from "@/lib/services/teacher.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subjectId } = await params;
    const subject = await getTeacherSubjectDetails(authContext.userId, subjectId);

    if (!subject) {
      return NextResponse.json({ error: "Subject not found or access denied." }, { status: 404 });
    }

    const curriculumTree = await getCurriculumTree(authContext.userId, subjectId);

    return NextResponse.json({
      success: true,
      subject,
      curriculum: curriculumTree,
    });
  } catch (err: unknown) {
    console.error("[TeacherSubjectDetailAPI] GET error:", err);
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
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.COURSE_EDIT);
    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to update subjects.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;
    const subject = await getTeacherSubjectDetails(authContext.userId, subjectId);
    if (!subject) {
      return NextResponse.json({ error: "Subject not found or access denied." }, { status: 404 });
    }

    // 2. Check organization-scoped permission if institutional subject
    if (subject.organization_id) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.COURSE_EDIT, {
        organizationId: subject.organization_id,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to update subjects in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));

    const updated = await updateTeacherSubject(authContext.userId, subjectId, body);
    return NextResponse.json({ success: true, subject: updated });
  } catch (err: unknown) {
    console.error("[TeacherSubjectDetailAPI] PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
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
    const baseDecision = evaluatePermission(authContext, PERMISSIONS.COURSE_EDIT);
    if (!baseDecision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to edit curriculum.",
          reason: baseDecision.reason,
        },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;
    const subject = await getTeacherSubjectDetails(authContext.userId, subjectId);
    if (!subject) {
      return NextResponse.json({ error: "Subject not found or access denied." }, { status: 404 });
    }

    // 2. Check organization-scoped permission if institutional subject
    if (subject.organization_id) {
      const orgDecision = evaluatePermission(authContext, PERMISSIONS.COURSE_EDIT, {
        organizationId: subject.organization_id,
      });

      if (!orgDecision.allowed) {
        return NextResponse.json(
          {
            error: "Forbidden: Teacher authorization is required to edit curriculum in this organization.",
            reason: orgDecision.reason,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { itemType, title, sequence, unitId, topicId, subtopicId, description, importance } = body;

    let result: any;
    if (itemType === "unit") {
      if (!title?.trim()) {
        return NextResponse.json({ error: "Unit title is required." }, { status: 400 });
      }
      result = await addCurriculumUnit(authContext.userId, subjectId, title, sequence);
    } else if (itemType === "topic") {
      if (!title?.trim() || !unitId) {
        return NextResponse.json({ error: "Topic title and unitId are required." }, { status: 400 });
      }
      result = await addCurriculumTopic(authContext.userId, unitId, subjectId, title, importance, sequence);
    } else if (itemType === "subtopic") {
      if (!title?.trim() || !topicId) {
        return NextResponse.json({ error: "Subtopic title and topicId are required." }, { status: 400 });
      }
      result = await addCurriculumSubtopic(authContext.userId, topicId, title, sequence);
    } else if (itemType === "objective") {
      if (!description?.trim() || !subtopicId) {
        return NextResponse.json({ error: "Objective description and subtopicId are required." }, { status: 400 });
      }
      result = await addCurriculumObjective(authContext.userId, subtopicId, description, sequence);
    } else {
      return NextResponse.json(
        { error: "Invalid itemType. Must be 'unit', 'topic', 'subtopic', or 'objective'." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, item: result }, { status: 201 });
  } catch (err: unknown) {
    console.error("[TeacherCurriculumAPI] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
