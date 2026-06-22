/**
 * Validation Middleware for FranchiseOS
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateFranchiseSchema = z.object({
  franchiseeName: z.string().min(2).max(100),
  franchiseePhone: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number'),
  franchiseeEmail: z.string().email().optional(),
  brandId: z.string().uuid(),
  locationId: z.string().uuid(),
  locationName: z.string().min(2).max(200),
  type: z.enum(['owned', 'franchise', 'licensed', 'JV', 'partner']),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    zipCode: z.string().length(6).optional(),
    country: z.string().default('India'),
  }),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contract: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    deposit: z.number().positive().optional(),
    setupFee: z.number().positive().optional(),
  }).optional(),
  royalty: z.object({
    type: z.enum(['flat', 'percentage']),
    value: z.number().positive(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    minimumGuarantee: z.number().optional(),
  }).optional(),
});

export const UpdateFranchiseSchema = z.object({
  franchiseeName: z.string().min(2).max(100).optional(),
  franchiseePhone: z.string().regex(/^\+91\d{10}$/).optional(),
  franchiseeEmail: z.string().email().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(2).max(100).optional(),
    state: z.string().min(2).max(100).optional(),
    zipCode: z.string().length(6).optional(),
  }).optional(),
  businessHours: z.record(
    z.string(),
    z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
      closed: z.boolean().optional(),
    })
  ).optional(),
});

export const SuspendFranchiseSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const UpdatePerformanceSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  revenue: z.number().nonnegative(),
  revenueTarget: z.number().nonnegative(),
  orders: z.number().int().nonnegative(),
  ordersTarget: z.number().int().nonnegative(),
  customers: z.number().int().nonnegative().optional(),
  averageOrderValue: z.number().nonnegative(),
  growthRate: z.number().optional(),
  score: z.number().min(0).max(100).optional(),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(2).max(200),
  logo: z.string().url().optional(),
  type: z.enum(['restaurant', 'salon', 'fitness', 'retail', 'service', 'other']),
  defaultRoyalty: z.object({
    type: z.enum(['flat', 'percentage']),
    value: z.number().positive(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    minimumGuarantee: z.number().optional(),
  }).optional(),
  requiredIntegrations: z.array(z.enum(['pos', 'inventory', 'menu', 'loyalty', 'delivery', 'analytics'])).optional(),
});

export const UpdateRoyaltyPaymentSchema = z.object({
  notes: z.string().max(500).optional(),
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

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error.flatten(),
        },
      });
    }

    next();
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path parameters',
          details: result.error.flatten(),
        },
      });
    }

    next();
  };
}

// Schema registry
const schemas = {
  createFranchise: CreateFranchiseSchema,
  updateFranchise: UpdateFranchiseSchema,
  suspendFranchise: SuspendFranchiseSchema,
  updatePerformance: UpdatePerformanceSchema,
  createBrand: CreateBrandSchema,
  updateRoyaltyPayment: UpdateRoyaltyPaymentSchema,
};

export type ValidationSchemas = keyof typeof schemas;
