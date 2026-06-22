/**
 * HOJAI Financial Intelligence - Type Definitions
 */

import { z } from 'zod';

// ============================================================================
// FINANCIAL TYPES
// ============================================================================

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum TransactionCategory {
  REVENUE = 'revenue',
  COST_OF_GOODS = 'cogs',
  MARKETING = 'marketing',
  SALARIES = 'salaries',
  RENT = 'rent',
  UTILITIES = 'utilities',
  SOFTWARE = 'software',
  TRAVEL = 'travel',
  OTHER = 'other'
}

// ============================================================================
// TRANSACTION SCHEMA
// ============================================================================

export const TransactionSchema = z.object({
  transactionId: z.string(),
  tenantId: z.string(),
  type: z.nativeEnum(TransactionType),
  category: z.nativeEnum(TransactionCategory),

  amount: z.number(),
  currency: z.string().default('INR'),

  description: z.string().optional(),
  reference: z.string().optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),

  // Dates
  transactionDate: z.date(),
  createdAt: z.date()
});

export type Transaction = z.infer<typeof TransactionSchema>;

// ============================================================================
// FINANCIAL METRICS SCHEMA
// ============================================================================

export const FinancialMetricsSchema = z.object({
  tenantId: z.string(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  startDate: z.date(),
  endDate: z.date(),

  // Revenue
  revenue: z.object({
    total: z.number(),
    breakdown: z.record(z.number())
  }),

  // Expenses
  expenses: z.object({
    total: z.number(),
    breakdown: z.record(z.number())
  }),

  // Profit
  profit: z.number(),
  profitMargin: z.number(),

  // Cash flow
  cashInflow: z.number(),
  cashOutflow: z.number(),
  netCashFlow: z.number(),

  // Metrics
  burnRate: z.number(),
  runway: z.number(), // days

  computedAt: z.date()
});

export type FinancialMetrics = z.infer<typeof FinancialMetricsSchema>;

// ============================================================================
// INVOICE SCHEMA
// ============================================================================

export const InvoiceSchema = z.object({
  invoiceId: z.string(),
  tenantId: z.string(),
  customerId: z.string().optional(),

  invoiceNumber: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),

  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number()
  })),

  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string().default('INR'),

  dueDate: z.date(),
  paidAt: z.date().optional(),

  createdAt: z.date()
});

export type Invoice = z.infer<typeof InvoiceSchema>;

// ============================================================================
// BUDGET SCHEMA
// ============================================================================

export const BudgetSchema = z.object({
  budgetId: z.string(),
  tenantId: z.string(),
  name: z.string(),

  category: z.nativeEnum(TransactionCategory),

  allocated: z.number(),
  spent: z.number(),
  remaining: z.number(),

  period: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.date(),
  endDate: z.date(),

  createdAt: z.date()
});

export type Budget = z.infer<typeof BudgetSchema>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: { timestamp: string; requestId: string; tenantId?: string };
}

export function createResponse<T>(data: T, options?: { tenantId?: string }): APIResponse<T> {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}`, tenantId: options?.tenantId }
  };
}

export function createErrorResponse(code: string, message: string, details?: Record<string, unknown>): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` }
  };
}
