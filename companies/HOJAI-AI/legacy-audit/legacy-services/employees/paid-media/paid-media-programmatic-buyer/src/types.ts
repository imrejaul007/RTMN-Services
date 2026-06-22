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
    platform?: "gdn" | "dv360" | "trade-desk" | "amazon-dsp" | "demandbase";
    campaignObjective?: string;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface DisplayCampaign {
  name: string;
  platform: string;
  objective: string;
  audience: {
    type: string;
    targeting: string[];
    exclusions?: string[];
  };
  placements: {
    type: "managed" | "topic" | "audience" | "keyword";
    list: string[];
  };
  budget: {
    daily: number;
    pacing: string;
  };
  frequencyCap?: number;
  viewabilityTarget?: number;
}

export interface ProgrammaticDeal {
  dealId: string;
  type: "pmp" | "programmatic-guaranteed" | "open-exchange";
  floorPrice: number;
  publisher: string;
  targeting: string[];
}

export interface ABMDisplay {
  accountList: string[];
  platforms: string[];
  engagementScoring: boolean;
  suppression: string[];
}
