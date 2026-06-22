// ============================================================================
// SUTAR Exploration Engine - Type Definitions
// ============================================================================

export interface Config {
  port: number;
  environment: string;
  logLevel: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// Market Scanning Types
// ============================================================================

export interface MarketScan {
  id: string;
  query: string;
  industry?: string;
  region?: string;
  timestamp: string;
  results: MarketDataPoint[];
  summary: MarketSummary;
  metadata: Record<string, unknown>;
}

export interface MarketDataPoint {
  id: string;
  name: string;
  category: string;
  size?: number;
  growth?: number;
  share?: number;
  trend: 'rising' | 'falling' | 'stable';
  confidence: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface MarketSummary {
  totalResults: number;
  avgGrowth: number;
  avgConfidence: number;
  topCategories: string[];
  marketHealth: 'excellent' | 'good' | 'moderate' | 'poor';
}

export interface ScanQuery {
  query: string;
  industry?: string;
  region?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  limit?: number;
}

// ============================================================================
// Opportunity Types
// ============================================================================

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  priority: 'high' | 'medium' | 'low';
  score: number;
  marketSize?: number;
  growthPotential?: number;
  competition?: number;
  barriers: string[];
  requirements: string[];
  timeline?: string;
  estimatedValue?: number;
  risks: string[];
  recommendations: string[];
  timestamp: string;
  source: string;
  relatedTrends?: string[];
  metadata: Record<string, unknown>;
}

export type OpportunityType =
  | 'market_entry'
  | 'product_extension'
  | 'partnership'
  | 'acquisition'
  | 'pricing'
  | 'geographic_expansion'
  | 'feature_addition'
  | 'process_improvement';

export interface OpportunityQuery {
  type?: OpportunityType;
  priority?: 'high' | 'medium' | 'low';
  minScore?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Trend Types
// ============================================================================

export interface Trend {
  id: string;
  name: string;
  description: string;
  category: string;
  direction: 'upward' | 'downward' | 'stable';
  velocity: number;
  strength: number;
  volume: number;
  sentiment: number;
  startDate: string;
  endDate: string;
  projections: TrendProjection[];
  relatedOpportunities: string[];
  sources: string[];
  metadata: Record<string, unknown>;
}

export interface TrendProjection {
  period: string;
  predicted: number;
  confidence: number;
  range: { min: number; max: number };
}

export interface TrendQuery {
  category?: string;
  direction?: 'upward' | 'downward' | 'stable';
  minStrength?: number;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  limit?: number;
}

// ============================================================================
// Competitor Types
// ============================================================================

export interface Competitor {
  id: string;
  name: string;
  description: string;
  website?: string;
  marketShare?: number;
  strength: string[];
  weaknesses: string[];
  offerings: CompetitorOffering[];
  pricing?: string;
  targetSegments: string[];
  recentActivity: Activity[];
  metadata: Record<string, unknown>;
}

export interface CompetitorOffering {
  name: string;
  category: string;
  price?: number;
  features: string[];
  rating?: number;
}

export interface Activity {
  type: 'product_launch' | 'pricing_change' | 'partnership' | 'expansion' | 'funding';
  description: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CompetitorQuery {
  industry?: string;
  region?: string;
  limit?: number;
}

// ============================================================================
// Gap Analysis Types
// ============================================================================

export interface GapAnalysis {
  id: string;
  industry: string;
  region?: string;
  timestamp: string;
  gaps: MarketGap[];
  summary: GapSummary;
  recommendations: GapRecommendation[];
  metadata: Record<string, unknown>;
}

export interface MarketGap {
  id: string;
  type: GapType;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  size?: number;
  competition: number;
  entryDifficulty: 'easy' | 'moderate' | 'hard';
  relatedTrends: string[];
  metadata: Record<string, unknown>;
}

export type GapType =
  | 'product'
  | 'pricing'
  | 'service'
  | 'technology'
  | 'geographic'
  | 'demographic'
  | 'feature'
  | 'channel';

export interface GapSummary {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  avgCompetition: number;
  bestOpportunities: string[];
}

export interface GapRecommendation {
  gapId: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'high' | 'medium' | 'low';
  estimatedCost?: number;
  estimatedTime?: string;
}

export interface GapQuery {
  industry: string;
  region?: string;
  type?: GapType;
  minSeverity?: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Market Segment Types
// ============================================================================

export interface MarketSegment {
  id: string;
  name: string;
  description: string;
  size?: number;
  growth?: number;
  demographics: Record<string, unknown>;
  behaviors: string[];
  needs: string[];
  painPoints: string[];
  willingnessToPay?: { min: number; max: number };
  accessibility: 'easy' | 'moderate' | 'difficult';
  competition: number;
  trends: string[];
  opportunities: string[];
  metadata: Record<string, unknown>;
}

export interface SegmentQuery {
  industry?: string;
  region?: string;
  minSize?: number;
  minGrowth?: number;
  limit?: number;
}

// ============================================================================
// Integration Types
// ============================================================================

export interface DiscoveryQuery {
  query: string;
  type?: string;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface DiscoveryResult {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface SimulationRequest {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  iterations?: number;
  confidenceLevel?: number;
}

export interface SimulationResult {
  id: string;
  status: string;
  result: Record<string, unknown>;
}
