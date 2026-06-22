// ============================================
// HOJAI AI - Marketing Agent Type Definitions
// ============================================

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum ContentType {
  BLOG_POST = 'blog_post',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  AD_COPY = 'ad_copy',
  LANDING_PAGE = 'landing_page',
  PRODUCT_DESCRIPTION = 'product_description',
  VIDEO_SCRIPT = 'video_script',
  NEWSLETTER = 'newsletter',
  CASE_STUDY = 'case_study',
  WHITE_PAPER = 'white_paper'
}

export enum ContentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  HUMOROUS = 'humorous',
  INSPIRATIONAL = 'inspirational',
  EDUCATIONAL = 'educational',
  PERSUASIVE = 'persuasive',
  FORMAL = 'formal',
  FRIENDLY = 'friendly'
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  THREADS = 'threads',
  REDDIT = 'reddit'
}

export enum SocialPostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed'
}

export enum CampaignStatus {
  DRAFT = 'draft',
  READY = 'ready',
  LAUNCHED = 'launched',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum CampaignType {
  EMAIL = 'email',
  SOCIAL = 'social',
  AD = 'ad',
  CONTENT = 'content',
  MULTI_CHANNEL = 'multi_channel'
}

export enum CampaignObjective {
  AWARENESS = 'awareness',
  CONSIDERATION = 'consideration',
  CONVERSION = 'conversion',
  RETENTION = 'retention',
  ENGAGEMENT = 'engagement'
}

export enum EmailCampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed'
}

export enum AdType {
  SEARCH = 'search',
  DISPLAY = 'display',
  SOCIAL = 'social',
  VIDEO = 'video',
  NATIVE = 'native',
  SEARCH_GENERATION = 'search_generation'
}

export enum AdCopyType {
  HEADLINE = 'headline',
  DESCRIPTION = 'description',
  CALL_TO_ACTION = 'call_to_action',
  BODY = 'body',
  DISPLAY_URL = 'display_url'
}

export enum SEOContentType {
  BLOG = 'blog',
  LANDING_PAGE = 'landing_page',
  PRODUCT_PAGE = 'product_page',
  CATEGORY_PAGE = 'category_page',
  FAQ = 'faq'
}

// ============================================
// Zod Schemas for Validation
// ============================================

// Content Generation Schemas
export const GenerateContentSchema = z.object({
  type: z.nativeEnum(ContentType),
  topic: z.string().min(1).max(500),
  keywords: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  tone: z.nativeEnum(ContentTone).default(ContentTone.PROFESSIONAL),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  brandVoice: z.string().max(200).optional(),
  cta: z.string().max(200).optional(),
  additionalContext: z.string().max(2000).optional()
});

export const ContentBriefSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.nativeEnum(ContentType),
  topic: z.string().min(1).max(1000),
  keyPoints: z.array(z.string()),
  keywords: z.array(z.string()).optional(),
  targetAudience: z.string(),
  tone: z.nativeEnum(ContentTone),
  cta: z.string().optional(),
  references: z.array(z.string()).optional()
});

// Social Media Schemas
export const SocialPostSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string().max(30)).optional(),
  mentions: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  title: z.string().max(200).optional()
});

export const SocialCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  platforms: z.array(z.nativeEnum(SocialPlatform)).min(1),
  content: z.array(z.object({
    platform: z.nativeEnum(SocialPlatform),
    content: z.string().min(1).max(2000),
    mediaUrls: z.array(z.string().url()).optional(),
    scheduledFor: z.string().datetime().optional()
  })).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
});

// Campaign Schemas
export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(CampaignType),
  objective: z.nativeEnum(CampaignObjective),
  description: z.string().max(1000),
  targetAudience: z.object({
    demographics: z.object({
      age: z.object({
        min: z.number().min(13).optional(),
        max: z.number().max(120).optional()
      }).optional(),
      gender: z.enum(['male', 'female', 'all']).optional(),
      locations: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional()
    }).optional(),
    interests: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional()
  }).optional(),
  budget: z.object({
    total: z.number().min(0),
    currency: z.string().default('USD')
  }).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  channels: z.array(z.enum(['email', 'social', 'ad', 'content'])).optional()
});

export const LaunchCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  schedule: z.object({
    immediate: z.boolean().default(false),
    startDate: z.string().datetime().optional()
  }).optional()
});

// Email Campaign Schemas
export const EmailCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  previewText: z.string().max(100).optional(),
  htmlContent: z.string().optional(),
  plainContent: z.string().optional(),
  templateId: z.string().optional(),
  recipientListId: z.string().optional(),
  segmentId: z.string().optional(),
  schedule: z.object({
    sendNow: z.boolean().default(true),
    scheduledFor: z.string().datetime().optional()
  }).optional()
});

// SEO Schemas
export const SEOOptimizeSchema = z.object({
  url: z.string().url().optional(),
  content: z.string().min(1).max(50000).optional(),
  type: z.nativeEnum(SEOContentType).default(SEOContentType.BLOG),
  targetKeywords: z.array(z.string()).min(1),
  competitorUrls: z.array(z.string().url()).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional()
});

// Ad Copy Schemas
export const GenerateAdCopySchema = z.object({
  adType: z.nativeEnum(AdType),
  productName: z.string().min(1).max(200),
  productDescription: z.string().max(2000).optional(),
  targetAudience: z.string().optional(),
  headlineOptions: z.number().min(1).max(10).default(3),
  descriptionOptions: z.number().min(1).max(5).default(2),
  cta: z.string().max(30).optional(),
  keywords: z.array(z.string()).optional(),
  platform: z.nativeEnum(SocialPlatform).optional()
});

// ============================================
// TypeScript Interfaces
// ============================================

export interface IContent extends z.infer<typeof ContentBriefSchema> {
  id: string;
  tenantId: string;
  status: ContentStatus;
  generatedContent: string;
  seoScore?: number;
  readabilityScore?: number;
  wordCount: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialPost extends z.infer<typeof SocialPostSchema> {
  id: string;
  tenantId: string;
  campaignId?: string;
  status: SocialPostStatus;
  publishedAt?: Date;
  engagement?: {
    impressions: number;
    clicks: number;
    likes: number;
    shares: number;
    comments: number;
  };
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaign extends z.infer<typeof CreateCampaignSchema> {
  id: string;
  tenantId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailCampaign extends z.infer<typeof EmailCampaignSchema> {
  id: string;
  tenantId: string;
  campaignId: string;
  status: EmailCampaignStatus;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  unsubscribedCount?: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISEOOptimization {
  id: string;
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
  optimizedContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdCopy {
  id: string;
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
  keywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

export interface GenerateContentRequest {
  content: z.infer<typeof GenerateContentSchema>;
}

export interface GenerateContentResponse {
  success: boolean;
  data?: {
    content: string;
    metadata: {
      wordCount: number;
      readabilityScore: number;
      seoScore: number;
      suggestedKeywords: string[];
      hashtags: string[];
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface SocialPostRequest {
  post: z.infer<typeof SocialPostSchema>;
}

export interface SocialPostResponse {
  success: boolean;
  data?: {
    post: ISocialPost;
    platformResponse?: Record<string, unknown>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateCampaignRequest {
  campaign: z.infer<typeof CreateCampaignSchema>;
}

export interface LaunchCampaignRequest {
  campaignId: string;
  immediate?: boolean;
  startDate?: string;
}

export interface LaunchCampaignResponse {
  success: boolean;
  data?: {
    campaignId: string;
    status: CampaignStatus;
    launchedAt: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface SEOOptimizeRequest {
  seo: z.infer<typeof SEOOptimizeSchema>;
}

export interface SEOOptimizeResponse {
  success: boolean;
  data?: {
    metaTitle: string;
    metaDescription: string;
    suggestions: string[];
    contentScore: number;
    keywordDensity: Record<string, number>;
    optimizedContent?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GenerateAdCopyRequest {
  ad: z.infer<typeof GenerateAdCopySchema>;
}

export interface GenerateAdCopyResponse {
  success: boolean;
  data?: {
    headlines: string[];
    descriptions: string[];
    callToActions: string[];
    body?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Internal Types
// ============================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
}

export interface MarketingAgentConfig {
  tenantId: string;
  ownerId: string;
  defaultTone: ContentTone;
  socialAccounts: {
    platform: SocialPlatform;
    accessToken?: string;
    accountId?: string;
  }[];
  emailProvider?: {
    provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
    apiKey?: string;
    fromEmail: string;
    fromName: string;
  };
  adPlatforms?: {
    platform: 'google' | 'facebook' | 'linkedin' | 'twitter';
    accountId: string;
    accessToken?: string;
  }[];
  aiModel?: string;
  maxContentLength?: number;
}

export interface ContentGenerationContext {
  industry?: string;
  productType?: string;
  competitors?: string[];
  trendingTopics?: string[];
  targetKeywords?: string[];
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  conversionRate: number;
}

export interface SocialAnalytics {
  platform: SocialPlatform;
  followers: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  reach: number;
  impressions: number;
  avgEngagementRate: number;
}
