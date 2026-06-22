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
    repId?: string;
    repName?: string;
    quotaAttainment?: number;
    winRate?: number;
    averageDealSize?: number;
    salesCycleLength?: number;
    focusAreas?: string[];
    coachingHistory?: string[];
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface CoachingPlan {
  repName: string;
  currentPerformance: {
    quotaAttainmentYTD: number;
    winRate: number;
    averageDealSize: number;
    salesCycleLength: number;
    pipelineCoverage: number;
  };
  skillAssessment: {
    competency: string;
    currentLevel: number;
    targetLevel: number;
    gap: string;
  }[];
  focusAreas: {
    skill: string;
    currentBehavior: string;
    targetBehavior: string;
    coachingActions: string[];
    milestone: string;
    targetDate: string;
  }[];
  coachingCadence: {
    weekly1on1: string;
    callReviews: string;
    dealPrepSessions: string;
    debriefSessions: string;
  };
}

export interface PipelineReview {
  repName: string;
  date: string;
  portfolioHealth: {
    totalPipeline: number;
    dealCount: number;
    weightedPipeline: number;
    pipelineToQuotaRatio: number;
    averageAgeByStage: Record<string, number>;
  };
  dealsUnderReview: {
    dealName: string;
    value: number;
    stage: string;
    age: number;
    keyQuestion: string;
    risk: "red" | "yellow" | "green";
  }[];
  patternObservations: {
    stalledDeals: string[];
    qualificationGaps: string[];
    stageAccuracy: string;
    coachingMoment: string;
  };
}

export interface CallCoachingDebrief {
  repName: string;
  date: string;
  callDetails: {
    account: string;
    callType: "discovery" | "demo" | "negotiation" | "executive";
    buyerAttendees: string[];
    duration: number;
    recordingLink?: string;
  };
  whatWentWell: string[];
  coachingOpportunity: {
    moment: string;
    whatHappened: string;
    whatToTryInstead: string;
    whyItMatters: string;
  };
  skillConnection: {
    focusArea: string;
    practiceAssignment: string;
    followUp: string;
  };
}

export interface RampPlan {
  repName: string;
  startDate: string;
  milestones30Days: string[];
  milestones60Days: string[];
  milestones90Days: string[];
  competencyGates: {
    milestone30: string;
    milestone60: string;
    milestone90: string;
  };
}
