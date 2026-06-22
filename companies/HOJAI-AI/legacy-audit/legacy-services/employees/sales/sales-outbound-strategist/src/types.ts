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
    targetICP?: string;
    signalType?: string;
    channel?: string;
    currentSequence?: string;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface ICPDefinition {
  firmographics: {
    industries: string[];
    revenueRange?: string;
    employeeCount?: string;
    geography?: string;
    technologyStack?: string[];
  };
  behavioralQualifiers: {
    buyingTrigger: string;
    painPoint: string;
    buyerRole: string;
    workaround: string;
  };
  disqualifiers: string[];
}

export interface SignalTier {
  tier: 1 | 2 | 3;
  signals: string[];
  priority: string;
  responseTime: string;
}

export interface SequenceTemplate {
  name: string;
  touches: {
    day: number;
    channel: string;
    content: string;
    cta: string;
  }[];
}

export interface AccountTier {
  tier: 1 | 2 | 3;
  criteria: string;
  engagement: string;
  personalization: string;
}
