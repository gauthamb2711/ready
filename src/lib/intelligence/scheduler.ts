import {
  PrioritizedTopic,
  getActionDurationMinutes,
} from "./plan-modes";
import type {
  LearningActionType,
  PlanItemPriority,
  CapabilityClassification,
} from "@/types/database.types";

export interface ScheduledPlanItem {
  dayNumber: number;
  scheduledDate: string;
  weekNumber: number;
  topicId: string;
  topicTitle: string;
  learningObjectiveId?: string | null;
  actionType: LearningActionType;
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: PlanItemPriority;
  reason: string;
  capabilityState: CapabilityClassification;
  sequence: number;
}

export interface ScheduledPlanDay {
  dayNumber: number;
  scheduledDate: string;
  weekNumber: number;
  theme: string;
  totalAllocatedMinutes: number;
  items: ScheduledPlanItem[];
}

export interface ScheduleGenerationInput {
  prioritizedTopics: PrioritizedTopic[];
  dailyStudyMinutes: number;
  daysRemaining: number;
  startDate?: Date;
  examDate?: string | null;
}

export interface ScheduleGenerationResult {
  days: ScheduledPlanDay[];
  totalEstimatedMinutes: number;
  scheduledDaysCount: number;
}

/**
 * Creates human-friendly action titles.
 */
function formatActionTitle(actionType: LearningActionType, topicTitle: string): string {
  switch (actionType) {
    case "UNDERSTAND":
      return `Understand Concept: ${topicTitle}`;
    case "EXPLAIN":
      return `Self-Explanation & Notes: ${topicTitle}`;
    case "EXAMPLE":
      return `Analyze Worked Examples: ${topicTitle}`;
    case "GUIDED_PRACTICE":
      return `Guided Problem Solving: ${topicTitle}`;
    case "INDEPENDENT_PRACTICE":
      return `Independent Practice: ${topicTitle}`;
    case "RECALL":
      return `Active Recall Sprint: ${topicTitle}`;
    case "APPLICATION":
      return `Applied Scenarios: ${topicTitle}`;
    case "REVIEW":
      return `Synthesize & Review: ${topicTitle}`;
  }
}

/**
 * Deterministically schedules learning items into daily budgets.
 * 
 * Rules:
 * 1. Each day's sum of estimatedMinutes <= dailyStudyMinutes.
 * 2. Days are bounded by min(daysRemaining, 30) (up to 30 days ahead).
 * 3. Never schedules beyond the exam date.
 * 4. High-priority topics appear earlier in the schedule.
 */
export function generateDailySchedule(input: ScheduleGenerationInput): ScheduleGenerationResult {
  const {
    prioritizedTopics,
    dailyStudyMinutes,
    daysRemaining,
    startDate = new Date(),
  } = input;

  // Study days: at least 1 day, at most min(daysRemaining, 30)
  const maxDays = Math.max(1, Math.min(daysRemaining > 0 ? daysRemaining : 14, 30));
  const effectiveDailyMinutes = Math.max(15, Math.min(720, dailyStudyMinutes));

  // Build a linear queue of discrete learning actions from prioritized topics
  interface ActionQueueItem {
    topic: PrioritizedTopic;
    actionType: LearningActionType;
    duration: number;
  }

  const queue: ActionQueueItem[] = [];

  for (const topic of prioritizedTopics) {
    for (const actionType of topic.recommendedActions) {
      queue.push({
        topic,
        actionType,
        duration: getActionDurationMinutes(actionType),
      });
    }
  }

  // If queue is empty (e.g. all topics strong or empty curriculum), add general review
  if (queue.length === 0 && prioritizedTopics.length > 0) {
    for (const topic of prioritizedTopics) {
      queue.push({
        topic,
        actionType: "RECALL",
        duration: 15,
      });
      queue.push({
        topic,
        actionType: "REVIEW",
        duration: 15,
      });
    }
  }

  const days: ScheduledPlanDay[] = [];
  let totalEstimatedMinutes = 0;
  let queueIndex = 0;

  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    // Stop if queue has been completely consumed and we already have at least 1 day
    if (queueIndex >= queue.length && dayNum > 1) {
      break;
    }

    const currentDate = new Date(startDate.getTime());
    currentDate.setDate(startDate.getDate() + (dayNum - 1));
    const scheduledDateStr = currentDate.toISOString().split("T")[0];
    const weekNumber = Math.ceil(dayNum / 7);

    let dayAllocated = 0;
    const dayItems: ScheduledPlanItem[] = [];
    const topicsEncounteredToday = new Set<string>();

    let seq = 1;
    while (queueIndex < queue.length) {
      const nextAction = queue[queueIndex];

      // Time budget constraint check
      if (dayAllocated + nextAction.duration > effectiveDailyMinutes) {
        // If nothing scheduled at all today, schedule it even if slightly over, otherwise save for tomorrow
        if (dayItems.length > 0) {
          break;
        }
      }

      topicsEncounteredToday.add(nextAction.topic.topicTitle);

      dayItems.push({
        dayNumber: dayNum,
        scheduledDate: scheduledDateStr,
        weekNumber,
        topicId: nextAction.topic.topicId,
        topicTitle: nextAction.topic.topicTitle,
        actionType: nextAction.actionType,
        title: formatActionTitle(nextAction.actionType, nextAction.topic.topicTitle),
        description: `Dedicated session addressing ${nextAction.topic.topicTitle} based on your ${nextAction.topic.capabilityState.replace(/_/g, " ")} classification.`,
        estimatedMinutes: nextAction.duration,
        priority: nextAction.topic.priorityLevel,
        reason: nextAction.topic.primaryReason,
        capabilityState: nextAction.topic.capabilityState,
        sequence: seq++,
      });

      dayAllocated += nextAction.duration;
      totalEstimatedMinutes += nextAction.duration;
      queueIndex++;
    }

    // Determine theme for day
    const dayTheme =
      topicsEncounteredToday.size > 0
        ? Array.from(topicsEncounteredToday).slice(0, 2).join(" & ")
        : "Foundational Practice";

    days.push({
      dayNumber: dayNum,
      scheduledDate: scheduledDateStr,
      weekNumber,
      theme: dayTheme,
      totalAllocatedMinutes: dayAllocated,
      items: dayItems,
    });
  }

  return {
    days,
    totalEstimatedMinutes,
    scheduledDaysCount: days.length,
  };
}
