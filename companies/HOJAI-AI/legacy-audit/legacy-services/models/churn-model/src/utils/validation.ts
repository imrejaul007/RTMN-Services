/**
 * Zod validation schemas for HOJAI AI Churn Model Service
 */

import { z } from 'zod';

// Feature validation schema
export const featuresSchema = z.object({
  daysSinceLastPurchase: z
    .number()
    .min(0, 'Days since last purchase must be non-negative')
    .max(365, 'Days since last purchase cannot exceed 365'),
  totalOrders: z
    .number()
    .int('Total orders must be an integer')
    .min(0, 'Total orders must be non-negative')
    .max(10000, 'Total orders cannot exceed 10000'),
  averageOrderValue: z
    .number()
    .min(0, 'Average order value must be non-negative')
    .max(1000000, 'Average order value cannot exceed 1,000,000'),
  engagementScore: z
    .number()
    .min(0, 'Engagement score must be non-negative')
    .max(100, 'Engagement score cannot exceed 100'),
  supportTickets: z
    .number()
    .int('Support tickets must be an integer')
    .min(0, 'Support tickets must be non-negative')
    .max(1000, 'Support tickets cannot exceed 1000'),
});

// Churn prediction request schema
export const churnPredictionRequestSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .max(100, 'Customer ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Customer ID contains invalid characters'),
  features: featuresSchema,
});

// Training request schema
export const trainRequestSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .max(100, 'Customer ID too long'),
  features: featuresSchema,
  label: z.boolean({ message: 'Label must be a boolean' }),
});

// Batch training request schema
export const batchTrainRequestSchema = z.object({
  samples: z
    .array(trainRequestSchema)
    .min(1, 'At least one training sample is required')
    .max(10000, 'Cannot exceed 10000 training samples'),
});

// Model ID schema
export const modelIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Model ID is required')
    .max(100, 'Model ID too long'),
});

// Type exports for use in routes
export type ChurnPredictionRequestInput = z.infer<typeof churnPredictionRequestSchema>;
export type TrainRequestInput = z.infer<typeof trainRequestSchema>;
export type BatchTrainRequestInput = z.infer<typeof batchTrainRequestSchema>;
export type ModelIdInput = z.infer<typeof modelIdSchema>;
