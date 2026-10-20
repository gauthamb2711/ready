import type {
  CapabilityClassification,
  ConfidenceLevel,
  PreparationLevel,
} from "@/types/database.types";
import type { TopicPerformance } from "./scoring";

export interface CapabilityClassificationInput {
  topicPerformance?: TopicPerformance;
  selfReportedConfidence?: ConfidenceLevel;
  priorPreparationLevel?: PreparationLevel;
}

export interface ClassifiedCapabilityResult {
  classification: CapabilityClassification;
  currentCapabilityScore: number;
  label: string;
  reason: string;
}

/**
 * Deterministic Current Capability Classifier.
 * Classifies a topic into one of the 7 states:
 * STRONG, KNOWN, UNKNOWN, FORGOTTEN, MISUNDERSTOOD, FALSE_CONFIDENCE, NOT_TESTED.
 *
 * IMPORTANT: These are product classifications, not permanent labels.
 * They are designed to update dynamically as new diagnostic evidence arrives.
 */
export function classifyTopicCapability(
  input: CapabilityClassificationInput
): ClassifiedCapabilityResult {
  const { topicPerformance, selfReportedConfidence, priorPreparationLevel } = input;

  // 1. NOT_TESTED: If no questions were tested for this topic
  if (!topicPerformance || topicPerformance.totalQuestions === 0) {
    return {
      classification: "NOT_TESTED",
      currentCapabilityScore: 0,
      label: "Not Tested",
      reason: "No diagnostic assessment items have been attempted for this topic yet.",
    };
  }

  const score = topicPerformance.scorePercentage;
  const isHighConfidence =
    selfReportedConfidence === "HIGH" || selfReportedConfidence === "VERY_HIGH";
  const hasPriorStudy =
    priorPreparationLevel === "COMPLETED" || priorPreparationLevel === "REVISED";

  // 2. FALSE_CONFIDENCE: High self-reported confidence, but significantly low diagnostic score (< 50%)
  if (isHighConfidence && score < 50) {
    return {
      classification: "FALSE_CONFIDENCE",
      currentCapabilityScore: score,
      label: "False Confidence",
      reason:
        "High self-reported confidence contradicts low diagnostic performance. Identified blindspots require fundamental review.",
    };
  }

  // 3. FORGOTTEN: Previously indicated completion or revision, but scored poorly (< 50%)
  if (hasPriorStudy && score < 50) {
    return {
      classification: "FORGOTTEN",
      currentCapabilityScore: score,
      label: "Forgotten",
      reason:
        "Prior preparation was indicated, but diagnostic retention has decayed. Spaced repetition review is recommended.",
    };
  }

  // 4. STRONG: High diagnostic performance (>= 80%) with solid accuracy
  if (score >= 80) {
    return {
      classification: "STRONG",
      currentCapabilityScore: score,
      label: "Strong Mastery",
      reason:
        "Consistent high accuracy across tested questions. Demonstrates solid concept retention and problem-solving.",
    };
  }

  // 5. KNOWN: Moderate/good performance (60% to 79%)
  if (score >= 60) {
    return {
      classification: "KNOWN",
      currentCapabilityScore: score,
      label: "Known",
      reason:
        "Sound foundational understanding, but minor precision gaps prevent classification as Strong.",
    };
  }

  // 6. MISUNDERSTOOD: Partial accuracy (30% to 59%) with wrong responses on core items
  if (score >= 30) {
    return {
      classification: "MISUNDERSTOOD",
      currentCapabilityScore: score,
      label: "Misunderstood",
      reason:
        "Attempted questions reveal conceptual confusion on underlying principles rather than lack of exposure.",
    };
  }

  // 7. UNKNOWN: Low score (< 30%) with low/medium confidence
  return {
    classification: "UNKNOWN",
    currentCapabilityScore: score,
    label: "Unknown / Low Exposure",
    reason:
      "Diagnostic evidence indicates significant concept deficits requiring structured step-by-step introduction.",
  };
}
