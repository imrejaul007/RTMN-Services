export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  context?: {
    period?: string;
    segment?: string;
    totalPipeline?: number;
    quotaRemaining?: number;
    forecastData?: {
      commit: number;
      bestCase: number;
      upside: number;
    };
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface PipelineHealthReport {
  period: string;
  velocityMetrics: {
    metric: string;
    current: number;
    priorPeriod: number;
    trend: string;
    benchmark: number;
  }[];
  coverageAnalysis: {
    segment: string;
    quotaRemaining: number;
    weightedPipeline: number;
    coverageRatio: number;
    qualityAdjustedRatio: number;
  }[];
  stageConversionFunnel: {
    stage: string;
    dealsIn: number;
    converted: number;
    lost: number;
    conversionRate: number;
    avgDaysInStage: number;
    benchmarkDays: number;
  }[];
  dealsRequiringIntervention: {
    dealName: string;
    stage: string;
    daysStalled: number;
    meddippicScore: number;
    riskSignal: string;
    recommendedAction: string;
  }[];
}

export interface ForecastModel {
  period: string;
  commit: { amount: number; confidence: number; assumptions: string[] };
  bestCase: { amount: number; confidence: number; assumptions: string[] };
  upside: { amount: number; confidence: number; assumptions: string[] };
  comparisonMethods: {
    method: string;
    forecastAmount: number;
    varianceFromCommit: number;
  }[];
  riskFactors: { factor: string; impact: string }[];
  upsideOpportunities: { opportunity: string; probability: number; potentialAmount: number }[];
}

export interface DealScoreCard {
  dealName: string;
  meddippicAssessment: {
    criteria: string;
    status: "green" | "yellow" | "red";
    score: number;
    evidenceOrGap: string;
  }[];
  qualificationScore: number;
  engagementScore: number;
  velocityScore: number;
  compositeDealHealth: number;
  recommendation: "advance" | "intervene" | "nurture" | "disqualify";
  reasoning: string;
  nextAction: string;
}

export interface VelocityMetrics {
  pipelineVelocity: number;
  qualifiedOpportunities: number;
  averageDealSize: number;
  winRate: number;
  salesCycleLength: number;
}
