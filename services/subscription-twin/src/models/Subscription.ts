import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const SubscriptionStatusSchema = z.enum(['active', 'paused', 'cancelled', 'expired', 'trial']);
export const BillingIntervalSchema = z.enum(['day', 'week', 'month', 'year']);

export const SubscriptionPlanSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  interval: BillingIntervalSchema,
  features: z.array(z.string()).optional(),
  trialDays: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const BillingInfoSchema = z.object({
  nextBilling: z.date(),
  lastBilling: z.date().optional(),
  paymentMethod: z.enum(['card', 'bank', 'wallet', 'other']).optional(),
  paymentMethodId: z.string().optional(),
  autoRenew: z.boolean().default(true)
});

export const UsageInfoSchema = z.object({
  current: z.number().min(0).default(0),
  limit: z.number().positive().optional(),
  unit: z.string().optional()
});

export const SubscriptionSchemaZod = z.object({
  subscriptionId: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema,
  billing: BillingInfoSchema,
  usage: UsageInfoSchema.optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  trialEnd: z.date().optional(),
  cancelledAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;
export type BillingInfo = z.infer<typeof BillingInfoSchema>;
export type UsageInfo = z.infer<typeof UsageInfoSchema>;
export type SubscriptionInput = z.infer<typeof SubscriptionSchemaZod>;

// Mongoose Schema
export interface ISubscription extends Document {
  subscriptionId: string;
  tenantId: string;
  customerId: string;
  plan: {
    name: string;
    price: number;
    interval: SubscriptionStatus;
    features?: string[];
    trialDays?: number;
    metadata?: Record<string, unknown>;
  };
  status: SubscriptionStatus;
  billing: {
    nextBilling: Date;
    lastBilling?: Date;
    paymentMethod?: 'card' | 'bank' | 'wallet' | 'other';
    paymentMethodId?: string;
    autoRenew: boolean;
  };
  usage?: {
    current: number;
    limit?: number;
    unit?: string;
  };
  startDate: Date;
  endDate?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSubSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  interval: { type: String, enum: ['day', 'week', 'month', 'year'], required: true },
  features: [{ type: String }],
  trialDays: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed }
}, { _id: false });

const BillingSubSchema = new Schema({
  nextBilling: { type: Date, required: true },
  lastBilling: { type: Date },
  paymentMethod: { type: String, enum: ['card', 'bank', 'wallet', 'other'] },
  paymentMethodId: { type: String },
  autoRenew: { type: Boolean, default: true }
}, { _id: false });

const UsageSubSchema = new Schema({
  current: { type: Number, default: 0 },
  limit: { type: Number },
  unit: { type: String }
}, { _id: false });

const SubscriptionSchema = new Schema<ISubscription>({
  subscriptionId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  plan: { type: PlanSubSchema, required: true },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired', 'trial'],
    default: 'trial',
    index: true
  },
  billing: { type: BillingSubSchema, required: true },
  usage: { type: UsageSubSchema },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  trialEnd: { type: Date },
  cancelledAt: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'subscriptions'
});

// Indexes for efficient queries
SubscriptionSchema.index({ tenantId: 1, status: 1 });
SubscriptionSchema.index({ customerId: 1, status: 1 });
SubscriptionSchema.index({ 'billing.nextBilling': 1 });
SubscriptionSchema.index({ createdAt: -1 });

// Methods
SubscriptionSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

SubscriptionSchema.methods.resume = function() {
  this.status = 'active';
  return this.save();
};

SubscriptionSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

SubscriptionSchema.methods.renew = function() {
  if (this.status === 'expired' || this.status === 'cancelled') {
    this.status = 'active';
  }
  this.billing.lastBilling = this.billing.nextBilling;
  const interval = this.plan.interval;
  const nextDate = new Date();
  switch (interval) {
    case 'day': nextDate.setDate(nextDate.getDate() + 1); break;
    case 'week': nextDate.setDate(nextDate.getDate() + 7); break;
    case 'month': nextDate.setMonth(nextDate.getMonth() + 1); break;
    case 'year': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
  }
  this.billing.nextBilling = nextDate;
  return this.save();
};

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
