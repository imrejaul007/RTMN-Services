import mongoose, { Document, Schema } from 'mongoose';

// Transaction Types
export type TransactionType = 'payment' | 'refund' | 'withdrawal' | 'deposit' | 'transfer' | 'fee' | 'chargeback' | 'reversal';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';

// Transaction Document Interface
export interface ITransaction extends Document {
  transactionId: string;
  tenantId: string;
  paymentId: string;
  customerId: string;
  orderId?: string;

  // Transaction Details
  type: TransactionType;
  status: TransactionStatus;

  // Amount
  amount: number;
  currency: string;
  fee?: number;
  netAmount: number;

  // Payment Info
  paymentMethod: string;
  gateway?: string;
  gatewayTransactionId?: string;

  // Balance Before/After
  balanceBefore?: number;
  balanceAfter?: number;
  walletId?: string;

  // Customer Info
  customerEmail?: string;
  customerPhone?: string;

  // Description
  description?: string;
  notes?: string;

  // Related References
  refundId?: string;
  relatedTransactionId?: string;

  // Metadata
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Transaction Schema
const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
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
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },

    // Transaction Details
    type: {
      type: String,
      enum: ['payment', 'refund', 'withdrawal', 'deposit', 'transfer', 'fee', 'chargeback', 'reversal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
      default: 'pending',
      index: true,
    },

    // Amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },

    // Payment Info
    paymentMethod: {
      type: String,
      required: true,
    },
    gateway: String,
    gatewayTransactionId: String,

    // Balance
    balanceBefore: Number,
    balanceAfter: Number,
    walletId: String,

    // Customer Info
    customerEmail: String,
    customerPhone: String,

    // Description
    description: String,
    notes: String,

    // Related References
    refundId: String,
    relatedTransactionId: String,

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound Indexes
TransactionSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
TransactionSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ tenantId: 1, paymentId: 1 });
TransactionSchema.index({ tenantId: 1, walletId: 1, createdAt: -1 });
TransactionSchema.index({ customerId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ createdAt: -1 });

// Static Methods
TransactionSchema.statics.generateTransactionId = function (tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${tenantId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`;
};

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
