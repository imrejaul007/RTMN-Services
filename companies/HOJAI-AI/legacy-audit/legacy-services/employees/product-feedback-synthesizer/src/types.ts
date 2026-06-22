export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    source?: 'survey' | 'support' | 'review' | 'interview' | 'all';
    timeframe?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  synthesis?: FeedbackSynthesis;
  themes?: ThemeAnalysis[];
  recommendations?: PriorityRecommendation[];
  metrics?: SatisfactionMetrics;
  agent: string;
  timestamp: number;
}

export interface FeedbackSynthesis {
  overview: string;
  keyThemes: string[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  volumeTrend: string;
  topInsights: Insight[];
}

export interface Insight {
  theme: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  representativeQuote: string;
  businessImpact: string;
}

export interface ThemeAnalysis {
  theme: string;
  volume: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  affectedUsers: number;
  verbatims: string[];
}

export interface PriorityRecommendation {
  priority: 'high' | 'medium' | 'low';
  theme: string;
  action: string;
  impact: string;
  effort: string;
  confidence: number;
}

export interface SatisfactionMetrics {
  nps?: number;
  csat?: number;
  ces?: number;
  trend: 'improving' | 'stable' | 'declining';
  benchmark?: string;
}

export interface ProcessingPipeline {
  ingestion: string;
  cleaning: string;
  sentimentAnalysis: string;
  categorization: string;
  qualityAssurance: string;
}

export interface RICEScore {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  score: number;
}
