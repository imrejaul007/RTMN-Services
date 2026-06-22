import { z } from 'zod';

export enum CostCategory {
  INFERENCE = 'inference',
  STORAGE = 'storage',
  COMPUTE = 'compute',
  API_CALLS = 'api_calls',
  VECTOR_OPERATIONS = 'vector_operations',
  EVENT_PROCESSING = 'event_processing'
}

export const CostEntrySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().optional(),

  category: z.nativeEnum(CostCategory),
  service: z.string(),
  operation: z.string(),

  // Usage
  quantity: z.number(),
  unit: z.string(),

  // Cost
  unitCost: z.number(),
  totalCost: z.number(),
  currency: z.string().default('USD'),

  // Context
  modelId: z.string().optional(),
  tokensUsed: z.number().optional(),
  latencyMs: z.number().optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),

  createdAt: z.date()
});

export type CostEntry = z.infer<typeof CostEntrySchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  name: z.string(),
  category: z.nativeEnum(CostCategory),

  // Budget limits
  monthlyLimit: z.number(),
  alertThreshold: z.number().default(0.8), // Alert at 80%

  // Current usage
  currentSpend: z.number().default(0),
  lastReset: z.date(),

  // Alerts
  alertsEnabled: z.boolean().default(true),
  alertEmails: z.array(z.string()).optional(),

  active: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Budget = z.infer<typeof BudgetSchema>;

export const CostReportSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.date(),
  endDate: z.date(),

  // Totals
  totalCost: z.number(),
  totalQuantity: z.number(),

  // Breakdown by category
  byCategory: z.record(z.number()),
  byService: z.record(z.number()),
  byUser: z.record(z.number()).optional(),

  // Trends
  vsLastPeriod: z.number(), // percentage change
  vsBudget: z.number(), // percentage of budget

  // Projections
  projectedMonthlyCost: z.number(),
  projectedMonthlyOverBudget: z.number().optional(),

  createdAt: z.date()
});

export type CostReport = z.infer<typeof CostReportSchema>;
