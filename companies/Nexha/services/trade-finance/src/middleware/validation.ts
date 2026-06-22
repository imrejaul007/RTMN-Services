/**
 * Validation Middleware for TradeFinance
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Validation Schemas
// ============================================================================

export const ApplyForCreditSchema = z.object({
  businessId: z.string().uuid(),
  businessName: z.string().min(2).max(200),
  type: z.enum(['distributor', 'merchant', 'franchise', 'manufacturer']),
  requestedLimit: z.number().positive().max(10000000),
  businessType: z.string().min(2).max(100),
  annualRevenue: z.number().nonnegative().optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  existingLoans: z.number().nonnegative().optional(),
});

export const UseCreditSchema = z.object({
  amount: z.number().positive().max(1000000),
  purpose: z.string().min(10).max(500).optional(),
});

export const CreateBNPLSchema = z.object({
  buyerId: z.string().uuid(),
  buyerName: z.string().min(2).max(200),
  sellerId: z.string().uuid(),
  sellerName: z.string().min(2).max(200),
  orderId: z.string().uuid(),
  orderAmount: z.number().positive().max(1000000),
  tenureDays: z.number().int().min(7).max(90).optional().default(30),
});

export const BNPLPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['upi', 'card', 'bank_transfer']),
  reference: z.string().min(5).max(100),
});

export const ApplyForLoanSchema = z.object({
  businessId: z.string().uuid(),
  businessName: z.string().min(2).max(200),
  type: z.enum(['working_capital', 'invoice_discounting', 'equipment', 'expansion']),
  principal: z.number().positive().min(50000).max(10000000),
  tenureMonths: z.number().int().min(3).max(60),
  purpose: z.string().min(10).max(1000),
  collateral: z.object({
    type: z.string(),
    value: z.number().positive(),
    documents: z.array(z.string()).optional(),
  }).optional(),
});

export const LoanPaymentSchema = z.object({
  amount: z.number().positive().max(1000000),
  reference: z.string().min(5).max(100).optional(),
});

export const FinanceInvoiceSchema = z.object({
  businessId: z.string().uuid(),
  businessName: z.string().min(2).max(200),
  buyerId: z.string().uuid(),
  buyerName: z.string().min(2).max(200),
  invoiceAmount: z.number().positive().max(10000000),
  invoiceNumber: z.string().min(3).max(50),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  invoiceDocument: z.string().url().optional(),
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
  applyForCredit: ApplyForCreditSchema,
  useCredit: UseCreditSchema,
  createBNPL: CreateBNPLSchema,
  bnplPayment: BNPLPaymentSchema,
  applyForLoan: ApplyForLoanSchema,
  loanPayment: LoanPaymentSchema,
  financeInvoice: FinanceInvoiceSchema,
};

export type ValidationSchemas = keyof typeof schemas;
