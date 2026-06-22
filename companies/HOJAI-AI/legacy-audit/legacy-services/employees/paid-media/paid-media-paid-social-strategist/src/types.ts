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
    platform?: "meta" | "linkedin" | "tiktok" | "pinterest" | "snapchat";
    campaignObjective?: string;
    monthlyBudget?: number;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface SocialCampaign {
  name: string;
  platform: string;
  objective: string;
  funnelStage: "awareness" | "consideration" | "conversion" | "retention";
  audience: {
    type: string;
    targeting: string[];
    exclusions?: string[];
  };
  budget: {
    daily: number;
    total?: number;
  };
  creative: string[];
}

export interface AudienceStrategy {
  prospecting: string[];
  retargeting: string[];
  exclusions: string[];
  lookalike: { source: string; percentage: number }[];
}

export interface PlatformComparison {
  platform: string;
  strengths: string[];
  bestFor: string[];
  creativeRequirements: string[];
  audienceTargeting: string[];
}
