import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

export const PlanTypeSchema = z.enum(['free', 'basic', 'standard', 'premium', 'enterprise', 'custom']);
export const BillingIntervalSchema = z.enum(['day', 'week', 'month', 'year']);

export const PlanSchemaZod = z.object({
  planId: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: PlanTypeSchema,
  price: z.number().min(0),
  interval: BillingIntervalSchema,
  features: z.array(z.string()),
  limits: z.object({
    users: z.number().optional(),
    storage: z.number().optional(),
    apiCalls: z.number().optional(),
    custom: z.record(z.unknown()).optional()
  }).optional(),
  usage: z.object({
    included: z.number().optional(),
    unit: z.string().optional()
  }).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  trialDays: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional()
});

export type PlanType = z.infer<typeof PlanSchemaZod>;
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export interface IPlan extends Document {
  planId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'free' | 'basic' | 'standard' | 'premium' | 'enterprise' | 'custom';
  price: number;
  interval: 'day' | 'week' | 'month' | 'year';
  features: string[];
  limits?: {
    users?: number;
    storage?: number;
    apiCalls?: number;
    custom?: Record<string, unknown>;
  };
  usage?: {
    included: number;
    unit: string;
  };
  isActive: boolean;
  isDefault: boolean;
  trialDays: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LimitsSchema = new Schema({
  users: { type: Number },
  storage: { type: Number },
  apiCalls: { type: Number },
  custom: { type: Schema.Types.Mixed }
}, { _id: false });

const UsagePlanSchema = new Schema({
  included: { type: Number },
  unit: { type: String }
}, { _id: false });

const PlanSchema = new Schema<IPlan>({
  planId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium', 'enterprise', 'custom'],
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  interval: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    required: true
  },
  features: [{ type: String }],
  limits: { type: LimitsSchema },
  usage: { type: UsagePlanSchema },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  trialDays: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'plans'
});

// Indexes
PlanSchema.index({ tenantId: 1, type: 1 });
PlanSchema.index({ tenantId: 1, isActive: 1 });
PlanSchema.index({ tenantId: 1, price: 1 });

// Static methods
PlanSchema.statics.findByTenant = function(tenantId: string) {
  return this.find({ tenantId, isActive: true });
};

PlanSchema.statics.findDefault = function(tenantId: string) {
  return this.findOne({ tenantId, isDefault: true, isActive: true });
};

// Pre-save hook to ensure only one default plan per tenant per type
PlanSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { tenantId: this.tenantId, type: this.type, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const Plan = mongoose.model<IPlan>('Plan', PlanSchema);

// Default plans seed data
export const defaultPlans = [
  {
    name: 'Free',
    type: 'free',
    price: 0,
    interval: 'month' as const,
    features: ['Basic access', '5 users', '1GB storage'],
    limits: { users: 5, storage: 1 },
    isDefault: true,
    trialDays: 0
  },
  {
    name: 'Basic',
    type: 'basic',
    price: 9.99,
    interval: 'month' as const,
    features: ['Standard access', '25 users', '10GB storage', 'Email support'],
    limits: { users: 25, storage: 10 },
    trialDays: 14
  },
  {
    name: 'Standard',
    type: 'standard',
    price: 29.99,
    interval: 'month' as const,
    features: ['Premium access', '100 users', '100GB storage', 'Priority support', 'API access'],
    limits: { users: 100, storage: 100, apiCalls: 10000 },
    trialDays: 14
  },
  {
    name: 'Premium',
    type: 'premium',
    price: 99.99,
    interval: 'month' as const,
    features: ['All features', 'Unlimited users', '1TB storage', '24/7 support', 'Full API access', 'Custom integrations'],
    limits: { users: -1, storage: 1000 },
    trialDays: 30
  },
  {
    name: 'Enterprise',
    type: 'enterprise',
    price: 299.99,
    interval: 'month' as const,
    features: ['Enterprise features', 'Unlimited everything', 'Dedicated support', 'Custom SLA', 'On-premise option'],
    limits: { users: -1, storage: -1, apiCalls: -1 },
    trialDays: 30
  }
];
