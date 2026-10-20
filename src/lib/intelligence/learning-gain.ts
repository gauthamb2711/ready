import type {
  CapabilityClassification,
  LearningGainCategory,
} from "@/types/database.types";

export interface LearningGainCalculationResult {
  preScore: number;
  postScore: number;
  gainPoints: number;
  category: LearningGainCategory;
  categoryReason: string;
  isPositiveGain: boolean;
}

export interface CapabilityTransitionResult {
  nextState: CapabilityClassification;
  transitionReason: string;
  isImprovedState: boolean;
}

/**
 * Deterministic Learning Gain Calculator.
 * Calculates percentage-point difference: Post-score - Pre-score.
 * Classifies gain into verified pedagogical categories without making exaggerated mastery claims.
 */
export function calculateLearningGain(
  preScore: number,
  postScore: number,
  preQuestions: number = 2,
  postQuestions: number = 2
): LearningGainCalculationResult {
  const boundedPre = Math.max(0, Math.min(100, Math.round(preScore)));
  const boundedPost = Math.max(0, Math.min(100, Math.round(postScore)));
  const gainPoints = boundedPost - boundedPre;

  // Insufficient evidence condition: insufficient question coverage or negative decline
  if (preQuestions < 1 || postQuestions < 1) {
    return {
      preScore: boundedPre,
      postScore: boundedPost,
      gainPoints,
      category: "INSUFFICIENT_EVIDENCE",
      categoryReason:
        "Assessment sample was too small to reliably establish capability change.",
      isPositiveGain: gainPoints > 0,
    };
  }

  if (gainPoints < -5) {
    return {
      preScore: boundedPre,
      postScore: boundedPost,
      gainPoints,
      category: "INSUFFICIENT_EVIDENCE",
      categoryReason:
        "Post-learning verification score was lower than baseline. Identified concept conflicts require re-evaluation.",
      isPositiveGain: false,
    };
  }

  // GAINED: Substantial positive jump (>= +25 or >= +15 with high absolute post-score >= 80)
  if (gainPoints >= 25 || (gainPoints >= 15 && boundedPost >= 80)) {
    return {
      preScore: boundedPre,
      postScore: boundedPost,
      gainPoints,
      category: "GAINED",
      categoryReason: `Demonstrated substantial improvement in post-learning verification compared to pre-learning baseline (+${gainPoints} percentage points).`,
      isPositiveGain: true,
    };
  }

  // IMPROVED: Noticeable positive progression (+10 to +24 points)
  if (gainPoints >= 10) {
    return {
      preScore: boundedPre,
      postScore: boundedPost,
      gainPoints,
      category: "IMPROVED",
      categoryReason: `Your post-learning performance was higher than your baseline (+${gainPoints} percentage points).`,
      isPositiveGain: true,
    };
  }

  // STABLE: Consistent performance (-5 to +9 points)
  return {
    preScore: boundedPre,
    postScore: boundedPost,
    gainPoints,
    category: "STABLE",
    categoryReason:
      gainPoints > 0
        ? `Slight positive progression (+${gainPoints} percentage points). Further guided reinforcement recommended.`
        : "Post-learning performance remained consistent with baseline. Reinforcement and review recommended.",
    isPositiveGain: gainPoints > 0,
  };
}

/**
 * Deterministically updates capability classification based on new post-learning evidence.
 * Preserves diagnostic history while updating current operational capability.
 */
export function determineCapabilityTransition(
  previousState: CapabilityClassification,
  preScore: number,
  postScore: number,
  gainPoints: number
): CapabilityTransitionResult {
  // If post score is exceptionally high (>= 85%) and gain was positive
  if (postScore >= 85 && gainPoints >= 15) {
    return {
      nextState: "STRONG",
      transitionReason: `Post-learning verification demonstrated strong capability (${postScore}%, +${gainPoints} gain). Core concepts are well understood.`,
      isImprovedState: previousState !== "STRONG",
    };
  }

  // If post score meets solid proficiency (>= 60%)
  if (postScore >= 60) {
    return {
      nextState: "KNOWN",
      transitionReason: `Verified positive learning gain (+${gainPoints} points, ${postScore}% post-score). Transitioned from ${previousState} to KNOWN.`,
      isImprovedState: previousState !== "KNOWN" && previousState !== "STRONG",
    };
  }

  // If student previously had FALSE_CONFIDENCE and now post-score is still low
  if (previousState === "FALSE_CONFIDENCE" && postScore < 60) {
    return {
      nextState: "MISUNDERSTOOD",
      transitionReason:
        "Assessment confirmed underlying conceptual gaps; transitioned from False Confidence to targeted Misunderstood remediation.",
      isImprovedState: false,
    };
  }

  // If student still struggles (< 60%)
  return {
    nextState: previousState === "NOT_TESTED" ? "MISUNDERSTOOD" : previousState,
    transitionReason: `Post-learning score (${postScore}%) remains below threshold. Capability state maintained for focused review.`,
    isImprovedState: false,
  };
}
