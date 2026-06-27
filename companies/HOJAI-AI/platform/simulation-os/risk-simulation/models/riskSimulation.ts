import { z } from 'zod';

// ============================================================================
// Risk Simulation Models - Data structures for risk analysis
// ============================================================================

/**
 * Risk categories
 */
export enum RiskCategory {
  MARKET = 'market',
  CREDIT = 'credit',
  OPERATIONAL = 'operational',
  LIQUIDITY = 'liquidity',
  COMPLIANCE = 'compliance',
  REPUTATIONAL = 'reputational',
  STRATEGIC = 'strategic',
  CYBERSECURITY = 'cybersecurity'
}

/**
 * Risk severity levels
 */
export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Distribution types for Monte Carlo
 */
export enum DistributionType {
  NORMAL = 'normal',
  UNIFORM = 'uniform',
  TRIANGULAR = 'triangular',
  LOGNORMAL = 'lognormal',
  POISSON = 'poisson',
  BERNOULLI = 'bernoulli'
}

/**
 * Risk factor model
 */
export interface RiskFactor {
  id: string;
  name: string;
  category: RiskCategory;
  currentValue: number;
  volatility: number; // Standard deviation
  distribution: DistributionType;
  min?: number;
  max?: number;
  mode?: number; // For triangular distribution
  correlation?: Map<string, number>; // Correlation with other factors
  historicalMean?: number;
  historicalStdDev?: number;
}

/**
 * Asset or portfolio position
 */
export interface Position {
  id: string;
  name: string;
  type: 'equity' | 'bond' | 'commodity' | 'fx' | 'crypto' | 'real_estate' | 'cash';
  value: number;
  exposure: number; // Dollar exposure
  riskFactors: Array<{
    factorId: string;
    sensitivity: number; // Factor sensitivity (beta-like)
  }>;
}

/**
 * Value at Risk calculation parameters
 */
export interface VaRParameters {
  confidenceLevel: number; // 0.95, 0.99, etc.
  timeHorizon: number; // Days
  method: 'historical' | 'variance_covariance' | 'monte_carlo';
  portfolio: Position[];
  riskFactors: RiskFactor[];
}

/**
 * VaR result
 */
export interface VaRResult {
  var: number; // Value at Risk
  cvar: number; // Conditional VaR (Expected Shortfall)
  confidenceLevel: number;
  timeHorizon: number;
  distribution: Array<{ value: number; probability: number }>;
  percentile5: number;
  percentile95: number;
  worstCase: number;
  bestCase: number;
}

/**
 * Scenario model
 */
export interface Scenario {
  id: string;
  name: string;
  probability: number; // 0-1
  description: string;
  factorChanges: Map<string, number>; // Factor ID -> percentage change
  duration: number; // Days to materialize
  recoveryTime?: number; // Days to recover
}

/**
 * Sensitivity analysis result
 */
export interface SensitivityResult {
  factorId: string;
  factorName: string;
  baseValue: number;
  impact: {
    valueChange: number;
    percentageChange: number;
  };
  tornado: {
    low: number;
    base: number;
    high: number;
  };
  contribution: number; // Percentage contribution to total risk
}

/**
 * Stress test result
 */
export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  impact: {
    portfolioValue: number;
    dollarChange: number;
    percentageChange: number;
  };
  recoveryTime?: number;
  cascadingRisks: Array<{
    risk: string;
    impact: number;
    probability: number;
  }>;
  survivability: {
    canRecover: boolean;
    timeToRecovery?: number;
    capitalNeeded?: number;
  };
}

/**
 * Risk simulation request
 */
export interface RiskSimulationRequest {
  simulationId: string;
  name: string;
  description?: string;
  positions: Position[];
  riskFactors: RiskFactor[];
  scenarios?: Scenario[];
  parameters?: {
    iterations?: number;
    confidenceLevel?: number;
    timeHorizon?: number;
    includeVaR?: boolean;
    includeSensitivity?: boolean;
    includeStress?: boolean;
  };
}

/**
 * Monte Carlo simulation result
 */
export interface MonteCarloResult {
  metric: string;
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  percentile5: number;
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  percentile95: number;
  percentile99: number;
  confidenceInterval: [number, number];
  distribution: Array<{ value: number; frequency: number }>;
  normalFit: {
    mu: number;
    sigma: number;
    andersonDarling: number;
    isNormal: boolean;
  };
}

/**
 * Correlation matrix
 */
export interface CorrelationMatrix {
  factors: string[];
  matrix: number[][];
}

/**
 * Risk metric summary
 */
export interface RiskMetrics {
  var: VaRResult;
  expectedReturn: number;
  volatility: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown: {
    value: number;
    percentage: number;
    duration: number;
  };
  beta?: number;
  correlationMatrix?: CorrelationMatrix;
}

/**
 * Risk mitigation recommendation
 */
export interface RiskMitigation {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  recommendation: string;
  expectedImpact: {
    riskReduction: number;
    cost: number;
    implementationTime: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  constraints: string[];
}

/**
 * Risk simulation result
 */
export interface RiskSimulationResult {
  id: string;
  simulationId: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  executionTimeMs: number;

  // Monte Carlo results
  monteCarlo: MonteCarloResult[];
  aggregateMetrics: RiskMetrics;

  // VaR analysis
  varResults: VaRResult[];

  // Sensitivity analysis
  sensitivityAnalysis: SensitivityResult[];

  // Scenario analysis
  scenarioAnalysis: Map<string, {
    scenario: Scenario;
    impact: number;
    probability: number;
  }>;

  // Stress testing
  stressTests: StressTestResult[];

  // Recommendations
  mitigations: RiskMitigation[];

  // Metadata
  metadata: {
    iterations: number;
    confidenceLevel: number;
    timeHorizon: number;
    positionsAnalyzed: number;
    riskFactors: number;
  };
}

/**
 * Zod validation schemas
 */
export const RiskFactorSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.nativeEnum(RiskCategory),
  currentValue: z.number(),
  volatility: z.number().nonnegative(),
  distribution: z.nativeEnum(DistributionType),
  min: z.number().optional(),
  max: z.number().optional(),
  mode: z.number().optional(),
  correlation: z.record(z.string(), z.number()).optional(),
  historicalMean: z.number().optional(),
  historicalStdDev: z.number().optional()
});

export const PositionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['equity', 'bond', 'commodity', 'fx', 'crypto', 'real_estate', 'cash']),
  value: z.number(),
  exposure: z.number(),
  riskFactors: z.array(z.object({
    factorId: z.string(),
    sensitivity: z.number()
  }))
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  probability: z.number().min(0).max(1),
  description: z.string(),
  factorChanges: z.record(z.string(), z.number()),
  duration: z.number().int().nonnegative(),
  recoveryTime: z.number().int().nonnegative().optional()
});

export const RiskSimulationRequestSchema = z.object({
  simulationId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  positions: z.array(PositionSchema),
  riskFactors: z.array(RiskFactorSchema),
  scenarios: z.array(ScenarioSchema).optional(),
  parameters: z.object({
    iterations: z.number().int().min(100).max(100000).default(10000),
    confidenceLevel: z.number().min(0.8).max(0.999).default(0.95),
    timeHorizon: z.number().int().min(1).max(365).default(1),
    includeVaR: z.boolean().default(true),
    includeSensitivity: z.boolean().default(true),
    includeStress: z.boolean().default(true)
  }).optional()
});
