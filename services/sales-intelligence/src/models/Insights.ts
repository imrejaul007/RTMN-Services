// Sales Intelligence Models

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: PipelineStage;
  probability: number;
  expectedCloseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  territoryId: string;
  accountId: string;
  accountName: string;
  contactId: string;
  productLines: string[];
  tags: string[];
}

export type PipelineStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  averageDealSize: number;
  averageSalesCycle: number;
  stageBreakdown: StageBreakdown[];
  conversionRates: ConversionRate[];
}

export interface StageBreakdown {
  stage: PipelineStage;
  count: number;
  value: number;
  probability: number;
  weightedValue: number;
}

export interface ConversionRate {
  fromStage: PipelineStage;
  toStage: PipelineStage;
  rate: number;
  avgDays: number;
}

export interface PipelineHealth {
  score: number; // 0-100
  status: 'healthy' | 'at_risk' | 'critical';
  factors: HealthFactor[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

export interface HealthFactor {
  name: string;
  value: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
}

export interface Bottleneck {
  stage: PipelineStage;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  resolution: string;
}

// Forecasting Models

export interface Forecast {
  id: string;
  period: string; // e.g., "Q1-2024", "March 2024"
  startDate: Date;
  endDate: Date;
  predictedRevenue: number;
  confidence: number; // 0-1
  range: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
  generatedAt: Date;
  methodology: string;
}

export interface ForecastDataPoint {
  date: Date;
  actualRevenue?: number;
  predictedRevenue?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

export interface ForecastRequest {
  horizon: number; // days
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  includeScenario?: boolean;
  territoryIds?: string[];
  productLines?: string[];
}

export interface QuotaForecast {
  repId: string;
  repName: string;
  quota: number;
  predictedAttainment: number;
  attainmentPercent: number;
  confidence: number;
  atRisk: boolean;
  dealsNeeded: number;
  avgDealSize: number;
}

export interface TerritoryForecast {
  territoryId: string;
  territoryName: string;
  historicalRevenue: number;
  predictedRevenue: number;
  growthRate: number;
  confidence: number;
  topPerformers: string[];
  atRiskDeals: Deal[];
}

// Performance Models

export interface RepPerformance {
  repId: string;
  repName: string;
  teamId: string;
  metrics: RepMetrics;
  period: string;
  trends: PerformanceTrend[];
  comparisons: ComparisonData;
}

export interface RepMetrics {
  revenue: number;
  quota: number;
  attainment: number;
  dealsWon: number;
  dealsLost: number;
  winRate: number;
  averageCycleTime: number;
  averageDealSize: number;
  activities: ActivityMetrics;
  rank?: number;
}

export interface ActivityMetrics {
  calls: number;
  emails: number;
  meetings: number;
  demos: number;
  proposals: number;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  momentum: 'accelerating' | 'decelerating' | 'steady';
}

export interface ComparisonData {
  vsTeamAverage: number;
  vsTopPerformer: number;
  vsQuota: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  managerId: string;
  totalRevenue: number;
  totalQuota: number;
  attainment: number;
  repCount: number;
  topReps: RepPerformance[];
  underperformingReps: RepPerformance[];
  teamHealth: TeamHealth;
}

export interface TeamHealth {
  collaboration: number;
  knowledgeSharing: number;
  mentorship: number;
  morale: number;
}

// Trend Models

export interface TrendAnalysis {
  id: string;
  period: string;
  startDate: Date;
  endDate: Date;
  trends: Trend[];
  insights: Insight[];
  anomalies: Anomaly[];
}

export interface Trend {
  id: string;
  type: 'revenue' | 'deal_velocity' | 'win_rate' | 'deal_size' | 'cycle_time';
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number; // percentage change
  confidence: number;
  description: string;
  contributingFactors: string[];
}

export interface Insight {
  id: string;
  category: 'revenue' | 'pipeline' | 'performance' | 'market';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  confidence: number;
}

export interface Anomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern_break';
  metric: string;
  description: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  possibleCauses: string[];
  investigationStatus: 'pending' | 'investigating' | 'resolved' | 'false_positive';
}

export interface SeasonalPattern {
  month: number;
  dayOfWeek?: number;
  averageRevenue: number;
  dealCount: number;
  winRate: number;
  confidence: number;
  trend: 'strong' | 'moderate' | 'weak';
}

// AI Prediction Models

export interface AIPrediction {
  id: string;
  type: 'deal_won' | 'deal_lost' | 'churn_risk' | 'upsell_opportunity' | 'next_action';
  entityId: string;
  entityType: 'deal' | 'account' | 'rep';
  prediction: number; // 0-1 probability
  confidence: number;
  factors: PredictionFactor[];
  recommendation: string;
  createdAt: Date;
  validUntil: Date;
}

export interface PredictionFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

// API Response Types

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    executionTime?: number;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Event Types for Event Bus

export interface SalesEvent {
  type: string;
  timestamp: Date;
  payload: any;
  source: 'sales-intelligence' | 'sales-hub' | 'crm';
}

export interface ForecastGeneratedEvent extends SalesEvent {
  type: 'forecast.generated';
  payload: {
    forecastId: string;
    period: string;
    predictedRevenue: number;
    confidence: number;
  };
}

export interface AnomalyDetectedEvent extends SalesEvent {
  type: 'anomaly.detected';
  payload: {
    anomalyId: string;
    metric: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    deviation: number;
  };
}

export interface DealHealthChangedEvent extends SalesEvent {
  type: 'deal.health_changed';
  payload: {
    dealId: string;
    previousHealth: number;
    currentHealth: number;
    riskFactors: string[];
  };
}
