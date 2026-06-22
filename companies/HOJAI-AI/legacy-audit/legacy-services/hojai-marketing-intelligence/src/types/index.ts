/**
 * HOJAI Marketing Intelligence - Type Definitions
 */

import { z } from 'zod';

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export enum CampaignType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
  SOCIAL = 'social',
  DISPLAY = 'display',
  SEO = 'seo',
  AFFILIATE = 'affiliate'
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// CAMPAIGN SCHEMA
// ============================================================================

export const CampaignSchema = z.object({
  campaignId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  type: z.nativeEnum(CampaignType),
  status: z.nativeEnum(CampaignStatus).default(CampaignStatus.DRAFT),

  // Targeting
  targeting: z.object({
    segments: z.array(z.string()).default([]),
    excludedSegments: z.array(z.string()).default([]),
    userIds: z.array(z.string()).default([]),
    filters: z.record(z.any()).optional()
  }),

  // Content
  content: z.object({
    subject: z.string().optional(),
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
    imageUrl: z.string().url().optional()
  }),

  // Schedule
  schedule: z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    sendTime: z.string().optional(),
    timezone: z.string().default('Asia/Kolkata')
  }),

  // Budget
  budget: z.object({
    total: z.number().default(0),
    spent: z.number().default(0),
    currency: z.string().default('INR')
  }),

  // Metrics
  metrics: z.object({
    sent: z.number().default(0),
    delivered: z.number().default(0),
    opened: z.number().default(0),
    clicked: z.number().default(0),
    converted: z.number().default(0),
    unsubscribed: z.number().default(0),
    bounced: z.number().default(0)
  }),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Campaign = z.infer<typeof CampaignSchema>;

// ============================================================================
// SEGMENT TYPES
// ============================================================================

export const MarketingSegmentSchema = z.object({
  segmentId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  criteria: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'between']),
    value: z.any()
  })),

  logic: z.enum(['AND', 'OR']).default('AND'),

  size: z.number().default(0),

  isActive: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type MarketingSegment = z.infer<typeof MarketingSegmentSchema>;

// ============================================================================
// ATTRIBUTION TYPES
// ============================================================================

export const AttributionSchema = z.object({
  tenantId: z.string(),

  // Models
  model: z.enum(['first_click', 'last_click', 'linear', 'time_decay', 'position_based', 'data_driven']),

  // Touchpoints
  touchpoints: z.array(z.object({
    channel: z.string(),
    campaignId: z.string().optional(),
    timestamp: z.date(),
    interactionType: z.string()
  })),

  // Conversion
  conversion: z.object({
    orderId: z.string(),
    revenue: z.number(),
    timestamp: z.date()
  }),

  // Attribution weights
  weights: z.record(z.number()),

  computedAt: z.date()
});

export type Attribution = z.infer<typeof AttributionSchema>;

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export const MarketingAnalyticsSchema = z.object({
  tenantId: z.string(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  startDate: z.date(),
  endDate: z.date(),

  // Overview
  overview: z.object({
    totalCampaigns: z.number().default(0),
    activeCampaigns: z.number().default(0),
    totalSent: z.number().default(0),
    totalRevenue: z.number().default(0),
    totalConversions: z.number().default(0)
  }),

  // Rates
  rates: z.object({
    deliveryRate: z.number().default(0),
    openRate: z.number().default(0),
    clickRate: z.number().default(0),
    conversionRate: z.number().default(0),
    unsubscribeRate: z.number().default(0),
    bounceRate: z.number().default(0)
  }),

  // Revenue
  revenue: z.object({
    email: z.number().default(0),
    sms: z.number().default(0),
    push: z.number().default(0),
    social: z.number().default(0),
    total: z.number().default(0)
  }),

  // ROI
  roi: z.object({
    email: z.number().default(0),
    sms: z.number().default(0),
    push: z.number().default(0),
    social: z.number().default(0),
    overall: z.number().default(0)
  }),

  // Top campaigns
  topCampaigns: z.array(z.object({
    campaignId: z.string(),
    name: z.string(),
    conversions: z.number(),
    revenue: z.number(),
    roi: z.number()
  })).default([]),

  computedAt: z.date()
});

export type MarketingAnalytics = z.infer<typeof MarketingAnalyticsSchema>;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export function createResponse<T>(data: T, options?: { tenantId?: string }): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      tenantId: options?.tenantId
    }
  };
}

export function createErrorResponse(code: string, message: string, details?: Record<string, unknown>): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` }
  };
}
