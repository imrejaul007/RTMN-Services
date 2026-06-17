/**
 * HOJAI Intelligence Layer - Type Definitions
 */

// Intent Detection Types
export interface IntentResult {
  primaryIntent: string;
  confidence: number;
  secondaryIntents: Array<{
    intent: string;
    confidence: number;
  }>;
  entities: Record<string, string[]>;
  suggestedActions: string[];
}

// Sentiment Analysis Types
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number;
  emotions: Array<{
    emotion: string;
    intensity: number;
  }>;
  keyPhrases: string[];
}

// Knowledge Retrieval Types
export interface RetrievalResult {
  relevantDocuments: Array<{
    id: string;
    title: string;
    content: string;
    relevance: number;
    source: string;
  }>;
  knowledgeGraphInsights: Array<{
    concept: string;
    relationships: string[];
    confidence: number;
  }>;
  contextSummary: string;
}

// Prediction Types
export interface PredictionResult {
  csatScore: number; // 1-5
  escalationProbability: number; // 0-1
  churnRisk: 'low' | 'medium' | 'high';
  recommendedProactiveActions: string[];
  confidence: number;
}

// Recommendation Types
export interface RecommendationResult {
  recommendations: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reasoning: string;
    expectedOutcome: string;
    confidence: number;
  }>;
  nextBestActions: string[];
  automationEligible: boolean;
}

// Conversation Memory Types
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationSession {
  sessionId: string;
  customerId: string;
  turns: ConversationTurn[];
  startedAt: number;
  lastActivity: number;
  metadata: {
    channel?: string;
    agentId?: string;
    sentiment?: SentimentResult;
  };
}

// Customer Memory Types
export interface CustomerProfile {
  customerId: string;
  name?: string;
  email?: string;
  phone?: string;
  lifetimeValue: number;
  tier: 'standard' | 'premium' | 'vip';
  preferences: Record<string, unknown>;
  interactionHistory: Array<{
    timestamp: number;
    type: string;
    summary: string;
  }>;
  sentimentTrend: number[]; // Last 5 sentiment scores
  lastUpdated: number;
}

// Organization Memory Types
export interface OrganizationMemory {
  orgId: string;
  policies: Policy[];
  brandVoice: {
    tone: string;
    vocabulary: string[];
    guidelines: string[];
  };
  commonIssues: Array<{
    issue: string;
    resolutionCount: number;
    avgResolutionTime: number;
  }>;
  escalationPatterns: Array<{
    pattern: string;
    frequency: number;
    typicalEscalation: string;
  }>;
  successMetrics: Record<string, number>;
}

// Policy Types
export interface Policy {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  actions: string[];
  priority: number;
  active: boolean;
}

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

export interface PolicyEvaluationResult {
  applicablePolicies: Policy[];
  recommendedActions: string[];
  requiresApproval: boolean;
  approverRoles?: string[];
}

// Analysis Request/Response Types
export interface AnalyzeRequest {
  text: string;
  customerId?: string;
  orgId?: string;
  sessionId?: string;
  context?: {
    channel?: string;
    previousMessages?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface AnalyzeResponse {
  requestId: string;
  timestamp: number;
  intent: IntentResult;
  sentiment: SentimentResult;
  retrieval?: RetrievalResult;
  prediction?: PredictionResult;
  recommendations?: RecommendationResult;
  processingTimeMs: number;
}

// Generate Brief Types
export interface GenerateBriefRequest {
  customerId: string;
  topic?: string;
  includeHistory?: boolean;
}

export interface GenerateBriefResponse {
  briefId: string;
  timestamp: number;
  customerProfile?: CustomerProfile;
  recentInteractions?: ConversationTurn[];
  sentimentTrend?: number[];
  keyInsights: string[];
  recommendations: string[];
}

// Policy Evaluate Types
export interface PolicyEvaluateRequest {
  context: {
    customerId?: string;
    orgId?: string;
    situation: string;
    customerAttributes?: Record<string, unknown>;
    transactionAmount?: number;
    [key: string]: unknown;
  };
}

export interface PolicyEvaluateResponse {
  evaluationId: string;
  timestamp: number;
  result: PolicyEvaluationResult;
  reasoning: string;
}

// Analytics Types
export interface IntelligenceMetrics {
  totalRequests: number;
  avgProcessingTimeMs: number;
  intentAccuracy: number;
  sentimentAccuracy: number;
  predictionAccuracy: number;
  cacheHitRate: number;
  activeSessions: number;
}
