import { z } from 'zod';

// Common schemas
export const positiveNumber = z.number().positive();
export const nonNegativeNumber = z.number().min(0);
export const percentage = z.number().min(0).max(100);
export const currencySchema = z.string().min(3).max(3).default('USD');

// ROI Calculation Schema
export const roiCalculationSchema = z.object({
  initialInvestment: z.number().positive('Initial investment must be positive'),
  finalValue: z.number().min(0, 'Final value cannot be negative'),
  timePeriod: z.number().positive('Time period must be positive').int('Time period must be an integer'),
  currency: currencySchema.optional(),
});

// Cost Benefit Analysis Schema
export const costBenefitSchema = z.object({
  investmentId: z.string().uuid().optional(),
  costs: z.array(z.object({
    name: z.string().min(1, 'Cost name is required'),
    amount: z.number().positive('Cost amount must be positive'),
    type: z.enum(['initial', 'operational', 'maintenance', 'scaling', 'other']),
    timing: z.enum(['immediate', 'recurring']),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    durationDays: z.number().positive().int().optional(),
  })).min(1, 'At least one cost is required'),
  benefits: z.array(z.object({
    name: z.string().min(1, 'Benefit name is required'),
    amount: z.number().positive('Benefit amount must be positive'),
    type: z.enum(['revenue', 'cost_savings', 'efficiency', 'other']),
    timing: z.enum(['immediate', 'recurring']),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    durationDays: z.number().positive().int().optional(),
  })).min(1, 'At least one benefit is required'),
  timeHorizon: z.number().positive('Time horizon must be positive').int(),
  discountRate: z.number().min(0).max(100).optional().default(0),
  currency: currencySchema.optional(),
});

// Break-Even Analysis Schema
export const breakEvenSchema = z.object({
  fixedCosts: z.number().positive('Fixed costs must be positive'),
  variableCostPerUnit: z.number().min(0, 'Variable cost cannot be negative'),
  pricePerUnit: z.number().positive('Price per unit must be positive'),
  expectedUnitsPerDay: z.number().positive().int().optional(),
  currency: currencySchema.optional(),
});

// Profit Margin Schema
export const profitMarginSchema = z.object({
  revenue: z.number().positive('Revenue must be positive'),
  costOfGoodsSold: z.number().min(0).optional().default(0),
  operatingExpenses: z.number().min(0).optional().default(0),
  otherExpenses: z.number().min(0).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(0),
  currency: currencySchema.optional(),
});

// Investment Projection Schema
export const projectionSchema = z.object({
  initialInvestment: z.number().positive('Initial investment must be positive'),
  expectedAnnualReturn: z.number().min(-100).max(1000),
  volatility: z.number().min(0).max(100).optional().default(0),
  years: z.number().positive().int('Years must be a positive integer'),
  monthlyContribution: z.number().min(0).optional().default(0),
  inflationRate: z.number().min(0).max(50).optional().default(0),
  currency: currencySchema.optional(),
});

// Create Investment Schema
export const createInvestmentSchema = z.object({
  name: z.string().min(1, 'Investment name is required').max(200),
  description: z.string().max(1000).optional(),
  initialInvestment: z.number().positive('Initial investment must be positive'),
  currency: currencySchema.optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }),
  endDate: z.string().datetime({ message: 'Invalid date format' }).optional(),
  expectedReturn: z.number().optional(),
  costs: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['initial', 'operational', 'maintenance', 'scaling', 'other']),
    date: z.string().datetime(),
    recurring: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  })).optional(),
  benefits: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['revenue', 'cost_savings', 'efficiency', 'other']),
    date: z.string().datetime(),
    recurring: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  })).optional(),
});

// Update Investment Schema
export const updateInvestmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  expectedReturn: z.number().optional(),
  actualReturn: z.number().optional(),
  status: z.enum(['active', 'completed', 'cancelled', 'pending']).optional(),
  costs: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['initial', 'operational', 'maintenance', 'scaling', 'other']),
    date: z.string().datetime(),
    recurring: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  })).optional(),
  benefits: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['revenue', 'cost_savings', 'efficiency', 'other']),
    date: z.string().datetime(),
    recurring: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  })).optional(),
});

// Performance Request Schema
export const performanceRequestSchema = z.object({
  investmentId: z.string().uuid('Invalid investment ID'),
  benchmarkValue: z.number().optional(),
  riskFreeRate: z.number().min(0).max(100).optional(),
  includeRiskMetrics: z.boolean().optional().default(false),
});

// Record Return Schema
export const recordReturnSchema = z.object({
  investmentId: z.string().uuid('Invalid investment ID'),
  returnAmount: z.number(),
});

// Simulation ROI Schema
export const simulationROISchema = z.object({
  initialInvestment: z.number().positive(),
  expectedReturn: z.number().min(-100).max(1000),
  volatility: z.number().min(0).max(100).optional().default(0),
  years: z.number().positive().int(),
  scenarios: z.array(z.object({
    name: z.string(),
    probability: z.number().min(0).max(100),
    returnModifier: z.number(),
  })).optional(),
});

// Type exports for validators
export type ROICalculationInput = z.infer<typeof roiCalculationSchema>;
export type CostBenefitInput = z.infer<typeof costBenefitSchema>;
export type BreakEvenInput = z.infer<typeof breakEvenSchema>;
export type ProfitMarginInput = z.infer<typeof profitMarginSchema>;
export type ProjectionInput = z.infer<typeof projectionSchema>;
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
export type PerformanceRequestInput = z.infer<typeof performanceRequestSchema>;
export type RecordReturnInput = z.infer<typeof recordReturnSchema>;
export type SimulationROIInput = z.infer<typeof simulationROISchema>;
