import { createClient } from "@/lib/supabase/server";
import type {
  ReadinessAssessment,
  ReadinessComponent,
  ReadinessStatus,
  ReadinessComponentType,
  ReadinessEvidenceStatus,
  StudentSubject,
  CurriculumTopic,
  TopicCapabilityState,
  LearningGainRecord,
  RetentionCheck,
  MockExamAttempt,
} from "@/types/database.types";
import {
  BASE_READINESS_WEIGHTS,
  calculateWeightedReadiness,
  calculateTimeReadiness,
  analyzeTopicReadiness,
  generateReadinessRecommendations,
  ReadinessComponentInput,
  TopicEvidenceRecord,
  AnalyzedTopicReadiness,
  ReadinessActionRecommendation,
  CalculatedComponentResult,
} from "@/lib/intelligence/readiness";

export interface ReadinessDashboardData {
  assessment: ReadinessAssessment;
  components: ReadinessComponent[];
  subject: StudentSubject;
  allSubjects: StudentSubject[];
  daysRemaining: number | null;
  analyzedTopics: AnalyzedTopicReadiness[];
  strongTopics: AnalyzedTopicReadiness[];
  weakTopics: AnalyzedTopicReadiness[];
  criticalWeakTopics: AnalyzedTopicReadiness[];
  unverifiedTopics: AnalyzedTopicReadiness[];
  recommendations: ReadinessActionRecommendation[];
  history: Array<{
    id: string;
    score: number;
    status: ReadinessStatus;
    calculatedAt: string;
    source: string;
  }>;
}

export class ReadinessService {
  /**
   * Recalculates and persists a new historical readiness assessment record for a student subject.
   * Every call preserves historical evidence and never overwrites previous records.
   */
  static async calculateAndSaveReadiness(
    userId: string,
    subjectId: string,
    triggerSource = "SYSTEM"
  ): Promise<{ assessment: ReadinessAssessment; components: ReadinessComponent[] }> {
    const supabase = await createClient();

    // 1. Fetch student subject and verify ownership
    const { data: subject, error: subErr } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("id", subjectId)
      .eq("user_id", userId)
      .single();

    if (subErr || !subject) {
      throw new Error("Student subject not found or access denied.");
    }

    // 2. Fetch curriculum topics
    const { data: topics } = await (supabase.from("curriculum_topics") as any)
      .select("*")
      .eq("subject_id", subjectId);

    const topicList: CurriculumTopic[] = topics || [];

    // 3. Fetch topic capability states
    const { data: capStates } = await (supabase.from("topic_capability_states") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);

    const capabilityStates: TopicCapabilityState[] = capStates || [];

    // 4. Fetch learning gain records
    const { data: gains } = await (supabase.from("learning_gain_records") as any)
      .select("*")
      .eq("user_id", userId);

    const gainRecords: LearningGainRecord[] = gains || [];

    // 5. Fetch retention checks
    const { data: retentions } = await (supabase.from("retention_checks") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("status", "COMPLETED");

    const completedRetentions: RetentionCheck[] = retentions || [];

    // 6. Fetch completed mock exam attempts for this subject
    const { data: mockExams } = await (supabase.from("mock_exams") as any)
      .select("id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);

    const mockExamIds: string[] = (mockExams || []).map((m: any) => m.id);

    let completedMockAttempts: MockExamAttempt[] = [];
    if (mockExamIds.length > 0) {
      const { data: attempts } = await (supabase.from("mock_exam_attempts") as any)
        .select("*")
        .eq("user_id", userId)
        .in("mock_exam_id", mockExamIds)
        .in("status", ["SUBMITTED", "EXPIRED"]);

      completedMockAttempts = attempts || [];
    }

    // 7. Calculate days remaining
    let daysRemaining: number | null = null;
    if (subject.exam_date) {
      const examDate = new Date(subject.exam_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      daysRemaining = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // 8. Dimension A: MASTERY (base weight 0.30)
    let masteryScore: number | null = null;
    let masteryStatus: ReadinessEvidenceStatus = "INSUFFICIENT";
    let masteryExplanation = "No topic capability assessments completed yet.";

    if (capabilityStates.length > 0) {
      let totalWeightedScore = 0;
      let totalWeight = 0;
      capabilityStates.forEach((cs) => {
        const topic = topicList.find((t) => t.id === cs.topic_id);
        const isCore = topic?.importance === "CORE" || (topic?.importance as string) === "HIGH";
        const weight = isCore ? 1.5 : 1.0;
        totalWeightedScore += Number(cs.current_capability_score || 0) * weight;
        totalWeight += weight;
      });

      masteryScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
      masteryStatus = capabilityStates.length >= Math.max(2, topicList.length * 0.5) ? "SUFFICIENT" : "LIMITED";
      masteryExplanation = `Demonstrated capability across ${capabilityStates.length} assessed topics (weighted average: ${masteryScore}%).`;
    }

    // 9. Dimension B: LEARNING_GAIN (base weight 0.10)
    let gainScore: number | null = null;
    let gainStatus: ReadinessEvidenceStatus = "INSUFFICIENT";
    let gainExplanation = "No post-learning verification records recorded yet.";

    if (gainRecords.length > 0) {
      const avgPostScore =
        gainRecords.reduce((sum, g) => sum + Number(g.post_score || 0), 0) / gainRecords.length;
      const avgGain =
        gainRecords.reduce((sum, g) => sum + Number(g.gain_points || 0), 0) / gainRecords.length;

      gainScore = Math.max(0, Math.min(100, Math.round(avgPostScore)));
      gainStatus = gainRecords.length >= 3 ? "SUFFICIENT" : "LIMITED";
      gainExplanation = `Average post-learning score is ${gainScore}% across ${gainRecords.length} micro-learning actions (average gain: +${avgGain.toFixed(1)} pts).`;
    }

    // 10. Dimension C: RETENTION (base weight 0.20)
    let retentionScore: number | null = null;
    let retentionStatus: ReadinessEvidenceStatus = "INSUFFICIENT";
    let retentionExplanation = "No spaced retention retrieval checks completed yet.";

    if (completedRetentions.length > 0) {
      const avgRetention =
        completedRetentions.reduce((sum, r) => sum + Number(r.retention_percentage || 0), 0) /
        completedRetentions.length;

      retentionScore = Math.max(0, Math.min(100, Math.round(avgRetention)));
      retentionStatus = completedRetentions.length >= 2 ? "SUFFICIENT" : "LIMITED";
      retentionExplanation = `Average spaced retrieval score is ${retentionScore}% across ${completedRetentions.length} completed checks.`;
    }

    // 11. Dimension D: COVERAGE (base weight 0.15)
    let coverageScore: number | null = null;
    let coverageStatus: ReadinessEvidenceStatus = "INSUFFICIENT";
    let coverageExplanation = "No curriculum syllabus topics configured.";

    if (topicList.length > 0) {
      const assessedTopicIds = new Set(capabilityStates.map((cs) => cs.topic_id));
      const coveredCount = topicList.filter((t) => assessedTopicIds.has(t.id)).length;
      coverageScore = Math.round((coveredCount / topicList.length) * 100);
      coverageStatus = "SUFFICIENT";
      coverageExplanation = `${coveredCount} of ${topicList.length} syllabus topics have verified assessment evidence (${coverageScore}%).`;
    }

    // 12. Dimension E: MOCK_PERFORMANCE (base weight 0.20)
    let mockScore: number | null = null;
    let mockStatus: ReadinessEvidenceStatus = "INSUFFICIENT";
    let mockExplanation = "No full mock exams completed under timed conditions.";

    if (completedMockAttempts.length > 0) {
      // Latest attempt has higher weighting (60%) if multiple, or straight average
      const sortedAttempts = [...completedMockAttempts].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      const latestAttempt = sortedAttempts[0];
      const avgPct =
        completedMockAttempts.reduce((sum, m) => sum + Number(m.percentage || 0), 0) /
        completedMockAttempts.length;

      const blended = Math.round(Number(latestAttempt.percentage) * 0.6 + avgPct * 0.4);
      mockScore = Math.max(0, Math.min(100, blended));
      mockStatus = completedMockAttempts.length >= 2 ? "SUFFICIENT" : "LIMITED";
      mockExplanation = `Mock exam simulation performance: ${mockScore}% (Latest: ${latestAttempt.percentage}%, Avg across ${completedMockAttempts.length} mocks: ${Math.round(avgPct)}%).`;
    }

    // 13. Dimension F: TIME_READINESS (base weight 0.05)
    const timeResult = calculateTimeReadiness(
      daysRemaining,
      Number(subject.capability_gap || 0)
    );

    // 14. Compile component inputs for weighted calculation
    const componentInputs: ReadinessComponentInput[] = [
      {
        type: "MASTERY",
        baseWeight: BASE_READINESS_WEIGHTS.MASTERY,
        score: masteryScore,
        evidenceStatus: masteryStatus,
        explanation: masteryExplanation,
      },
      {
        type: "LEARNING_GAIN",
        baseWeight: BASE_READINESS_WEIGHTS.LEARNING_GAIN,
        score: gainScore,
        evidenceStatus: gainStatus,
        explanation: gainExplanation,
      },
      {
        type: "RETENTION",
        baseWeight: BASE_READINESS_WEIGHTS.RETENTION,
        score: retentionScore,
        evidenceStatus: retentionStatus,
        explanation: retentionExplanation,
      },
      {
        type: "COVERAGE",
        baseWeight: BASE_READINESS_WEIGHTS.COVERAGE,
        score: coverageScore,
        evidenceStatus: coverageStatus,
        explanation: coverageExplanation,
      },
      {
        type: "MOCK_PERFORMANCE",
        baseWeight: BASE_READINESS_WEIGHTS.MOCK_PERFORMANCE,
        score: mockScore,
        evidenceStatus: mockStatus,
        explanation: mockExplanation,
      },
      {
        type: "TIME_READINESS",
        baseWeight: BASE_READINESS_WEIGHTS.TIME_READINESS,
        score: timeResult.score,
        evidenceStatus: timeResult.evidenceStatus,
        explanation: timeResult.explanation,
      },
    ];

    // 15. Execute weighted calculation with dynamic normalization
    const calculation = calculateWeightedReadiness(componentInputs);

    // 16. Persist assessment row
    const { data: newAssessment, error: assessErr } = await (
      supabase.from("readiness_assessments") as any
    )
      .insert({
        user_id: userId,
        subject_id: subjectId,
        score: calculation.score,
        status: calculation.status,
        calculated_at: calculation.calculatedAt,
        evidence_version: calculation.evidenceVersion,
        exam_date: subject.exam_date || null,
        days_remaining: daysRemaining,
        current_capability: Number(subject.current_capability_score || 0),
        target_capability: Number(subject.target_capability_score || 85),
        capability_gap: Number(subject.capability_gap || 0),
        summary: {
          triggerSource,
          activeDimensions: calculation.activeComponentCount,
          explanation: calculation.explanation,
        },
      })
      .select("*")
      .single();

    if (assessErr || !newAssessment) {
      throw new Error(`Failed to save readiness assessment: ${assessErr?.message || "Unknown error"}`);
    }

    // 17. Persist component breakdown records
    const componentsToInsert = calculation.components.map((c) => ({
      readiness_assessment_id: newAssessment.id,
      user_id: userId,
      component_type: c.componentType,
      score: c.score,
      weight: c.weight,
      effective_weight: c.effectiveWeight,
      evidence_status: c.evidenceStatus,
      explanation: c.explanation,
      metadata: c.metadata,
    }));

    const { data: insertedComponents, error: compErr } = await (
      supabase.from("readiness_components") as any
    )
      .insert(componentsToInsert)
      .select("*");

    if (compErr) {
      console.error("Warning: Failed to insert readiness components:", compErr);
    }

    return {
      assessment: newAssessment as ReadinessAssessment,
      components: (insertedComponents || []) as ReadinessComponent[],
    };
  }

  /**
   * Retrieves the comprehensive readiness dashboard for a student subject.
   */
  static async getReadinessDashboard(
    userId: string,
    subjectId?: string
  ): Promise<ReadinessDashboardData | null> {
    const supabase = await createClient();

    // 1. Fetch student subjects
    const { data: subjects } = await (supabase.from("student_subjects") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const subjectList: StudentSubject[] = subjects || [];
    if (subjectList.length === 0) return null;

    const selectedSubject = subjectId
      ? subjectList.find((s) => s.id === subjectId) || subjectList[0]
      : subjectList[0];

    // 2. Fetch latest readiness assessment
    const { data: latestAssessments } = await (supabase.from("readiness_assessments") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", selectedSubject.id)
      .order("calculated_at", { ascending: false })
      .limit(1);

    let activeAssessment: ReadinessAssessment;
    let activeComponents: ReadinessComponent[];

    if (!latestAssessments || latestAssessments.length === 0) {
      // Calculate initial readiness assessment on first load
      const created = await this.calculateAndSaveReadiness(
        userId,
        selectedSubject.id,
        "INITIAL_INTAKE"
      );
      activeAssessment = created.assessment;
      activeComponents = created.components;
    } else {
      activeAssessment = latestAssessments[0];
      const { data: comps } = await (supabase.from("readiness_components") as any)
        .select("*")
        .eq("readiness_assessment_id", activeAssessment.id);
      activeComponents = comps || [];
    }

    // 3. Fetch historical assessments
    const { data: histRecords } = await (supabase.from("readiness_assessments") as any)
      .select("id, score, status, calculated_at, summary")
      .eq("user_id", userId)
      .eq("subject_id", selectedSubject.id)
      .order("calculated_at", { ascending: true })
      .limit(20);

    const history = (histRecords || []).map((h: any) => ({
      id: h.id,
      score: Number(h.score),
      status: h.status as ReadinessStatus,
      calculatedAt: h.calculated_at,
      source: h.summary?.triggerSource || "ASSESSMENT",
    }));

    // 4. Topic-level evidence collection
    const { data: topics } = await (supabase.from("curriculum_topics") as any)
      .select("*")
      .eq("subject_id", selectedSubject.id);
    const curriculumTopics: CurriculumTopic[] = topics || [];

    const { data: capStates } = await (supabase.from("topic_capability_states") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", selectedSubject.id);
    const capabilityStates: TopicCapabilityState[] = capStates || [];

    const { data: retentions } = await (supabase.from("retention_checks") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", selectedSubject.id)
      .eq("status", "COMPLETED");
    const completedRetentions: RetentionCheck[] = retentions || [];

    // Compile topic evidence records
    const topicEvidenceList: TopicEvidenceRecord[] = curriculumTopics.map((topic) => {
      const cap = capabilityStates.find((cs) => cs.topic_id === topic.id);
      const topicR = completedRetentions.filter((r) => r.topic_id === topic.id);

      const retScore =
        topicR.length > 0
          ? Math.round(
              topicR.reduce((sum, r) => sum + Number(r.retention_percentage || 0), 0) /
                topicR.length
            )
          : null;

      const questionsAttempted = (cap?.evidence_count || 0) + topicR.reduce((s, r) => s + r.question_count, 0);
      const questionsCorrect = topicR.reduce((s, r) => s + r.correct_count, 0) + (cap ? Math.round(((cap.diagnostic_score || 0) / 100) * (cap.evidence_count || 1)) : 0);

      return {
        topicId: topic.id,
        topicTitle: topic.title,
        importance: topic.importance || "CORE",
        diagnosticScore: cap ? Number(cap.diagnostic_score) : null,
        retentionScore: retScore,
        questionsAttempted,
        questionsCorrect,
      };
    });

    const analyzedTopics = analyzeTopicReadiness(topicEvidenceList);
    const strongTopics = analyzedTopics.filter((t) => t.status === "STRONG");
    const weakTopics = analyzedTopics.filter((t) => t.status === "WEAK");
    const criticalWeakTopics = analyzedTopics.filter((t) => t.isCriticalWeak);
    const unverifiedTopics = analyzedTopics.filter(
      (t) => t.status === "NOT_YET_VERIFIED" || t.status === "NOT_ENOUGH_EVIDENCE"
    );

    // 5. Generate deterministic recommendations
    const recommendations = generateReadinessRecommendations({
      readinessScore: Number(activeAssessment.score),
      readinessStatus: activeAssessment.status,
      components: activeComponents.map((c) => ({
        componentType: c.component_type,
        score: c.score,
        weight: c.weight,
        effectiveWeight: c.effective_weight,
        evidenceStatus: c.evidence_status,
        explanation: c.explanation,
        metadata: c.metadata,
      })),
      analyzedTopics,
      daysRemaining: activeAssessment.days_remaining,
    });

    return {
      assessment: activeAssessment,
      components: activeComponents,
      subject: selectedSubject,
      allSubjects: subjectList,
      daysRemaining: activeAssessment.days_remaining,
      analyzedTopics,
      strongTopics,
      weakTopics,
      criticalWeakTopics,
      unverifiedTopics,
      recommendations,
      history,
    };
  }

  /**
   * Retrieves readiness history for audit and timeline review.
   */
  static async getReadinessHistory(userId: string, subjectId: string) {
    const supabase = await createClient();

    const { data: assessments, error } = await (supabase.from("readiness_assessments") as any)
      .select("*, readiness_components(*)")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .order("calculated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return assessments || [];
  }
}
