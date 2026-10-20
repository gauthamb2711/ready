import type { ExamTiming } from "@/types/database.types";

export interface CapabilityGapSummary {
  currentCapability: number;
  targetCapability: number;
  capabilityGap: number;
  gapLevel: "NONE" | "MODERATE" | "HIGH" | "CRITICAL";
  recommendation: string;
}

/**
 * Parses user target score into a numeric capability target (0-100).
 */
export function resolveTargetScoreNumber(targetScoreStr: string): number {
  const normalized = (targetScoreStr || "85").toUpperCase().trim();
  if (normalized === "PASS") return 55;
  const parsed = parseInt(normalized, 10);
  if (!isNaN(parsed) && parsed >= 10 && parsed <= 100) {
    return parsed;
  }
  return 85; // Default standard target capability
}

/**
 * Calculates Target Capability based on target score, exam timing, and topic importance.
 */
export function calculateTargetCapability(
  targetScoreStr: string,
  examTiming?: ExamTiming,
  topicImportance?: "CORE" | "FOUNDATIONAL" | "ADVANCED"
): number {
  const baseTarget = resolveTargetScoreNumber(targetScoreStr);

  let modifier = 1.0;
  if (topicImportance === "CORE") {
    modifier = 1.05; // Core concepts demand slightly higher mastery
  } else if (topicImportance === "ADVANCED") {
    modifier = 0.95;
  }

  // Urgent exam deadlines (e.g. TOMORROW) compress realistic target
  if (examTiming === "TOMORROW" || examTiming === "WITHIN_3_DAYS") {
    modifier *= 0.9;
  }

  const finalTarget = Math.min(100, Math.max(40, Math.round(baseTarget * modifier)));
  return finalTarget;
}

/**
 * Calculates Capability Gap:
 * TARGET CAPABILITY - CURRENT CAPABILITY = CAPABILITY GAP
 */
export function calculateCapabilityGap(
  targetCapability: number,
  currentCapability: number
): CapabilityGapSummary {
  const current = Math.max(0, Math.min(100, Math.round(currentCapability)));
  const target = Math.max(0, Math.min(100, Math.round(targetCapability)));
  const gap = Math.max(0, target - current);

  let gapLevel: "NONE" | "MODERATE" | "HIGH" | "CRITICAL" = "NONE";
  let recommendation = "Target capability verified. Focus on spaced retention practice.";

  if (gap === 0) {
    gapLevel = "NONE";
    recommendation = "Target capability verified. Focus on spaced retention practice.";
  } else if (gap <= 15) {
    gapLevel = "MODERATE";
    recommendation = "Small deficit identified. Minor targeted review will bridge the gap.";
  } else if (gap <= 35) {
    gapLevel = "HIGH";
    recommendation = "Substantial capability gap. Follow structured micro-learning plans.";
  } else {
    gapLevel = "CRITICAL";
    recommendation = "Critical capability gap. Immediate foundational action required.";
  }

  return {
    currentCapability: current,
    targetCapability: target,
    capabilityGap: gap,
    gapLevel,
    recommendation,
  };
}
