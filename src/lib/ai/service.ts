import type {
  AIProvider,
  AICapabilityAnalysisRequest,
  AICapabilityAnalysisResponse,
  AIAssessmentGenerationRequest,
  AIAssessmentGenerationResponse,
} from "./types";

/**
 * Future Provider Stub (Ready for Google DeepMind Gemini integration in later phase)
 * NO API keys are stored or invoked on Day 1.
 */
class GeminiProviderStub implements AIProvider {
  name = "Google Gemini Provider (Deferred)";

  async isAvailable(): Promise<boolean> {
    return false; // Day 1 intentional deferral
  }

  async analyzeCapabilityGap(
    _request: AICapabilityAnalysisRequest
  ): Promise<AICapabilityAnalysisResponse> {
    throw new Error(
      "[READY AI Architecture] Gemini Provider is deferred for Day 1 foundation. Engine abstraction ready for Phase 2."
    );
  }

  async generateAssessmentDraft(
    _request: AIAssessmentGenerationRequest
  ): Promise<AIAssessmentGenerationResponse> {
    throw new Error(
      "[READY AI Architecture] Assessment Generation is deferred for Day 1 foundation. Engine abstraction ready for Phase 2."
    );
  }
}

/**
 * READY Central AI Service abstraction
 */
export class ReadyAIService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new GeminiProviderStub();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async evaluateGap(
    request: AICapabilityAnalysisRequest
  ): Promise<AICapabilityAnalysisResponse> {
    return this.provider.analyzeCapabilityGap(request);
  }

  public async draftAssessment(
    request: AIAssessmentGenerationRequest
  ): Promise<AIAssessmentGenerationResponse> {
    return this.provider.generateAssessmentDraft(request);
  }
}

// Global service singleton export
export const readyAI = new ReadyAIService();
