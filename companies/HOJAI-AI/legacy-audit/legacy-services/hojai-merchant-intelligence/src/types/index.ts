/**
 * HOJAI Merchant Intelligence - Type Definitions
 * Business Intelligence for Merchants
 */

import { z } from 'zod';

// ============================================================================
// MERCHANT TYPES
// ============================================================================

export enum MerchantCategory {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  SALON = 'salon',
  HOTEL = 'hotel',
  HEALTHCARE = 'healthcare',
  ECOMMERCE = 'ecommerce',
  SERVICES = 'services',
  OTHER = 'other'
}

export enum MerchantTier {
  STARTER = 'starter',
  GROWING = 'growing',
  ESTABLISHED = 'established',
  PREMIUM = 'premium'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

// ============================================================================
// MERCHANT PROFILE
// ============================================================================

export const MerchantProfileSchema = z.object({
  merchantId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  category: z.nativeEnum(MerchantCategory),
  tier: z.nativeEnum(MerchantTier).default(MerchantTier.STARTER),

  // Location
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default('India'),
    pincode: z.string().optional()
  }).optional(),

  // Contact
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }).optional(),

  // Business metrics
  metrics: z.object({
    totalRevenue: z.number().default(0),
    totalOrders: z.number().default(0),
    avgOrderValue: z.number().default(0),
    totalCustomers: z.number().default(0),
    totalProducts: z.number().default(0),
    avgRating: z.number().min(0).max(5).default(0)
  }),

  // Performance
  performance: z.object({
    revenueGrowth: z.number().default(0),
    orderGrowth: z.number().default(0),
    customerGrowth: z.number().default(0),
    ratingChange: z.number().default(0)
  }),

  // Status
  isActive: z.boolean().default(true),
  verifiedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type MerchantProfile = z.infer<typeof MerchantProfileSchema>;

// ============================================================================
// BUSINESS METRICS
// ============================================================================

export const BusinessMetricsSchema = z.object({
  merchantId: z.string(),
  tenantId: z.string(),

  // Time range
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  startDate: z.date(),
  endDate: z.date(),

  // Revenue
  grossRevenue: z.number().default(0),
  netRevenue: z.number().default(0),
  averageOrderValue: z.number().default(0),
  totalOrders: z.number().default(0),
  cancelledOrders: z.number().default(0),
  returnedOrders: z.number().default(0),

  // Customers
  newCustomers: z.number().default(0),
  returningCustomers: z.number().default(0),
  totalCustomers: z.number().default(0),
  customerRetentionRate: z.number().default(0),

  // Products
  totalProducts: z.number().default(0),
  activeProducts: z.number().default(0),
  outOfStockProducts: z.number().default(0),
  topProducts: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    unitsSold: z.number(),
    revenue: z.number()
  })).default([]),

  // Performance indicators
  conversionRate: z.number().default(0),
  cartAbandonmentRate: z.number().default(0),
  avgProcessingTime: z.number().default(0), // minutes

  // Comparisons
  momGrowth: z.number().optional(),
  wowGrowth: z.number().optional(),
  yoyGrowth: z.number().optional(),

  computedAt: z.date()
});

export type BusinessMetrics = z.infer<typeof BusinessMetricsSchema>;

// ============================================================================
// COMPETITOR ANALYSIS
// ============================================================================

export const CompetitorAnalysisSchema = z.object({
  merchantId: z.string(),
  tenantId: z.string(),

  // Category benchmarks
  categoryAverage: z.object({
    avgOrderValue: z.number(),
    avgRevenue: z.number(),
    avgCustomers: z.number(),
    avgRating: z.number()
  }),

  // Position
  position: z.object({
    revenueRank: z.number().optional(),
    ordersRank: z.number().optional(),
    ratingRank: z.number().optional(),
    overallScore: z.number()
  }),

  // Comparisons
  vsCategoryAverage: z.object({
    revenueDiff: z.number(),
    orderDiff: z.number(),
    ratingDiff: z.number()
  }),

  // Recommendations
  improvements: z.array(z.object({
    area: z.string(),
    currentValue: z.number(),
    targetValue: z.number(),
    priority: z.enum(['high', 'medium', 'low'])
  })).default([]),

  computedAt: z.date()
});

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

// ============================================================================
// ALERTS & RECOMMENDATIONS
// ============================================================================

export const MerchantAlertSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  tenantId: z.string(),

  type: z.enum([
    'low_inventory',
    'negative_feedback',
    'declining_sales',
    'high_returns',
    'payment_issue',
    'compliance_warning',
    'opportunity'
  ]),

  severity: z.nativeEnum(AlertSeverity),
  title: z.string(),
  description: z.string(),

  // Data
  data: z.record(z.any()).optional(),

  // Status
  isRead: z.boolean().default(false),
  isActioned: z.boolean().default(false),
  actionedAt: z.date().optional(),

  createdAt: z.date()
});

export type MerchantAlert = z.infer<typeof MerchantAlertSchema>;

// ============================================================================
// PERFORMANCE SCORE
// ============================================================================

export const MerchantPerformanceScoreSchema = z.object({
  merchantId: z.string(),
  tenantId: z.string(),

  // Overall score (0-100)
  overallScore: z.number().min(0).max(100),

  // Component scores
  components: z.object({
    revenue: z.number().min(0).max(100),
    customer: z.number().min(0).max(100),
    operations: z.number().min(0).max(100),
    satisfaction: z.number().min(0).max(100)
  }),

  // Grade
  grade: z.enum(['A+', 'A', 'B+', 'B', 'C', 'D', 'F']),

  // Trend
  trend: z.enum(['improving', 'stable', 'declining']),

  // Benchmark
  benchmarkPercentile: z.number().min(0).max(100),

  computedAt: z.date()
});

export type MerchantPerformanceScore = z.infer<typeof MerchantPerformanceScoreSchema>;

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
