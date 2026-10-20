export interface AICapabilityAnalysisRequest {
  currentCapability: string;
  targetCapability: string;
  domain: string;
  priorAssessments?: unknown[];
}

export interface AICapabilityAnalysisResponse {
  identifiedGap: string;
  recommendedLearningPlan: {
    steps: Array<{
      order: number;
      actionTitle: string;
      focusConcept: string;
      estimatedMinutes: number;
    }>;
  };
  confidenceScore: number;
}

export interface AIAssessmentGenerationRequest {
  topic: string;
  targetLevel: number;
  questionCount: number;
  locale?: string;
}

export interface AIAssessmentGenerationResponse {
  generatedQuestions: Array<{
    prompt: string;
    options: string[];
    rubricHint: string;
  }>;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  analyzeCapabilityGap(
    request: AICapabilityAnalysisRequest
  ): Promise<AICapabilityAnalysisResponse>;
  generateAssessmentDraft(
    request: AIAssessmentGenerationRequest
  ): Promise<AIAssessmentGenerationResponse>;
}
