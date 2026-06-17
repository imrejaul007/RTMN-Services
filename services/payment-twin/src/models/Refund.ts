import mongoose, { Document, Schema } from 'mongoose';

// Refund Types
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type RefundReason = 'customer_request' | 'duplicate' | 'fraudulent' | 'order_cancelled' | 'service_not_rendered' | 'product_returned' | 'other';

// Refund Document Interface
export interface IRefund extends Document {
  refundId: string;
  tenantId: string;
  paymentId: string;
  customerId: string;
  orderId?: string;

  // Refund Details
  amount: number;
  currency: string;

  // Status
  status: RefundStatus;
  reason: RefundReason;
  reasonDescription?: string;

  // Gateway Info
  gatewayRefundId?: string;
  gatewayResponse?: Record<string, unknown>;

  // Processing Details
  initiatedBy: string;
  initiatedAt: Date;
  processedAt?: Date;
  estimatedCompletion?: Date;

  // Customer Info
  customerEmail?: string;
  customerPhone?: string;

  // Payment Method (for refund destination)
  originalPaymentMethod?: string;
  refundToWallet?: boolean;

  // Metadata
  metadata?: Record<string, unknown>;
  notes?: string;

  // Transaction Link
  transactionId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Refund Schema
const RefundSchema = new Schema<IRefund>(
  {
    refundId: {
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

    // Refund Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      enum: ['customer_request', 'duplicate', 'fraudulent', 'order_cancelled', 'service_not_rendered', 'product_returned', 'other'],
      required: true,
    },
    reasonDescription: String,

    // Gateway Info
    gatewayRefundId: String,
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },

    // Processing Details
    initiatedBy: {
      type: String,
      required: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    estimatedCompletion: Date,

    // Customer Info
    customerEmail: String,
    customerPhone: String,

    // Payment Method
    originalPaymentMethod: String,
    refundToWallet: {
      type: Boolean,
      default: false,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
    notes: String,

    // Transaction Link
    transactionId: String,
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
RefundSchema.index({ tenantId: 1, status: 1 });
RefundSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
RefundSchema.index({ tenantId: 1, paymentId: 1 });
RefundSchema.index({ tenantId: 1, orderId: 1 });
RefundSchema.index({ createdAt: -1 });

// Static Methods
RefundSchema.statics.generateRefundId = function (tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${tenantId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`;
};

export const Refund = mongoose.model<IRefund>('Refund', RefundSchema);
export default Refund;
