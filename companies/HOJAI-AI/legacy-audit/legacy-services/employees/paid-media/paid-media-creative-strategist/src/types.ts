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
    campaignName?: string;
    platform?: "google" | "meta" | "microsoft";
    adType?: "rsa" | "display" | "video" | "pmax";
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface RSACopy {
  headlines: string[];
  descriptions: string[];
  pinStrategy?: { assetId: string; position: number }[];
}

export interface MetaCreative {
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  format: "image" | "video" | "carousel" | "collection";
}

export interface CreativeTestPlan {
  hypothesis: string;
  variants: string[];
  control: string;
  successMetric: string;
  sampleSize: string;
  duration: string;
}

export interface AdStrengthAnalysis {
  score: "inadequate" | "poor" | "average" | "good" | "excellent";
  issues: string[];
  recommendations: string[];
}
