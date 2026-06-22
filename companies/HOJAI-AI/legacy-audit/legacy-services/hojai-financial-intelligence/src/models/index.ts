/**
 * HOJAI Financial Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// TRANSACTION MODEL
// ============================================================================

export interface ITransaction extends Document {
  transactionId: string;
  tenantId: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  transactionDate: Date;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  transactionId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  category: { type: String, enum: ['revenue', 'cogs', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'travel', 'other'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  description: String,
  reference: String,
  metadata: { type: Schema.Types.Mixed },
  transactionDate: { type: Date, required: true }
}, { timestamps: true });

TransactionSchema.index({ tenantId: 1, transactionId: 1 }, { unique: true });
TransactionSchema.index({ tenantId: 1, type: 1, transactionDate: -1 });
TransactionSchema.index({ tenantId: 1, category: 1, transactionDate: -1 });

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);

// ============================================================================
// INVOICE MODEL
// ============================================================================

export interface IInvoice extends Document {
  invoiceId: string;
  tenantId: string;
  customerId?: string;
  invoiceNumber: string;
  status: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  invoiceId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  customerId: String,
  invoiceNumber: { type: String, required: true },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  dueDate: { type: Date, required: true },
  paidAt: Date
}, { timestamps: true });

InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, dueDate: 1 });

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

// ============================================================================
// BUDGET MODEL
// ============================================================================

export interface IBudget extends Document {
  budgetId: string;
  tenantId: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  period: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

const BudgetSchema = new Schema<IBudget>({
  budgetId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['revenue', 'cogs', 'marketing', 'salaries', 'rent', 'utilities', 'software', 'travel', 'other'], required: true },
  allocated: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  remaining: { type: Number, required: true },
  period: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
}, { timestamps: true });

BudgetSchema.index({ tenantId: 1, period: 1 });

export const BudgetModel = mongoose.model<IBudget>('Budget', BudgetSchema);

// ============================================================================
// FINANCIAL METRICS MODEL
// ============================================================================

export interface IFinancialMetrics extends Document {
  tenantId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  revenue: { total: number; breakdown: Record<string, number> };
  expenses: { total: number; breakdown: Record<string, number> };
  profit: number;
  profitMargin: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  burnRate: number;
  runway: number;
  computedAt: Date;
}

const FinancialMetricsSchema = new Schema<IFinancialMetrics>({
  tenantId: { type: String, required: true, index: true },
  period: { type: String, enum: ['day', 'week', 'month', 'quarter', 'year'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  revenue: {
    total: { type: Number, default: 0 },
    breakdown: { type: Schema.Types.Mixed, default: {} }
  },
  expenses: {
    total: { type: Number, default: 0 },
    breakdown: { type: Schema.Types.Mixed, default: {} }
  },
  profit: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },
  cashInflow: { type: Number, default: 0 },
  cashOutflow: { type: Number, default: 0 },
  netCashFlow: { type: Number, default: 0 },
  burnRate: { type: Number, default: 0 },
  runway: { type: Number, default: 0 }
}, { timestamps: true });

FinancialMetricsSchema.index({ tenantId: 1, period: 1, startDate: -1 });

export const FinancialMetricsModel = mongoose.model<IFinancialMetrics>('FinancialMetrics', FinancialMetricsSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  Transaction: TransactionModel,
  Invoice: InvoiceModel,
  Budget: BudgetModel,
  FinancialMetrics: FinancialMetricsModel
};

export default models;
