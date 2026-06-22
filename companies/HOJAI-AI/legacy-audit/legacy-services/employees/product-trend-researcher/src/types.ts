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
    reportType?: 'trend' | 'competitive' | 'market' | 'opportunity';
    timeframe?: 'short' | 'medium' | 'long';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  trendReport?: TrendReport;
  competitiveAnalysis?: CompetitiveAnalysis;
  marketAssessment?: MarketAssessment;
  opportunity?: Opportunity;
  agent: string;
  timestamp: number;
}

export interface TrendReport {
  title: string;
  summary: string;
  trends: Trend[];
  emergingSignals: Signal[];
  predictions: Prediction[];
  recommendations: string[];
}

export interface Trend {
  name: string;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  lifecycle: 'emerging' | 'growing' | 'mature' | 'declining';
  impact: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface Signal {
  source: string;
  description: string;
  confidence: number;
  collectedAt: string;
}

export interface Prediction {
  trend: string;
  forecast: string;
  confidence: number;
  timeframe: string;
}

export interface CompetitiveAnalysis {
  landscape: string;
  competitors: Competitor[];
  marketGaps: MarketGap[];
  opportunities: string[];
}

export interface Competitor {
  name: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  marketShare?: number;
}

export interface MarketGap {
  gap: string;
  opportunity: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MarketAssessment {
  tam: MarketSize;
  sam: MarketSize;
  som: MarketSize;
  growth: GrowthMetrics;
  segments: Segment[];
}

export interface MarketSize {
  value: string;
  confidence: string;
  methodology: string;
}

export interface GrowthMetrics {
  rate: string;
  trend: 'accelerating' | 'stable' | 'decelerating';
  drivers: string[];
}

export interface Segment {
  name: string;
  size: string;
  growth: string;
  attractiveness: 'low' | 'medium' | 'high';
}

export interface Opportunity {
  title: string;
  description: string;
  marketSizing: string;
  timing: 'now' | 'near' | 'future';
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  actionItems: string[];
}
