/**
 * HOJAI Commerce Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// USER BEHAVIOR MODEL
// ============================================================================

export interface IUserBehavior extends Document {
  userId: string;
  tenantId: string;
  totalSessions: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  lastActiveAt?: Date;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate?: Date;
  productsViewed: string[];
  productsPurchased: string[];
  cartAbandons: number;
  wishlistItems: string[];
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmTier: string;
  segment: string;
  predictedChurnRisk: number;
  predictedLTV: number;
  lifetimeDays: number;
  updatedAt: Date;
}

const UserBehaviorSchema = new Schema<IUserBehavior>({
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  totalSessions: { type: Number, default: 0 },
  avgSessionDuration: { type: Number, default: 0 },
  pagesPerSession: { type: Number, default: 0 },
  lastActiveAt: { type: Date },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  avgOrderValue: { type: Number, default: 0 },
  lastOrderDate: { type: Date },
  productsViewed: { type: [String], default: [] },
  productsPurchased: { type: [String], default: [] },
  cartAbandons: { type: Number, default: 0 },
  wishlistItems: { type: [String], default: [] },
  recencyScore: { type: Number, default: 3, min: 1, max: 5 },
  frequencyScore: { type: Number, default: 3, min: 1, max: 5 },
  monetaryScore: { type: Number, default: 3, min: 1, max: 5 },
  rfmTier: { type: String, enum: ['champions', 'loyal', 'potential', 'at_risk', 'lost'], default: 'potential' },
  segment: { type: String, enum: ['new', 'active', 'inactive', 'at_risk', 'churned', 'vip', 'whale', 'dormant'], default: 'new' },
  predictedChurnRisk: { type: Number, default: 0.5, min: 0, max: 1 },
  predictedLTV: { type: Number, default: 0 },
  lifetimeDays: { type: Number, default: 0 }
}, { timestamps: true });

UserBehaviorSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
UserBehaviorSchema.index({ tenantId: 1, segment: 1 });
UserBehaviorSchema.index({ tenantId: 1, rfmTier: 1 });
UserBehaviorSchema.index({ tenantId: 1, predictedChurnRisk: -1 });

export const UserBehaviorModel = mongoose.model<IUserBehavior>('UserBehavior', UserBehaviorSchema);

// ============================================================================
// PRODUCT INTELLIGENCE MODEL
// ============================================================================

export interface IProductIntelligence extends Document {
  productId: string;
  tenantId: string;
  views: number;
  uniqueViewers: number;
  purchases: number;
  revenue: number;
  unitsSold: number;
  returns: number;
  returnRate: number;
  avgTimeOnPage: number;
  addToCartRate: number;
  purchaseRate: number;
  wishlistAddRate: number;
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  priceElasticity?: number;
  relatedProducts: string[];
  frequentlyBoughtTogether: string[];
  similarProducts: string[];
  complementaryProducts: string[];
  trending: boolean;
  trendingScore: number;
  demandForecast?: number;
  stockLevel: number;
  reorderPoint: number;
  sellThroughRate: number;
  updatedAt: Date;
}

const ProductIntelligenceSchema = new Schema<IProductIntelligence>({
  productId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  views: { type: Number, default: 0 },
  uniqueViewers: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  unitsSold: { type: Number, default: 0 },
  returns: { type: Number, default: 0 },
  returnRate: { type: Number, default: 0 },
  avgTimeOnPage: { type: Number, default: 0 },
  addToCartRate: { type: Number, default: 0 },
  purchaseRate: { type: Number, default: 0 },
  wishlistAddRate: { type: Number, default: 0 },
  currentPrice: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  priceElasticity: { type: Number },
  relatedProducts: { type: [String], default: [] },
  frequentlyBoughtTogether: { type: [String], default: [] },
  similarProducts: { type: [String], default: [] },
  complementaryProducts: { type: [String], default: [] },
  trending: { type: Boolean, default: false },
  trendingScore: { type: Number, default: 0 },
  demandForecast: { type: Number },
  stockLevel: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 0 },
  sellThroughRate: { type: Number, default: 0 }
}, { timestamps: true });

ProductIntelligenceSchema.index({ tenantId: 1, productId: 1 }, { unique: true });
ProductIntelligenceSchema.index({ tenantId: 1, trending: -1, trendingScore: -1 });
ProductIntelligenceSchema.index({ tenantId: 1, revenue: -1 });

export const ProductIntelligenceModel = mongoose.model<IProductIntelligence>('ProductIntelligence', ProductIntelligenceSchema);

// ============================================================================
// CART ABANDONMENT MODEL
// ============================================================================

export interface ICartAbandonment extends Document {
  userId: string;
  tenantId: string;
  cartId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalValue: number;
  lastActivityAt: Date;
  recoveryEmailsSent: number;
  recovered: boolean;
  recoveredAt?: Date;
  churnRisk: boolean;
  highValue: boolean;
  createdAt: Date;
}

const CartAbandonmentSchema = new Schema<ICartAbandonment>({
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  cartId: { type: String, required: true, unique: true },
  items: [{
    productId: String,
    quantity: Number,
    price: Number
  }],
  totalValue: { type: Number, required: true },
  lastActivityAt: { type: Date, required: true },
  recoveryEmailsSent: { type: Number, default: 0 },
  recovered: { type: Boolean, default: false },
  recoveredAt: { type: Date },
  churnRisk: { type: Boolean, default: false },
  highValue: { type: Boolean, default: false }
}, { timestamps: true });

CartAbandonmentSchema.index({ tenantId: 1, recovered: 1 });
CartAbandonmentSchema.index({ tenantId: 1, highValue: 1, churnRisk: 1 });

export const CartAbandonmentModel = mongoose.model<ICartAbandonment>('CartAbandonment', CartAbandonmentSchema);

// ============================================================================
// COMMERCE PREDICTION MODEL
// ============================================================================

export interface ICommercePrediction extends Document {
  id: string;
  tenantId: string;
  userId?: string;
  productId?: string;
  type: string;
  value: number;
  confidence: number;
  risk?: string;
  factors?: Array<{ name: string; importance: number; value: string | number }>;
  recommendations?: Array<{ action: string; reason: string; priority: string }>;
  createdAt: Date;
  validUntil: Date;
}

const CommercePredictionSchema = new Schema<ICommercePrediction>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  productId: { type: String, index: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  risk: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  factors: [{
    name: String,
    importance: Number,
    value: Schema.Types.Mixed
  }],
  recommendations: [{
    action: String,
    reason: String,
    priority: String
  }],
  validUntil: { type: Date, required: true }
}, { timestamps: true });

CommercePredictionSchema.index({ tenantId: 1, userId: 1, type: 1 });
CommercePredictionSchema.index({ tenantId: 1, productId: 1, type: 1 });
CommercePredictionSchema.index({ tenantId: 1, type: 1, confidence: -1 });

export const CommercePredictionModel = mongoose.model<ICommercePrediction>('CommercePrediction', CommercePredictionSchema);

// ============================================================================
// COMMERCE METRICS MODEL
// ============================================================================

export interface ICommerceMetrics extends Document {
  tenantId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  grossRevenue: number;
  netRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  newCustomers: number;
  returningCustomers: number;
  activeUsers: number;
  conversionRate: number;
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenue: number }>;
  cartAbandonmentRate: number;
  checkoutCompletionRate: number;
  checkoutAbandonmentRate: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  growthRate: number;
  momGrowth?: number;
  yoyGrowth?: number;
  computedAt: Date;
}

const CommerceMetricsSchema = new Schema<ICommerceMetrics>({
  tenantId: { type: String, required: true, index: true },
  period: { type: String, enum: ['day', 'week', 'month', 'quarter', 'year'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  grossRevenue: { type: Number, default: 0 },
  netRevenue: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  newCustomers: { type: Number, default: 0 },
  returningCustomers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  topProducts: [{
    productId: String,
    name: String,
    unitsSold: Number,
    revenue: Number
  }],
  cartAbandonmentRate: { type: Number, default: 0 },
  checkoutCompletionRate: { type: Number, default: 0 },
  checkoutAbandonmentRate: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  avgSessionDuration: { type: Number, default: 0 },
  growthRate: { type: Number, default: 0 },
  momGrowth: { type: Number },
  yoyGrowth: { type: Number },
  computedAt: { type: Date, required: true }
}, { timestamps: true });

CommerceMetricsSchema.index({ tenantId: 1, period: 1, startDate: -1 });

export const CommerceMetricsModel = mongoose.model<ICommerceMetrics>('CommerceMetrics', CommerceMetricsSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  UserBehavior: UserBehaviorModel,
  ProductIntelligence: ProductIntelligenceModel,
  CartAbandonment: CartAbandonmentModel,
  CommercePrediction: CommercePredictionModel,
  CommerceMetrics: CommerceMetricsModel
};

export default models;
