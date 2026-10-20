import { createClient } from "@/lib/supabase/server";
import type {
  MockExam,
  MockExamQuestion,
  MockExamAttempt,
  MockExamResponse,
  MockExamDifficulty,
  StudentSubject,
  CurriculumTopic,
} from "@/types/database.types";
import {
  selectMockQuestions,
  stripMockAnswerKeys,
  evaluateMockSubmission,
  ClientSafeMockQuestion,
  MockEvaluationResult,
} from "@/lib/intelligence/mock-engine";
import { ReadinessService } from "./readiness.service";

export interface MockDashboardData {
  subjects: StudentSubject[];
  selectedSubject: StudentSubject | null;
  mocks: Array<
    MockExam & {
      subjectName: string;
      latestAttempt?: MockExamAttempt;
      attemptCount: number;
    }
  >;
  recentAttempts: Array<
    MockExamAttempt & {
      mockTitle: string;
      subjectName: string;
      durationSeconds: number;
    }
  >;
  stats: {
    totalCompleted: number;
    bestPercentage: number;
    latestPercentage: number | null;
    averagePercentage: number;
    recentImprovement: number;
  };
}

export class MockService {
  /**
   * Configures and creates a new Mock Exam with server-selected questions.
   */
  static async createMockExam(
    userId: string,
    params: {
      subjectId: string;
      title?: string;
      totalQuestions?: number;
      durationMinutes?: number;
      difficulty?: MockExamDifficulty;
      topicDistribution?: Record<string, number>;
    }
  ): Promise<MockExam> {
    const supabase = await createClient();

    // 1. Verify subject ownership
    const { data: subject, error: subErr } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", params.subjectId)
      .eq("user_id", userId)
      .single();

    if (subErr || !subject) {
      throw new Error("Student subject not found or access denied.");
    }

    // 2. Fetch subject curriculum topics
    const { data: topics } = await (supabase.from("curriculum_topics") as any)
      .select("*")
      .eq("subject_id", params.subjectId);

    const curriculumTopics: CurriculumTopic[] = topics || [];
    const topicTitles = curriculumTopics.map((t) => t.title);

    // 3. Server-side question selection
    const questionCount = Math.max(3, Math.min(params.totalQuestions || 10, 50));
    const durationSeconds = Math.max(300, (params.durationMinutes || 20) * 60);
    const difficulty: MockExamDifficulty = params.difficulty || "MIXED";

    const selectedQuestions = selectMockQuestions({
      topicTitles: topicTitles.length > 0 ? topicTitles : undefined,
      totalQuestions: questionCount,
      difficulty,
    });

    const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
    const examTitle =
      params.title?.trim() ||
      `${subject.name} - ${difficulty} Mock Exam (${questionCount} Questions)`;

    // 4. Create mock_exams record
    const { data: mockExam, error: mockErr } = await (supabase.from("mock_exams") as any)
      .insert({
        user_id: userId,
        subject_id: params.subjectId,
        title: examTitle,
        total_questions: selectedQuestions.length,
        total_marks: totalMarks,
        duration_seconds: durationSeconds,
        difficulty,
        status: "READY",
        config: {
          topicDistribution: params.topicDistribution || {},
          requestedQuestions: questionCount,
          difficulty,
        },
      })
      .select("*")
      .single();

    if (mockErr || !mockExam) {
      throw new Error(`Failed to create mock exam: ${mockErr?.message || "Unknown error"}`);
    }

    // 5. Insert mock_exam_questions (correct_answer stored securely server-side)
    const questionsToInsert = selectedQuestions.map((q, idx) => {
      const matchedTopic = curriculumTopics.find(
        (t) => t.title.toLowerCase() === q.topicTitle.toLowerCase()
      );

      return {
        mock_exam_id: mockExam.id,
        question_id: q.id,
        topic_id: matchedTopic ? matchedTopic.id : null,
        topic_title: q.topicTitle,
        prompt: q.prompt,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        question_type: q.questionType,
        difficulty: q.difficulty,
        display_order: idx + 1,
        marks: q.marks,
      };
    });

    const { error: qErr } = await (supabase.from("mock_exam_questions") as any).insert(
      questionsToInsert
    );

    if (qErr) {
      console.error("Failed to insert mock exam questions:", qErr);
      throw new Error("Failed to populate mock questions.");
    }

    return mockExam as MockExam;
  }

  /**
   * Starts a new attempt or resumes an in-progress attempt for a mock exam.
   * Strips answer keys before returning questions to the client.
   */
  static async startOrResumeAttempt(
    userId: string,
    mockExamId: string
  ): Promise<{
    mockExam: MockExam;
    attempt: MockExamAttempt;
    questions: ClientSafeMockQuestion[];
    savedResponses: Record<string, string | null>;
    timeRemainingSeconds: number;
    isExpired: boolean;
  }> {
    const supabase = await createClient();

    // 1. Verify mock exam ownership
    const { data: mockExam, error: mockErr } = await (supabase.from("mock_exams") as any)
      .select("*")
      .eq("id", mockExamId)
      .eq("user_id", userId)
      .single();

    if (mockErr || !mockExam) {
      throw new Error("Mock exam not found or access denied.");
    }

    // 2. Fetch mock exam questions
    const { data: rawQuestions, error: qErr } = await (
      supabase.from("mock_exam_questions") as any
    )
      .select("*")
      .eq("mock_exam_id", mockExamId)
      .order("display_order", { ascending: true });

    if (qErr || !rawQuestions || rawQuestions.length === 0) {
      throw new Error("No questions found for this mock exam.");
    }

    // 3. Check for existing active in-progress attempt
    const { data: activeAttempts } = await (supabase.from("mock_exam_attempts") as any)
      .select("*")
      .eq("mock_exam_id", mockExamId)
      .eq("user_id", userId)
      .eq("status", "IN_PROGRESS")
      .order("started_at", { ascending: false })
      .limit(1);

    let attempt: MockExamAttempt;

    if (activeAttempts && activeAttempts.length > 0) {
      attempt = activeAttempts[0];
    } else {
      // Create new attempt
      const { data: newAttempt, error: attErr } = await (
        supabase.from("mock_exam_attempts") as any
      )
        .insert({
          mock_exam_id: mockExamId,
          user_id: userId,
          status: "IN_PROGRESS",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
        })
        .select("*")
        .single();

      if (attErr || !newAttempt) {
        throw new Error("Failed to initialize mock attempt.");
      }

      attempt = newAttempt as MockExamAttempt;

      // Update mock status to IN_PROGRESS if first time
      if (mockExam.status === "READY" || mockExam.status === "DRAFT") {
        await (supabase.from("mock_exams") as any)
          .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
          .eq("id", mockExamId);
      }
    }

    // 4. Calculate server-side remaining time
    const startedAtMs = new Date(attempt.started_at).getTime();
    const nowMs = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
    const timeRemainingSeconds = Math.max(0, mockExam.duration_seconds - elapsedSeconds);
    const isExpired = elapsedSeconds > mockExam.duration_seconds + 15;

    // 5. Fetch existing saved responses for this attempt
    const { data: responses } = await (supabase.from("mock_exam_responses") as any)
      .select("question_id, selected_answer")
      .eq("attempt_id", attempt.id)
      .eq("user_id", userId);

    const savedResponses: Record<string, string | null> = {};
    (responses || []).forEach((r: any) => {
      savedResponses[r.question_id] = r.selected_answer;
    });

    // 6. Strip answer keys before returning to client
    const safeQuestions = stripMockAnswerKeys(rawQuestions);

    return {
      mockExam: mockExam as MockExam,
      attempt,
      questions: safeQuestions,
      savedResponses,
      timeRemainingSeconds,
      isExpired,
    };
  }

  /**
   * Idempotently saves an answer response for a question during an active attempt.
   */
  static async saveAnswerResponse(
    userId: string,
    attemptId: string,
    questionId: string,
    selectedAnswer: string | null
  ): Promise<{ saved: boolean; isExpired: boolean }> {
    const supabase = await createClient();

    // 1. Verify attempt ownership and active status
    const { data: attempt, error: attErr } = await (
      supabase.from("mock_exam_attempts") as any
    )
      .select("*, mock_exams(duration_seconds)")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attErr || !attempt) {
      throw new Error("Mock attempt not found or access denied.");
    }

    if (attempt.status !== "IN_PROGRESS") {
      throw new Error(`Cannot submit answer. Attempt is already ${attempt.status}.`);
    }

    // 2. Check server-side expiration
    const durationSeconds = attempt.mock_exams?.duration_seconds || 1800;
    const elapsedSeconds = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
    const isExpired = elapsedSeconds > durationSeconds + 15;

    if (isExpired) {
      return { saved: false, isExpired: true };
    }

    // 3. Upsert response idempotently
    const { error: upsertErr } = await (supabase.from("mock_exam_responses") as any).upsert(
      {
        attempt_id: attemptId,
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" }
    );

    if (upsertErr) {
      throw new Error(`Failed to save answer: ${upsertErr.message}`);
    }

    return { saved: true, isExpired: false };
  }

  /**
   * Final submission and server-side evaluation of a mock exam attempt.
   * Calculates score, marks, topic performance, updates attempt, and triggers readiness recalculation.
   */
  static async submitMockAttempt(
    userId: string,
    attemptId: string
  ): Promise<{ attempt: MockExamAttempt; result: MockEvaluationResult }> {
    const supabase = await createClient();

    // 1. Authenticate and verify attempt ownership
    const { data: attempt, error: attErr } = await (
      supabase.from("mock_exam_attempts") as any
    )
      .select("*, mock_exams(*)")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attErr || !attempt) {
      throw new Error("Mock attempt not found or access denied.");
    }

    const mockExam: MockExam = attempt.mock_exams;

    // Idempotency check: if already submitted, fetch and return cached result
    if (attempt.status === "SUBMITTED" || attempt.status === "EXPIRED") {
      return {
        attempt: attempt as MockExamAttempt,
        result: {
          score: Number(attempt.score),
          totalMarks: mockExam.total_marks,
          percentage: Number(attempt.percentage),
          correctCount: attempt.correct_count,
          incorrectCount: attempt.incorrect_count,
          unansweredCount: attempt.unanswered_count,
          timeUsedSeconds: attempt.time_used_seconds,
          isExpired: attempt.status === "EXPIRED",
          topicBreakdown: (attempt.topic_performance as any) || {},
          strongTopics: [],
          weakTopics: [],
          needsPracticeTopics: [],
          unverifiedTopics: [],
          evaluatedResponses: [],
        },
      };
    }

    // 2. Fetch questions with server-side answer keys
    const { data: questions, error: qErr } = await (
      supabase.from("mock_exam_questions") as any
    )
      .select("*")
      .eq("mock_exam_id", mockExam.id);

    if (qErr || !questions || questions.length === 0) {
      throw new Error("Could not load exam questions for scoring.");
    }

    // 3. Fetch all saved responses
    const { data: responses } = await (supabase.from("mock_exam_responses") as any)
      .select("*")
      .eq("attempt_id", attemptId)
      .eq("user_id", userId);

    const studentResponses = (responses || []).map((r: any) => ({
      question_id: r.question_id,
      selected_answer: r.selected_answer,
    }));

    // 4. Server-side scoring and topic breakdown
    const now = new Date();
    const evaluation = evaluateMockSubmission({
      questions: questions as MockExamQuestion[],
      responses: studentResponses,
      durationSeconds: mockExam.duration_seconds,
      startedAt: new Date(attempt.started_at),
      submittedAt: now,
    });

    const finalStatus = evaluation.isExpired ? "EXPIRED" : "SUBMITTED";

    // 5. Update mock_exam_attempts record
    const { data: updatedAttempt, error: updateErr } = await (
      supabase.from("mock_exam_attempts") as any
    )
      .update({
        score: evaluation.score,
        percentage: evaluation.percentage,
        correct_count: evaluation.correctCount,
        incorrect_count: evaluation.incorrectCount,
        unanswered_count: evaluation.unansweredCount,
        time_used_seconds: evaluation.timeUsedSeconds,
        status: finalStatus,
        submitted_at: now.toISOString(),
        topic_performance: evaluation.topicBreakdown,
        updated_at: now.toISOString(),
      })
      .eq("id", attemptId)
      .select("*")
      .single();

    if (updateErr || !updatedAttempt) {
      throw new Error(`Failed to finalize attempt: ${updateErr?.message}`);
    }

    // 6. Update individual responses with awarded marks and is_correct
    for (const evaluated of evaluation.evaluatedResponses) {
      await (supabase.from("mock_exam_responses") as any)
        .update({
          awarded_marks: evaluated.awardedMarks,
          is_correct: evaluated.isCorrect,
          updated_at: now.toISOString(),
        })
        .eq("attempt_id", attemptId)
        .eq("question_id", evaluated.questionId);
    }

    // 7. Update parent mock_exam status
    await (supabase.from("mock_exams") as any)
      .update({ status: "SUBMITTED", submitted_at: now.toISOString() })
      .eq("id", mockExam.id);

    // 8. Trigger automatic readiness recalculation with mock performance as fresh evidence
    try {
      await ReadinessService.calculateAndSaveReadiness(
        userId,
        mockExam.subject_id,
        "MOCK_SUBMISSION"
      );
    } catch (readinessErr) {
      console.error("Warning: Failed to recalculate readiness after mock:", readinessErr);
    }

    return {
      attempt: updatedAttempt as MockExamAttempt,
      result: evaluation,
    };
  }

  /**
   * Retrieves sanitized result data for a completed attempt.
   */
  static async getMockExamResult(userId: string, attemptId: string) {
    const supabase = await createClient();

    // 1. Verify attempt ownership
    const { data: attempt, error: attErr } = await (
      supabase.from("mock_exam_attempts") as any
    )
      .select("*, mock_exams(*, student_subjects(*))")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attErr || !attempt) {
      throw new Error("Attempt not found or access denied.");
    }

    if (attempt.status !== "SUBMITTED" && attempt.status !== "EXPIRED") {
      throw new Error("Results are not available for in-progress attempts.");
    }

    // 2. Fetch questions
    const { data: questions } = await (supabase.from("mock_exam_questions") as any)
      .select("*")
      .eq("mock_exam_id", attempt.mock_exam_id)
      .order("display_order", { ascending: true });

    // 3. Fetch responses
    const { data: responses } = await (supabase.from("mock_exam_responses") as any)
      .select("*")
      .eq("attempt_id", attemptId)
      .eq("user_id", userId);

    const responseMap = new Map<string, any>((responses || []).map((r: any) => [r.question_id, r]));

    const reviewItems = (questions || []).map((q: any) => {
      const resp: any = responseMap.get(q.question_id);
      return {
        questionId: q.question_id,
        topicTitle: q.topic_title,
        prompt: q.prompt,
        options: q.options,
        selectedAnswer: resp?.selected_answer || null,
        correctAnswer: q.correct_answer, // Safe to expose post-submission in result review
        explanation: q.explanation,
        isCorrect: Boolean(resp?.is_correct),
        marks: q.marks,
        awardedMarks: resp?.awarded_marks || 0,
      };
    });

    return {
      attempt: attempt as MockExamAttempt,
      mockExam: attempt.mock_exams as MockExam,
      subject: attempt.mock_exams?.student_subjects as StudentSubject,
      topicPerformance: attempt.topic_performance as Record<string, any>,
      reviewItems,
    };
  }

  /**
   * Retrieves the mock exams dashboard data for student overview.
   */
  static async getMockDashboard(
    userId: string,
    subjectId?: string
  ): Promise<MockDashboardData> {
    const supabase = await createClient();

    // 1. Fetch student subjects
    const { data: subjects } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    const subjectList: StudentSubject[] = subjects || [];
    const selectedSubject = subjectId
      ? subjectList.find((s) => s.id === subjectId) || null
      : null;

    // 2. Query mock exams
    let mockQuery = (supabase.from("mock_exams") as any)
      .select("*, student_subjects(name), mock_exam_attempts(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (selectedSubject) {
      mockQuery = mockQuery.eq("subject_id", selectedSubject.id);
    }

    const { data: rawMocks } = await mockQuery;

    const formattedMocks = (rawMocks || []).map((m: any) => {
      const attempts: MockExamAttempt[] = m.mock_exam_attempts || [];
      const latestAttempt = attempts.sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )[0];

      return {
        ...m,
        subjectName: m.student_subjects?.name || "Subject",
        latestAttempt,
        attemptCount: attempts.length,
      };
    });

    // 3. Fetch recent completed attempts across all mocks
    let attemptQuery = (supabase.from("mock_exam_attempts") as any)
      .select("*, mock_exams(title, duration_seconds, subject_id, student_subjects(name))")
      .eq("user_id", userId)
      .in("status", ["SUBMITTED", "EXPIRED"])
      .order("submitted_at", { ascending: false })
      .limit(10);

    const { data: rawAttempts } = await attemptQuery;

    const recentAttempts = (rawAttempts || []).map((a: any) => ({
      ...a,
      mockTitle: a.mock_exams?.title || "Mock Exam",
      subjectName: a.mock_exams?.student_subjects?.name || "Subject",
      durationSeconds: a.mock_exams?.duration_seconds || 1800,
    }));

    // 4. Calculate aggregated metrics
    const completedAttempts = recentAttempts;
    const totalCompleted = completedAttempts.length;

    let bestPercentage = 0;
    let latestPercentage: number | null = null;
    let averagePercentage = 0;
    let recentImprovement = 0;

    if (totalCompleted > 0) {
      bestPercentage = Math.max(...completedAttempts.map((a: any) => Number(a.percentage || 0)));
      latestPercentage = Number(completedAttempts[0].percentage || 0);
      averagePercentage = Math.round(
        completedAttempts.reduce((sum: number, a: any) => sum + Number(a.percentage || 0), 0) / totalCompleted
      );

      if (totalCompleted >= 2) {
        const oldest = completedAttempts[completedAttempts.length - 1];
        recentImprovement = Math.round(latestPercentage - Number(oldest.percentage || 0));
      }
    }

    return {
      subjects: subjectList,
      selectedSubject,
      mocks: formattedMocks,
      recentAttempts,
      stats: {
        totalCompleted,
        bestPercentage,
        latestPercentage,
        averagePercentage,
        recentImprovement,
      },
    };
  }
}
