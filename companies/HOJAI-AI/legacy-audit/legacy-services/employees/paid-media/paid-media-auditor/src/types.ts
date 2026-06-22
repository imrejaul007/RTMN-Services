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
    platforms?: ("google" | "meta" | "microsoft")[];
    auditFocus?: string[];
    monthlySpend?: number;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface AuditFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  finding: string;
  impact: string;
  recommendation: string;
  projectedImpact?: string;
}

export interface AuditReport {
  accountId: string;
  platforms: string[];
  overallScore: number;
  findings: AuditFinding[];
  executiveSummary: string;
  prioritizedActionPlan: {
    priority: number;
    action: string;
    impact: string;
    effort: "low" | "medium" | "high";
  }[];
}
