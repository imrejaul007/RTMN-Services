/**
 * HOJAI Merchant Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// MERCHANT PROFILE MODEL
// ============================================================================

export interface IMerchantProfile extends Document {
  merchantId: string;
  tenantId: string;
  name: string;
  category: string;
  tier: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalCustomers: number;
    totalProducts: number;
    avgRating: number;
  };
  performance: {
    revenueGrowth: number;
    orderGrowth: number;
    customerGrowth: number;
    ratingChange: number;
  };
  isActive: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantProfileSchema = new Schema<IMerchantProfile>({
  merchantId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['retail', 'restaurant', 'salon', 'hotel', 'healthcare', 'ecommerce', 'services', 'other'], default: 'other' },
  tier: { type: String, enum: ['starter', 'growing', 'established', 'premium'], default: 'starter' },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  metrics: {
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 }
  },
  performance: {
    revenueGrowth: { type: Number, default: 0 },
    orderGrowth: { type: Number, default: 0 },
    customerGrowth: { type: Number, default: 0 },
    ratingChange: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  verifiedAt: { type: Date }
}, { timestamps: true });

MerchantProfileSchema.index({ tenantId: 1, merchantId: 1 }, { unique: true });
MerchantProfileSchema.index({ tenantId: 1, category: 1 });
MerchantProfileSchema.index({ tenantId: 1, tier: 1 });
MerchantProfileSchema.index({ 'metrics.totalRevenue': -1 });

export const MerchantProfileModel = mongoose.model<IMerchantProfile>('MerchantProfile', MerchantProfileSchema);

// ============================================================================
// BUSINESS METRICS MODEL
// ============================================================================

export interface IBusinessMetrics extends Document {
  merchantId: string;
  tenantId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  grossRevenue: number;
  netRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  customerRetentionRate: number;
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenue: number }>;
  conversionRate: number;
  cartAbandonmentRate: number;
  avgProcessingTime: number;
  momGrowth?: number;
  wowGrowth?: number;
  yoyGrowth?: number;
  computedAt: Date;
}

const BusinessMetricsSchema = new Schema<IBusinessMetrics>({
  merchantId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  period: { type: String, enum: ['day', 'week', 'month', 'quarter', 'year'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  grossRevenue: { type: Number, default: 0 },
  netRevenue: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  cancelledOrders: { type: Number, default: 0 },
  returnedOrders: { type: Number, default: 0 },
  newCustomers: { type: Number, default: 0 },
  returningCustomers: { type: Number, default: 0 },
  totalCustomers: { type: Number, default: 0 },
  customerRetentionRate: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  activeProducts: { type: Number, default: 0 },
  outOfStockProducts: { type: Number, default: 0 },
  topProducts: [{
    productId: String,
    name: String,
    unitsSold: Number,
    revenue: Number
  }],
  conversionRate: { type: Number, default: 0 },
  cartAbandonmentRate: { type: Number, default: 0 },
  avgProcessingTime: { type: Number, default: 0 },
  momGrowth: { type: Number },
  wowGrowth: { type: Number },
  yoyGrowth: { type: Number },
  computedAt: { type: Date, required: true }
}, { timestamps: true });

BusinessMetricsSchema.index({ merchantId: 1, period: 1, startDate: -1 });

export const BusinessMetricsModel = mongoose.model<IBusinessMetrics>('BusinessMetrics', BusinessMetricsSchema);

// ============================================================================
// MERCHANT ALERT MODEL
// ============================================================================

export interface IMerchantAlert extends Document {
  id: string;
  merchantId: string;
  tenantId: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  isActioned: boolean;
  actionedAt?: Date;
  createdAt: Date;
}

const MerchantAlertSchema = new Schema<IMerchantAlert>({
  id: { type: String, required: true, unique: true, index: true },
  merchantId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['low_inventory', 'negative_feedback', 'declining_sales', 'high_returns', 'payment_issue', 'compliance_warning', 'opportunity'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  isActioned: { type: Boolean, default: false },
  actionedAt: { type: Date }
}, { timestamps: true });

MerchantAlertSchema.index({ merchantId: 1, isRead: 1, createdAt: -1 });
MerchantAlertSchema.index({ tenantId: 1, severity: 1 });

export const MerchantAlertModel = mongoose.model<IMerchantAlert>('MerchantAlert', MerchantAlertSchema);

// ============================================================================
// PERFORMANCE SCORE MODEL
// ============================================================================

export interface IMerchantPerformanceScore extends Document {
  merchantId: string;
  tenantId: string;
  overallScore: number;
  components: {
    revenue: number;
    customer: number;
    operations: number;
    satisfaction: number;
  };
  grade: string;
  trend: string;
  benchmarkPercentile: number;
  computedAt: Date;
}

const MerchantPerformanceScoreSchema = new Schema<IMerchantPerformanceScore>({
  merchantId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  overallScore: { type: Number, required: true, min: 0, max: 100 },
  components: {
    revenue: { type: Number, required: true, min: 0, max: 100 },
    customer: { type: Number, required: true, min: 0, max: 100 },
    operations: { type: Number, required: true, min: 0, max: 100 },
    satisfaction: { type: Number, required: true, min: 0, max: 100 }
  },
  grade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'], required: true },
  trend: { type: String, enum: ['improving', 'stable', 'declining'], required: true },
  benchmarkPercentile: { type: Number, required: true, min: 0, max: 100 },
  computedAt: { type: Date, required: true }
}, { timestamps: true });

MerchantPerformanceScoreSchema.index({ merchantId: 1, computedAt: -1 });

export const MerchantPerformanceScoreModel = mongoose.model<IMerchantPerformanceScore>('MerchantPerformanceScore', MerchantPerformanceScoreSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  MerchantProfile: MerchantProfileModel,
  BusinessMetrics: BusinessMetricsModel,
  MerchantAlert: MerchantAlertModel,
  MerchantPerformanceScore: MerchantPerformanceScoreModel
};

export default models;
