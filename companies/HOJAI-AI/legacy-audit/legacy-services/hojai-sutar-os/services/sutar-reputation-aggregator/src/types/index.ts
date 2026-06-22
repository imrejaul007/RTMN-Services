// Core Configuration
export interface Config {
  port: number;
  environment: string;
  logLevel: string;
  trustEngineUrl: string;
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
}

// Review Types
export type ReviewSource = 'manual' | 'automated' | 'imported' | 'api';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface Review {
  id: string;
  entityId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  source: ReviewSource;
  status: ReviewStatus;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewInput {
  entityId: string;
  userId: string;
  rating: number;
  title: string;
  content: string;
  source?: ReviewSource;
  verified?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  minRating?: number;
  maxRating?: number;
  source?: ReviewSource;
  verified?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Reputation Types
export type EntityType = 'user' | 'product' | 'service' | 'organization' | 'content';

export interface ReputationScore {
  entityId: string;
  entityType: EntityType;
  overall: number;
  weighted: number;
  components: ReputationComponents;
  confidence: number;
  totalReviews: number;
  verifiedReviews: number;
  lastUpdated: string;
}

export interface ReputationComponents {
  averageRating: number;
  ratingDistribution: RatingDistribution;
  sentiment: SentimentSummary;
  trustScore: TrustScoreResult | null;
  recency: RecencyScore;
  engagement: EngagementScore;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface RecencyScore {
  score: number;
  averageAge: number;
  latestReview: string;
}

export interface EngagementScore {
  score: number;
  totalHelpful: number;
  totalNotHelpful: number;
  responseRate: number;
}

// Sentiment Analysis Types
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
  confidence: number;
  keywords: string[];
  aspects: AspectSentiment[];
}

export interface AspectSentiment {
  aspect: string;
  label: SentimentLabel;
  score: number;
  mentions: number;
}

export interface SentimentSummary {
  overall: SentimentLabel;
  score: number;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  trend: 'improving' | 'stable' | 'declining';
  periodComparison: PeriodComparison;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface EntitySentiment {
  entityId: string;
  overall: SentimentSummary;
  recent: SentimentResult[];
  trends: SentimentTrend[];
  topics: TopicSentiment[];
}

export interface SentimentTrend {
  period: string;
  score: number;
  volume: number;
}

export interface TopicSentiment {
  topic: string;
  sentiment: SentimentLabel;
  score: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

// Trust Score Types
export interface TrustScoreResult {
  score: number;
  tier: TrustTier;
  factors: TrustFactor[];
  verified: boolean;
  lastVerified: string;
}

export type TrustTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'unverified';

export interface TrustFactor {
  name: string;
  weight: number;
  score: number;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface TrustEngineRequest {
  entityId: string;
  entityType: EntityType;
  reviewCount: number;
  averageRating: number;
  verifiedReviews: number;
  sentimentScore: number;
}

// Historical Tracking Types
export type MetricType = 'reputation' | 'rating' | 'sentiment' | 'trust';

export interface HistoricalEntry {
  id: string;
  entityId: string;
  metricType: MetricType;
  value: number;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface HistoricalData {
  entityId: string;
  metricType: MetricType;
  entries: DataPoint[];
  summary: HistoricalSummary;
}

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface HistoricalSummary {
  min: number;
  max: number;
  average: number;
  current: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
}

export type TrendDirection = 'up' | 'down' | 'stable';

// Rating Breakdown Types
export interface RatingBreakdown {
  entityId: string;
  distribution: RatingDistribution;
  percentages: RatingPercentages;
  statistics: RatingStatistics;
  trends: RatingTrend[];
}

export interface RatingPercentages {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface RatingStatistics {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  totalReviews: number;
}

export interface RatingTrend {
  period: string;
  average: number;
  count: number;
}

// Weighted Scoring Types
export interface WeightedScoringConfig {
  recencyWeight: number;
  verifiedWeight: number;
  engagementWeight: number;
  trustWeight: number;
  volumeThreshold: number;
}

export interface WeightedScoreRequest {
  entityId: string;
  baseScore: number;
  config?: Partial<WeightedScoringConfig>;
}

// Error Types
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

// Logging Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}
