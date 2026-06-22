// ============================================================================
// SUTAR SimulationOS - Zod Validators
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Simulation Type Enum
// ============================================================================

export const SimulationTypeSchema = z.enum([
  'PRICING',
  'OFFER',
  'CASHBACK',
  'BUNDLE',
  'STAFFING',
  'INVENTORY',
  'PROCUREMENT',
  'DEMAND',
  'RISK',
  'CASHFLOW',
  'REVENUE',
  'COST',
  'COMPLIANCE',
  'CUSTOM',
]);

// ============================================================================
// Simulation Status Enum
// ============================================================================

export const SimulationStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

// ============================================================================
// Supplier Schema
// ============================================================================

export const SupplierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  reliability: z.number().min(0).max(1),
  leadTime: z.number().positive().int(),
});

// ============================================================================
// Risk Factor Schema
// ============================================================================

export const RiskFactorSchema = z.object({
  name: z.string().min(1),
  probability: z.number().min(0).max(1),
  impact: z.number().min(0).max(100),
});

// ============================================================================
// Simulation Parameters Schema
// ============================================================================

export const SimulationParametersSchema = z.object({
  // Common parameters
  baseValue: z.number().positive().optional(),
  variance: z.number().min(0).max(1).optional(),

  // Pricing specific
  currentPrice: z.number().positive().optional(),
  priceChange: z.number().optional(),
  elasticity: z.number().min(0).max(5).optional(),
  competitorPrice: z.number().positive().optional(),

  // Offer/Cashback specific
  offerType: z.enum(['percentage', 'fixed', 'bogo']).optional(),
  offerValue: z.number().positive().optional(),
  targetAudience: z.string().optional(),
  estimatedUplift: z.number().min(0).max(1).optional(),

  // Bundle specific
  bundleItems: z.array(z.object({
    id: z.string(),
    price: z.number().positive(),
    cost: z.number().nonnegative(),
  })).optional(),

  discountPercentage: z.number().min(0).max(100).optional(),

  // Staffing specific
  currentStaff: z.number().positive().int().optional(),
  hoursRequired: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  productivityGain: z.number().min(0).max(1).optional(),

  // Inventory specific
  currentStock: z.number().positive().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  leadTime: z.number().positive().optional(),
  carryingCost: z.number().nonnegative().optional(),
  stockoutCost: z.number().nonnegative().optional(),

  // Procurement specific
  suppliers: z.array(SupplierSchema).optional(),
  quantity: z.number().positive().optional(),
  currency: z.string().length(3).optional(),

  // Demand specific
  historicalDemand: z.array(z.number().nonnegative()).optional(),
  seasonalityFactor: z.number().positive().optional(),
  trendFactor: z.number().optional(),

  // Risk specific
  riskFactors: z.array(RiskFactorSchema).optional(),

  // Cashflow specific
  inflows: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().nonnegative(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
    certainty: z.number().min(0).max(1),
  })).optional(),
  outflows: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().nonnegative(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
    certainty: z.number().min(0).max(1),
  })).optional(),
  openingBalance: z.number().optional(),
  forecastPeriods: z.number().positive().int().optional(),
  workingCapital: z.number().optional(),

  // Revenue specific
  historicalRevenue: z.array(z.number().nonnegative()).optional(),
  growthRate: z.number().optional(),
  growthRateVariance: z.number().min(0).max(1).optional(),
  seasonality: z.array(z.object({
    month: z.number().min(1).max(12),
    factor: z.number().min(0),
  })).optional(),
  pricePerUnit: z.number().positive().optional(),
  unitsSold: z.number().positive().optional(),
  marketSize: z.number().positive().optional(),
  marketShare: z.number().min(0).max(1).optional(),

  // Cost specific
  fixedCosts: z.number().nonnegative().optional(),
  variableCostPerUnit: z.number().nonnegative().optional(),
  overheadCosts: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().nonnegative(),
  })).optional(),
  costDrivers: z.array(z.object({
    name: z.string().min(1),
    correlation: z.number().min(-1).max(1),
  })).optional(),

  // Compliance specific
  complianceAreas: z.array(z.object({
    area: z.string().min(1),
    riskLevel: z.number().min(0).max(1),
    penaltyAmount: z.number().nonnegative(),
  })).optional(),
  regulatoryChanges: z.array(z.object({
    date: z.string().or(z.date()),
    description: z.string().min(1),
    estimatedImpact: z.number().min(0),
  })).optional(),
  auditFindings: z.array(z.object({
    year: z.number().int(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    cost: z.number().nonnegative(),
  })).optional(),
  policyViolations: z.array(z.object({
    type: z.string().min(1),
    frequency: z.number().min(0),
    averagePenalty: z.number().nonnegative(),
  })).optional(),

  // Custom parameters
  customVars: z.record(z.string(), z.number()).optional(),
});

// ============================================================================
// Run Simulation Request Schema
// ============================================================================

export const RunSimulationRequestSchema = z.object({
  name: z.string().min(1).max(200),
  type: SimulationTypeSchema,
  parameters: SimulationParametersSchema,
  iterations: z.number().int().positive().max(10000).optional().default(1000),
  confidenceLevel: z.number().min(0.5).max(0.99).optional().default(0.95),
  async: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// What-If Request Schema
// ============================================================================

export const WhatIfVariationSchema = z.object({
  name: z.string().min(1).max(100),
  parameterChanges: z.record(z.string(), z.number()),
});

export const WhatIfRequestSchema = z.object({
  simulationId: z.string().min(1),
  variations: z.array(WhatIfVariationSchema).min(1).max(20),
});

// ============================================================================
// Compare Scenarios Request Schema
// ============================================================================

export const CompareScenariosRequestSchema = z.object({
  simulationIds: z.array(z.string().min(1)).min(2).max(10),
  weights: z.record(z.string(), z.number().min(0).max(1)).optional(),
});

// ============================================================================
// List Simulations Query Schema
// ============================================================================

export const ListSimulationsQuerySchema = z.object({
  type: SimulationTypeSchema.optional(),
  status: SimulationStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['createdAt', 'name', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// Intent/Event Schemas
// ============================================================================

export const IntentPayloadSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});

export const EventPayloadSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SimulationType = z.infer<typeof SimulationTypeSchema>;
export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;
export type RunSimulationRequest = z.infer<typeof RunSimulationRequestSchema>;
export type WhatIfRequest = z.infer<typeof WhatIfRequestSchema>;
export type CompareScenariosRequest = z.infer<typeof CompareScenariosRequestSchema>;
export type ListSimulationsQuery = z.infer<typeof ListSimulationsQuerySchema>;