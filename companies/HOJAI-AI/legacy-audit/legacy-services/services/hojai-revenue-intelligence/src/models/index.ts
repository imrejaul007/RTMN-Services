/**
 * HOJAI Revenue Intelligence - MongoDB Models
 * Revenue tracking, forecasting, and analytics for CoPilot
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// REVENUE METRIC MODEL
// ============================================================================

export interface IRevenueMetric extends Document {
  id: string;
  tenantId: string;
  metricType: 'arr' | 'mrr' | 'brrr' | 'nrr' | 'griff';
  value: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  breakdown?: {
    byProduct?: Record<string, number>;
    bySegment?: Record<string, number>;
    byRegion?: Record<string, number>;
  };
  recordedAt: Date;
}

const RevenueMetricSchema = new Schema<IRevenueMetric>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  metricType: { type: String, enum: ['arr', 'mrr', 'brrr', 'nrr', 'griff'], required: true },
  value: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'], required: true },
  breakdown: {
    byProduct: { type: Map, of: Number },
    bySegment: { type: Map, of: Number },
    byRegion: { type: Map, of: Number }
  },
  recordedAt: { type: Date, required: true }
}, { timestamps: true });

RevenueMetricSchema.index({ tenantId: 1, metricType: 1, period: 1, recordedAt: -1 });
RevenueMetricSchema.index({ tenantId: 1, recordedAt: -1 });

export const RevenueMetricModel = mongoose.model<IRevenueMetric>('RevenueMetric', RevenueMetricSchema);

// ============================================================================
// REVENUE PIPELINE MODEL
// ============================================================================

export interface IRevenuePipeline extends Document {
  id: string;
  tenantId: string;
  dealName: string;
  customerId: string;
  customerName: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date;
  ownerId?: string;
  productIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RevenuePipelineSchema = new Schema<IRevenuePipeline>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  dealName: { type: String, required: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  stage: {
    type: String,
    enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    required: true,
    default: 'prospecting'
  },
  value: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  probability: { type: Number, default: 0, min: 0, max: 100 },
  expectedCloseDate: { type: Date, required: true },
  ownerId: { type: String, index: true },
  productIds: { type: [String], default: [] }
}, { timestamps: true });

RevenuePipelineSchema.index({ tenantId: 1, stage: 1 });
RevenuePipelineSchema.index({ tenantId: 1, ownerId: 1, stage: 1 });
RevenuePipelineSchema.index({ tenantId: 1, expectedCloseDate: 1 });
RevenuePipelineSchema.index({ tenantId: 1, customerId: 1 });

export const RevenuePipelineModel = mongoose.model<IRevenuePipeline>('RevenuePipeline', RevenuePipelineSchema);

// ============================================================================
// REVENUE FORECAST MODEL
// ============================================================================

export interface IForecastFactor {
  name: string;
  impact: number;
}

export interface IRevenueForecast extends Document {
  id: string;
  tenantId: string;
  forecastType: 'arr' | 'mrr' | 'pipeline' | 'churn';
  predictedValue: number;
  confidence: number;
  period: string;
  forecastModel: 'linear' | 'exponential' | 'moving_average';
  factors: IForecastFactor[];
  generatedAt: Date;
  generatedBy: string;
}

const RevenueForecastSchema = new Schema<IRevenueForecast>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  forecastType: { type: String, enum: ['arr', 'mrr', 'pipeline', 'churn'], required: true },
  predictedValue: { type: Number, required: true },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  period: { type: String, required: true },
  forecastModel: { type: String, enum: ['linear', 'exponential', 'moving_average'], required: true },
  factors: [{
    name: String,
    impact: Number
  }],
  generatedAt: { type: Date, required: true },
  generatedBy: { type: String, required: true }
}, { timestamps: true });

RevenueForecastSchema.index({ tenantId: 1, forecastType: 1, period: 1, generatedAt: -1 });

export const RevenueForecastModel = mongoose.model<IRevenueForecast>('RevenueForecast', RevenueForecastSchema);

// ============================================================================
// REVENUE ALERT MODEL
// ============================================================================

export interface IRevenueAlert extends Document {
  id: string;
  tenantId: string;
  alertType: 'churn_risk' | 'revenue_drop' | 'pipeline_risk' | 'growth_stall' | 'milestone';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric?: string;
  threshold?: number;
  currentValue?: number;
  isRead: boolean;
  createdAt: Date;
}

const RevenueAlertSchema = new Schema<IRevenueAlert>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  alertType: {
    type: String,
    enum: ['churn_risk', 'revenue_drop', 'pipeline_risk', 'growth_stall', 'milestone'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true, default: 'medium' },
  metric: String,
  threshold: Number,
  currentValue: Number,
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

RevenueAlertSchema.index({ tenantId: 1, alertType: 1 });
RevenueAlertSchema.index({ tenantId: 1, severity: 1 });
RevenueAlertSchema.index({ tenantId: 1, isRead: 1, createdAt: -1 });

export const RevenueAlertModel = mongoose.model<IRevenueAlert>('RevenueAlert', RevenueAlertSchema);

// ============================================================================
// SUBSCRIPTION MODEL
// ============================================================================

export interface ISubscription extends Document {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  plan: string;
  status: 'active' | 'trial' | 'paused' | 'cancelled' | 'churned';
  mrr: number;
  arr: number;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  trialEndsAt?: Date;
  churnDate?: Date;
  churnReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  plan: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'trial', 'paused', 'cancelled', 'churned'],
    required: true,
    default: 'active'
  },
  mrr: { type: Number, required: true },
  arr: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  renewalDate: Date,
  trialEndsAt: Date,
  churnDate: Date,
  churnReason: String
}, { timestamps: true });

SubscriptionSchema.index({ tenantId: 1, status: 1 });
SubscriptionSchema.index({ tenantId: 1, customerId: 1 });
SubscriptionSchema.index({ tenantId: 1, plan: 1 });
SubscriptionSchema.index({ tenantId: 1, renewalDate: 1 });

export const SubscriptionModel = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

// ============================================================================
// REVENUE BREAKDOWN MODEL
// ============================================================================

export interface IBreakdownSegment {
  name: string;
  value: number;
  percentage: number;
  growth?: number;
}

export interface IRevenueBreakdown extends Document {
  id: string;
  tenantId: string;
  period: string;
  type: 'by_product' | 'by_segment' | 'by_region' | 'by_channel';
  segments: IBreakdownSegment[];
  recordedAt: Date;
}

const RevenueBreakdownSchema = new Schema<IRevenueBreakdown>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  period: { type: String, required: true },
  type: {
    type: String,
    enum: ['by_product', 'by_segment', 'by_region', 'by_channel'],
    required: true
  },
  segments: [{
    name: String,
    value: Number,
    percentage: Number,
    growth: Number
  }],
  recordedAt: { type: Date, required: true }
}, { timestamps: true });

RevenueBreakdownSchema.index({ tenantId: 1, type: 1, period: 1, recordedAt: -1 });

export const RevenueBreakdownModel = mongoose.model<IRevenueBreakdown>('RevenueBreakdown', RevenueBreakdownSchema);

// ============================================================================
// CONVERSION METRIC MODEL
// ============================================================================

export interface IConversionMetric extends Document {
  id: string;
  tenantId: string;
  stage: string;
  count: number;
  conversionRate: number;
  period: string;
  recordedAt: Date;
}

const ConversionMetricSchema = new Schema<IConversionMetric>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  stage: { type: String, required: true },
  count: { type: Number, required: true },
  conversionRate: { type: Number, required: true },
  period: { type: String, required: true },
  recordedAt: { type: Date, required: true }
}, { timestamps: true });

ConversionMetricSchema.index({ tenantId: 1, stage: 1, period: 1, recordedAt: -1 });

export const ConversionMetricModel = mongoose.model<IConversionMetric>('ConversionMetric', ConversionMetricSchema);

// ============================================================================
// CAC METRIC MODEL
// ============================================================================

export interface ICACMetric extends Document {
  id: string;
  tenantId: string;
  channel: string;
  segment?: string;
  customerAcquisitionCost: number;
  period: string;
  recordedAt: Date;
}

const CACMetricSchema = new Schema<ICACMetric>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  channel: { type: String, required: true },
  segment: String,
  customerAcquisitionCost: { type: Number, required: true },
  period: { type: String, required: true },
  recordedAt: { type: Date, required: true }
}, { timestamps: true });

CACMetricSchema.index({ tenantId: 1, channel: 1, period: 1, recordedAt: -1 });
CACMetricSchema.index({ tenantId: 1, segment: 1, period: 1 });

export const CACMetricModel = mongoose.model<ICACMetric>('CACMetric', CACMetricSchema);

// ============================================================================
// LTV METRIC MODEL
// ============================================================================

export interface ILTVMetric extends Document {
  id: string;
  tenantId: string;
  segment?: string;
  plan?: string;
  lifetimeValue: number;
  period: string;
  recordedAt: Date;
}

const LTVMetricSchema = new Schema<ILTVMetric>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  segment: String,
  plan: String,
  lifetimeValue: { type: Number, required: true },
  period: { type: String, required: true },
  recordedAt: { type: Date, required: true }
}, { timestamps: true });

LTVMetricSchema.index({ tenantId: 1, segment: 1, period: 1, recordedAt: -1 });
LTVMetricSchema.index({ tenantId: 1, plan: 1, period: 1 });

export const LTVMetricModel = mongoose.model<ILTVMetric>('LTVMetric', LTVMetricSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  RevenueMetric: RevenueMetricModel,
  RevenuePipeline: RevenuePipelineModel,
  RevenueForecast: RevenueForecastModel,
  RevenueAlert: RevenueAlertModel,
  Subscription: SubscriptionModel,
  RevenueBreakdown: RevenueBreakdownModel,
  ConversionMetric: ConversionMetricModel,
  CACMetric: CACMetricModel,
  LTVMetric: LTVMetricModel
};

export default models;
