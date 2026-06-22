// ── Learning Analytics Types ─────────────────────────────────────────────────────
// Types for AI learning and improvement system

export interface ConversationOutcome {
  conversationId: string;
  userId: string;
  appType: string;
  industryCategory?: string;
  merchantId?: string;
  messageCount: number;
  toolCalls: number;
  escalations: number;
  outcome: 'resolved' | 'escalated' | 'abandoned' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
}

export interface MessageFeedback {
  messageId: string;
  conversationId: string;
  helpful: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  timestamp: Date;
}

export interface AIResponseMetrics {
  messageId: string;
  conversationId: string;
  confidence: number;
  responseTime: number; // ms
  toolUsed: boolean;
  toolName?: string;
  knowledgeSources: string[]; // e.g., ['unified', 'industry', 'merchant']
  keywordsMatched: string[];
  resolvedIntent: boolean;
  timestamp: Date;
}

export interface PatternEntry {
  id: string;
  pattern: string;
  normalizedPattern: string; // lowercased, lemmatized
  intent: string;
  category: string;
  frequency: number;
  successRate: number;
  avgConfidence: number;
  typicalResponses: string[];
  associatedTools: string[];
  industryCategories: string[];
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeGap {
  id: string;
  category: string;
  industryCategory?: string;
  questionPattern: string;
  timesAsked: number;
  resolvedCount: number;
  unresolvedCount: number;
  resolutionRate: number;
  suggestedResponse?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface ImprovementAction {
  id: string;
  type: 'add_knowledge' | 'update_response' | 'add_tool' | 'update_intent' | 'improve_context';
  target: string; // knowledge base ID, response template ID, etc.
  reason: string;
  data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt: Date;
  appliedAt?: Date;
}

export interface AnalyticsSummary {
  period: { start: Date; end: Date };
  totalConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  abandonedConversations: number;
  avgResolutionRate: number;
  avgResponseTime: number;
  avgConfidence: number;
  topIntents: Array<{ intent: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  knowledgeGaps: KnowledgeGap[];
  improvementActions: ImprovementAction[];
}

export interface IntentPattern {
  patterns: RegExp[];
  intent: string;
  examples: string[];
  keywords: string[];
  priority: number;
}

export interface LearningConfig {
  minFeedbackCount: number;
  confidenceThreshold: number;
  patternFrequencyThreshold: number;
  knowledgeGapThreshold: number;
  improvementBatchSize: number;
  retentionDays: number;
}
