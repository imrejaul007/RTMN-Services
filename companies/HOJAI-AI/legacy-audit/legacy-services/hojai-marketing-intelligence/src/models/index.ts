/**
 * HOJAI Marketing Intelligence - MongoDB Models
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// CAMPAIGN MODEL
// ============================================================================

export interface ICampaign extends Document {
  campaignId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  targeting: {
    segments: string[];
    excludedSegments: string[];
    userIds: string[];
    filters?: Record<string, unknown>;
  };
  content: {
    subject?: string;
    headline?: string;
    body?: string;
    cta?: string;
    imageUrl?: string;
  };
  schedule: {
    startDate?: Date;
    endDate?: Date;
    sendTime?: string;
    timezone: string;
  };
  budget: {
    total: number;
    spent: number;
    currency: string;
  };
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
    bounced: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
  campaignId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['email', 'sms', 'push', 'whatsapp', 'social', 'display', 'seo', 'affiliate'], required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'], default: 'draft' },
  targeting: {
    segments: { type: [String], default: [] },
    excludedSegments: { type: [String], default: [] },
    userIds: { type: [String], default: [] },
    filters: { type: Schema.Types.Mixed }
  },
  content: {
    subject: String,
    headline: String,
    body: String,
    cta: String,
    imageUrl: String
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    sendTime: String,
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  budget: {
    total: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  },
  metrics: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 }
  }
}, { timestamps: true });

CampaignSchema.index({ tenantId: 1, campaignId: 1 }, { unique: true });
CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, type: 1 });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema);

// ============================================================================
// CAMPAIGN EVENT MODEL
// ============================================================================

export interface ICampaignEvent extends Document {
  eventId: string;
  tenantId: string;
  campaignId: string;
  userId: string;
  type: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const CampaignEventSchema = new Schema<ICampaignEvent>({
  eventId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['sent', 'delivered', 'opened', 'clicked', 'converted', 'unsubscribed', 'bounced'], required: true },
  timestamp: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

CampaignEventSchema.index({ tenantId: 1, campaignId: 1, type: 1, timestamp: -1 });

export const CampaignEventModel = mongoose.model<ICampaignEvent>('CampaignEvent', CampaignEventSchema);

// ============================================================================
// MARKETING ANALYTICS MODEL
// ============================================================================

export interface IMarketingAnalytics extends Document {
  tenantId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalRevenue: number;
    totalConversions: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    unsubscribeRate: number;
    bounceRate: number;
  };
  revenue: {
    email: number;
    sms: number;
    push: number;
    social: number;
    total: number;
  };
  roi: {
    email: number;
    sms: number;
    push: number;
    social: number;
    overall: number;
  };
  computedAt: Date;
}

const MarketingAnalyticsSchema = new Schema<IMarketingAnalytics>({
  tenantId: { type: String, required: true, index: true },
  period: { type: String, enum: ['day', 'week', 'month', 'quarter', 'year'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  overview: {
    totalCampaigns: { type: Number, default: 0 },
    activeCampaigns: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 }
  },
  rates: {
    deliveryRate: { type: Number, default: 0 },
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    unsubscribeRate: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 }
  },
  revenue: {
    email: { type: Number, default: 0 },
    sms: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  roi: {
    email: { type: Number, default: 0 },
    sms: { type: Number, default: 0 },
    push: { type: Number, default: 0 },
    social: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  }
}, { timestamps: true });

MarketingAnalyticsSchema.index({ tenantId: 1, period: 1, startDate: -1 });

export const MarketingAnalyticsModel = mongoose.model<IMarketingAnalytics>('MarketingAnalytics', MarketingAnalyticsSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  Campaign: CampaignModel,
  CampaignEvent: CampaignEventModel,
  MarketingAnalytics: MarketingAnalyticsModel
};

export default models;
