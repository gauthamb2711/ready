import type { DiagnosticQuestion } from "@/types/database.types";

export interface QuestionSubmission {
  questionId: string;
  studentAnswer: string | null;
  timeSpentSeconds?: number;
}

export interface QuestionScoreResult {
  questionId: string;
  topicId: string | null;
  unitId: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  studentAnswer: string | null;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  explanation: string | null;
}

export interface TopicPerformance {
  topicId: string;
  totalQuestions: number;
  correctQuestions: number;
  scorePercentage: number;
  totalMarksAwarded: number;
  maxMarks: number;
}

export interface DifficultyPerformance {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalQuestions: number;
  correctQuestions: number;
  scorePercentage: number;
}

export interface DiagnosticEvaluationResult {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  incorrectCount: number;
  scorePercentage: number;
  totalMarksAwarded: number;
  maxMarks: number;
  topicBreakdown: Record<string, TopicPerformance>;
  difficultyBreakdown: Record<string, DifficultyPerformance>;
  detailedResults: QuestionScoreResult[];
}

/**
 * Deterministic answer evaluator.
 * Evaluates student responses server-side against question answer keys.
 */
export function evaluateDiagnosticAnswers(
  questions: DiagnosticQuestion[],
  submissions: QuestionSubmission[]
): DiagnosticEvaluationResult {
  const submissionMap = new Map<string, QuestionSubmission>();
  for (const sub of submissions) {
    submissionMap.set(sub.questionId, sub);
  }

  const detailedResults: QuestionScoreResult[] = [];
  const topicMap = new Map<string, { total: number; correct: number; awarded: number; max: number }>();
  const difficultyMap = new Map<"EASY" | "MEDIUM" | "HARD", { total: number; correct: number }>();

  let totalMarksAwarded = 0;
  let maxMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let answeredCount = 0;
  let unansweredCount = 0;

  for (const q of questions) {
    const sub = submissionMap.get(q.id);
    const studentAnswer = sub?.studentAnswer?.trim() ?? null;
    const isAnswered = studentAnswer !== null && studentAnswer !== "";

    if (isAnswered) {
      answeredCount++;
    } else {
      unansweredCount++;
    }

    maxMarks += q.marks;

    // Strict deterministic equality check (normalized case and trimmed whitespace)
    const expected = (q.correct_answer || "").trim().toLowerCase();
    const actual = (studentAnswer || "").trim().toLowerCase();
    const isCorrect = isAnswered && actual === expected;

    const awarded = isCorrect ? q.marks : 0;
    if (isCorrect) {
      correctCount++;
    } else if (isAnswered) {
      incorrectCount++;
    }
    totalMarksAwarded += awarded;

    detailedResults.push({
      questionId: q.id,
      topicId: q.topic_id,
      unitId: q.unit_id,
      difficulty: q.difficulty,
      studentAnswer,
      isCorrect,
      marksAwarded: awarded,
      maxMarks: q.marks,
      explanation: q.explanation,
    });

    // Topic aggregate
    if (q.topic_id) {
      const current = topicMap.get(q.topic_id) || { total: 0, correct: 0, awarded: 0, max: 0 };
      current.total++;
      if (isCorrect) current.correct++;
      current.awarded += awarded;
      current.max += q.marks;
      topicMap.set(q.topic_id, current);
    }

    // Difficulty aggregate
    const diffCurrent = difficultyMap.get(q.difficulty) || { total: 0, correct: 0 };
    diffCurrent.total++;
    if (isCorrect) diffCurrent.correct++;
    difficultyMap.set(q.difficulty, diffCurrent);
  }

  const scorePercentage = maxMarks > 0 ? Math.round((totalMarksAwarded / maxMarks) * 100) : 0;

  // Format topic breakdown
  const topicBreakdown: Record<string, TopicPerformance> = {};
  for (const [topicId, data] of topicMap.entries()) {
    topicBreakdown[topicId] = {
      topicId,
      totalQuestions: data.total,
      correctQuestions: data.correct,
      scorePercentage: data.max > 0 ? Math.round((data.awarded / data.max) * 100) : 0,
      totalMarksAwarded: data.awarded,
      maxMarks: data.max,
    };
  }

  // Format difficulty breakdown
  const difficultyBreakdown: Record<string, DifficultyPerformance> = {};
  for (const [difficulty, data] of difficultyMap.entries()) {
    difficultyBreakdown[difficulty] = {
      difficulty,
      totalQuestions: data.total,
      correctQuestions: data.correct,
      scorePercentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    };
  }

  return {
    totalQuestions: questions.length,
    answeredCount,
    unansweredCount,
    correctCount,
    incorrectCount,
    scorePercentage,
    totalMarksAwarded,
    maxMarks,
    topicBreakdown,
    difficultyBreakdown,
    detailedResults,
  };
}
