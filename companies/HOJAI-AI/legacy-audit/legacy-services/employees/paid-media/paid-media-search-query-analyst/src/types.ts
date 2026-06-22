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
    campaignName?: string;
    timePeriod?: string;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface SearchQueryAnalysis {
  accountId: string;
  timePeriod: string;
  totalQueries: number;
  convertingQueries: number;
  nonConvertingSpend: number;
  wastedSpendPercentage: number;
  recommendations: {
    type: "negative-keyword" | "keyword-add" | "match-type" | "sculpt";
    queries: string[];
    action: string;
    projectedSavings?: number;
  }[];
}

export interface NegativeKeywordArchitecture {
  accountLevel: string[];
  campaignLevel: { campaign: string; negatives: string[] }[];
  sharedLists: { name: string; negatives: string[] }[];
  conflicts: { keyword: string; conflict: string }[];
}

export interface QueryIntentMapping {
  query: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  correctDestination: string;
  currentDestination: string;
  alignmentScore: number;
}

export interface WasteAnalysis {
  category: string;
  spend: number;
  conversions: number;
  cpa: number;
  recommendation: string;
}
