import mongoose, { Document, Schema } from 'mongoose';

// Transaction Types
export type TransactionType =
  | 'invoice'
  | 'payment'
  | 'credit'
  | 'debit'
  | 'refund'
  | 'adjustment'
  | 'fee'
  | 'penalty';

// Transaction Status
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

// Payment Method
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'cash' | 'other';

// Transaction Record
export interface ITransaction {
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string;
  reference?: string; // Invoice number, PO number, etc.

  // Dates
  transactionDate: Date;
  dueDate?: Date;
  paidDate?: Date;

  // Payment Details
  paymentMethod?: PaymentMethod;
  paymentReference?: string;

  // Breakdown
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;

  // Attachments
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];

  // Notes
  notes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  createdBy?: string;
}

// Credit Line
export interface ICreditLine {
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  lastUpdated: Date;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
}

// Payment History Summary
export interface IPaymentHistory {
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  totalAmountPaid: number;
  averagePaymentTime: number; // days
  paymentScore: number; // 0-100
}

// Invoice Record
export interface IInvoice {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paidAmount?: number;
  remainingAmount?: number;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

// Interface for Financial Document
export interface IPartnerFinancial extends Document {
  // Core Identification
  financialId: string;
  partnerId: string;
  tenantId: string;

  // Credit Line
  creditLine: ICreditLine;

  // Payment Terms
  paymentTerms: string; // e.g., 'NET30', 'NET60'
  preferredPaymentMethod?: PaymentMethod;
  billingEmail?: string;

  // Currency
  defaultCurrency: string;
  supportedCurrencies: string[];

  // Financial Health
  financialHealthScore: number; // 0-100
  riskRating: 'low' | 'medium' | 'high';
  bankruptcyFlag: boolean;

  // Transactions
  transactions: ITransaction[];

  // Payment History
  paymentHistory: IPaymentHistory;

  // Invoices
  invoices: IInvoice[];

  // Current Period
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    invoicesPaid: number;
    invoicesPending: number;
    invoicesOverdue: number;
  };

  // Aging Buckets
  agingBuckets: {
    current: number; // 0-30 days
    days31to60: number;
    days61to90: number;
    over90days: number;
  };

  // Taxes
  taxId?: string;
  taxExemption?: boolean;
  taxCertificateUrl?: string;

  // Insurance
  hasInsurance: boolean;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  insuranceCoverageAmount?: number;

  // Bonds
  hasBond: boolean;
  bondAmount?: number;
  bondExpiryDate?: Date;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

// Financial Schema
const FinancialSchema = new Schema<IPartnerFinancial>(
  {
    financialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    partnerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    creditLine: {
      creditLimit: { type: Number, default: 0 },
      currentBalance: { type: Number, default: 0 },
      availableCredit: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      lastPaymentDate: Date,
      lastPaymentAmount: Number,
    },

    paymentTerms: {
      type: String,
      default: 'NET30',
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['bank_transfer', 'credit_card', 'debit_card', 'check', 'cash', 'other'],
    },
    billingEmail: String,

    defaultCurrency: {
      type: String,
      default: 'USD',
    },
    supportedCurrencies: [String],

    financialHealthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    riskRating: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    bankruptcyFlag: {
      type: Boolean,
      default: false,
    },

    transactions: [
      {
        transactionId: String,
        type: {
          type: String,
          enum: ['invoice', 'payment', 'credit', 'debit', 'refund', 'adjustment', 'fee', 'penalty'],
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
          required: true,
        },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        description: String,
        reference: String,
        transactionDate: Date,
        dueDate: Date,
        paidDate: Date,
        paymentMethod: String,
        paymentReference: String,
        subtotal: Number,
        tax: Number,
        discount: Number,
        total: Number,
        attachments: [
          {
            name: String,
            url: String,
            type: String,
          },
        ],
        notes: String,
        metadata: Schema.Types.Mixed,
        createdAt: Date,
        createdBy: String,
      },
    ],

    paymentHistory: {
      totalPayments: { type: Number, default: 0 },
      onTimePayments: { type: Number, default: 0 },
      latePayments: { type: Number, default: 0 },
      totalAmountPaid: { type: Number, default: 0 },
      averagePaymentTime: { type: Number, default: 0 },
      paymentScore: { type: Number, default: 50 },
    },

    invoices: [
      {
        invoiceId: String,
        invoiceNumber: String,
        amount: Number,
        currency: String,
        status: String,
        issueDate: Date,
        dueDate: Date,
        paidDate: Date,
        paidAmount: Number,
        remainingAmount: Number,
        lineItems: [
          {
            description: String,
            quantity: Number,
            unitPrice: Number,
            total: Number,
          },
        ],
      },
    ],

    currentPeriod: {
      startDate: Date,
      endDate: Date,
      totalBilled: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      outstandingBalance: { type: Number, default: 0 },
      invoicesPaid: { type: Number, default: 0 },
      invoicesPending: { type: Number, default: 0 },
      invoicesOverdue: { type: Number, default: 0 },
    },

    agingBuckets: {
      current: { type: Number, default: 0 },
      days31to60: { type: Number, default: 0 },
      days61to90: { type: Number, default: 0 },
      over90days: { type: Number, default: 0 },
    },

    taxId: String,
    taxExemption: { type: Boolean, default: false },
    taxCertificateUrl: String,

    hasInsurance: { type: Boolean, default: false },
    insuranceProvider: String,
    insurancePolicyNumber: String,
    insuranceExpiryDate: Date,
    insuranceCoverageAmount: Number,

    hasBond: { type: Boolean, default: false },
    bondAmount: Number,
    bondExpiryDate: Date,

    metadata: Schema.Types.Mixed,

    createdBy: String,
    updatedBy: String,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
FinancialSchema.index({ financialId: 1, tenantId: 1 });
FinancialSchema.index({ partnerId: 1, tenantId: 1 });
FinancialSchema.index({ tenantId: 1, riskRating: 1 });
FinancialSchema.index({ 'creditLine.availableCredit': 1 });
FinancialSchema.index({ 'agingBuckets.over90days': 1 });
FinancialSchema.index({ isDeleted: 1 });

// Virtual for credit utilization percentage
FinancialSchema.virtual('creditUtilization').get(function () {
  if (this.creditLine.creditLimit === 0) return 0;
  return (this.creditLine.currentBalance / this.creditLine.creditLimit) * 100;
});

// Virtual for payment punctuality rate
FinancialSchema.virtual('paymentPunctualityRate').get(function () {
  if (this.paymentHistory.totalPayments === 0) return 100;
  return (this.paymentHistory.onTimePayments / this.paymentHistory.totalPayments) * 100;
});

// Export
export const PartnerFinancial = mongoose.model<IPartnerFinancial>('PartnerFinancial', FinancialSchema);
export default PartnerFinancial;
