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
    callType?: "discovery" | "demo" | "negotiation" | "executive";
    buyerProfile?: {
      title?: string;
      company?: string;
      seniority?: "ic" | "manager" | "director" | "vp" | "cxo";
    };
    discoveryQuality?: "needs-work" | "adequate" | "strong" | "excellent";
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface DiscoveryFramework {
  type: "spin" | "gap" | "sandler";
  questions: {
    category: string;
    question: string;
    purpose: string;
  }[];
}

export interface CallStructure {
  opening: {
    upfrontContract: string;
  };
  discovery: {
    duration: number;
    questions: string[];
  };
  tailoredPitch: {
    duration: number;
    focus: string[];
  };
  nextSteps: {
    duration: number;
    requirements: string[];
  };
}

export interface ObjectionHandling {
  objection: string;
  acknowledge: string;
  empathize: string;
  clarify: string;
  reframe: string;
}
