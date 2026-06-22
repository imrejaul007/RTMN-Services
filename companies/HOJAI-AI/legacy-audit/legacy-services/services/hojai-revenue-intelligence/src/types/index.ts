/**
 * HOJAI Revenue Intelligence - Type Definitions
 * Port: 4757
 */

import { z } from 'zod';

export const MetricTypeSchema = z.enum(['arr', 'mrr', 'revenue', 'new_revenue', 'expansion', 'churn', 'net_new', 'ltv', 'cac', 'burn_rate', 'runway_months']);
export type MetricType = z.infer<typeof MetricTypeSchema>;

export const RevenueMetricSchema = z.object({
  id: z.string().uuid(),
  metricType: MetricTypeSchema,
  value: z.number(),
  currency: z.string().default('USD'),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.date(),
  endDate: z.date(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date().default(() => new Date()),
});
export type RevenueMetric = z.infer<typeof RevenueMetricSchema>;

export const ForecastSchema = z.object({
  id: z.string().uuid(),
  metricType: MetricTypeSchema,
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1),
  horizon: z.number(), // months ahead
  model: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date().default(() => new Date()),
});
export type Forecast = z.infer<typeof ForecastSchema>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['churn_risk', 'revenue_drop', 'burn_rate', 'milestone', 'opportunity']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  metricValue: z.number().optional(),
  threshold: z.number().optional(),
  acknowledged: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});
export type Alert = z.infer<typeof AlertSchema>;

export const CreateMetricRequestSchema = z.object({
  metricType: MetricTypeSchema,
  value: z.number(),
  currency: z.string().default('USD'),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string(),
  endDate: z.string(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateMetricRequest = z.infer<typeof CreateMetricRequestSchema>;

export const QuerySchema = z.object({
  metricType: MetricTypeSchema.optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(365).default(30),
});
export type Query = z.infer<typeof QuerySchema>;

export function validateMetric(data: unknown): RevenueMetric { return RevenueMetricSchema.parse(data); }
export function validateForecast(data: unknown): Forecast { return ForecastSchema.parse(data); }
export function validateAlert(data: unknown): Alert { return AlertSchema.parse(data); }
export function validateCreateMetricRequest(data: unknown): CreateMetricRequest { return CreateMetricRequestSchema.parse(data); }

export function calculateChurnRate(churned: number, total: number): number {
  return total > 0 ? (churned / total) * 100 : 0;
}

export function calculateCAC(marketingCost: number, newCustomers: number): number {
  return newCustomers > 0 ? marketingCost / newCustomers : 0;
}

export function calculateLTV(revenue: number, churnRate: number): number {
  return churnRate > 0 ? revenue / (churnRate / 100) : revenue * 12;
}

export function calculateRunwayMonths(cash: number, burnRate: number): number {
  return burnRate > 0 ? cash / burnRate : 999;
}
