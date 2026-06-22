// ============================================
// HOJAI AI - Marketing Agent MongoDB Models
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  ContentType,
  ContentStatus,
  ContentTone,
  SocialPlatform,
  SocialPostStatus,
  CampaignStatus,
  CampaignType,
  CampaignObjective,
  EmailCampaignStatus,
  AdType,
  SEOContentType
} from '../types';

// ============================================
// Content Model
// ============================================

export interface IContentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  title: string;
  type: ContentType;
  topic: string;
  keyPoints: string[];
  keywords: string[];
  targetAudience: string;
  tone: ContentTone;
  status: ContentStatus;
  cta?: string;
  references: string[];
  generatedContent: string;
  wordCount: number;
  seoScore?: number;
  readabilityScore?: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContentDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: true,
      index: true
    },
    topic: { type: String, required: true, maxlength: 1000 },
    keyPoints: { type: [String], default: [] },
    keywords: { type: [String], default: [], index: true },
    targetAudience: { type: String, required: true },
    tone: {
      type: String,
      enum: Object.values(ContentTone),
      default: ContentTone.PROFESSIONAL
    },
    status: {
      type: String,
      enum: Object.values(ContentStatus),
      default: ContentStatus.DRAFT,
      index: true
    },
    cta: { type: String, maxlength: 200 },
    references: { type: [String], default: [] },
    generatedContent: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
    seoScore: { type: Number, min: 0, max: 100 },
    readabilityScore: { type: Number, min: 0, max: 100 },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true },
    publishedAt: Date
  },
  {
    timestamps: true,
    collection: 'marketing_contents'
  }
);

ContentSchema.index({ tenantId: 1, status: 1 });
ContentSchema.index({ tenantId: 1, type: 1 });
ContentSchema.index({ tenantId: 1, createdBy: 1 });

// ============================================
// Social Post Model
// ============================================

export interface ISocialPostDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  campaignId?: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  title?: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  status: SocialPostStatus;
  scheduledFor?: Date;
  publishedAt?: Date;
  errorMessage?: string;
  engagement?: {
    impressions: number;
    clicks: number;
    likes: number;
    shares: number;
    comments: number;
  };
  platformPostId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema = new Schema<ISocialPostDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    platform: {
      type: String,
      enum: Object.values(SocialPlatform),
      required: true,
      index: true
    },
    title: { type: String, maxlength: 200 },
    content: { type: String, required: true, maxlength: 2000 },
    mediaUrls: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    mentions: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(SocialPostStatus),
      default: SocialPostStatus.DRAFT,
      index: true
    },
    scheduledFor: { type: Date, index: true },
    publishedAt: Date,
    errorMessage: String,
    engagement: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 }
    },
    platformPostId: String,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'marketing_social_posts'
  }
);

SocialPostSchema.index({ tenantId: 1, status: 1 });
SocialPostSchema.index({ tenantId: 1, platform: 1 });
SocialPostSchema.index({ tenantId: 1, scheduledFor: 1 });

// ============================================
// Campaign Model
// ============================================

export interface ICampaignDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  type: CampaignType;
  objective: CampaignObjective;
  description: string;
  targetAudience: {
    demographics?: {
      age?: { min?: number; max?: number };
      gender?: 'male' | 'female' | 'all';
      locations?: string[];
      languages?: string[];
    };
    interests?: string[];
    behaviors?: string[];
  };
  budget?: {
    total: number;
    currency: string;
    spent: number;
  };
  startDate: Date;
  endDate?: Date;
  channels: string[];
  status: CampaignStatus;
  metrics?: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
  };
  createdBy: string;
  launchedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaignDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    type: {
      type: String,
      enum: Object.values(CampaignType),
      required: true
    },
    objective: {
      type: String,
      enum: Object.values(CampaignObjective),
      required: true
    },
    description: { type: String, maxlength: 1000 },
    targetAudience: {
      demographics: {
        age: {
          min: Number,
          max: Number
        },
        gender: String,
        locations: [String],
        languages: [String]
      },
      interests: [String],
      behaviors: [String]
    },
    budget: {
      total: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      spent: { type: Number, default: 0 }
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    channels: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true
    },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
      roas: { type: Number, default: 0 }
    },
    createdBy: { type: String, required: true },
    launchedAt: Date,
    completedAt: Date,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'marketing_campaigns'
  }
);

CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ tenantId: 1, type: 1 });
CampaignSchema.index({ tenantId: 1, createdBy: 1 });

// ============================================
// Email Campaign Model
// ============================================

export interface IEmailCampaignDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  campaignId: mongoose.Types.ObjectId;
  subject: string;
  previewText?: string;
  htmlContent?: string;
  plainContent?: string;
  templateId?: string;
  recipientListId?: string;
  segmentId?: string;
  status: EmailCampaignStatus;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  unsubscribedCount?: number;
  scheduledFor?: Date;
  sentAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema = new Schema<IEmailCampaignDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    subject: { type: String, required: true, maxlength: 200 },
    previewText: { type: String, maxlength: 100 },
    htmlContent: String,
    plainContent: String,
    templateId: String,
    recipientListId: String,
    segmentId: String,
    status: {
      type: String,
      enum: Object.values(EmailCampaignStatus),
      default: EmailCampaignStatus.DRAFT,
      index: true
    },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 },
    bouncedCount: { type: Number, default: 0 },
    unsubscribedCount: { type: Number, default: 0 },
    scheduledFor: { type: Date },
    sentAt: Date,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'marketing_email_campaigns'
  }
);

EmailCampaignSchema.index({ tenantId: 1, status: 1 });
EmailCampaignSchema.index({ tenantId: 1, campaignId: 1 });

// ============================================
// SEO Optimization Model
// ============================================

export interface ISEOOptimizationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  url?: string;
  type: SEOContentType;
  targetKeywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  headings?: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  contentScore?: number;
  keywordDensity?: Record<string, number>;
  suggestions?: string[];
  originalContent?: string;
  optimizedContent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SEOOptimizationSchema = new Schema<ISEOOptimizationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    url: { type: String },
    type: {
      type: String,
      enum: Object.values(SEOContentType),
      required: true
    },
    targetKeywords: { type: [String], required: true, index: true },
    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },
    headings: {
      h1: { type: [String], default: [] },
      h2: { type: [String], default: [] },
      h3: { type: [String], default: [] }
    },
    contentScore: { type: Number, min: 0, max: 100 },
    keywordDensity: { type: Schema.Types.Mixed },
    suggestions: { type: [String], default: [] },
    originalContent: String,
    optimizedContent: String,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'marketing_seo_optimizations'
  }
);

SEOOptimizationSchema.index({ tenantId: 1, type: 1 });
SEOOptimizationSchema.index({ tenantId: 1, url: 1 }, { sparse: true });

// ============================================
// Ad Copy Model
// ============================================

export interface IAdCopyDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  adType: AdType;
  platform?: SocialPlatform;
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  headlines: string[];
  descriptions: string[];
  callToActions: string[];
  body?: string;
  displayUrl?: string;
  keywords: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AdCopySchema = new Schema<IAdCopyDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    adType: {
      type: String,
      enum: Object.values(AdType),
      required: true,
      index: true
    },
    platform: {
      type: String,
      enum: Object.values(SocialPlatform)
    },
    productName: { type: String, required: true, maxlength: 200 },
    productDescription: { type: String, maxlength: 2000 },
    targetAudience: String,
    headlines: { type: [String], required: true, default: [] },
    descriptions: { type: [String], default: [] },
    callToActions: { type: [String], default: [] },
    body: String,
    displayUrl: String,
    keywords: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'marketing_ad_copies'
  }
);

AdCopySchema.index({ tenantId: 1, adType: 1 });
AdCopySchema.index({ tenantId: 1, productName: 1 });

// ============================================
// Export Models
// ============================================

export const Content = mongoose.model<IContentDocument>('Content', ContentSchema);
export const SocialPost = mongoose.model<ISocialPostDocument>('SocialPost', SocialPostSchema);
export const Campaign = mongoose.model<ICampaignDocument>('Campaign', CampaignSchema);
export const EmailCampaign = mongoose.model<IEmailCampaignDocument>('EmailCampaign', EmailCampaignSchema);
export const SEOOptimization = mongoose.model<ISEOOptimizationDocument>('SEOOptimization', SEOOptimizationSchema);
export const AdCopy = mongoose.model<IAdCopyDocument>('AdCopy', AdCopySchema);

// Type exports for services
export type ContentModel = Model<IContentDocument>;
export type SocialPostModel = Model<ISocialPostDocument>;
export type CampaignModel = Model<ICampaignDocument>;
export type EmailCampaignModel = Model<IEmailCampaignDocument>;
export type SEOOptimizationModel = Model<ISEOOptimizationDocument>;
export type AdCopyModel = Model<IAdCopyDocument>;
