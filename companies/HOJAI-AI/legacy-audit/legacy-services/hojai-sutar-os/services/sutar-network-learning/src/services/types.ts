// ============================================================================
// SUTAR Network Learning - Type Definitions
// ============================================================================

// Pattern Types
export type PatternType = 'success' | 'failure' | 'neutral';
export type LearningStatus = 'learning' | 'analyzing' | 'ready';
export type ModelType = 'linear' | 'tree' | 'neural' | 'ensemble' | 'bayesian';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ExperimentStatus = 'running' | 'completed' | 'paused' | 'cancelled';
export type RecommendationConfidence = 'low' | 'medium' | 'high' | 'very_high';

// Core Pattern Interface
export interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  frequency: number;
  successRate: number;
  triggers: string[];
  outcomes: string[];
  confidence: number;
  lastObserved: string;
  createdAt: string;
  metadata?: Record<string, any>;
  features?: number[];
  clusterId?: string;
}

// Learning Data Interface
export interface LearningData {
  id: string;
  context: Record<string, any>;
  action: string;
  outcome: PatternType;
  reward?: number;
  metadata: Record<string, any>;
  timestamp: string;
  features?: Record<string, number>;
  embedding?: number[];
}

// Strategy Interface
export interface Strategy {
  id: string;
  name: string;
  description: string;
  actions: string[];
  conditions: StrategyCondition[];
  expectedOutcome: PatternType;
  successRate: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'experimental';
  tags: string[];
  metadata: Record<string, any>;
}

export interface StrategyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;
}

// Success Analysis Interface
export interface SuccessAnalysis {
  id: string;
  patternId: string;
  factors: SuccessFactor[];
  correlations: FactorCorrelation[];
  overallScore: number;
  confidence: number;
  insights: string[];
  recommendations: string[];
  analyzedAt: string;
}

export interface SuccessFactor {
  name: string;
  impact: number;
  importance: number;
  description: string;
  examples: string[];
}

export interface FactorCorrelation {
  factor1: string;
  factor2: string;
  correlation: number;
  significance: number;
}

// Recommendation Interface
export interface Recommendation {
  id: string;
  type: 'action' | 'strategy' | 'pattern' | 'trend';
  title: string;
  description: string;
  confidence: RecommendationConfidence;
  score: number;
  actions: RecommendedAction[];
  context: Record<string, any>;
  basedOnPatterns: string[];
  createdAt: string;
  feedback?: RecommendationFeedback;
}

export interface RecommendedAction {
  action: string;
  description: string;
  priority: number;
  expectedOutcome: string;
  risk: 'low' | 'medium' | 'high';
}

export interface RecommendationFeedback {
  userId?: string;
  helpful: boolean;
  applied: boolean;
  rating?: number;
  comment?: string;
  timestamp: string;
}

// Trend Detection Interface
export interface Trend {
  id: string;
  name: string;
  direction: TrendDirection;
  strength: number;
  velocity: number;
  startDate: string;
  lastUpdated: string;
  dataPoints: number;
  forecast?: TrendForecast;
  relatedPatterns: string[];
  description: string;
}

export interface TrendForecast {
  predictedValue: number;
  confidenceInterval: { lower: number; upper: number };
  horizon: number;
  model: string;
}

// Anomaly Detection Interface
export interface Anomaly {
  id: string;
  type: string;
  severity: AnomalySeverity;
  description: string;
  detectedAt: string;
  metrics: AnomalyMetrics;
  causes: string[];
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: string;
}

export interface AnomalyMetrics {
  expectedValue: number;
  actualValue: number;
  deviation: number;
  threshold: number;
  zScore?: number;
}

// Learning Models Interface
export interface LearningModel {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainedAt: string;
  trainingDataSize: number;
  features: string[];
  hyperparameters: Record<string, any>;
  status: 'training' | 'ready' | 'deprecated';
  performanceHistory: PerformanceMetric[];
}

export interface PerformanceMetric {
  timestamp: string;
  accuracy: number;
  loss: number;
  validationScore: number;
}

// A/B Testing Interface
export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  status: ExperimentStatus;
  startedAt: string;
  endedAt?: string;
  sampleSize: number;
  targetSampleSize: number;
  statisticalPower: number;
  significanceLevel: number;
  winner?: string;
  pValue?: number;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  trafficAllocation: number;
  conversions: number;
  impressions: number;
  conversionRate: number;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'custom';
  value: number;
  confidence: number;
  variantComparisons: Record<string, { mean: number; stdDev: number }>;
}

// Knowledge Graph Interface
export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'strategy' | 'pattern' | 'outcome' | 'action';
  name: string;
  description: string;
  properties: Record<string, any>;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  weight: number;
  properties: Record<string, any>;
  createdAt: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    lastUpdated: string;
  };
}

// External Integration Interfaces
export interface SimulationRequest {
  strategyId: string;
  context: Record<string, any>;
  duration: number;
  iterations: number;
  parameters: Record<string, any>;
}

export interface SimulationResult {
  id: string;
  strategyId: string;
  outcomes: SimulationOutcome[];
  summary: SimulationSummary;
  metrics: Record<string, number>;
  generatedAt: string;
}

export interface SimulationOutcome {
  iteration: number;
  context: Record<string, any>;
  actions: string[];
  result: PatternType;
  reward: number;
  timestamp: string;
}

export interface SimulationSummary {
  totalIterations: number;
  successRate: number;
  averageReward: number;
  variance: number;
  recommendations: string[];
}

export interface PolicyRequest {
  strategyId: string;
  context: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
  applyImmediately: boolean;
}

export interface PolicyResponse {
  policyId: string;
  status: 'applied' | 'queued' | 'rejected';
  appliedAt?: string;
  estimatedImpact?: number;
}

// API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Pattern Insights
export interface PatternInsights {
  pattern: Pattern;
  similarPatterns: Pattern[];
  usageHistory: {
    date: string;
    count: number;
    successRate: number;
  }[];
  performanceMetrics: {
    averageReward: number;
    winRate: number;
    riskScore: number;
  };
  recommendations: string[];
}

// Paginated Request
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}
