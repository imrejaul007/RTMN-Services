import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

export const UsageTypeSchema = z.enum(['api_calls', 'storage', 'users', 'transactions', 'custom']);
export const UsageActionSchema = z.enum(['increment', 'decrement', 'reset', 'set']);

export const UsageSchemaZod = z.object({
  usageId: z.string().min(1),
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  type: UsageTypeSchema,
  value: z.number().min(0),
  unit: z.string(),
  resetDate: z.date().optional(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  metadata: z.record(z.unknown()).optional()
});

export type UsageType = z.infer<typeof UsageSchemaZod>;
export type UsageAction = z.infer<typeof UsageActionSchema>;
export type UsageInput = z.infer<typeof UsageSchemaZod>;

export interface IUsage extends Document {
  usageId: string;
  tenantId: string;
  subscriptionId: string;
  customerId: string;
  type: 'api_calls' | 'storage' | 'users' | 'transactions' | 'custom';
  value: number;
  unit: string;
  resetDate?: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Usage Record for tracking individual usage events
export const UsageRecordSchemaZod = z.object({
  recordId: z.string().min(1),
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  customerId: z.string().min(1),
  type: UsageTypeSchema,
  action: UsageActionSchema,
  amount: z.number(),
  previousValue: z.number(),
  newValue: z.number(),
  description: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional()
});

export type UsageRecordInput = z.infer<typeof UsageRecordSchemaZod>;

export interface IUsageRecord extends Document {
  recordId: string;
  tenantId: string;
  subscriptionId: string;
  customerId: string;
  type: 'api_calls' | 'storage' | 'users' | 'transactions' | 'custom';
  action: 'increment' | 'decrement' | 'reset' | 'set';
  amount: number;
  previousValue: number;
  newValue: number;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const UsageSchema = new Schema<IUsage>({
  usageId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  subscriptionId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['api_calls', 'storage', 'users', 'transactions', 'custom'],
    required: true
  },
  value: { type: Number, required: true, default: 0, min: 0 },
  unit: { type: String, required: true },
  resetDate: { type: Date },
  billingPeriodStart: { type: Date, required: true },
  billingPeriodEnd: { type: Date, required: true }
}, {
  timestamps: true,
  collection: 'usage'
});

// Indexes
UsageSchema.index({ tenantId: 1, type: 1 });
UsageSchema.index({ subscriptionId: 1, type: 1 });
UsageSchema.index({ billingPeriodStart: 1, billingPeriodEnd: 1 });

// Usage Record Schema
const UsageRecordSchema = new Schema<IUsageRecord>({
  recordId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  subscriptionId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['api_calls', 'storage', 'users', 'transactions', 'custom'],
    required: true
  },
  action: {
    type: String,
    enum: ['increment', 'decrement', 'reset', 'set'],
    required: true
  },
  amount: { type: Number, required: true },
  previousValue: { type: Number, required: true },
  newValue: { type: Number, required: true },
  description: { type: String },
  timestamp: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true,
  collection: 'usage_records'
});

// Indexes for usage records
UsageRecordSchema.index({ tenantId: 1, timestamp: -1 });
UsageRecordSchema.index({ subscriptionId: 1, timestamp: -1 });
UsageRecordSchema.index({ type: 1, timestamp: -1 });

// Static methods for Usage
UsageSchema.statics.findBySubscriptionPeriod = function(
  subscriptionId: string,
  start: Date,
  end: Date
) {
  return this.find({
    subscriptionId,
    billingPeriodStart: { $gte: start },
    billingPeriodEnd: { $lte: end }
  });
};

UsageSchema.statics.findOrCreate = async function(
  subscriptionId: string,
  tenantId: string,
  customerId: string,
  type: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
) {
  let usage = await this.findOne({
    subscriptionId,
    type,
    billingPeriodStart,
    billingPeriodEnd
  });

  if (!usage) {
    usage = await this.create({
      usageId: `UR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      subscriptionId,
      customerId,
      type,
      value: 0,
      unit: type === 'api_calls' ? 'calls' : type === 'storage' ? 'MB' : 'units',
      billingPeriodStart,
      billingPeriodEnd
    });
  }

  return usage;
};

// Methods
UsageSchema.methods.increment = function(amount: number) {
  this.value += amount;
  return this.save();
};

UsageSchema.methods.decrement = function(amount: number) {
  this.value = Math.max(0, this.value - amount);
  return this.save();
};

UsageSchema.methods.reset = function() {
  this.value = 0;
  return this.save();
};

UsageSchema.methods.setValue = function(value: number) {
  this.value = Math.max(0, value);
  return this.save();
};

export const Usage = mongoose.model<IUsage>('Usage', UsageSchema);
export const UsageRecord = mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);
