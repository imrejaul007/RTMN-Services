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
    accountId?: string;
    accountName?: string;
    currentARR?: number;
    contractRenewalDate?: string;
    healthScore?: "green" | "yellow" | "red";
    productsDeployed?: string[];
    stakeholders?: Stakeholder[];
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface Stakeholder {
  name: string;
  title: string;
  role: "champion" | "economic-buyer" | "influencer" | "end-user" | "detractor";
  influence: "high" | "medium" | "low";
  sentiment: "positive" | "neutral" | "negative";
  lastContact?: string;
}

export interface ExpansionOpportunity {
  type: "upsell" | "cross-sell";
  triggerSignal: string;
  businessCase: string;
  timing: string;
  owner: string;
  stage: "discovery" | "proposal" | "negotiation";
}

export interface AccountExpansionPlan {
  accountName: string;
  currentARR: number;
  contractRenewal: string;
  healthScore: "green" | "yellow" | "red";
  productsDeployed: string[];
  whitespace: string[];
  stakeholders: Stakeholder[];
  expansionOpportunities: ExpansionOpportunity[];
}

export interface QBRPreparation {
  accountName: string;
  quarter: string;
  usageTrends: string;
  supportHistory: string;
  roiData: string;
  industryContext: string;
  agenda: string[];
  questions: string[];
  attendees: string[];
  missing: string[];
}

export interface ChurnPreventionPlan {
  accountName: string;
  earlyWarningSignals: {
    signal: string;
    currentState: string;
    threshold: string;
    severity: "high" | "medium" | "low";
  }[];
  interventionPlan: {
    immediate: string;
    shortTerm: string;
    mediumTerm: string;
  };
  riskAssessment: {
    probabilityOfChurn: number;
    revenueAtRisk: number;
    saveDifficulty: "low" | "medium" | "high";
  };
}
