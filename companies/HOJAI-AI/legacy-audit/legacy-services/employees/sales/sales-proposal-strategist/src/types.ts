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
    opportunityName?: string;
    buyerName?: string;
    competitors?: string[];
    rfpRequirements?: string[];
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface WinTheme {
  themeNumber: number;
  statement: string;
  buyerNeed: string;
  differentiator: string;
  proofPoint: string;
  sections: string[];
}

export interface WinThemeMatrix {
  opportunityName: string;
  themes: WinTheme[];
  competitivePositioning: {
    dimension: string;
    ourPosition: string;
    competitorApproach: string;
    ourAdvantage: string;
  }[];
}

export interface ExecutiveSummary {
  buyerSituation: string;
  centralTension: string;
  solutionThesis: string;
  proof: string;
  transformedState: string;
}

export interface ProposalArchitecture {
  opportunityName: string;
  narrativeFlow: {
    act: string;
    sections: string[];
    purpose: string;
  }[];
  winThemeIntegrationMap: {
    section: string;
    primaryTheme: string;
    secondaryTheme: string;
    keyEvidence: string;
  }[];
  complianceChecklist: {
    requirement: string;
    compliant: boolean;
    strategicEnhancement: string;
  }[];
}
