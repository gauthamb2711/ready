import type {
  ReadinessStatus,
  ReadinessComponentType,
  ReadinessEvidenceStatus,
  TopicPerformanceStatus,
} from "@/types/database.types";

export interface ReadinessComponentInput {
  type: ReadinessComponentType;
  baseWeight: number;
  score: number | null;
  evidenceStatus: ReadinessEvidenceStatus;
  explanation: string;
  metadata?: Record<string, unknown>;
}

export interface CalculatedComponentResult {
  componentType: ReadinessComponentType;
  score: number | null;
  weight: number;
  effectiveWeight: number;
  evidenceStatus: ReadinessEvidenceStatus;
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface ReadinessCalculationResult {
  score: number;
  status: ReadinessStatus;
  calculatedAt: string;
  evidenceVersion: string;
  components: CalculatedComponentResult[];
  activeComponentCount: number;
  hasSufficientEvidence: boolean;
  explanation: string;
}

export interface TopicEvidenceRecord {
  topicId: string;
  topicTitle: string;
  importance: "CORE" | "ELECTIVE" | "SUPPORTING" | "HIGH" | "MEDIUM" | "LOW" | string;
  diagnosticScore?: number | null;
  learningGainScore?: number | null;
  retentionScore?: number | null;
  mockScore?: number | null;
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface AnalyzedTopicReadiness {
  topicId: string;
  topicTitle: string;
  importance: string;
  compositeScore: number | null;
  status: TopicPerformanceStatus;
  questionsAttempted: number;
  questionsCorrect: number;
  evidenceSummary: string;
  isCriticalWeak: boolean;
}

export interface ReadinessActionRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  actionType: "REVIEW_TOPIC" | "PRACTICE_RETENTION" | "TAKE_MOCK" | "EXPAND_COVERAGE" | "FINAL_PREP";
  targetTopicId?: string;
  targetTopicTitle?: string;
}

export const BASE_READINESS_WEIGHTS: Record<ReadinessComponentType, number> = {
  MASTERY: 0.30,
  LEARNING_GAIN: 0.10,
  RETENTION: 0.20,
  COVERAGE: 0.15,
  MOCK_PERFORMANCE: 0.20,
  TIME_READINESS: 0.05,
};

/**
 * Classifies an overall 0-100 readiness score into one of the 5 defined product states.
 * Note: Never promises guaranteed exam success; these represent product readiness states.
 */
export function classifyReadinessScore(score: number): ReadinessStatus {
  const rounded = Math.round(score);
  if (rounded >= 90) return "HIGHLY_READY";
  if (rounded >= 75) return "READY";
  if (rounded >= 60) return "DEVELOPING";
  if (rounded >= 40) return "NEEDS_WORK";
  return "NOT_READY";
}

/**
 * Normalizes component weights and calculates the deterministic readiness score.
 * If a component has INSUFFICIENT evidence, its weight is not treated as zero score;
 * instead, weights are normalized across available evidence.
 */
export function calculateWeightedReadiness(
  componentInputs: ReadinessComponentInput[]
): ReadinessCalculationResult {
  const activeComponents = componentInputs.filter(
    (c) => c.evidenceStatus !== "INSUFFICIENT" && c.score !== null && !isNaN(c.score)
  );

  const sumActiveBaseWeights = activeComponents.reduce((acc, c) => acc + c.baseWeight, 0);

  const calculatedComponents: CalculatedComponentResult[] = componentInputs.map((comp) => {
    const isAvailable = comp.evidenceStatus !== "INSUFFICIENT" && comp.score !== null && !isNaN(comp.score);
    let effectiveWeight = 0;
    if (isAvailable && sumActiveBaseWeights > 0) {
      effectiveWeight = Number((comp.baseWeight / sumActiveBaseWeights).toFixed(4));
    }

    return {
      componentType: comp.type,
      score: comp.score !== null ? Math.max(0, Math.min(100, Math.round(comp.score))) : null,
      weight: comp.baseWeight,
      effectiveWeight,
      evidenceStatus: comp.evidenceStatus,
      explanation: comp.explanation,
      metadata: comp.metadata || {},
    };
  });

  if (activeComponents.length === 0 || sumActiveBaseWeights === 0) {
    return {
      score: 0,
      status: "NOT_READY",
      calculatedAt: new Date().toISOString(),
      evidenceVersion: "v1.0",
      components: calculatedComponents,
      activeComponentCount: 0,
      hasSufficientEvidence: false,
      explanation: "Insufficient evidence across all readiness dimensions. Complete diagnostic intake, learning actions, or mock exams to generate an evidence-based score.",
    };
  }

  // Adjust possible rounding inaccuracies in sum of effective weights
  const weightedScoreSum = calculatedComponents.reduce((acc, comp) => {
    if (comp.score !== null && comp.effectiveWeight > 0) {
      return acc + comp.score * comp.effectiveWeight;
    }
    return acc;
  }, 0);

  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScoreSum)));
  const status = classifyReadinessScore(finalScore);

  // Generate deterministic explanation summary
  const summaryParts: string[] = [];
  const sufficientCount = componentInputs.filter((c) => c.evidenceStatus === "SUFFICIENT").length;
  const limitedCount = componentInputs.filter((c) => c.evidenceStatus === "LIMITED").length;
  const insufficientCount = componentInputs.filter((c) => c.evidenceStatus === "INSUFFICIENT").length;

  summaryParts.push(
    `Readiness calculated at ${finalScore}/100 (${status.replace("_", " ")}). Normalized across ${activeComponents.length} active dimensions (${sufficientCount} sufficient, ${limitedCount} limited, ${insufficientCount} unavailable).`
  );

  return {
    score: finalScore,
    status,
    calculatedAt: new Date().toISOString(),
    evidenceVersion: "v1.0",
    components: calculatedComponents,
    activeComponentCount: activeComponents.length,
    hasSufficientEvidence: sufficientCount >= 3,
    explanation: summaryParts.join(" "),
  };
}

/**
 * Calculates Time Readiness score based on exam date proximity and capability gap.
 */
export function calculateTimeReadiness(
  daysRemaining: number | null,
  capabilityGap: number
): { score: number; evidenceStatus: ReadinessEvidenceStatus; explanation: string } {
  if (daysRemaining === null || isNaN(daysRemaining)) {
    return {
      score: 70,
      evidenceStatus: "LIMITED",
      explanation: "No exam date configured. Standard baseline time readiness assumed (70%).",
    };
  }

  const safeDays = Math.max(0, daysRemaining);
  const gap = Math.max(0, Math.min(100, capabilityGap));

  if (safeDays === 0 && gap > 15) {
    return {
      score: 25,
      evidenceStatus: "SUFFICIENT",
      explanation: `Exam is today/imminent with a remaining capability gap of ${gap}%. High time pressure.`,
    };
  }

  if (gap <= 5) {
    return {
      score: 95,
      evidenceStatus: "SUFFICIENT",
      explanation: `Target capability is almost met (gap: ${gap}%), with ${safeDays} days remaining.`,
    };
  }

  // Pace ratio: days available vs points needed to close
  // Ideal ratio: at least 0.5 days per gap point
  const daysPerGapPoint = safeDays / Math.max(1, gap);
  let timeScore: number;

  if (daysPerGapPoint >= 1.0) {
    timeScore = 90;
  } else if (daysPerGapPoint >= 0.5) {
    timeScore = 75;
  } else if (daysPerGapPoint >= 0.25) {
    timeScore = 55;
  } else {
    timeScore = 35;
  }

  const status: ReadinessEvidenceStatus = "SUFFICIENT";
  const explanation = `${safeDays} days remaining to close a ${gap}% capability gap (${daysPerGapPoint.toFixed(1)} days/point).`;

  return {
    score: Math.round(timeScore),
    evidenceStatus: status,
    explanation,
  };
}

/**
 * Analyzes topic performance across all available learning and testing evidence.
 * Categorizes each topic as STRONG (80-100%), NEEDS_PRACTICE (60-79%), WEAK (0-59%),
 * or NOT_ENOUGH_EVIDENCE / NOT_YET_VERIFIED.
 * High-importance topics with low performance are flagged as CRITICAL_WEAK.
 */
export function analyzeTopicReadiness(topics: TopicEvidenceRecord[]): AnalyzedTopicReadiness[] {
  return topics.map((t) => {
    const isCore = t.importance === "CORE" || t.importance === "HIGH";

    if (t.questionsAttempted === 0) {
      return {
        topicId: t.topicId,
        topicTitle: t.topicTitle,
        importance: t.importance,
        compositeScore: null,
        status: "NOT_YET_VERIFIED",
        questionsAttempted: 0,
        questionsCorrect: 0,
        evidenceSummary: "No questions attempted or verified for this topic yet.",
        isCriticalWeak: false,
      };
    }

    if (t.questionsAttempted < 2) {
      const singleScore = Math.round((t.questionsCorrect / t.questionsAttempted) * 100);
      return {
        topicId: t.topicId,
        topicTitle: t.topicTitle,
        importance: t.importance,
        compositeScore: singleScore,
        status: "NOT_ENOUGH_EVIDENCE",
        questionsAttempted: t.questionsAttempted,
        questionsCorrect: t.questionsCorrect,
        evidenceSummary: `Only 1 question attempted (${singleScore}%). Needs at least 2 questions for verified classification.`,
        isCriticalWeak: false,
      };
    }

    // Blend available signals: Mock: 40%, Retention: 30%, Learning Gain: 20%, Diagnostic: 10%
    const signals: Array<{ weight: number; val: number }> = [];
    if (t.mockScore !== undefined && t.mockScore !== null) signals.push({ weight: 0.40, val: t.mockScore });
    if (t.retentionScore !== undefined && t.retentionScore !== null) signals.push({ weight: 0.30, val: t.retentionScore });
    if (t.learningGainScore !== undefined && t.learningGainScore !== null) signals.push({ weight: 0.20, val: t.learningGainScore });
    if (t.diagnosticScore !== undefined && t.diagnosticScore !== null) signals.push({ weight: 0.10, val: t.diagnosticScore });

    let compositeScore: number;
    if (signals.length > 0) {
      const sumW = signals.reduce((a, s) => a + s.weight, 0);
      compositeScore = Math.round(signals.reduce((a, s) => a + s.val * (s.weight / sumW), 0));
    } else {
      compositeScore = Math.round((t.questionsCorrect / t.questionsAttempted) * 100);
    }

    let status: TopicPerformanceStatus;
    if (compositeScore >= 80) {
      status = "STRONG";
    } else if (compositeScore >= 60) {
      status = "NEEDS_PRACTICE";
    } else {
      status = "WEAK";
    }

    const isCriticalWeak = isCore && (status === "WEAK" || compositeScore < 60);
    if (isCriticalWeak) {
      status = "CRITICAL_WEAK";
    }

    return {
      topicId: t.topicId,
      topicTitle: t.topicTitle,
      importance: t.importance,
      compositeScore,
      status,
      questionsAttempted: t.questionsAttempted,
      questionsCorrect: t.questionsCorrect,
      evidenceSummary: `${t.questionsCorrect}/${t.questionsAttempted} correct (${compositeScore}% composite across available evidence).`,
      isCriticalWeak,
    };
  });
}

/**
 * Generates deterministic action recommendations based on readiness components and topic analysis.
 */
export function generateReadinessRecommendations(params: {
  readinessScore: number;
  readinessStatus: ReadinessStatus;
  components: CalculatedComponentResult[];
  analyzedTopics: AnalyzedTopicReadiness[];
  daysRemaining: number | null;
}): ReadinessActionRecommendation[] {
  const recommendations: ReadinessActionRecommendation[] = [];

  const criticalWeakTopics = params.analyzedTopics.filter((t) => t.isCriticalWeak);
  const regularWeakTopics = params.analyzedTopics.filter((t) => t.status === "WEAK");
  const retentionComp = params.components.find((c) => c.componentType === "RETENTION");
  const mockComp = params.components.find((c) => c.componentType === "MOCK_PERFORMANCE");
  const coverageComp = params.components.find((c) => c.componentType === "COVERAGE");

  // Rule 1: Critical weak core topics must be addressed first
  for (const crit of criticalWeakTopics.slice(0, 2)) {
    recommendations.push({
      id: `rec-crit-${crit.topicId}`,
      title: `Review High-Priority Topic: ${crit.topicTitle}`,
      description: `This is a core curriculum topic currently scoring ${crit.compositeScore ?? 0}%. Targeted conceptual review and guided practice are strongly recommended.`,
      priority: "HIGH",
      actionType: "REVIEW_TOPIC",
      targetTopicId: crit.topicId,
      targetTopicTitle: crit.topicTitle,
    });
  }

  // Rule 2: Retention declining or low retention
  if (retentionComp && retentionComp.score !== null && retentionComp.score < 70) {
    recommendations.push({
      id: "rec-retention-declining",
      title: "Complete Spaced Retrieval Checks",
      description: `Retention score is ${retentionComp.score}%. Active retrieval prevents memory decay before exam day.`,
      priority: "HIGH",
      actionType: "PRACTICE_RETENTION",
    });
  }

  // Rule 3: Mock exam not taken or low performance
  if (!mockComp || mockComp.evidenceStatus === "INSUFFICIENT") {
    recommendations.push({
      id: "rec-take-mock-init",
      title: "Take a Full-Length Mock Exam",
      description: "You have not completed any mock exam under timed conditions. Complete a mock exam to benchmark your exam stamina and pacing.",
      priority: "HIGH",
      actionType: "TAKE_MOCK",
    });
  } else if (mockComp.score !== null && mockComp.score < 65) {
    recommendations.push({
      id: "rec-retake-mock",
      title: "Take Targeted Practice & Retake Mock",
      description: `Recent mock performance was ${mockComp.score}%. Focus on missed questions and retake a simulation to verify improvement.`,
      priority: "MEDIUM",
      actionType: "TAKE_MOCK",
    });
  }

  // Rule 4: Low syllabus coverage
  if (coverageComp && coverageComp.score !== null && coverageComp.score < 60) {
    recommendations.push({
      id: "rec-expand-coverage",
      title: "Complete Uncovered High-Yield Topics",
      description: `Current syllabus coverage is ${coverageComp.score}%. Work through remaining planned topics to avoid unaddressed exam content.`,
      priority: "MEDIUM",
      actionType: "EXPAND_COVERAGE",
    });
  }

  // Rule 5: Regular weak topics if under limit
  if (recommendations.length < 3) {
    for (const weak of regularWeakTopics.slice(0, 3 - recommendations.length)) {
      recommendations.push({
        id: `rec-weak-${weak.topicId}`,
        title: `Practice Concepts: ${weak.topicTitle}`,
        description: `Performance on ${weak.topicTitle} is currently ${weak.compositeScore ?? 0}%. Targeted micro-learning sessions will help close this gap.`,
        priority: "MEDIUM",
        actionType: "REVIEW_TOPIC",
        targetTopicId: weak.topicId,
        targetTopicTitle: weak.topicTitle,
      });
    }
  }

  // Rule 6: Proximity to exam
  if (params.daysRemaining !== null && params.daysRemaining <= 7 && params.daysRemaining >= 0) {
    recommendations.unshift({
      id: "rec-urgent-exam-prep",
      title: "Final Countdown: Focus on Core High-Yield Topics",
      description: `Exam is in ${params.daysRemaining} days. Prioritize high-weight core topics and avoid introducing unfamiliar elective concepts.`,
      priority: "HIGH",
      actionType: "FINAL_PREP",
    });
  }

  // Rule 7: High readiness maintenance
  if (params.readinessScore >= 90) {
    recommendations.push({
      id: "rec-maintain-readiness",
      title: "Maintain Spaced Retrieval & Take Final Warm-Up Mock",
      description: "Demonstrated readiness is strong (90+). Maintain memory stability with light spaced retrieval until your exam.",
      priority: "LOW",
      actionType: "FINAL_PREP",
    });
  }

  return recommendations.slice(0, 5);
}
