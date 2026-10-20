import { createClient } from "@/lib/supabase/server";
import type {
  RetentionCheck,
  RetentionResponse,
  RetentionStage,
  RetentionStatus,
  RetentionCheckStatus,
  StudentSubject,
  CurriculumTopic,
  LearningPlanItem,
  LearningPlan,
} from "@/types/database.types";
import {
  calculateScheduledDate,
  isRetentionCheckAvailable,
  resolveRetentionCheckStatus,
  calculateRetentionScore,
  classifyRetention,
  shouldTriggerRevision,
  determineRevisionActionDetails,
  RetentionClassificationResult,
} from "@/lib/intelligence/retention";
import {
  getRetentionQuestions,
  stripRetentionAnswerKeys,
  ClientSafeRetentionQuestion,
} from "@/lib/intelligence/retention-questions";

export interface RetentionSubmission {
  questionId: string;
  studentAnswer: string | null;
  timeSpentSeconds?: number;
}

export interface RetentionWorkspaceContext {
  check: RetentionCheck;
  subject: StudentSubject;
  topic: CurriculumTopic;
  isAvailable: boolean;
  serverTime: string;
  questions: ClientSafeRetentionQuestion[];
}

export interface TopicRetentionTimeline {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  baselineScore: number;
  checks: {
    RETENTION_24H?: RetentionCheck;
    RETENTION_7D?: RetentionCheck;
    RETENTION_30D?: RetentionCheck;
  };
  latestStatus: RetentionStatus | "PENDING";
}

export interface RetentionDashboardData {
  dueChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }>;
  upcomingChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }>;
  completedChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }>;
  timelines: TopicRetentionTimeline[];
  counts: {
    dueCount: number;
    upcomingCount: number;
    retainedCount: number;
    decliningCount: number;
    needsReviewCount: number;
  };
}

export interface RetentionResultData {
  check: RetentionCheck;
  topic: CurriculumTopic;
  subject: StudentSubject;
  classification: RetentionClassificationResult;
  revisionItem?: LearningPlanItem | null;
}

export class RetentionService {
  /**
   * Idempotently schedules 24H, 7D, and 30D retention checks upon Day 5 learning completion.
   */
  static async scheduleRetentionChecks(params: {
    userId: string;
    subjectId: string;
    topicId: string | null;
    learningObjectiveId: string | null;
    learningItemId: string;
    learningGainRecordId: string | null;
    baselineScore: number;
    completedAt?: Date | string;
  }): Promise<RetentionCheck[]> {
    const supabase = await createClient();
    const baseDate = params.completedAt ? new Date(params.completedAt) : new Date();

    const stages: RetentionStage[] = ["RETENTION_24H", "RETENTION_7D", "RETENTION_30D"];
    const createdChecks: RetentionCheck[] = [];

    for (const stage of stages) {
      const dates = calculateScheduledDate(baseDate, stage);

      const checkPayload = {
        user_id: params.userId,
        subject_id: params.subjectId,
        topic_id: params.topicId,
        learning_objective_id: params.learningObjectiveId,
        learning_item_id: params.learningItemId,
        learning_gain_record_id: params.learningGainRecordId,
        retention_stage: stage,
        scheduled_at: dates.scheduledAt.toISOString(),
        available_at: dates.availableAt.toISOString(),
        status: "SCHEDULED" as RetentionCheckStatus,
        baseline_score: params.baselineScore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { data, error } = await (supabase.from("retention_checks") as any)
          .upsert(checkPayload, {
            onConflict: "user_id,learning_item_id,retention_stage",
          })
          .select()
          .single();

        if (!error && data) {
          createdChecks.push(data as RetentionCheck);
        }
      } catch {
        // Fallback representation if table migration is pending remote sync
        createdChecks.push({
          id: `retention-${stage.toLowerCase()}-${params.learningItemId}`,
          ...checkPayload,
          started_at: null,
          completed_at: null,
          score: null,
          question_count: 3,
          correct_count: 0,
          retention_percentage: null,
          performance_delta: null,
          retention_status: null,
          revision_item_id: null,
          metadata: {},
        } as RetentionCheck);
      }
    }

    return createdChecks;
  }

  /**
   * Retrieves full dashboard metrics and spaced timelines for the authenticated student.
   */
  static async getRetentionDashboard(userId: string): Promise<RetentionDashboardData> {
    const supabase = await createClient();
    const serverNow = new Date();

    let allChecks: RetentionCheck[] = [];
    try {
      const { data } = await (supabase.from("retention_checks") as any)
        .select("*")
        .eq("user_id", userId)
        .order("scheduled_at", { ascending: true });

      if (data) allChecks = data as RetentionCheck[];
    } catch {
      allChecks = [];
    }

    // Fetch subjects for label mapping
    const { data: subjectsData } = await (supabase.from("student_subjects") as any)
      .select("id, name")
      .eq("user_id", userId);
    const subjectMap = new Map<string, string>(
      (subjectsData || []).map((s: any) => [String(s.id), String(s.name)])
    );

    // Fetch topics for label mapping
    const { data: topicsData } = await (supabase.from("curriculum_topics") as any)
      .select("id, title")
      .eq("user_id", userId);
    const topicMap = new Map<string, string>(
      (topicsData || []).map((t: any) => [String(t.id), String(t.title)])
    );

    const dueChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }> = [];
    const upcomingChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }> = [];
    const completedChecks: Array<RetentionCheck & { topicTitle: string; subjectName: string }> = [];

    let retainedCount = 0;
    let decliningCount = 0;
    let needsReviewCount = 0;

    // Timeline grouping by topic
    const timelineMap = new Map<string, TopicRetentionTimeline>();

    for (const check of allChecks) {
      const topicTitle: string = (check.topic_id ? topicMap.get(check.topic_id) : null) || "Curriculum Unit";
      const subjectName: string = subjectMap.get(check.subject_id) || "Subject";

      const enriched: RetentionCheck & { topicTitle: string; subjectName: string } = {
        ...check,
        topicTitle,
        subjectName,
      };

      const resolvedStatus = resolveRetentionCheckStatus(check.status, check.scheduled_at, serverNow);

      if (check.status === "COMPLETED") {
        completedChecks.push(enriched);
        if (check.retention_status === "RETAINED") retainedCount++;
        else if (check.retention_status === "DECLINING") decliningCount++;
        else if (check.retention_status === "NEEDS_REVIEW") needsReviewCount++;
      } else if (resolvedStatus === "AVAILABLE") {
        dueChecks.push({ ...enriched, status: "AVAILABLE" });
      } else {
        upcomingChecks.push(enriched);
      }

      // Group into topic timeline
      const timelineKey = check.topic_id || check.learning_item_id || "general";
      if (!timelineMap.has(timelineKey)) {
        timelineMap.set(timelineKey, {
          topicId: check.topic_id || timelineKey,
          topicTitle,
          subjectName,
          baselineScore: check.baseline_score || 80,
          checks: {},
          latestStatus: "PENDING",
        });
      }

      const timeline = timelineMap.get(timelineKey)!;
      timeline.checks[check.retention_stage] = check;
      if (check.status === "COMPLETED" && check.retention_status) {
        timeline.latestStatus = check.retention_status;
      }
    }

    return {
      dueChecks,
      upcomingChecks,
      completedChecks,
      timelines: Array.from(timelineMap.values()),
      counts: {
        dueCount: dueChecks.length,
        upcomingCount: upcomingChecks.length,
        retainedCount,
        decliningCount,
        needsReviewCount,
      },
    };
  }

  /**
   * Loads the workspace context for a retention check, enforcing ownership and server-side availability.
   */
  static async getRetentionCheckWorkspace(
    userId: string,
    retentionCheckId: string
  ): Promise<RetentionWorkspaceContext | null> {
    const supabase = await createClient();
    const serverNow = new Date();

    // 1. Fetch check strictly with user_id
    const { data: checkData, error: checkError } = await (
      supabase.from("retention_checks") as any
    )
      .select("*")
      .eq("id", retentionCheckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError || !checkData) return null;
    const check = checkData as RetentionCheck;

    // 2. Fetch Subject with user ownership
    const { data: subjectData } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", check.subject_id)
      .eq("user_id", userId)
      .maybeSingle();

    const subject: StudentSubject = subjectData || {
      id: check.subject_id,
      user_id: userId,
      name: "Subject",
      target_score: "PASS",
      exam_date: null,
      available_daily_study_time: 60,
      current_preparation_level: "SOME_PREPARATION",
      current_capability_score: 50,
      target_capability_score: 80,
      capability_gap: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Fetch Topic
    let topic: CurriculumTopic | null = null;
    if (check.topic_id) {
      const { data: topicData } = await (supabase.from("curriculum_topics") as any)
        .select("*")
        .eq("id", check.topic_id)
        .eq("user_id", userId)
        .maybeSingle();
      topic = topicData as CurriculumTopic | null;
    }

    if (!topic) {
      topic = {
        id: check.topic_id || "topic-default",
        unit_id: "unit-default",
        subject_id: subject.id,
        user_id: userId,
        title: "Curriculum Concept",
        sequence: 1,
        importance: "CORE",
        created_at: new Date().toISOString(),
      };
    }

    // 4. Server-side availability evaluation
    const isAvailable =
      check.status === "COMPLETED" || isRetentionCheckAvailable(check.scheduled_at, serverNow);

    // 5. Generate client-safe retrieval questions
    const rawQuestions = getRetentionQuestions(topic.title, check.retention_stage);
    const questions = stripRetentionAnswerKeys(rawQuestions);

    return {
      check,
      subject,
      topic,
      isAvailable,
      serverTime: serverNow.toISOString(),
      questions,
    };
  }

  /**
   * Submits a retention check, calculates score & delta, classifies status, and creates revision actions if declining.
   */
  static async submitRetentionCheck(
    userId: string,
    retentionCheckId: string,
    submissions: RetentionSubmission[],
    actualMinutesSpent?: number
  ): Promise<RetentionResultData> {
    const supabase = await createClient();

    // 1. Verify check ownership
    const { data: checkData, error: checkError } = await (
      supabase.from("retention_checks") as any
    )
      .select("*")
      .eq("id", retentionCheckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError || !checkData) {
      throw new Error("Retention check not found or unauthorized");
    }
    const check = checkData as RetentionCheck;

    // 2. Idempotency Check: Return existing result if already completed
    if (check.status === "COMPLETED" && check.score !== null) {
      return this.getRetentionResult(userId, retentionCheckId) as Promise<RetentionResultData>;
    }

    // 3. Fetch topic title
    let topicTitle = "Curriculum Concept";
    let topic: CurriculumTopic | null = null;
    if (check.topic_id) {
      const { data: topicData } = await (supabase.from("curriculum_topics") as any)
        .select("*")
        .eq("id", check.topic_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (topicData) {
        topic = topicData as CurriculumTopic;
        topicTitle = topic.title;
      }
    }

    if (!topic) {
      topic = {
        id: check.topic_id || "topic-default",
        unit_id: "unit-default",
        subject_id: check.subject_id,
        user_id: userId,
        title: topicTitle,
        sequence: 1,
        importance: "CORE",
        created_at: new Date().toISOString(),
      };
    }

    // 4. Fetch subject
    const { data: subjectData } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", check.subject_id)
      .eq("user_id", userId)
      .maybeSingle();

    const subject: StudentSubject = subjectData || {
      id: check.subject_id,
      user_id: userId,
      name: "Subject",
      target_score: "PASS",
      exam_date: null,
      available_daily_study_time: 60,
      current_preparation_level: "SOME_PREPARATION",
      current_capability_score: 50,
      target_capability_score: 80,
      capability_gap: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. Authoritative Server-side Grading
    const authoritativeQuestions = getRetentionQuestions(topicTitle, check.retention_stage);
    const submissionMap = new Map(submissions.map((s) => [s.questionId, s]));

    let correctCount = 0;
    let totalMarks = 0;
    let awardedMarks = 0;
    const responsesToInsert: Array<Record<string, unknown>> = [];

    for (const q of authoritativeQuestions) {
      totalMarks += q.marks;
      const sub = submissionMap.get(q.id);
      const studentAns = (sub?.studentAnswer || "").trim().toLowerCase();
      const expectedAns = q.correctAnswer.trim().toLowerCase();
      const isCorrect = studentAns === expectedAns && studentAns.length > 0;

      if (isCorrect) {
        correctCount++;
        awardedMarks += q.marks;
      }

      responsesToInsert.push({
        retention_check_id: check.id,
        user_id: userId,
        question_id: q.id,
        question_prompt: q.prompt,
        student_answer: sub?.studentAnswer || null,
        correct_answer: q.correctAnswer,
        is_correct: isCorrect,
        marks: isCorrect ? q.marks : 0,
        time_spent_seconds: sub?.timeSpentSeconds || 0,
      });
    }

    const retentionScore = calculateRetentionScore(awardedMarks, totalMarks);
    const baseline = Number(check.baseline_score || 80);
    const classification = classifyRetention(
      retentionScore,
      baseline,
      authoritativeQuestions.length
    );
    const deltaPoints = classification.deltaPoints;

    // 6. Automatic Revision Action Triggering (Performance Drop Detection)
    let revisionItem: LearningPlanItem | null = null;
    const triggerRevision = shouldTriggerRevision(classification.status, deltaPoints);

    if (triggerRevision) {
      try {
        // Prevent duplicate revision actions: check if revision action already exists for this check
        const { data: existingRevision } = await (supabase.from("learning_plan_items") as any)
          .select("*")
          .eq("user_id", userId)
          .filter("metadata->>source_retention_check_id", "eq", check.id)
          .maybeSingle();

        if (existingRevision) {
          revisionItem = existingRevision as LearningPlanItem;
        } else {
          // Find student's active plan or primary plan for this subject
          const { data: activePlan } = await (supabase.from("learning_plans") as any)
            .select("id")
            .eq("subject_id", check.subject_id)
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle();

          const planId = activePlan?.id || check.learning_item_id;

          // Find first day of the plan
          const { data: planDay } = await (supabase.from("learning_plan_days") as any)
            .select("id")
            .eq("plan_id", planId)
            .eq("user_id", userId)
            .order("day_number", { ascending: true })
            .limit(1)
            .maybeSingle();

          const revisionDetails = determineRevisionActionDetails(
            classification.status,
            deltaPoints,
            topicTitle,
            check.retention_stage
          );

          const revisionPayload = {
            plan_id: planId,
            plan_day_id: planDay?.id || planId,
            user_id: userId,
            topic_id: check.topic_id,
            learning_objective_id: check.learning_objective_id,
            action_type: revisionDetails.actionType,
            title: revisionDetails.title,
            description: revisionDetails.description,
            estimated_minutes: 20,
            priority: revisionDetails.priority,
            reason: revisionDetails.reason,
            capability_state: classification.status === "NEEDS_REVIEW" ? "MISUNDERSTOOD" : "FORGOTTEN",
            sequence: 1,
            status: "NOT_STARTED",
            metadata: {
              source_retention_check_id: check.id,
              performance_delta: deltaPoints,
              retention_stage: check.retention_stage,
              baseline_score: baseline,
              retention_score: retentionScore,
            },
          };

          const { data: createdRev } = await (supabase.from("learning_plan_items") as any)
            .insert(revisionPayload)
            .select()
            .single();

          if (createdRev) revisionItem = createdRev as LearningPlanItem;
        }
      } catch (revErr) {
        console.error("Failed to automatically create revision action:", revErr);
      }
    }

    // 7. Update retention_checks record
    const updatedCheckData: Partial<RetentionCheck> = {
      status: "COMPLETED",
      score: retentionScore,
      question_count: authoritativeQuestions.length,
      correct_count: correctCount,
      retention_percentage: retentionScore,
      performance_delta: deltaPoints,
      retention_status: classification.status,
      completed_at: new Date().toISOString(),
      revision_item_id: revisionItem?.id || null,
      updated_at: new Date().toISOString(),
    };

    try {
      await (supabase.from("retention_checks") as any)
        .update(updatedCheckData)
        .eq("id", check.id)
        .eq("user_id", userId);

      // Save responses
      if (responsesToInsert.length > 0) {
        await (supabase.from("retention_responses") as any).insert(responsesToInsert);
      }

      // 8. Update Topic Capability Evidence (without overwriting previous diagnostic/learning records)
      if (check.topic_id) {
        const { data: existingState } = await (supabase.from("topic_capability_states") as any)
          .select("*")
          .eq("topic_id", check.topic_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingState) {
          // Adjust state if decayed
          let nextClassification = existingState.classification;
          if (classification.status === "NEEDS_REVIEW") {
            nextClassification = "MISUNDERSTOOD";
          } else if (classification.status === "DECLINING") {
            nextClassification = "FORGOTTEN";
          } else if (classification.status === "RETAINED" && existingState.classification !== "STRONG") {
            nextClassification = "STRONG";
          }

          const currentCap = Number(existingState.current_capability_score || 50);
          const updatedScore = Math.round(currentCap * 0.7 + retentionScore * 0.3);
          const targetCap = Number(existingState.target_capability_score || 80);

          await (supabase.from("topic_capability_states") as any)
            .update({
              classification: nextClassification,
              current_capability_score: updatedScore,
              capability_gap: Math.max(0, targetCap - updatedScore),
              evidence_count: (existingState.evidence_count || 1) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingState.id)
            .eq("user_id", userId);
        }
      }
    } catch (saveErr) {
      console.error("Failed to save completed retention check:", saveErr);
    }

    const completedCheck: RetentionCheck = {
      ...check,
      ...updatedCheckData,
    } as RetentionCheck;

    return {
      check: completedCheck,
      topic,
      subject,
      classification,
      revisionItem,
    };
  }

  /**
   * Retrieves verified retention results for a completed check.
   */
  static async getRetentionResult(
    userId: string,
    retentionCheckId: string
  ): Promise<RetentionResultData | null> {
    const supabase = await createClient();

    const { data: checkData, error } = await (supabase.from("retention_checks") as any)
      .select("*")
      .eq("id", retentionCheckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !checkData) return null;
    const check = checkData as RetentionCheck;

    // Fetch topic
    let topic: CurriculumTopic = {
      id: check.topic_id || "topic-default",
      unit_id: "unit-default",
      subject_id: check.subject_id,
      user_id: userId,
      title: "Curriculum Concept",
      sequence: 1,
      importance: "CORE",
      created_at: new Date().toISOString(),
    };

    if (check.topic_id) {
      const { data: topicData } = await (supabase.from("curriculum_topics") as any)
        .select("*")
        .eq("id", check.topic_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (topicData) topic = topicData as CurriculumTopic;
    }

    // Fetch subject
    const { data: subjectData } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", check.subject_id)
      .eq("user_id", userId)
      .maybeSingle();

    const subject: StudentSubject = subjectData || {
      id: check.subject_id,
      user_id: userId,
      name: "Subject",
      target_score: "PASS",
      exam_date: null,
      available_daily_study_time: 60,
      current_preparation_level: "SOME_PREPARATION",
      current_capability_score: 50,
      target_capability_score: 80,
      capability_gap: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const retentionScore = check.score ?? 75;
    const baseline = check.baseline_score ?? 80;
    const classification = classifyRetention(retentionScore, baseline, check.question_count || 3);

    // Fetch revision item if linked
    let revisionItem: LearningPlanItem | null = null;
    if (check.revision_item_id) {
      const { data: revData } = await (supabase.from("learning_plan_items") as any)
        .select("*")
        .eq("id", check.revision_item_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (revData) revisionItem = revData as LearningPlanItem;
    }

    return {
      check,
      topic,
      subject,
      classification,
      revisionItem,
    };
  }
}
