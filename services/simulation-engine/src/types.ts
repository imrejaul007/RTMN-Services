import { z } from 'zod';

// Business Metric Types
export interface MetricImpact {
  metric: string;
  baseline: number;
  projected: number;
  change: number;
  changePercent: number;
  confidence: number;
}

export interface ImpactSummary {
  csat: MetricImpact;
  revenue: MetricImpact;
  churn: MetricImpact;
  supportCost: MetricImpact;
  netImpact: MetricImpact;
}

// Scenario Types
export enum ScenarioCategory {
  PRICING = 'pricing',
  REFUND = 'refund',
  PROMOTION = 'promotion',
  SERVICE = 'service',
  OPERATIONAL = 'operational',
  CUSTOMER = 'customer',
  FINANCIAL = 'financial',
  MARKETING = 'marketing',
}

export enum ScenarioType {
  WHAT_IF = 'what_if',
  COMPARATIVE = 'comparative',
  SENSITIVITY = 'sensitivity',
  MONTE_CARLO = 'monte_carlo',
  STRESS_TEST = 'stress_test',
}

export interface ScenarioParameter {
  name: string;
  currentValue: number;
  proposedValue: number;
  minValue?: number;
  maxValue?: number;
  unit: string;
  category: ScenarioCategory;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  type: ScenarioType;
  parameters: ScenarioParameter[];
  constraints: Record<string, number>;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isActive: boolean;
}

// Simulation Types
export enum SimulationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum SimulationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface MonteCarloConfig {
  iterations: number;
  confidenceLevel: number;
  distribution: 'normal' | 'uniform' | 'exponential' | 'poisson';
  seed?: number;
}

export interface SimulationConfig {
  scenarioId: string;
  monteCarlo: MonteCarloConfig;
  timeHorizon: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  sensitivityAnalysis: boolean;
  parallelRuns: number;
}

export interface Simulation {
  id: string;
  name: string;
  description: string;
  scenarioId: string;
  tenantId: string;
  status: SimulationStatus;
  priority: SimulationPriority;
  config: SimulationConfig;
  results?: SimulationResults;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Result Types
export interface StatisticalMetrics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
  percentile99: number;
  variance: number;
  skewness?: number;
  kurtosis?: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface MetricProjection {
  metric: string;
  baseline: number;
  projections: TimeSeriesPoint[];
  statistics: StatisticalMetrics;
  distribution: Record<string, number>;
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  impactSummary: ImpactSummary;
  riskScore: number;
  recommendation: string;
}

export interface RiskAnalysis {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    probability: number;
    impact: number;
    mitigation?: string;
  }>;
  valueAtRisk: number;
  confidenceInterval: [number, number];
}

export interface SimulationResults {
  summary: {
    totalIterations: number;
    successfulIterations: number;
    failedIterations: number;
    executionTime: number;
    confidenceLevel: number;
  };
  metrics: {
    csat: MetricProjection;
    revenue: MetricProjection;
    churn: MetricProjection;
    supportCost: MetricProjection;
    netRevenue: MetricProjection;
  };
  impactSummary: ImpactSummary;
  scenarios: ScenarioComparison[];
  riskAnalysis: RiskAnalysis;
  timeSeries: TimeSeriesPoint[];
  recommendations: Array<{
    priority: number;
    title: string;
    description: string;
    expectedImpact: number;
    confidence: number;
    caveats?: string[];
  }>;
}

// API Types
export interface CreateScenarioRequest {
  name: string;
  description: string;
  category: ScenarioCategory;
  type: ScenarioType;
  parameters: ScenarioParameter[];
  constraints?: Record<string, number>;
  tags?: string[];
  tenantId: string;
}

export interface RunSimulationRequest {
  name?: string;
  description?: string;
  scenarioId: string;
  tenantId: string;
  priority?: SimulationPriority;
  monteCarlo?: Partial<MonteCarloConfig>;
  timeHorizon?: {
    start: Date;
    end: Date;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  };
  sensitivityAnalysis?: boolean;
  parallelRuns?: number;
  createdBy: string;
}

export interface CompareScenariosRequest {
  scenarioIds: string[];
  tenantId: string;
}

export interface QueryParams {
  tenantId: string;
  status?: SimulationStatus;
  category?: ScenarioCategory;
  type?: ScenarioType;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Validation Schemas
export const ScenarioParameterSchema = z.object({
  name: z.string().min(1),
  currentValue: z.number(),
  proposedValue: z.number(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  unit: z.string().min(1),
  category: z.nativeEnum(ScenarioCategory),
});

export const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  category: z.nativeEnum(ScenarioCategory),
  type: z.nativeEnum(ScenarioType),
  parameters: z.array(ScenarioParameterSchema).min(1),
  constraints: z.record(z.string(), z.number()).optional(),
  tags: z.array(z.string()).optional(),
  tenantId: z.string().min(1),
});

export const RunSimulationSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  scenarioId: z.string().min(1),
  tenantId: z.string().min(1),
  priority: z.nativeEnum(SimulationPriority).optional(),
  monteCarlo: z.object({
    iterations: z.number().min(100).max(10000).optional(),
    confidenceLevel: z.number().min(0).max(1).optional(),
    distribution: z.enum(['normal', 'uniform', 'exponential', 'poisson']).optional(),
    seed: z.number().optional(),
  }).optional(),
  timeHorizon: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
  }).optional(),
  sensitivityAnalysis: z.boolean().optional(),
  parallelRuns: z.number().min(1).max(10).optional(),
  createdBy: z.string().min(1),
});

// Default Impact Model Coefficients
export const DEFAULT_IMPACT_COEFFICIENTS = {
  csat: {
    refundSensitivity: 0.3,
    supportResponseTime: 0.25,
    resolutionRate: 0.35,
    customerEffort: -0.15,
  },
  revenue: {
    refundRate: -0.8,
    csatImpact: 0.15,
    churnImpact: -0.25,
    promotionUplift: 0.12,
  },
  churn: {
    csatThreshold: 0.7,
    csatImpact: -0.4,
    refundFrequency: 0.2,
    supportContacts: 0.15,
  },
  supportCost: {
    refundAmount: 0.05,
    csatImpact: -0.1,
    complexityFactor: 0.3,
    resolutionTime: 0.2,
  },
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
