// ============================================================================
// SUTAR SimulationOS - Type Definitions
// ============================================================================

export interface Config {
  port: number;
  environment: string;
  maxIterations: number;
  defaultConfidenceLevel: number;
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
// Simulation Types
// ============================================================================

export type SimulationType =
  | 'PRICING'
  | 'OFFER'
  | 'CASHBACK'
  | 'BUNDLE'
  | 'STAFFING'
  | 'INVENTORY'
  | 'PROCUREMENT'
  | 'DEMAND'
  | 'RISK'
  | 'CASHFLOW'
  | 'REVENUE'
  | 'COST'
  | 'COMPLIANCE'
  | 'CUSTOM';

export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SimulationRequest {
  name: string;
  type: SimulationType;
  parameters: SimulationParameters;
  iterations?: number;
  confidenceLevel?: number;
  metadata?: Record<string, unknown>;
}

export interface SimulationParameters {
  // Common parameters
  baseValue?: number;
  variance?: number;

  // Pricing specific
  currentPrice?: number;
  priceChange?: number;
  elasticity?: number;
  competitorPrice?: number;

  // Offer/Cashback specific
  offerType?: 'percentage' | 'fixed' | 'bogo';
  offerValue?: number;
  targetAudience?: string;
  estimatedUplift?: number;

  // Bundle specific
  bundleItems?: Array<{ id: string; price: number; cost: number }>;
  discountPercentage?: number;

  // Staffing specific
  currentStaff?: number;
  hoursRequired?: number;
  hourlyRate?: number;
  productivityGain?: number;

  // Inventory specific
  currentStock?: number;
  reorderPoint?: number;
  leadTime?: number;
  carryingCost?: number;
  stockoutCost?: number;

  // Procurement specific
  suppliers?: Array<{ id: string; name: string; price: number; reliability: number; leadTime: number }>;
  quantity?: number;
  currency?: string;

  // Demand specific
  historicalDemand?: number[];
  seasonalityFactor?: number;
  trendFactor?: number;

  // Risk specific
  riskFactors?: Array<{ name: string; probability: number; impact: number }>;

  // Cashflow specific
  inflows?: Array<{ name: string; amount: number; frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'; certainty: number }>;
  outflows?: Array<{ name: string; amount: number; frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'; certainty: number }>;
  openingBalance?: number;
  forecastPeriods?: number;
  workingCapital?: number;

  // Revenue specific
  historicalRevenue?: number[];
  growthRate?: number;
  growthRateVariance?: number;
  seasonality?: Array<{ month: number; factor: number }>;
  pricePerUnit?: number;
  unitsSold?: number;
  marketSize?: number;
  marketShare?: number;

  // Cost specific
  fixedCosts?: number;
  variableCostPerUnit?: number;
  overheadCosts?: Array<{ name: string; amount: number }>;
  costDrivers?: Array<{ name: string; correlation: number }>;

  // Compliance specific
  complianceAreas?: Array<{ area: string; riskLevel: number; penaltyAmount: number }>;
  regulatoryChanges?: Array<{ date: Date | string; description: string; estimatedImpact: number }>;
  auditFindings?: Array<{ year: number; severity: 'low' | 'medium' | 'high' | 'critical'; cost: number }>;
  policyViolations?: Array<{ type: string; frequency: number; averagePenalty: number }>;

  // Custom parameters
  customVars?: Record<string, number>;
}

export interface SimulationResult {
  id: string;
  name: string;
  type: SimulationType;
  status: SimulationStatus;
  scenarios: Scenario[];
  bestScenario: Scenario | null;
  worstScenario: Scenario | null;
  statistics: SimulationStatistics;
  confidenceInterval: ConfidenceInterval;
  riskAssessment: RiskAssessment;
  metadata: SimulationMetadata;
  createdAt: string;
  completedAt?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number | string>;
  outcomes: ScenarioOutcome;
  probability: number;
  confidence: number;
  rank: number;
}

export interface ScenarioOutcome {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  units?: number;
  savings?: number;
  riskScore: number;
  metrics: Record<string, number>;
}

export interface SimulationStatistics {
  totalIterations: number;
  successfulRuns: number;
  failedRuns: number;
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  percentiles: Percentiles;
  distribution: DistributionBucket[];
}

export interface Percentiles {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface DistributionBucket {
  bucket: string;
  count: number;
  percentage: number;
  cumulative: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
  marginOfError: number;
}

export interface RiskAssessment {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  riskMitigation: string[];
  valueAtRisk: number;
  expectedShortfall: number;
}

export interface RiskFactor {
  name: string;
  probability: number;
  impact: number;
  riskContribution: number;
  mitigation: string;
}

export interface SimulationMetadata {
  durationMs: number;
  iterationsCompleted: number;
  convergenceRate: number;
  modelAccuracy: number;
  assumptions: string[];
  warnings: string[];
}

// ============================================================================
// What-If Analysis Types
// ============================================================================

export interface WhatIfAnalysis {
  id: string;
  baseline: Scenario;
  variations: WhatIfVariation[];
  impactSummary: ImpactSummary;
  recommendations: Recommendation[];
}

export interface WhatIfVariation {
  name: string;
  description: string;
  parameterChanges: Record<string, { from: number; to: number }>;
  projectedOutcome: ScenarioOutcome;
  delta: ScenarioOutcome;
  impactScore: number;
}

export interface ImpactSummary {
  totalImpact: number;
  revenueImpact: number;
  costImpact: number;
  riskImpact: number;
  netEffect: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidenceScore: number;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  rationale: string;
  expectedOutcome: ScenarioOutcome;
  confidenceScore: number;
}

// ============================================================================
// Scenario Comparison Types
// ============================================================================

export interface ScenarioComparison {
  id: string;
  scenarios: SimulationResult[];
  metrics: ComparisonMetrics;
  rankings: ScenarioRanking[];
  insights: ComparisonInsight[];
  winner: string;
}

export interface ComparisonMetrics {
  revenue: MetricComparison;
  cost: MetricComparison;
  profit: MetricComparison;
  margin: MetricComparison;
  risk: MetricComparison;
  time: MetricComparison;
}

export interface MetricComparison {
  values: Record<string, number>;
  best: string;
  worst: string;
  spread: number;
  normalizedScores: Record<string, number>;
}

export interface ScenarioRanking {
  scenarioId: string;
  overallRank: number;
  rankScores: Record<string, number>;
  weightedScore: number;
}

export interface ComparisonInsight {
  category: string;
  finding: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ListSimulationsQuery {
  type?: SimulationType;
  status?: SimulationStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ListSimulationsResponse {
  simulations: SimulationResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface RunSimulationRequest {
  name: string;
  type: SimulationType;
  parameters: SimulationParameters;
  iterations?: number;
  confidenceLevel?: number;
  async?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RunSimulationResponse {
  simulationId: string;
  status: 'completed' | 'processing';
  result?: SimulationResult;
}

export interface CompareScenariosRequest {
  simulationIds: string[];
  weights?: Record<string, number>;
}

export interface WhatIfRequest {
  simulationId: string;
  variations: Array<{
    name: string;
    parameterChanges: Record<string, number>;
  }>;
}

// ============================================================================
// Event Types (for Event Bus)
// ============================================================================

export interface SimulationEvent {
  type: 'SIMULATION_STARTED' | 'SIMULATION_COMPLETED' | 'SIMULATION_FAILED';
  simulationId: string;
  timestamp: string;
  data: Partial<SimulationResult>;
}
