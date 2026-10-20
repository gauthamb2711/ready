import { createClient } from "@/lib/supabase/server";
import type {
  LearningPlan,
  LearningPlanDay,
  LearningPlanItem,
  StudentSubject,
  TopicCapabilityState,
  CurriculumTopic,
  LearningActionStatus,
} from "@/types/database.types";
import {
  determinePlanMode,
  prioritizeTopics,
  TopicPrioritizationInput,
} from "@/lib/intelligence/plan-modes";
import { generateDailySchedule } from "@/lib/intelligence/scheduler";

export interface PlanWithSchedule {
  plan: LearningPlan;
  days: Array<LearningPlanDay & { items: LearningPlanItem[] }>;
  activeTodayDay: (LearningPlanDay & { items: LearningPlanItem[] }) | null;
}

export interface GeneratePlanOptions {
  userId: string;
  subjectId: string;
  forceRegenerate?: boolean;
  regenerationReason?: string;
}

export class LearningPlanService {
  /**
   * Retrieves the current active learning plan for a user and subject.
   */
  static async getActivePlan(userId: string, subjectId: string): Promise<PlanWithSchedule | null> {
    const supabase = await createClient();

    // 1. Fetch active plan
    const { data: planData, error: planError } = await (supabase.from("learning_plans") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError || !planData) return null;
    const plan = planData as LearningPlan;

    // 2. Fetch days
    const { data: daysData } = await (supabase.from("learning_plan_days") as any)
      .select("*")
      .eq("plan_id", plan.id)
      .eq("user_id", userId)
      .order("day_number", { ascending: true });

    const rawDays = (daysData || []) as LearningPlanDay[];

    // 3. Fetch items
    const { data: itemsData } = await (supabase.from("learning_plan_items") as any)
      .select("*")
      .eq("plan_id", plan.id)
      .eq("user_id", userId)
      .order("sequence", { ascending: true });

    const rawItems = (itemsData || []) as LearningPlanItem[];

    // Assemble days with items
    const todayStr = new Date().toISOString().split("T")[0];
    let activeTodayDay: (LearningPlanDay & { items: LearningPlanItem[] }) | null = null;

    const daysWithItems = rawDays.map((day) => {
      const items = rawItems.filter((i) => i.plan_day_id === day.id);
      const dayBundle = { ...day, items };
      if (day.scheduled_date === todayStr) {
        activeTodayDay = dayBundle;
      }
      return dayBundle;
    });

    // If no exact today match, default active day to day 1 or first incomplete day
    if (!activeTodayDay && daysWithItems.length > 0) {
      activeTodayDay =
        daysWithItems.find((d) => d.status !== "COMPLETED") || daysWithItems[0];
    }

    return {
      plan,
      days: daysWithItems,
      activeTodayDay,
    };
  }

  /**
   * Generates or regenerates a personalized learning plan using verified evidence.
   */
  static async generateOrRegeneratePlan(options: GeneratePlanOptions): Promise<PlanWithSchedule> {
    const { userId, subjectId, forceRegenerate = false, regenerationReason } = options;
    const supabase = await createClient();

    // 1. Fetch Subject with strict user_id check
    const { data: subjectData, error: subError } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", subjectId)
      .eq("user_id", userId)
      .single();

    if (subError || !subjectData) {
      throw new Error("Subject not found or unauthorized.");
    }
    const subject = subjectData as StudentSubject;

    // If an active plan already exists and forceRegenerate is false, return it
    if (!forceRegenerate) {
      const existing = await this.getActivePlan(userId, subjectId);
      if (existing) return existing;
    }

    // 2. Fetch Topics for this subject
    const { data: topicsData } = await (supabase.from("curriculum_topics") as any)
      .select("*")
      .eq("subject_id", subjectId)
      .eq("user_id", userId);

    const topics = (topicsData || []) as CurriculumTopic[];

    // 3. Fetch Topic Capability States
    const { data: capStatesData } = await (supabase.from("topic_capability_states") as any)
      .select("*")
      .eq("subject_id", subjectId)
      .eq("user_id", userId);

    const capStates = (capStatesData || []) as TopicCapabilityState[];
    const capStateMap = new Map<string, TopicCapabilityState>();
    capStates.forEach((cs) => {
      capStateMap.set(cs.topic_id, cs);
    });

    // 4. Calculate Time Remaining until Exam
    let daysRemaining = 14;
    const now = new Date();
    if (subject.exam_date) {
      const examDate = new Date(subject.exam_date);
      const diffTime = examDate.getTime() - now.getTime();
      const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(1, calculatedDays);
    }

    const dailyStudyMinutes = Number(subject.available_daily_study_time) || 60;
    const currentCap = subject.current_capability_score ?? 0;
    const targetCap = subject.target_capability_score ?? 80;
    const capGap = Math.max(0, targetCap - currentCap);

    // 5. Build prioritization inputs
    const prioritizationInputs: TopicPrioritizationInput[] = topics.map((t) => {
      const stateRecord = capStateMap.get(t.id) || capStateMap.get(t.title);
      const classification = stateRecord ? stateRecord.classification : "NOT_TESTED";
      const topicCurrent = stateRecord ? stateRecord.current_capability_score : 0;
      const topicTarget = stateRecord ? stateRecord.target_capability_score : targetCap;
      const topicGap = Math.max(0, topicTarget - topicCurrent);

      return {
        topicId: t.id,
        topicTitle: t.title,
        importance: t.importance,
        capabilityState: classification,
        currentCapability: topicCurrent,
        targetCapability: topicTarget,
        capabilityGap: topicGap,
      };
    });

    // Check for critical weak areas
    const hasCriticalWeakTopics = prioritizationInputs.some(
      (p) =>
        p.capabilityState === "MISUNDERSTOOD" ||
        p.capabilityState === "FALSE_CONFIDENCE" ||
        p.capabilityGap >= 40
    );

    // 6. Determine Planning Mode
    const modeResult = determinePlanMode({
      preparationLevel: subject.current_prep_level,
      currentCapability: currentCap,
      targetCapability: targetCap,
      capabilityGap: capGap,
      daysRemaining,
      hasCriticalWeakTopics,
    });

    // 7. Prioritize topics
    const prioritized = prioritizeTopics(prioritizationInputs);

    // 8. Generate Daily Schedule
    const scheduleResult = generateDailySchedule({
      prioritizedTopics: prioritized,
      dailyStudyMinutes,
      daysRemaining,
      startDate: now,
      examDate: subject.exam_date,
    });

    // 9. Versioning: Find current max version
    const { data: latestPlan } = await (supabase.from("learning_plans") as any)
      .select("version")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestPlan?.version || 0) + 1;

    // Archive previous active plans for this subject
    await (supabase.from("learning_plans") as any)
      .update({ is_active: false, status: "ARCHIVED" })
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_active", true);

    // 10. Persist new Learning Plan record
    const { data: createdPlanData, error: createPlanError } = await (
      supabase.from("learning_plans") as any
    )
      .insert({
        user_id: userId,
        subject_id: subjectId,
        title: `${subject.name} - ${modeResult.mode.replace(/_/g, " ")} (v${nextVersion})`,
        mode: modeResult.mode,
        mode_reason: modeResult.reason,
        version: nextVersion,
        is_active: true,
        status: "ACTIVE",
        daily_study_minutes: dailyStudyMinutes,
        total_estimated_minutes: scheduleResult.totalEstimatedMinutes,
        exam_date: subject.exam_date,
        target_score: subject.target_score,
        current_capability_score: currentCap,
        target_capability_score: targetCap,
        capability_gap: capGap,
        days_remaining: daysRemaining,
        gap_summary: `Capability gap of ${capGap}% points across ${topics.length} topics.`,
        metadata: {
          regenerationReason: regenerationReason || (nextVersion === 1 ? "Initial plan generation" : "Evidence update"),
        },
      })
      .select()
      .single();

    if (createPlanError || !createdPlanData) {
      throw new Error(createPlanError?.message || "Failed to create learning plan");
    }

    const createdPlan = createdPlanData as LearningPlan;

    // 11. Persist Days & Items
    const assembledDays: Array<LearningPlanDay & { items: LearningPlanItem[] }> = [];

    for (const day of scheduleResult.days) {
      const { data: dayData, error: dayError } = await (
        supabase.from("learning_plan_days") as any
      )
        .insert({
          plan_id: createdPlan.id,
          user_id: userId,
          day_number: day.dayNumber,
          scheduled_date: day.scheduledDate,
          week_number: day.weekNumber,
          theme: day.theme,
          total_allocated_minutes: day.totalAllocatedMinutes,
          status: "NOT_STARTED",
        })
        .select()
        .single();

      if (dayError || !dayData) continue;
      const createdDay = dayData as LearningPlanDay;

      // Insert Items
      const itemsToInsert = day.items.map((item) => ({
        plan_id: createdPlan.id,
        plan_day_id: createdDay.id,
        user_id: userId,
        topic_id: item.topicId,
        action_type: item.actionType,
        title: item.title,
        description: item.description,
        estimated_minutes: item.estimatedMinutes,
        priority: item.priority,
        reason: item.reason,
        capability_state: item.capabilityState,
        sequence: item.sequence,
        status: "NOT_STARTED",
      }));

      const { data: insertedItems } = await (supabase.from("learning_plan_items") as any)
        .insert(itemsToInsert)
        .select();

      assembledDays.push({
        ...createdDay,
        items: (insertedItems || []) as LearningPlanItem[],
      });
    }

    return {
      plan: createdPlan,
      days: assembledDays,
      activeTodayDay: assembledDays[0] || null,
    };
  }

  /**
   * Updates an item's status (START, PAUSE, COMPLETE, SKIP).
   */
  static async updateActionStatus(
    userId: string,
    itemId: string,
    status: LearningActionStatus,
    actualMinutesSpent?: number
  ): Promise<LearningPlanItem> {
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "COMPLETED") {
      updates.completed_at = new Date().toISOString();
    }

    if (typeof actualMinutesSpent === "number") {
      updates.actual_minutes_spent = actualMinutesSpent;
    }

    const { data, error } = await (supabase.from("learning_plan_items") as any)
      .update(updates)
      .eq("id", itemId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to update learning action");
    }

    return data as LearningPlanItem;
  }
}
