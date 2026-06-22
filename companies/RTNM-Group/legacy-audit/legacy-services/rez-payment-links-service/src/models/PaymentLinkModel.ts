import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export interface IPaymentLink extends Document {
  merchantId: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: PaymentStatus;
  upiId: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  redirectUrl?: string;
  shortUrl?: string;
  qrCodeDataUrl?: string;
  transactionId?: string;
  paidAt?: Date;
  paymentMethod?: string;
  maxUsageCount?: number;
  currentUsageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>({
  merchantId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'INR' },
  purpose: { type: String, required: true },
  description: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true
  },
  upiId: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  metadata: { type: Schema.Types.Mixed },
  webhookUrl: { type: String },
  redirectUrl: { type: String },
  shortUrl: { type: String, index: true },
  qrCodeDataUrl: { type: String },
  transactionId: { type: String, index: true },
  paidAt: { type: Date },
  paymentMethod: { type: String },
  maxUsageCount: { type: Number },
  currentUsageCount: { type: Number, default: 0 },
}, {
  timestamps: true
});

// Compound indexes for common queries
PaymentLinkSchema.index({ merchantId: 1, createdAt: -1 });
PaymentLinkSchema.index({ status: 1, expiresAt: 1 });

// Index for finding by shortId via regex on shortUrl
PaymentLinkSchema.index({ shortUrl: 1 });

export const PaymentLinkModel = mongoose.model<IPaymentLink>('PaymentLink', PaymentLinkSchema);

export enum RefundStatus {
  INITIATED = 'INITIATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IRefund extends Document {
  refundId: string;
  paymentLinkId: string;
  originalAmount: number;
  refundedAmount: number;
  reason?: string;
  status: RefundStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>({
  refundId: { type: String, required: true, unique: true, index: true },
  paymentLinkId: { type: String, required: true, index: true },
  originalAmount: { type: Number, required: true },
  refundedAmount: { type: Number, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: Object.values(RefundStatus),
    default: RefundStatus.INITIATED
  },
}, {
  timestamps: true
});

export const RefundModel = mongoose.model<IRefund>('Refund', RefundSchema);
