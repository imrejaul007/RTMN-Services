/**
 * Validation Middleware for ProcurementOS
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Validation Schemas
// ============================================================================

export const RegisterSupplierSchema = z.object({
  businessName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number'),
  category: z.string().min(2).max(100),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    pincode: z.string().length(6),
    country: z.string().default('India'),
  }),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/).optional(),
  certifications: z.array(z.string()).optional(),
  bankDetails: z.object({
    accountName: z.string(),
    accountNumber: z.string().min(9).max(18),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    bankName: z.string(),
  }).optional(),
});

export const CreateRFQSchema = z.object({
  buyerId: z.string().uuid(),
  buyerName: z.string().min(2).max(200),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(100),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).max(20),
  deadline: z.string().datetime(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().positive(),
    specifications: z.string().optional(),
    unit: z.string().min(1).max(20),
  })).min(1),
});

export const SubmitQuoteSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string().min(2).max(200),
  price: z.number().positive(),
  currency: z.string().default('INR'),
  deliveryTime: z.number().int().positive(),
  terms: z.string().max(500).optional(),
  validUntil: z.string().datetime(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional(),
});

export const SearchSupplierSchema = z.object({
  category: z.string().optional(),
  verified: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const MarketplaceSearchSchema = z.object({
  category: z.string().optional(),
  inStock: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sortBy: z.enum(['price', 'rating', 'name']).optional(),
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

// Schema registry
const schemas = {
  registerSupplier: RegisterSupplierSchema,
  createRFQ: CreateRFQSchema,
  submitQuote: SubmitQuoteSchema,
  updateOrderStatus: UpdateOrderStatusSchema,
  searchSupplier: SearchSupplierSchema,
  marketplaceSearch: MarketplaceSearchSchema,
};

export type ValidationSchemas = keyof typeof schemas;
