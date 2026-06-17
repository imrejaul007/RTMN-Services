import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

export const PaymentStatusSchema = z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']);
export const PaymentMethodSchema = z.enum(['card', 'bank', 'wallet', 'other']);

export const BillingCycleSchemaZod = z.object({
  billingId: z.string().min(1),
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  status: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.optional(),
  paymentMethodId: z.string().optional(),
  paymentDate: z.date().optional(),
  dueDate: z.date(),
  billingPeriod: z.object({
    start: z.date(),
    end: z.date()
  }),
  invoiceNumber: z.string().optional(),
  transactionId: z.string().optional(),
  failureReason: z.string().optional(),
  refundAmount: z.number().optional(),
  refundDate: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type BillingCycleInput = z.infer<typeof BillingCycleSchemaZod>;

export interface IBillingCycle extends Document {
  billingId: string;
  tenantId: string;
  subscriptionId: string;
  customerId: string;
  planId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod?: 'card' | 'bank' | 'wallet' | 'other';
  paymentMethodId?: string;
  paymentDate?: Date;
  dueDate: Date;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  invoiceNumber?: string;
  transactionId?: string;
  failureReason?: string;
  refundAmount?: number;
  refundDate?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const BillingPeriodSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true }
}, { _id: false });

const BillingCycleSchema = new Schema<IBillingCycle>({
  billingId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  subscriptionId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  planId: { type: String, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentMethod: { type: String, enum: ['card', 'bank', 'wallet', 'other'] },
  paymentMethodId: { type: String },
  paymentDate: { type: Date },
  dueDate: { type: Date, required: true, index: true },
  billingPeriod: { type: BillingPeriodSchema, required: true },
  invoiceNumber: { type: String, index: true },
  transactionId: { type: String },
  failureReason: { type: String },
  refundAmount: { type: Number },
  refundDate: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'billing_cycles'
});

// Indexes
BillingCycleSchema.index({ tenantId: 1, status: 1 });
BillingCycleSchema.index({ customerId: 1, status: 1 });
BillingCycleSchema.index({ subscriptionId: 1, billingPeriod: 1 });
BillingCycleSchema.index({ dueDate: 1, status: 1 });

// Static methods
BillingCycleSchema.statics.findBySubscription = function(subscriptionId: string) {
  return this.find({ subscriptionId }).sort({ billingPeriod: -1 });
};

BillingCycleSchema.statics.findByCustomer = function(customerId: string, limit = 10) {
  return this.find({ customerId, status: 'completed' })
    .sort({ paymentDate: -1 })
    .limit(limit);
};

BillingCycleSchema.statics.findPendingDue = function(days: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return this.find({
    status: 'pending',
    dueDate: { $lte: date }
  });
};

// Methods
BillingCycleSchema.methods.markPaid = function(transactionId?: string) {
  this.status = 'completed';
  this.paymentDate = new Date();
  if (transactionId) this.transactionId = transactionId;
  return this.save();
};

BillingCycleSchema.methods.markFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

BillingCycleSchema.methods.refund = function(amount?: number) {
  this.status = 'refunded';
  this.refundAmount = amount || this.amount;
  this.refundDate = new Date();
  return this.save();
};

export const BillingCycle = mongoose.model<IBillingCycle>('BillingCycle', BillingCycleSchema);
