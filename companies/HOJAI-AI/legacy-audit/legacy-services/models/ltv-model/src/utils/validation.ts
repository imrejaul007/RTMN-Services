/**
 * Zod validation schemas for HOJAI AI LTV Model Service
 */

import { z } from 'zod';

// Feature validation schema
export const ltvFeaturesSchema = z.object({
  totalRevenue: z
    .number()
    .min(0, 'Total revenue must be non-negative')
    .max(10000000, 'Total revenue cannot exceed 10,000,000'),
  orderCount: z
    .number()
    .int('Order count must be an integer')
    .min(0, 'Order count must be non-negative')
    .max(100000, 'Order count cannot exceed 100,000'),
  averageOrderValue: z
    .number()
    .min(0, 'Average order value must be non-negative')
    .max(1000000, 'Average order value cannot exceed 1,000,000'),
  daysActive: z
    .number()
    .int('Days active must be an integer')
    .min(1, 'Days active must be at least 1')
    .max(3650, 'Days active cannot exceed 3650 (10 years)'),
  retentionRate: z
    .number()
    .min(0, 'Retention rate must be non-negative')
    .max(1, 'Retention rate cannot exceed 1'),
});

// LTV prediction request schema
export const ltvPredictionRequestSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .max(100, 'Customer ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Customer ID contains invalid characters'),
  features: ltvFeaturesSchema,
});

// Training sample schema
export const ltvTrainSampleSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .max(100, 'Customer ID too long'),
  features: ltvFeaturesSchema,
  actualLTV: z
    .number()
    .min(0, 'Actual LTV must be non-negative')
    .max(10000000, 'Actual LTV cannot exceed 10,000,000'),
});

// Batch training request schema
export const ltvBatchTrainRequestSchema = z.object({
  samples: z
    .array(ltvTrainSampleSchema)
    .min(1, 'At least one training sample is required')
    .max(50000, 'Cannot exceed 50,000 training samples'),
});

// Model ID schema
export const modelIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Model ID is required')
    .max(100, 'Model ID too long'),
});

// Type exports for use in routes
export type LTVPredictionRequestInput = z.infer<typeof ltvPredictionRequestSchema>;
export type LTVTrainSampleInput = z.infer<typeof ltvTrainSampleSchema>;
export type LTVBatchTrainRequestInput = z.infer<typeof ltvBatchTrainRequestSchema>;
export type ModelIdInput = z.infer<typeof modelIdSchema>;
