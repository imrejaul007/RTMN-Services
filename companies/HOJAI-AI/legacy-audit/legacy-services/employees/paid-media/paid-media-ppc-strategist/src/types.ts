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
    monthlyBudget?: number;
    campaignType?: "search" | "shopping" | "pmax" | "display" | "video";
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface CampaignArchitecture {
  accountName: string;
  campaigns: {
    name: string;
    type: string;
    objective: string;
    budget: number;
    targeting: string[];
    bidStrategy: string;
  }[];
  negativeKeywordLists: string[];
  labels: string[];
}

export interface BiddingStrategy {
  strategy: "maximize-conversions" | "tCPA" | "tROAS" | "maximize-conversion-value" | "manual-cpc" | "enhanced-cpc";
  targetValue?: number;
  requirements: string[];
  risks: string[];
}

export interface BudgetAllocation {
  campaign: string;
  percentage: number;
  amount: number;
  rationale: string;
}
