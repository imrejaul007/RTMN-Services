import mongoose, { Document, Schema } from 'mongoose';

// Payment Method Types
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank_transfer' | 'cod' | 'crypto';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded' | 'partial_refund' | 'cancelled' | 'expired';
export type PaymentGateway = 'stripe' | 'razorpay' | 'paytm' | 'phonepe' | 'cashfree' | 'internal';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

// Payment Document Interface
export interface IPayment extends Document {
  paymentId: string;
  tenantId: string;
  customerId: string;
  orderId?: string;
  invoiceId?: string;

  // Amount Details
  amount: number;
  refundedAmount: number;
  currency: Currency;

  // Payment Method
  method: PaymentMethod;
  gateway: PaymentGateway;

  // Status
  status: PaymentStatus;

  // Gateway Response
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;

  // Card Details (encrypted)
  cardLast4?: string;
  cardBrand?: string;

  // Customer Details
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;

  // Metadata
  description?: string;
  metadata?: Record<string, unknown>;

  // Billing Address
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // Refund Info
  refundIds: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  expiresAt?: Date;
}

// Payment Schema
const PaymentSchema = new Schema<IPayment>(
  {
    paymentId: {
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
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    invoiceId: {
      type: String,
      index: true,
    },

    // Amount Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'],
      default: 'INR',
    },

    // Payment Method
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'cod', 'crypto'],
      required: true,
    },
    gateway: {
      type: String,
      enum: ['stripe', 'razorpay', 'paytm', 'phonepe', 'cashfree', 'internal'],
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'partial_refund', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },

    // Gateway Response
    gatewayTransactionId: {
      type: String,
      index: true,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },

    // Card Details
    cardLast4: String,
    cardBrand: String,

    // Customer Details
    customerEmail: String,
    customerPhone: String,
    customerName: String,

    // Metadata
    description: String,
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Billing Address
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // Refund Info
    refundIds: [{
      type: String,
      ref: 'Refund',
    }],
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
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, gateway: 1, createdAt: -1 });
PaymentSchema.index({ createdAt: -1 });

// Static Methods
PaymentSchema.statics.generatePaymentId = function (tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${tenantId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`;
};

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
