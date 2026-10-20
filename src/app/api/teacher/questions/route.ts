import { NextResponse } from "next/server";
import { getServerAuthContext, evaluatePermission } from "@/lib/rbac/access-control";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  createTeacherQuestion,
  getTeacherQuestions,
  getTeacherQuestionCounts,
} from "@/lib/services/teacher.service";
import type {
  CognitiveLevel,
  TeacherDifficulty,
  TeacherQuestionStatus,
  TeacherQuestionType,
} from "@/types/database.types";

export async function GET(request: Request) {
  try {
    const authContext = await getServerAuthContext();
    if (!authContext || !authContext.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const unitId = searchParams.get("unitId") || undefined;
    const topicId = searchParams.get("topicId") || undefined;
    const subtopic = searchParams.get("subtopic") || undefined;
    const difficulty = (searchParams.get("difficulty") as TeacherDifficulty) || undefined;
    const questionType = (searchParams.get("questionType") as TeacherQuestionType) || undefined;
    const cognitiveLevel = (searchParams.get("cognitiveLevel") as CognitiveLevel) || undefined;
    const status = (searchParams.get("status") as TeacherQuestionStatus) || undefined;
    const searchTerm = searchParams.get("search") || searchParams.get("searchTerm") || undefined;
    const authorId = searchParams.get("authorId") || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;
    const sort = (searchParams.get("sort") as "newest" | "oldest" | "updated" | "status") || undefined;
    const includeCounts = searchParams.get("counts") === "true";

    const questions = await getTeacherQuestions(authContext.userId, {
      subjectId,
      unitId,
      topicId,
      subtopic,
      difficulty,
      questionType,
      cognitiveLevel,
      status,
      searchTerm,
      authorId,
      organizationId,
      sort,
    });

    let counts;
    if (includeCounts) {
      counts = await getTeacherQuestionCounts(authContext.userId, organizationId);
    }

    return NextResponse.json({ success: true, questions, counts });
  } catch (err: unknown) {
    console.error("[TeacherQuestionsAPI] GET error:", err);
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

    const decision = evaluatePermission(authContext, PERMISSIONS.QUESTION_CREATE);

    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden: Teacher authorization is required to create questions.",
          reason: decision.reason,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      subject_id,
      unit_id,
      topic_id,
      subtopic,
      subtopic_id,
      learning_objective_id,
      question_type,
      question_text,
      options,
      correct_answer,
      explanation,
      difficulty,
      cognitive_level,
      marks,
      tags,
      estimated_time,
      organization_id,
      status,
      is_draft,
    } = body;

    const isDraftMode = is_draft === true || status === "DRAFT" || !status;

    // In draft mode, only subject_id and question_text are required
    if (isDraftMode) {
      if (!subject_id || !question_text || !question_text.trim()) {
        return NextResponse.json(
          { error: "Subject and question text are required to save a draft." },
          { status: 400 }
        );
      }
    } else {
      // In non-draft mode (submitting for review/approval), enforce full fields
      if (!subject_id || !topic_id || !question_text || !question_text.trim()) {
        return NextResponse.json(
          { error: "Subject, topic, and question text are required." },
          { status: 400 }
        );
      }
      if (
        ["MCQ", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER"].includes(question_type || "MCQ") &&
        (!correct_answer || !correct_answer.trim())
      ) {
        return NextResponse.json(
          { error: "Correct answer is required for this question type." },
          { status: 400 }
        );
      }
    }

    const question = await createTeacherQuestion(authContext.userId, {
      subject_id,
      unit_id,
      topic_id: topic_id || null,
      subtopic: subtopic || null,
      subtopic_id: subtopic_id || null,
      learning_objective_id,
      question_type: question_type || "MCQ",
      question_text: question_text.trim(),
      options: options || [],
      correct_answer: correct_answer || null,
      explanation: explanation || null,
      difficulty: difficulty || "MEDIUM",
      cognitive_level: cognitive_level || "UNDERSTAND",
      marks: Number(marks) || 1,
      tags: Array.isArray(tags) ? tags : [],
      estimated_time: Number(estimated_time) || 60,
      organization_id: organization_id || null,
      status: isDraftMode ? "DRAFT" : status || "DRAFT",
    });

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (err: unknown) {
    console.error("[TeacherQuestionsAPI] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 400 }
    );
  }
}
