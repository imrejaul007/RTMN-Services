/**
 * HOJAI Customer Intelligence - Type Definitions
 * Customer 360 for Businesses
 */

import { z } from 'zod';

// ============================================================================
// CUSTOMER 360 TYPES
// ============================================================================

export enum CustomerLifecycleStage {
  PROSPECT = 'prospect',
  NEW = 'new',
  ACTIVE = 'active',
  ENGAGED = 'engaged',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
  REACTIVATED = 'reactivated'
}

export enum CustomerValueTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

// ============================================================================
// CUSTOMER 360 PROFILE
// ============================================================================

export const Customer360ProfileSchema = z.object({
  customerId: z.string(),
  tenantId: z.string(),

  // Identity
  identity: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
    avatar: z.string().url().optional()
  }),

  // Demographics
  demographics: z.object({
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().default('India')
    }).optional(),
    language: z.string().default('en'),
    timezone: z.string().optional()
  }).optional(),

  // Lifecycle
  lifecycle: z.object({
    stage: z.nativeEnum(CustomerLifecycleStage),
    firstSeenAt: z.date(),
    lastSeenAt: z.date(),
    lastPurchaseAt: z.date().optional(),
    lifetimeDays: z.number()
  }),

  // Value
  value: z.object({
    tier: z.nativeEnum(CustomerValueTier),
    totalSpent: z.number().default(0),
    totalOrders: z.number().default(0),
    avgOrderValue: z.number().default(0),
    predictedLTV: z.number().default(0),
    clv: z.number().default(0) // Customer Lifetime Value
  }),

  // Engagement
  engagement: z.object({
    sessions: z.number().default(0),
    avgSessionDuration: z.number().default(0),
    pagesViewed: z.number().default(0),
    productsViewed: z.number().default(0),
    wishlistItems: z.number().default(0),
    cartAbandons: z.number().default(0),
    lastActivityAt: z.date().optional()
  }),

  // Preferences
  preferences: z.object({
    categories: z.array(z.string()).default([]),
    brands: z.array(z.string()).default([]),
    communicationChannel: z.enum(['email', 'sms', 'whatsapp', 'push']).default('email'),
    notificationsEnabled: z.boolean().default(true)
  }),

  // Satisfaction
  satisfaction: z.object({
    avgRating: z.number().min(0).max(5).default(0),
    reviewsCount: z.number().default(0),
    nps: z.number().min(-100).max(100).default(0),
    lastSurveyAt: z.date().optional()
  }),

  // Risk
  risk: z.object({
    churnScore: z.number().min(0).max(1).default(0.5),
    churnRisk: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
    inactiveDays: z.number().default(0),
    refundRate: z.number().default(0)
  }),

  // Compliance
  compliance: z.object({
    gdprConsent: z.boolean().default(false),
    marketingConsent: z.boolean().default(false),
    dataUpdatedAt: z.date().optional()
  }),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type Customer360Profile = z.infer<typeof Customer360ProfileSchema>;

// ============================================================================
// INTERACTION TIMELINE
// ============================================================================

export const InteractionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  tenantId: z.string(),

  type: z.enum([
    'page_view',
    'product_view',
    'add_to_cart',
    'purchase',
    'cart_abandon',
    'wishlist_add',
    'review',
    'support_ticket',
    'email_open',
    'email_click',
    'sms_sent',
    'push_sent',
    'app_open',
    'login',
    'signup'
  ]),

  channel: z.enum(['web', 'mobile', 'app', 'email', 'sms', 'whatsapp', 'call', 'instore']).default('web'),

  // Data
  data: z.record(z.any()).optional(),

  // Context
  context: z.object({
    page: z.string().optional(),
    productId: z.string().optional(),
    orderId: z.string().optional(),
    campaignId: z.string().optional(),
    referrer: z.string().optional(),
    device: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional()
  }).optional(),

  timestamp: z.date()
});

export type Interaction = z.infer<typeof InteractionSchema>;

// ============================================================================
// CUSTOMER SEGMENT
// ============================================================================

export const CustomerSegmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Criteria
  criteria: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'between']),
    value: z.any()
  })),

  logic: z.enum(['AND', 'OR']).default('AND'),

  // Stats
  memberCount: z.number().default(0),
  avgLTV: z.number().default(0),
  avgOrders: z.number().default(0),

  // Priority
  priority: z.number().default(0),

  isActive: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;

// ============================================================================
// CUSTOMER INSIGHT
// ============================================================================

export const CustomerInsightSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  tenantId: z.string(),

  type: z.enum([
    'behavior',
    'preference',
    'intent',
    'propensity',
    'risk',
    'opportunity'
  ]),

  category: z.string(),

  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),

  // Data
  data: z.record(z.any()),

  // Recommended actions
  actions: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low'])
  })).default([]),

  createdAt: z.date()
});

export type CustomerInsight = z.infer<typeof CustomerInsightSchema>;

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
    latencyMs?: number;
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

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
}
