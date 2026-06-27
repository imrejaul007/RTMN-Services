import { z } from 'zod';

// ============================================================================
// What-If Analysis Models - Data structures for ad-hoc what-if scenarios
// ============================================================================

/**
 * Question type categories
 */
export enum QuestionType {
  ORGANIZATION = 'organization',
  PRICING = 'pricing',
  MARKET = 'market',
  HIRING = 'hiring',
  FINANCIAL = 'financial',
  OPERATIONS = 'operations',
  TECHNOLOGY = 'technology',
  COMPETITION = 'competition',
  CUSTOM = 'custom'
}

/**
 * Variable type for what-if parameters
 */
export enum VariableType {
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  CURRENCY = 'currency',
  DATE = 'date',
  SELECT = 'select'
}

/**
 * Variable model
 */
export interface WhatIfVariable {
  id: string;
  name: string;
  type: VariableType;
  currentValue: number | boolean | string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // For SELECT type
  description?: string;
}

/**
 * Change assumption for what-if scenario
 */
export interface ChangeAssumption {
  id: string;
  variableId: string;
  newValue: number | boolean | string;
  changeType: 'absolute' | 'percentage' | 'relative';
  changeAmount?: number;
  confidence?: number; // 0-1 confidence in this assumption
  rationale?: string;
}

/**
 * What-if question model
 */
export interface WhatIfQuestion {
  id: string;
  question: string;
  type: QuestionType;
  description?: string;
  variables: WhatIfVariable[];
  assumptions: ChangeAssumption[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculation model for what-if analysis
 */
export interface CalculationModel {
  id: string;
  name: string;
  type: QuestionType;
  formula: string; // Human-readable formula
  variables: Array<{
    id: string;
    coefficient: number;
    isDriver: boolean;
  }>;
  outputMetric: string;
  validation?: {
    minOutput: number;
    maxOutput: number;
    expectedRange?: { min: number; max: number };
  };
}

/**
 * What-if result projection
 */
export interface WhatIfProjection {
  period: string; // e.g., "Year 1", "Month 6"
  baseline: number;
  projected: number;
  change: number;
  changePercent: number;
  confidenceInterval: [number, number];
}

/**
 * Impact analysis
 */
export interface ImpactAnalysis {
  metric: string;
  baseline: number;
  projected: number;
  impact: {
    absolute: number;
    percentage: number;
    confidence: number;
  };
  drivers: Array<{
    assumption: string;
    contribution: number;
    percentage: number;
  }>;
}

/**
 * Comparison between scenarios
 */
export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  projections: WhatIfProjection[];
  impact: ImpactAnalysis[];
  totalImpact: number;
  riskAdjustedImpact: number;
  confidence: number;
  tradeoffs: Array<{
    positive: string[];
    negative: string[];
  }>;
}

/**
 * What-if analysis result
 */
export interface WhatIfResult {
  id: string;
  questionId: string;
  question: string;
  type: QuestionType;

  // Projections over time
  projections: WhatIfProjection[];

  // Detailed impact analysis
  impacts: ImpactAnalysis[];

  // Comparison with baseline
  baselineMetrics: {
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  };
  projectedMetrics: {
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  };

  // Scenario comparison
  comparisons: ScenarioComparison[];

  // Key insights
  insights: Array<{
    type: 'opportunity' | 'risk' | 'recommendation';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;

  // Recommendations
  recommendations: Array<{
    action: string;
    expectedOutcome: string;
    effort: 'low' | 'medium' | 'high';
    timeframe: string;
  }>;

  metadata: {
    createdAt: Date;
    confidenceLevel: number;
    assumptionsUsed: number;
    scenariosCompared: number;
  };
}

/**
 * What-if analysis request
 */
export interface WhatIfAnalysisRequest {
  question: string;
  type: QuestionType;
  description?: string;
  variables: Array<{
    id: string;
    currentValue: number | boolean | string;
  }>;
  changes: Array<{
    variableId: string;
    newValue: number | boolean | string;
    changeType: 'absolute' | 'percentage' | 'relative';
    confidence?: number;
  }>;
  parameters?: {
    timeHorizon?: number;
    scenarios?: number;
    includeComparison?: boolean;
    baselineMetrics?: {
      revenue?: number;
      costs?: number;
      employees?: number;
      customers?: number;
    };
  };
}

/**
 * Predefined what-if templates
 */
export interface WhatIfTemplate {
  id: string;
  name: string;
  type: QuestionType;
  description: string;
  question: string;
  suggestedVariables: WhatIfVariable[];
  calculationModel?: CalculationModel;
}

/**
 * Zod validation schemas
 */
export const WhatIfVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(VariableType),
  currentValue: z.union([z.number(), z.boolean(), z.string()]),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional()
});

export const ChangeAssumptionSchema = z.object({
  id: z.string(),
  variableId: z.string(),
  newValue: z.union([z.number(), z.boolean(), z.string()]),
  changeType: z.enum(['absolute', 'percentage', 'relative']),
  changeAmount: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().optional()
});

export const WhatIfAnalysisRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  type: z.nativeEnum(QuestionType),
  description: z.string().optional(),
  variables: z.array(z.object({
    id: z.string(),
    currentValue: z.union([z.number(), z.boolean(), z.string()])
  })),
  changes: z.array(z.object({
    variableId: z.string(),
    newValue: z.union([z.number(), z.boolean(), z.string()]),
    changeType: z.enum(['absolute', 'percentage', 'relative']),
    confidence: z.number().min(0).max(1).optional()
  })),
  parameters: z.object({
    timeHorizon: z.number().int().min(1).max(60).default(12),
    scenarios: z.number().int().min(2).max(10).default(3),
    includeComparison: z.boolean().default(true),
    baselineMetrics: z.object({
      revenue: z.number().optional(),
      costs: z.number().optional(),
      employees: z.number().optional(),
      customers: z.number().optional()
    }).optional()
  }).optional()
});

export const WhatIfTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(QuestionType),
  description: z.string(),
  question: z.string(),
  suggestedVariables: z.array(WhatIfVariableSchema)
});
