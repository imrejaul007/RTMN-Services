/**
 * Validation Middleware for ManufacturingOS
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateBOMSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(2).max(200),
  version: z.string().default('1.0'),
  components: z.array(z.object({
    itemId: z.string().uuid(),
    itemName: z.string().min(1).max(200),
    quantity: z.number().positive(),
    unit: z.string().min(1).max(20),
    scrapRate: z.number().min(0).max(100).optional().default(0),
    isOptional: z.boolean().optional().default(false),
  })).min(1),
  labor: z.array(z.object({
    operationId: z.string(),
    operationName: z.string(),
    timeInMinutes: z.number().positive(),
    laborCost: z.number().nonnegative(),
  })).optional(),
  overhead: z.number().nonnegative().optional().default(0),
  notes: z.string().max(1000).optional(),
});

export const CreateProductionOrderSchema = z.object({
  bomId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().min(2).max(200),
  quantity: z.number().int().positive(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const CompleteProductionSchema = z.object({
  quantity: z.number().int().positive(),
  qualityPassed: z.boolean(),
  notes: z.string().max(500).optional(),
});

export const AddQualityCheckSchema = z.object({
  check: z.enum(['visual', 'dimensional', 'functional', 'material', 'safety']),
  result: z.enum(['pass', 'fail', 'conditional']),
  notes: z.string().max(500).optional(),
  inspector: z.string().min(2).max(100).optional(),
});

export const MRPCalculationSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  warehouseId: z.string().uuid().optional(),
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
  createBOM: CreateBOMSchema,
  createProductionOrder: CreateProductionOrderSchema,
  completeProduction: CompleteProductionSchema,
  addQualityCheck: AddQualityCheckSchema,
  mrpCalculation: MRPCalculationSchema,
};

export type ValidationSchemas = keyof typeof schemas;
