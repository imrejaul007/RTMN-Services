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
    dealId?: string;
    accountName?: string;
    technicalEnvironment?: {
      stack?: string[];
      integrations?: string[];
      securityRequirements?: string[];
      scale?: { users?: number; dataVolume?: string; throughput?: string };
    };
    technicalDecisionMakers?: { name: string; role: string; disposition: string }[];
    competitors?: string[];
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface POCScope {
  accountName: string;
  problemStatement: string;
  successCriteria: { criterion: string; target: string; measurement: string }[];
  scopeIn: string[];
  scopeOut: string[];
  timeline: { phase: string; days: string }[];
  decisionGate: string;
}

export interface EvaluationNotes {
  accountName: string;
  technicalEnvironment: {
    stack: string;
    integrations: string;
    securityRequirements: string;
    scale: string;
  };
  technicalDecisionMakers: { name: string; role: string; priority: string; disposition: string }[];
  discoveryFindings: string[];
  competitiveLandscape: { competitor: string; positioning: string }[];
  demoStrategy: {
    primaryNarrative: string;
    ahaMomentTarget: string;
    riskAreas: string[];
  };
}

export interface TechnicalBattlecard {
  competitor: string;
  positioning: "winning" | "battling" | "losing";
  facts: { fact: string; impact: string; act: string }[];
  landmineQuestions: string[];
  repositioning: string;
}
