/**
 * Validation Middleware for IntelligenceLayer
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Validation Schemas
// ============================================================================

export const DemandForecastSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(2).max(200),
  periodDays: z.number().int().min(1).max(90).optional().default(7),
  locationId: z.string().uuid().optional(),
});

export const ReorderPredictionSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(2).max(200),
  currentStock: z.number().int().nonnegative(),
  historicalSales: z.array(z.number().int().nonnegative()).min(3).optional(),
});

export const SupplierScoreSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string().min(2).max(200),
  qualityScore: z.number().min(0).max(100).optional(),
  deliveryScore: z.number().min(0).max(100).optional(),
  priceScore: z.number().min(0).max(100).optional(),
  responsivenessScore: z.number().min(0).max(100).optional(),
  complianceScore: z.number().min(0).max(100).optional(),
  historicalData: z.object({
    onTimeDeliveries: z.number().int().nonnegative(),
    totalDeliveries: z.number().int().positive(),
    qualityReturns: z.number().int().nonnegative(),
    totalOrders: z.number().int().positive(),
    priceVariance: z.number(),
    avgResponseTime: z.number().nonnegative(),
  }).optional(),
});

export const TerritoryInsightsSchema = z.object({
  territoryId: z.string().uuid(),
  territoryName: z.string().min(2).max(200),
  totalRetailers: z.number().int().positive(),
  activeRetailers: z.number().int().nonnegative(),
  avgOrderValue: z.number().nonnegative(),
  monthlyGrowth: z.number().optional(),
});

export const FraudDetectionSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['order', 'supplier', 'distributor', 'franchise']),
  orderValue: z.number().positive().optional(),
  unusualPatterns: z.array(z.string()).optional(),
  blacklistedPatterns: z.array(z.string()).optional(),
  velocityAnomaly: z.boolean().optional(),
  addressMismatch: z.boolean().optional(),
});

export const ChurnPredictionSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['retailer', 'franchise', 'distributor']),
  daysSinceLastOrder: z.number().int().nonnegative().optional(),
  orderFrequencyTrend: z.enum(['increasing', 'stable', 'decreasing']).optional(),
  avgOrderValueTrend: z.enum(['increasing', 'stable', 'decreasing']).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  complaintCount: z.number().int().nonnegative().optional(),
  competitorActivity: z.boolean().optional(),
});

// ============================================================================
// Validation Middleware Factory
// ============================================================================

export function validateRequest(schemaName: keyof typeof schemas) {
  const schema = schemas[schemaName];

  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.flatten(),
        },
      });
    }

    req.body = result.data;
    next();
  };
}

// Schema registry
const schemas = {
  demandForecast: DemandForecastSchema,
  reorderPrediction: ReorderPredictionSchema,
  supplierScore: SupplierScoreSchema,
  territoryInsights: TerritoryInsightsSchema,
  fraudDetection: FraudDetectionSchema,
  churnPrediction: ChurnPredictionSchema,
};

export type ValidationSchemas = keyof typeof schemas;
