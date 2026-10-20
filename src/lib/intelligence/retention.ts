import type {
  RetentionStage,
  RetentionStatus,
  RetentionCheckStatus,
  PlanItemPriority,
  LearningActionType,
} from "@/types/database.types";

/**
 * Centralized, configurable retention classification thresholds.
 * Product heuristics designed to track evidence over time, not absolute scientific claims.
 */
export const RETENTION_CONFIG = {
  THRESHOLDS: {
    RETAINED_MIN_SCORE: 80,
    STABLE_MIN_SCORE: 70,
    DECLINING_MIN_SCORE: 50,
    MEANINGFUL_DELTA_DROP: -10, // Drop of 10 or more percentage points from baseline
    CRITICAL_DELTA_DROP: -20,  // Drop of 20 or more percentage points
    MIN_QUESTIONS_EVIDENCE: 2,
  },
  INTERVALS: {
    RETENTION_24H_HOURS: 24,
    RETENTION_7D_DAYS: 7,
    RETENTION_30D_DAYS: 30,
  },
} as const;

export interface RetentionClassificationResult {
  status: RetentionStatus;
  message: string;
  isDeclined: boolean;
  deltaPoints: number;
}

export interface ScheduledDates {
  scheduledAt: Date;
  availableAt: Date;
}

/**
 * Calculates deterministic future timestamps for a given retention stage.
 */
export function calculateScheduledDate(
  baseDate: Date | string,
  stage: RetentionStage
): ScheduledDates {
  const base = new Date(baseDate);
  const scheduled = new Date(base);

  switch (stage) {
    case "RETENTION_24H":
      scheduled.setTime(base.getTime() + RETENTION_CONFIG.INTERVALS.RETENTION_24H_HOURS * 60 * 60 * 1000);
      break;
    case "RETENTION_7D":
      scheduled.setTime(base.getTime() + RETENTION_CONFIG.INTERVALS.RETENTION_7D_DAYS * 24 * 60 * 60 * 1000);
      break;
    case "RETENTION_30D":
      scheduled.setTime(base.getTime() + RETENTION_CONFIG.INTERVALS.RETENTION_30D_DAYS * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    scheduledAt: scheduled,
    availableAt: scheduled, // Check becomes available as soon as scheduled time arrives
  };
}

/**
 * Evaluates whether a retention check is currently available to take.
 * Always evaluated against current server time, never trusting client timestamps.
 */
export function isRetentionCheckAvailable(
  scheduledAt: Date | string,
  serverNow: Date = new Date()
): boolean {
  const schedTime = new Date(scheduledAt).getTime();
  return serverNow.getTime() >= schedTime;
}

/**
 * Resolves the dynamic status of a retention check based on server time.
 */
export function resolveRetentionCheckStatus(
  currentStatus: RetentionCheckStatus,
  scheduledAt: Date | string,
  serverNow: Date = new Date()
): RetentionCheckStatus {
  if (currentStatus === "COMPLETED" || currentStatus === "SKIPPED") {
    return currentStatus;
  }

  if (isRetentionCheckAvailable(scheduledAt, serverNow)) {
    return "AVAILABLE";
  }

  return "SCHEDULED";
}

/**
 * Calculates score percentage for a set of marks.
 */
export function calculateRetentionScore(
  awardedMarks: number,
  totalMarks: number
): number {
  if (totalMarks <= 0) return 0;
  return Math.round((awardedMarks / totalMarks) * 100);
}

/**
 * Evaluates retention performance against post-learning baseline and determines product classification.
 * Grounded in honest product evidence without exaggerated scientific claims.
 */
export function classifyRetention(
  retentionScore: number,
  baselineScore: number,
  questionsAnswered: number = 2
): RetentionClassificationResult {
  const deltaPoints = retentionScore - baselineScore;

  // 1. Check for insufficient questions
  if (questionsAnswered < RETENTION_CONFIG.THRESHOLDS.MIN_QUESTIONS_EVIDENCE) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      message: "Insufficient responses recorded to reliably evaluate concept retention.",
      isDeclined: false,
      deltaPoints,
    };
  }

  // 2. NEEDS_REVIEW: Score < 50%
  if (retentionScore < RETENTION_CONFIG.THRESHOLDS.DECLINING_MIN_SCORE) {
    return {
      status: "NEEDS_REVIEW",
      message: "Your performance indicates that core concepts require targeted review and reinforcement.",
      isDeclined: true,
      deltaPoints,
    };
  }

  // 3. RETAINED: Score >= 80%
  if (retentionScore >= RETENTION_CONFIG.THRESHOLDS.RETAINED_MIN_SCORE) {
    return {
      status: "RETAINED",
      message:
        deltaPoints >= 0
          ? "Your performance remains strong on this retention check."
          : `Your performance remains high (${retentionScore}%), within a stable range of your baseline.`,
      isDeclined: false,
      deltaPoints,
    };
  }

  // 4. STABLE: Score >= 70% and not critically declining from high baseline
  if (
    retentionScore >= RETENTION_CONFIG.THRESHOLDS.STABLE_MIN_SCORE &&
    deltaPoints > RETENTION_CONFIG.THRESHOLDS.MEANINGFUL_DELTA_DROP
  ) {
    return {
      status: "STABLE",
      message: "Your performance is stable and meets expected retention benchmarks.",
      isDeclined: false,
      deltaPoints,
    };
  }

  // 5. DECLINING: Score >= 50% and below baseline by a meaningful amount
  return {
    status: "DECLINING",
    message: `Your performance has declined from your post-learning baseline of ${baselineScore}%. Spaced revision is recommended.`,
    isDeclined: true,
    deltaPoints,
  };
}

/**
 * Determines whether a retention outcome should trigger an automatic revision action.
 */
export function shouldTriggerRevision(
  status: RetentionStatus,
  deltaPoints: number
): boolean {
  return (
    status === "DECLINING" ||
    status === "NEEDS_REVIEW" ||
    deltaPoints <= RETENTION_CONFIG.THRESHOLDS.MEANINGFUL_DELTA_DROP
  );
}

/**
 * Derives appropriate action type and priority for revision based on performance severity.
 */
export function determineRevisionActionDetails(
  status: RetentionStatus,
  deltaPoints: number,
  topicTitle: string,
  stage: RetentionStage
): {
  actionType: LearningActionType;
  priority: PlanItemPriority;
  title: string;
  description: string;
  reason: string;
} {
  const stageLabel =
    stage === "RETENTION_24H"
      ? "24-hour"
      : stage === "RETENTION_7D"
      ? "7-day"
      : "30-day";

  if (status === "NEEDS_REVIEW" || deltaPoints <= RETENTION_CONFIG.THRESHOLDS.CRITICAL_DELTA_DROP) {
    return {
      actionType: "UNDERSTAND",
      priority: "CRITICAL",
      title: `Revision: Conceptual Review of ${topicTitle}`,
      description: `Targeted revision created following a ${Math.abs(deltaPoints)} percentage-point drop in ${stageLabel} retention.`,
      reason: `RETENTION_DECLINE: ${stageLabel} retention check scored critically below baseline (${deltaPoints} pts).`,
    };
  }

  return {
    actionType: "RECALL",
    priority: "HIGH",
    title: `Revision: Active Recall on ${topicTitle}`,
    description: `Retrieval reinforcement created to restore decayed memory pathways on ${topicTitle}.`,
    reason: `RETENTION_DECLINE: ${stageLabel} retention check showed concept decay (${deltaPoints} pts).`,
  };
}
