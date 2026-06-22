import mongoose, { Document, Schema } from 'mongoose';

// Invoice Model
export interface IInvoice extends Document {
  invoiceId: string;
  fromCorpId: string;
  toCorpId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  paidAmount?: number;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromCorpId: {
      type: String,
      required: true,
      index: true,
    },
    toCorpId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    lineItems: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
InvoiceSchema.index({ fromCorpId: 1, status: 1 });
InvoiceSchema.index({ toCorpId: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });

// Settlement Model
export interface ISettlement extends Document {
  settlementId: string;
  period: {
    start: Date;
    end: Date;
    month: string; // Format: YYYY-MM
  };
  transactions: {
    invoiceId: string;
    fromCorpId: string;
    toCorpId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'settled' | 'failed';
  }[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  executedAt?: Date;
  summary: {
    totalTransactions: number;
    totalVolume: number;
    settledCount: number;
    pendingCount: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    settlementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      month: { type: String, required: true, index: true },
    },
    transactions: [
      {
        invoiceId: { type: String, required: true },
        fromCorpId: { type: String, required: true },
        toCorpId: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'settled', 'failed'],
          default: 'pending',
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    executedAt: {
      type: Date,
    },
    summary: {
      totalTransactions: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      settledCount: { type: Number, default: 0 },
      pendingCount: { type: Number, default: 0 },
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Reconciliation Model
export interface IReconciliation extends Document {
  reconciliationId: string;
  period: {
    start: Date;
    end: Date;
    month: string;
  };
  companies: string[];
  discrepancies: {
    companyId: string;
    type: 'amount_mismatch' | 'missing_transaction' | 'duplicate_transaction';
    description: string;
    amount: number;
    resolution?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
  }[];
  balances: {
    corpId: string;
    expectedBalance: number;
    actualBalance: number;
    difference: number;
  }[];
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

const ReconciliationSchema = new Schema<IReconciliation>(
  {
    reconciliationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      month: { type: String, required: true, index: true },
    },
    companies: [
      {
        type: String,
        required: true,
      },
    ],
    discrepancies: [
      {
        companyId: { type: String, required: true },
        type: {
          type: String,
          enum: ['amount_mismatch', 'missing_transaction', 'duplicate_transaction'],
          required: true,
        },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        resolution: { type: String },
        resolvedAt: { type: Date },
        resolvedBy: { type: String },
      },
    ],
    balances: [
      {
        corpId: { type: String, required: true },
        expectedBalance: { type: Number, required: true },
        actualBalance: { type: Number, required: true },
        difference: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
      index: true,
    },
    completedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Export models
export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
export const Reconciliation = mongoose.model<IReconciliation>('Reconciliation', ReconciliationSchema);

export default {
  Invoice,
  Settlement,
  Reconciliation,
};
