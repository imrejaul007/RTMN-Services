// ============================================================================
// SUTAR Decision Engine - Zod Validators
// ============================================================================

import { z } from 'zod';
import type { ConditionOperator, RiskLevel } from '../types/index.js';
import { ConditionOperator as ConditionOperatorEnum, DecisionOutcome, DecisionType } from '../types/index.js';

/**
 * Condition schema for policy rules
 */
export const ConditionSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: z.nativeEnum(ConditionOperatorEnum, {
    errorMap: () => ({ message: 'Invalid condition operator' }),
  }),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

/**
 * Policy rule schema
 */
export const PolicyRuleSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
  name: z.string().min(1, 'Rule name is required'),
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required'),
  conditionLogic: z.enum(['AND', 'OR']),
  outcome: z.nativeEnum(DecisionOutcome),
  priority: z.number().int().min(0),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * Decision context schema
 */
export const DecisionContextSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  decisionType: z.nativeEnum(DecisionType),
  amount: z.number().optional(),
  currency: z.string().optional(),
  customerTier: z.enum(['standard', 'premium', 'vip']).optional(),
  customerAge: z.number().optional(),
  accountAge: z.number().optional(),
  transactionCount: z.number().optional(),
  riskScore: z.number().optional(),
  previousDecisions: z.array(z.object({
    type: z.nativeEnum(DecisionType),
    outcome: z.nativeEnum(DecisionOutcome),
    timestamp: z.string(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Decision request schema
 */
export const DecisionRequestSchema = z.object({
  context: DecisionContextSchema,
  skipRiskAssessment: z.boolean().optional().default(false),
  overridePolicyId: z.string().optional(),
});

/**
 * Scenario variation schema for simulation
 */
export const ScenarioVariationSchema = z.object({
  name: z.string().min(1, 'Variation name is required'),
  modifications: DecisionContextSchema.partial(),
});

/**
 * Simulation request schema
 */
export const SimulationRequestSchema = z.object({
  context: DecisionContextSchema,
  scenarioVariations: z.array(ScenarioVariationSchema).min(1, 'At least one variation is required'),
  comparePolicies: z.boolean().optional().default(false),
});

/**
 * Health check query schema
 */
export const HealthCheckQuerySchema = z.object({
  detailed: z.enum(['true', 'false']).optional().default('false'),
});

/**
 * Stats query schema
 */
export const StatsQuerySchema = z.object({
  reset: z.enum(['true', 'false']).optional().default('false'),
});

// Type exports
export type ConditionInput = z.infer<typeof ConditionSchema>;
export type PolicyRuleInput = z.infer<typeof PolicyRuleSchema>;
export type DecisionContextInput = z.infer<typeof DecisionContextSchema>;
export type DecisionRequestInput = z.infer<typeof DecisionRequestSchema>;
export type ScenarioVariationInput = z.infer<typeof ScenarioVariationSchema>;
export type SimulationRequestInput = z.infer<typeof SimulationRequestSchema>;
