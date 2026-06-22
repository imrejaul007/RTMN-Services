/**
 * HOJAI Customer Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// CUSTOMER 360 PROFILE MODEL
// ============================================================================

export interface ICustomer360Profile extends Document {
  customerId: string;
  tenantId: string;
  identity: {
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
  };
  demographics?: {
    age?: number;
    gender?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    language?: string;
    timezone?: string;
  };
  lifecycle: {
    stage: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    lastPurchaseAt?: Date;
    lifetimeDays: number;
  };
  value: {
    tier: string;
    totalSpent: number;
    totalOrders: number;
    avgOrderValue: number;
    predictedLTV: number;
    clv: number;
  };
  engagement: {
    sessions: number;
    avgSessionDuration: number;
    pagesViewed: number;
    productsViewed: number;
    wishlistItems: number;
    cartAbandons: number;
    lastActivityAt?: Date;
  };
  preferences: {
    categories: string[];
    brands: string[];
    communicationChannel: string;
    notificationsEnabled: boolean;
  };
  satisfaction: {
    avgRating: number;
    reviewsCount: number;
    nps: number;
    lastSurveyAt?: Date;
  };
  risk: {
    churnScore: number;
    churnRisk: string;
    inactiveDays: number;
    refundRate: number;
  };
  compliance: {
    gdprConsent: boolean;
    marketingConsent: boolean;
    dataUpdatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const Customer360ProfileSchema = new Schema<ICustomer360Profile>({
  customerId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  identity: {
    email: String,
    phone: String,
    name: String,
    avatar: String
  },
  demographics: {
    age: Number,
    gender: String,
    location: {
      city: String,
      state: String,
      country: String
    },
    language: String,
    timezone: String
  },
  lifecycle: {
    stage: { type: String, enum: ['prospect', 'new', 'active', 'engaged', 'at_risk', 'churned', 'reactivated'], default: 'new' },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    lastPurchaseAt: Date,
    lifetimeDays: { type: Number, default: 0 }
  },
  value: {
    tier: { type: String, enum: ['basic', 'silver', 'gold', 'platinum', 'diamond'], default: 'basic' },
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    predictedLTV: { type: Number, default: 0 },
    clv: { type: Number, default: 0 }
  },
  engagement: {
    sessions: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    pagesViewed: { type: Number, default: 0 },
    productsViewed: { type: Number, default: 0 },
    wishlistItems: { type: Number, default: 0 },
    cartAbandons: { type: Number, default: 0 },
    lastActivityAt: Date
  },
  preferences: {
    categories: { type: [String], default: [] },
    brands: { type: [String], default: [] },
    communicationChannel: { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], default: 'email' },
    notificationsEnabled: { type: Boolean, default: true }
  },
  satisfaction: {
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    nps: { type: Number, default: 0, min: -100, max: 100 },
    lastSurveyAt: Date
  },
  risk: {
    churnScore: { type: Number, default: 0.5, min: 0, max: 1 },
    churnRisk: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    inactiveDays: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0 }
  },
  compliance: {
    gdprConsent: { type: Boolean, default: false },
    marketingConsent: { type: Boolean, default: false },
    dataUpdatedAt: Date
  }
}, { timestamps: true });

Customer360ProfileSchema.index({ tenantId: 1, customerId: 1 }, { unique: true });
Customer360ProfileSchema.index({ tenantId: 1, 'lifecycle.stage': 1 });
Customer360ProfileSchema.index({ tenantId: 1, 'value.tier': 1 });
Customer360ProfileSchema.index({ tenantId: 1, 'risk.churnRisk': 1 });
Customer360ProfileSchema.index({ tenantId: 1, 'value.predictedLTV': -1 });

export const Customer360ProfileModel = mongoose.model<ICustomer360Profile>('Customer360Profile', Customer360ProfileSchema);

// ============================================================================
// INTERACTION MODEL
// ============================================================================

export interface IInteraction extends Document {
  id: string;
  customerId: string;
  tenantId: string;
  type: string;
  channel: string;
  data?: Record<string, unknown>;
  context?: {
    page?: string;
    productId?: string;
    orderId?: string;
    campaignId?: string;
    referrer?: string;
    device?: string;
    browser?: string;
    os?: string;
  };
  timestamp: Date;
}

const InteractionSchema = new Schema<IInteraction>({
  id: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['page_view', 'product_view', 'add_to_cart', 'purchase', 'cart_abandon', 'wishlist_add', 'review', 'support_ticket', 'email_open', 'email_click', 'sms_sent', 'push_sent', 'app_open', 'login', 'signup'], required: true },
  channel: { type: String, enum: ['web', 'mobile', 'app', 'email', 'sms', 'whatsapp', 'call', 'instore'], default: 'web' },
  data: { type: Schema.Types.Mixed },
  context: {
    page: String,
    productId: String,
    orderId: String,
    campaignId: String,
    referrer: String,
    device: String,
    browser: String,
    os: String
  },
  timestamp: { type: Date, required: true }
}, { timestamps: true });

InteractionSchema.index({ tenantId: 1, customerId: 1, timestamp: -1 });
InteractionSchema.index({ tenantId: 1, type: 1, timestamp: -1 });

export const InteractionModel = mongoose.model<IInteraction>('Interaction', InteractionSchema);

// ============================================================================
// CUSTOMER INSIGHT MODEL
// ============================================================================

export interface ICustomerInsight extends Document {
  id: string;
  customerId: string;
  tenantId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  data: Record<string, unknown>;
  actions: Array<{
    type: string;
    title: string;
    description?: string;
    priority: string;
  }>;
  createdAt: Date;
}

const CustomerInsightSchema = new Schema<ICustomerInsight>({
  id: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['behavior', 'preference', 'intent', 'propensity', 'risk', 'opportunity'], required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  data: { type: Schema.Types.Mixed, default: {} },
  actions: [{
    type: String,
    title: String,
    description: String,
    priority: String
  }]
}, { timestamps: true });

CustomerInsightSchema.index({ tenantId: 1, customerId: 1, type: 1 });

export const CustomerInsightModel = mongoose.model<ICustomerInsight>('CustomerInsight', CustomerInsightSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  Customer360Profile: Customer360ProfileModel,
  Interaction: InteractionModel,
  CustomerInsight: CustomerInsightModel
};

export default models;
