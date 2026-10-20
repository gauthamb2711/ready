import type {
  PlanMode,
  PreparationLevel,
  CapabilityClassification,
  LearningActionType,
  PlanItemPriority,
} from "@/types/database.types";

export interface PlanModeSelectionInput {
  preparationLevel: PreparationLevel;
  currentCapability: number;
  targetCapability: number;
  capabilityGap: number;
  daysRemaining: number;
  hasCriticalWeakTopics: boolean;
}

export interface PlanModeSelectionResult {
  mode: PlanMode;
  reason: string;
}

/**
 * Deterministically determines the optimal learning plan mode.
 * 
 * Rules:
 * - RESCUE: Very limited time (<= 3 days) + significant gaps (>= 30) or critical weak topics.
 * - FOUNDATION: Low preparation level ('NOT_STARTED' | 'BASIC') + low current capability (< 40).
 * - CATCH_UP: Moderate time (<= 14 days) with significant capability gap (>= 35).
 * - OPTIMIZATION: High current capability (>= 75) with smaller remaining gap (<= 15).
 * - EARLY_PREP: Long runway (> 30 days) with stable initial capability.
 * - NORMAL_PREP: Standard balanced prep across typical study runways.
 */
export function determinePlanMode(input: PlanModeSelectionInput): PlanModeSelectionResult {
  const {
    preparationLevel,
    currentCapability,
    capabilityGap,
    daysRemaining,
    hasCriticalWeakTopics,
  } = input;

  // 1. Rescue Mode
  if (daysRemaining <= 3 && (capabilityGap >= 25 || hasCriticalWeakTopics)) {
    return {
      mode: "RESCUE",
      reason:
        "Your target date is imminent and priority topics show critical capability gaps. Triage high-yield concepts and essential practice.",
    };
  }

  // 2. Foundation Mode
  if (
    (preparationLevel === "NOT_STARTED" || preparationLevel === "BASIC") &&
    currentCapability < 40
  ) {
    return {
      mode: "FOUNDATION",
      reason:
        "Starting from core fundamentals. Focus on conceptual understanding, guided worked examples, and terminology before timed problem-solving.",
    };
  }

  // 3. Catch-Up Mode
  if (daysRemaining <= 14 && capabilityGap >= 30) {
    return {
      mode: "CATCH_UP",
      reason:
        "Significant capability gap relative to remaining time. Prioritizing high-weightage topics with intensive practice intervals.",
    };
  }

  // 4. Optimization Mode
  if (currentCapability >= 75 && capabilityGap <= 15) {
    return {
      mode: "OPTIMIZATION",
      reason:
        "High verified capability baseline. Fine-tuning edge cases, high-difficulty problem variations, and active recall retention.",
    };
  }

  // 5. Early Prep Mode
  if (daysRemaining > 30) {
    return {
      mode: "EARLY_PREP",
      reason:
        "Substantial study runway available. Distributing curriculum evenly with deep dive units and spaced reinforcement cycles.",
    };
  }

  // 6. Normal Prep (Default)
  return {
    mode: "NORMAL_PREP",
    reason:
      "Balanced study cycle configured to systematically close identified capability gaps leading up to your target date.",
  };
}

export interface TopicPrioritizationInput {
  topicId: string;
  topicTitle: string;
  importance: "CORE" | "FOUNDATIONAL" | "ADVANCED";
  capabilityState: CapabilityClassification;
  currentCapability: number;
  targetCapability: number;
  capabilityGap: number;
}

export interface PrioritizedTopic extends TopicPrioritizationInput {
  priorityScore: number;
  priorityLevel: PlanItemPriority;
  recommendedActions: LearningActionType[];
  primaryReason: string;
}

/**
 * Deterministically ranks curriculum topics by learning priority.
 * Considers capability gap, topic importance, capability state, and difficulty.
 */
export function prioritizeTopics(topics: TopicPrioritizationInput[]): PrioritizedTopic[] {
  return topics
    .map((t) => {
      let score = 0;

      // 1. Capability Gap Weight (0 - 50 points)
      score += Math.min(50, Math.round(t.capabilityGap * 0.5));

      // 2. Importance Weight
      if (t.importance === "CORE") score += 30;
      else if (t.importance === "FOUNDATIONAL") score += 20;
      else if (t.importance === "ADVANCED") score += 10;

      // 3. State Weighting & Action Mapping
      let recommendedActions: LearningActionType[] = [];
      let primaryReason = "";

      switch (t.capabilityState) {
        case "MISUNDERSTOOD":
          score += 25; // Critical priority: unlearning and rebuilding
          recommendedActions = ["UNDERSTAND", "EXAMPLE", "GUIDED_PRACTICE", "INDEPENDENT_PRACTICE"];
          primaryReason = "Diagnostic revealed recurring conceptual misconceptions that require guided unlearning.";
          break;

        case "FALSE_CONFIDENCE":
          score += 22; // High priority blind spot
          recommendedActions = ["UNDERSTAND", "GUIDED_PRACTICE", "INDEPENDENT_PRACTICE", "RECALL"];
          primaryReason = "High self-reported confidence was contradicted by assessment results. Targeted practice scheduled to correct blind spots.";
          break;

        case "FORGOTTEN":
          score += 20;
          recommendedActions = ["RECALL", "EXPLAIN", "GUIDED_PRACTICE", "REVIEW"];
          primaryReason = "Topic was previously studied but shows retention decay. Active retrieval scheduled.";
          break;

        case "UNKNOWN":
          score += 18;
          recommendedActions = ["UNDERSTAND", "EXPLAIN", "EXAMPLE", "GUIDED_PRACTICE"];
          primaryReason = "Topic has low familiarity and requires step-by-step foundational instruction.";
          break;

        case "NOT_TESTED":
          score += 15;
          recommendedActions = ["UNDERSTAND", "GUIDED_PRACTICE", "APPLICATION"];
          primaryReason = "No assessment evidence recorded yet. Introductory review and practice scheduled.";
          break;

        case "KNOWN":
          score += 8;
          recommendedActions = ["GUIDED_PRACTICE", "INDEPENDENT_PRACTICE", "RECALL"];
          primaryReason = "Good conceptual grasp demonstrated. Practice scheduled to elevate to mastery.";
          break;

        case "STRONG":
          score += 2;
          recommendedActions = ["RECALL", "REVIEW"];
          primaryReason = "Strong verified capability. Periodic maintenance and active recall scheduled.";
          break;
      }

      // Assign human-readable priority tier
      let priorityLevel: PlanItemPriority = "MEDIUM";
      if (score >= 70) priorityLevel = "CRITICAL";
      else if (score >= 50) priorityLevel = "HIGH";
      else if (score >= 30) priorityLevel = "MEDIUM";
      else priorityLevel = "LOW";

      return {
        ...t,
        priorityScore: score,
        priorityLevel,
        recommendedActions,
        primaryReason,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Maps an action type to an appropriate time budget duration in minutes.
 */
export function getActionDurationMinutes(actionType: LearningActionType): number {
  switch (actionType) {
    case "UNDERSTAND":
      return 25;
    case "EXPLAIN":
      return 15;
    case "EXAMPLE":
      return 20;
    case "GUIDED_PRACTICE":
      return 25;
    case "INDEPENDENT_PRACTICE":
      return 20;
    case "RECALL":
      return 15;
    case "APPLICATION":
      return 20;
    case "REVIEW":
      return 15;
  }
}
