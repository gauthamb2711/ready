import { createClient } from "@/lib/supabase/server";
import type {
  DiagnosticAssessment,
  DiagnosticQuestion,
  ExamTiming,
  ConfidenceLevel,
  PreparationLevel,
  TopicCapabilityState,
  StudentSubject,
} from "@/types/database.types";
import { DETERMINISTIC_QUESTION_BANK } from "@/lib/intelligence/questions-bank";
import {
  evaluateDiagnosticAnswers,
  type QuestionSubmission,
  type DiagnosticEvaluationResult,
} from "@/lib/intelligence/scoring";
import { classifyTopicCapability } from "@/lib/intelligence/capability";
import {
  calculateTargetCapability,
  calculateCapabilityGap,
  resolveTargetScoreNumber,
} from "@/lib/intelligence/gap";

export interface DiagnosticIntakeData {
  examTiming: ExamTiming;
  targetScore: string;
  currentPrep: PreparationLevel;
  dailyStudyTime: string;
  confidenceLevel: ConfidenceLevel;
}

export interface ClientSafeDiagnosticQuestion {
  id: string;
  subject_id: string | null;
  unit_id: string | null;
  topic_id: string | null;
  type: string;
  difficulty: string;
  prompt: string;
  options: string[] | Array<{ id: string; text: string }>;
  marks: number;
}

/**
 * Initializes a new Diagnostic Assessment for a subject with Current-State Intake.
 */
export async function initializeDiagnosticAssessment(
  userId: string,
  subjectId: string,
  intakeData: DiagnosticIntakeData
): Promise<{ diagnostic: DiagnosticAssessment; questions: ClientSafeDiagnosticQuestion[] }> {
  const supabase = await createClient();

  // 1. Verify subject ownership
  const { data: subjectData, error: subError } = await (
    supabase.from("student_subjects") as any
  )
    .select("*")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .single();

  if (subError || !subjectData) {
    throw new Error("Subject not found or unauthorized.");
  }

  const subject = subjectData as StudentSubject;

  // 2. Fetch subject curriculum topics
  const { data: topicsData } = await (supabase.from("curriculum_topics") as any)
    .select("*")
    .eq("subject_id", subjectId)
    .eq("user_id", userId);

  const topics = topicsData || [];

  // 3. Ensure deterministic diagnostic questions exist for this subject
  const { data: existingQuestions } = await (supabase.from("diagnostic_questions") as any)
    .select("*")
    .eq("subject_id", subjectId);

  let questions: DiagnosticQuestion[] = (existingQuestions || []) as DiagnosticQuestion[];

  if (questions.length === 0) {
    // Seed questions from the deterministic bank mapped to subject topics
    const questionsToInsert = DETERMINISTIC_QUESTION_BANK.map((bankQ, idx) => {
      // Find matching topic if present, else fallback to first topic or null
      const matchedTopic = topics.find((t: any) =>
        t.title.toLowerCase().includes(bankQ.topicTitle.toLowerCase())
      ) || topics[idx % (topics.length || 1)] || null;

      return {
        subject_id: subjectId,
        topic_id: matchedTopic ? matchedTopic.id : null,
        type: bankQ.type,
        difficulty: bankQ.difficulty,
        prompt: bankQ.prompt,
        options: bankQ.options,
        correct_answer: bankQ.correctAnswer,
        explanation: bankQ.explanation,
        marks: bankQ.marks,
      };
    });

    const { data: insertedQuestions, error: insertError } = await (
      supabase.from("diagnostic_questions") as any
    )
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Failed to seed questions:", insertError);
    } else {
      questions = (insertedQuestions || []) as DiagnosticQuestion[];
    }
  }

  // 4. Create Diagnostic Assessment record
  const { data: diagData, error: diagError } = await (
    supabase.from("diagnostic_assessments") as any
  )
    .insert({
      user_id: userId,
      subject_id: subjectId,
      title: `${subject.name} Initial Diagnostic`,
      status: "IN_PROGRESS",
      intake_data: {
        exam_timing: intakeData.examTiming,
        target_score: intakeData.targetScore,
        current_prep: intakeData.currentPrep,
        daily_study_time: intakeData.dailyStudyTime,
        confidence_level: intakeData.confidenceLevel,
      },
      started_at: new Date().toISOString(),
      total_questions: questions.length,
      current_capability_score: 0,
      target_capability_score: resolveTargetScoreNumber(intakeData.targetScore),
      capability_gap: resolveTargetScoreNumber(intakeData.targetScore),
    })
    .select()
    .single();

  if (diagError || !diagData) {
    throw new Error("Failed to initialize diagnostic assessment.");
  }

  // 5. SECURITY: Strip correct_answer before sending to client!
  const safeQuestions: ClientSafeDiagnosticQuestion[] = questions.map((q) => ({
    id: q.id,
    subject_id: q.subject_id,
    unit_id: q.unit_id,
    topic_id: q.topic_id,
    type: q.type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
    marks: q.marks,
  }));

  return {
    diagnostic: diagData as DiagnosticAssessment,
    questions: safeQuestions,
  };
}

/**
 * Retrieves an active diagnostic session, strictly stripping correct answers.
 */
export async function getDiagnosticSession(
  userId: string,
  diagnosticId: string
): Promise<{
  diagnostic: DiagnosticAssessment;
  subject: StudentSubject;
  questions: ClientSafeDiagnosticQuestion[];
} | null> {
  const supabase = await createClient();

  const { data: diagData, error: diagError } = await (
    supabase.from("diagnostic_assessments") as any
  )
    .select("*")
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .single();

  if (diagError || !diagData) return null;

  const diagnostic = diagData as DiagnosticAssessment;

  const { data: subjectData } = await (supabase.from("student_subjects") as any)
    .select("*")
    .eq("id", diagnostic.subject_id)
    .single();

  // Load questions
  const { data: questionsData } = await (supabase.from("diagnostic_questions") as any)
    .select("*")
    .eq("subject_id", diagnostic.subject_id);

  const rawQuestions = (questionsData || []) as DiagnosticQuestion[];

  // SECURITY: Strip correct_answer
  const clientQuestions: ClientSafeDiagnosticQuestion[] = rawQuestions.map((q) => ({
    id: q.id,
    subject_id: q.subject_id,
    unit_id: q.unit_id,
    topic_id: q.topic_id,
    type: q.type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
    marks: q.marks,
  }));

  return {
    diagnostic,
    subject: subjectData as StudentSubject,
    questions: clientQuestions,
  };
}

/**
 * Submits student responses, performs server-side scoring, classifies topic capabilities,
 * computes capability gap, and updates the student subject.
 */
export async function submitDiagnosticAssessment(
  userId: string,
  diagnosticId: string,
  submissions: QuestionSubmission[]
): Promise<{
  diagnostic: DiagnosticAssessment;
  evaluation: DiagnosticEvaluationResult;
  gapSummary: ReturnType<typeof calculateCapabilityGap>;
}> {
  const supabase = await createClient();

  // 1. Verify ownership and state
  const { data: diagData, error: diagError } = await (
    supabase.from("diagnostic_assessments") as any
  )
    .select("*")
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .single();

  if (diagError || !diagData) {
    throw new Error("Diagnostic assessment not found or unauthorized.");
  }

  const diagnostic = diagData as DiagnosticAssessment;

  // 2. Fetch questions with answer keys server-side
  const { data: questionsData } = await (supabase.from("diagnostic_questions") as any)
    .select("*")
    .eq("subject_id", diagnostic.subject_id);

  const questions = (questionsData || []) as DiagnosticQuestion[];

  // 3. Server-side scoring
  const evaluation = evaluateDiagnosticAnswers(questions, submissions);

  // 4. Save individual responses to diagnostic_responses
  const responseRecords = evaluation.detailedResults.map((r) => ({
    diagnostic_id: diagnosticId,
    user_id: userId,
    question_id: r.questionId,
    student_answer: r.studentAnswer,
    is_correct: r.isCorrect,
    score: r.marksAwarded,
  }));

  await (supabase.from("diagnostic_responses") as any).insert(responseRecords);

  // 5. Capability Classification & Gap Calculation
  const intake = diagnostic.intake_data || {};
  const targetScoreStr = intake.target_score || "85";
  const examTiming = intake.exam_timing;
  const selfReportedConfidence = intake.confidence_level;
  const priorPrep = intake.current_prep;

  const targetCapability = calculateTargetCapability(targetScoreStr, examTiming);
  const currentCapability = evaluation.scorePercentage;
  const gapSummary = calculateCapabilityGap(targetCapability, currentCapability);

  // 6. Update topic capability states
  for (const [topicId, topicPerf] of Object.entries(evaluation.topicBreakdown)) {
    const classificationResult = classifyTopicCapability({
      topicPerformance: topicPerf,
      selfReportedConfidence,
      priorPreparationLevel: priorPrep,
    });

    const topicTarget = calculateTargetCapability(targetScoreStr, examTiming);
    const topicGap = calculateCapabilityGap(topicTarget, classificationResult.currentCapabilityScore);

    await (supabase.from("topic_capability_states") as any).upsert(
      {
        user_id: userId,
        subject_id: diagnostic.subject_id,
        topic_id: topicId,
        classification: classificationResult.classification,
        current_capability_score: classificationResult.currentCapabilityScore,
        target_capability_score: topicTarget,
        capability_gap: topicGap.capabilityGap,
        confidence_reported: selfReportedConfidence || null,
        diagnostic_score: topicPerf.scorePercentage,
        evidence_count: topicPerf.totalQuestions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_id" }
    );
  }

  // 7. Update Diagnostic Assessment record
  const { data: updatedDiag, error: updateDiagError } = await (
    supabase.from("diagnostic_assessments") as any
  )
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      correct_count: evaluation.correctCount,
      score_percentage: evaluation.scorePercentage,
      current_capability_score: currentCapability,
      target_capability_score: targetCapability,
      capability_gap: gapSummary.capabilityGap,
      summary: {
        totalQuestions: evaluation.totalQuestions,
        correctCount: evaluation.correctCount,
        incorrectCount: evaluation.incorrectCount,
        unansweredCount: evaluation.unansweredCount,
        topicBreakdown: evaluation.topicBreakdown,
        difficultyBreakdown: evaluation.difficultyBreakdown,
        gapSummary,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", diagnosticId)
    .select()
    .single();

  if (updateDiagError) {
    console.error("Failed to update diagnostic:", updateDiagError);
  }

  // 8. Update Subject Capability Summary
  await (supabase.from("student_subjects") as any)
    .update({
      current_capability_score: currentCapability,
      target_capability_score: targetCapability,
      capability_gap: gapSummary.capabilityGap,
      updated_at: new Date().toISOString(),
    })
    .eq("id", diagnostic.subject_id);

  return {
    diagnostic: (updatedDiag || diagnostic) as DiagnosticAssessment,
    evaluation,
    gapSummary,
  };
}

/**
 * Retrieves the full results of a completed diagnostic assessment.
 */
export async function getDiagnosticResults(
  userId: string,
  diagnosticId: string
) {
  const supabase = await createClient();

  const { data: diagData, error: diagError } = await (
    supabase.from("diagnostic_assessments") as any
  )
    .select("*")
    .eq("id", diagnosticId)
    .eq("user_id", userId)
    .single();

  if (diagError || !diagData) return null;

  const diagnostic = diagData as DiagnosticAssessment;

  // Load subject
  const { data: subjectData } = await (supabase.from("student_subjects") as any)
    .select("*")
    .eq("id", diagnostic.subject_id)
    .single();

  // Load topic capability states
  const { data: topicStatesData } = await (
    supabase.from("topic_capability_states") as any
  )
    .select(`
      *,
      topic:curriculum_topics(id, title, importance)
    `)
    .eq("subject_id", diagnostic.subject_id)
    .eq("user_id", userId);

  // Load individual responses with question details and explanations
  const { data: responsesData } = await (supabase.from("diagnostic_responses") as any)
    .select(`
      *,
      question:diagnostic_questions(id, prompt, type, difficulty, explanation, marks, correct_answer)
    `)
    .eq("diagnostic_id", diagnosticId)
    .eq("user_id", userId);

  return {
    diagnostic,
    subject: subjectData as StudentSubject,
    topicStates: (topicStatesData || []) as Array<
      TopicCapabilityState & { topic: { id: string; title: string; importance: string } | null }
    >,
    responses: responsesData || [],
  };
}
