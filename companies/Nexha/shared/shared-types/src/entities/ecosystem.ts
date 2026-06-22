/**
 * Ecosystem Entity Types - Cross-OS entities
 */

import { z } from 'zod';

// ============================================================================
// Trade Finance Entities
// ============================================================================

export const CreditTypeSchema = z.enum(['distributor', 'merchant', 'franchise', 'manufacturer']);
export type CreditType = z.infer<typeof CreditTypeSchema>;

export const CreditStatusSchema = z.enum(['pending', 'approved', 'rejected', 'suspended']);
export type CreditStatus = z.infer<typeof CreditStatusSchema>;

export const BNPLStatusSchema = z.enum(['active', 'paid', 'overdue', 'defaulted']);
export type BNPLStatus = z.infer<typeof BNPLStatusSchema>;

export const LoanTypeSchema = z.enum(['working_capital', 'invoice_discounting', 'equipment', 'expansion']);
export type LoanType = z.infer<typeof LoanTypeSchema>;

export const LoanStatusSchema = z.enum(['pending', 'approved', 'disbursed', 'rejected', 'closed']);
export type LoanStatus = z.infer<typeof LoanStatusSchema>;

// ============================================================================
// Credit Line
// ============================================================================

export interface CreditLine {
  id: string;
  businessId: string;
  businessName: string;
  type: CreditType;
  creditLimit: number;
  usedAmount: number;
  availableAmount: number;
  status: CreditStatus;
  interestRate: number;
  dueDate?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const CreditLineSchema: z.ZodType<CreditLine> = z.object({
  id: z.string().uuid(),
  businessId: z.string(),
  businessName: z.string(),
  type: CreditTypeSchema,
  creditLimit: z.number().nonnegative(),
  usedAmount: z.number().nonnegative(),
  availableAmount: z.number().nonnegative(),
  status: CreditStatusSchema,
  interestRate: z.number(),
  dueDate: z.date().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// BNPL Transaction
// ============================================================================

export interface BNPLTransaction {
  id: string;
  bnplNumber: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  orderId: string;
  orderAmount: number;
  tenure: number;
  emiAmount: number;
  totalPayable: number;
  amountPaid: number;
  status: BNPLStatus;
  dueDate: Date;
  payments: Array<{
    date: Date;
    amount: number;
    method: 'upi' | 'card' | 'bank_transfer';
    reference: string;
  }>;
  createdAt: Date;
}

export const BNPLTransactionSchema: z.ZodType<BNPLTransaction> = z.object({
  id: z.string().uuid(),
  bnplNumber: z.string(),
  buyerId: z.string(),
  buyerName: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  orderId: z.string(),
  orderAmount: z.number().positive(),
  tenure: z.number().positive(),
  emiAmount: z.number().nonnegative(),
  totalPayable: z.number().nonnegative(),
  amountPaid: z.number().nonnegative(),
  status: BNPLStatusSchema,
  dueDate: z.date(),
  payments: z.array(z.object({
    date: z.date(),
    amount: z.number().positive(),
    method: z.enum(['upi', 'card', 'bank_transfer']),
    reference: z.string(),
  })),
  createdAt: z.date(),
});

// ============================================================================
// Loan
// ============================================================================

export interface Loan {
  id: string;
  loanNumber: string;
  businessId: string;
  businessName: string;
  type: LoanType;
  principal: number;
  interestRate: number;
  tenure: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  disbursedAmount: number;
  repaidAmount: number;
  outstandingAmount: number;
  status: LoanStatus;
  disbursedAt?: Date;
  nextDueDate?: Date;
  createdAt: Date;
}

export const LoanSchema: z.ZodType<Loan> = z.object({
  id: z.string().uuid(),
  loanNumber: z.string(),
  businessId: z.string(),
  businessName: z.string(),
  type: LoanTypeSchema,
  principal: z.number().positive(),
  interestRate: z.number(),
  tenure: z.number().positive(),
  emi: z.number().nonnegative(),
  totalInterest: z.number().nonnegative(),
  totalPayable: z.number().nonnegative(),
  disbursedAmount: z.number().nonnegative(),
  repaidAmount: z.number().nonnegative(),
  outstandingAmount: z.number().nonnegative(),
  status: LoanStatusSchema,
  disbursedAt: z.date().optional(),
  nextDueDate: z.date().optional(),
  createdAt: z.date(),
});

// ============================================================================
// Intelligence Entities
// ============================================================================

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export interface DemandForecast {
  productId: string;
  productName: string;
  period: { start: Date; end: Date };
  predictions: Array<{
    date: string;
    predicted: number;
    confidence: number;
    factors: string[];
  }>;
  recommendations: string[];
}

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  breakdown: {
    quality: number;
    delivery: number;
    price: number;
    responsiveness: number;
    compliance: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: RiskLevel;
  recommendations: string[];
}

export interface FraudRisk {
  entityId: string;
  entityType: 'order' | 'supplier' | 'distributor' | 'franchise';
  riskScore: number;
  riskLevel: RiskLevel;
  flags: Array<{
    type: string;
    severity: 'warning' | 'alert' | 'critical';
    description: string;
  }>;
  recommendation: string;
}

export interface ChurnPrediction {
  entityId: string;
  entityType: 'retailer' | 'franchise' | 'distributor';
  churnProbability: number;
  churnRisk: RiskLevel;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  retentionActions: string[];
}
