/**
 * HOJAI Commerce Intelligence - Type Definitions
 * Commercial AI for E-commerce Businesses
 */

import { z } from 'zod';

// ============================================================================
// COMMERCE TYPES
// ============================================================================

export enum CommerceEventType {
  PRODUCT_VIEW = 'product.view',
  PRODUCT_PURCHASE = 'product.purchase',
  CART_ADD = 'cart.add',
  CART_REMOVE = 'cart.remove',
  CART_ABANDON = 'cart.abandon',
  CHECKOUT_START = 'checkout.start',
  CHECKOUT_COMPLETE = 'checkout.complete',
  SEARCH = 'search',
  WISHLIST_ADD = 'wishlist.add',
  REVIEW = 'review',
  REFUND = 'refund',
  SUBSCRIPTION_RENEW = 'subscription.renew',
  SUBSCRIPTION_CANCEL = 'subscription.cancel'
}

export enum ProductCategory {
  ELECTRONICS = 'electronics',
  FASHION = 'fashion',
  GROCERIES = 'groceries',
  HOME = 'home',
  BEAUTY = 'beauty',
  SPORTS = 'sports',
  BOOKS = 'books',
  TOYS = 'toys',
  FOOD = 'food',
  OTHER = 'other'
}

export enum OfferType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  BUNDLE = 'bundle',
  BUY_ONE_GET_ONE = 'bogo',
  FREE_SHIPPING = 'free_shipping',
  LOYALTY = 'loyalty'
}

// ============================================================================
// USER SEGMENTATION
// ============================================================================

export enum UserSegment {
  NEW = 'new',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
  VIP = 'vip',
  WHALE = 'whale',
  DORMANT = 'dormant'
}

export enum RFMTier {
  CHAMPIONS = 'champions',
  LOYAL = 'loyal',
  POTENTIAL = 'potential',
  AT_RISK = 'at_risk',
  LOST = 'lost'
}

export const UserBehaviorSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),

  // Engagement metrics
  totalSessions: z.number().default(0),
  avgSessionDuration: z.number().default(0),
  pagesPerSession: z.number().default(0),
  lastActiveAt: z.date().optional(),

  // Purchase metrics
  totalOrders: z.number().default(0),
  totalSpent: z.number().default(0),
  avgOrderValue: z.number().default(0),
  lastOrderDate: z.date().optional(),

  // Product interactions
  productsViewed: z.array(z.string()).default([]),
  productsPurchased: z.array(z.string()).default([]),
  cartAbandons: z.number().default(0),
  wishlistItems: z.array(z.string()).default([]),

  // RFM
  recencyScore: z.number().min(1).max(5).default(3),
  frequencyScore: z.number().min(1).max(5).default(3),
  monetaryScore: z.number().min(1).max(5).default(3),
  rfmTier: z.nativeEnum(RFMTier).default(RFMTier.POTENTIAL),

  // Segment
  segment: z.nativeEnum(UserSegment).default(UserSegment.NEW),

  // Computed
  predictedChurnRisk: z.number().min(0).max(1).default(0.5),
  predictedLTV: z.number().default(0),
  lifetimeDays: z.number().default(0),

  updatedAt: z.date()
});

export type UserBehavior = z.infer<typeof UserBehaviorSchema>;

// ============================================================================
// PRODUCT INTELLIGENCE
// ============================================================================

export const ProductIntelligenceSchema = z.object({
  productId: z.string(),
  tenantId: z.string(),

  // Performance
  views: z.number().default(0),
  uniqueViewers: z.number().default(0),
  purchases: z.number().default(0),
  revenue: z.number().default(0),
  unitsSold: z.number().default(0),
  returns: z.number().default(0),
  returnRate: z.number().default(0),

  // Engagement
  avgTimeOnPage: z.number().default(0),
  addToCartRate: z.number().default(0),
  purchaseRate: z.number().default(0),
  wishlistAddRate: z.number().default(0),

  // Pricing
  currentPrice: z.number(),
  originalPrice: z.number(),
  discountPercent: z.number().default(0),
  priceElasticity: z.number().optional(),

  // Recommendations
  relatedProducts: z.array(z.string()).default([]),
  frequentlyBoughtTogether: z.array(z.string()).default([]),
  similarProducts: z.array(z.string()).default([]),
  complementaryProducts: z.array(z.string()).default([]),

  // Demand signals
  trending: z.boolean().default(false),
  trendingScore: z.number().default(0),
  demandForecast: z.number().optional(),

  // Inventory
  stockLevel: z.number().default(0),
  reorderPoint: z.number().default(0),
  sellThroughRate: z.number().default(0),

  updatedAt: z.date()
});

export type ProductIntelligence = z.infer<typeof ProductIntelligenceSchema>;

// ============================================================================
// CART & CHECKOUT
// ============================================================================

export const CartAbandonmentSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  cartId: z.string(),

  // Cart data
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    price: z.number()
  })),
  totalValue: z.number(),

  // Abandonment signals
  lastActivityAt: z.date(),
  recoveryEmailsSent: z.number().default(0),
  recovered: z.boolean().default(false),
  recoveredAt: z.date().optional(),

  // Risk assessment
  churnRisk: z.boolean().default(false),
  highValue: z.boolean().default(false),

  createdAt: z.date()
});

export type CartAbandonment = z.infer<typeof CartAbandonmentSchema>;

// ============================================================================
// PREDICTIONS
// ============================================================================

export const CommercePredictionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string().optional(),
  productId: z.string().optional(),

  // Prediction type
  type: z.enum([
    'churn', 'ltv', 'next_purchase', 'product_demand',
    'cart_recovery', 'price_optimization', 'inventory_demand'
  ]),

  // Results
  value: z.number(),
  confidence: z.number().min(0).max(1),
  risk: z.enum(['critical', 'high', 'medium', 'low']).optional(),

  // Factors
  factors: z.array(z.object({
    name: z.string(),
    importance: z.number(),
    value: z.union([z.string(), z.number()])
  })).optional(),

  // Recommendations
  recommendations: z.array(z.object({
    action: z.string(),
    reason: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })).optional(),

  createdAt: z.date(),
  validUntil: z.date()
});

export type CommercePrediction = z.infer<typeof CommercePredictionSchema>;

// ============================================================================
// OFFERS & PROMOTIONS
// ============================================================================

export const OfferOptimizationSchema = z.object({
  offerId: z.string().optional(),
  tenantId: z.string(),

  // Offer details
  offerType: z.nativeEnum(OfferType),
  discountValue: z.number(),
  minPurchaseAmount: z.number().default(0),

  // Optimization targets
  targetConversionLift: z.number().optional(),
  targetRevenue: z.number().optional(),
  maxRedemptions: z.number().optional(),

  // Predicted outcomes
  predictedConversionRate: z.number().optional(),
  predictedRevenueImpact: z.number().optional(),
  predictedProfitImpact: z.number().optional(),

  // Segment targeting
  targetSegments: z.array(z.nativeEnum(UserSegment)).default([]),
  excludedSegments: z.array(z.nativeEnum(UserSegment)).default([]),

  // Timing
  validFrom: z.date(),
  validUntil: z.date(),
  optimalSendTime: z.string().optional(),

  createdAt: z.date()
});

export type OfferOptimization = z.infer<typeof OfferOptimizationSchema>;

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export const CommerceMetricsSchema = z.object({
  tenantId: z.string(),

  // Time range
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  startDate: z.date(),
  endDate: z.date(),

  // Revenue metrics
  grossRevenue: z.number().default(0),
  netRevenue: z.number().default(0),
  averageOrderValue: z.number().default(0),
  totalOrders: z.number().default(0),

  // User metrics
  newCustomers: z.number().default(0),
  returningCustomers: z.number().default(0),
  activeUsers: z.number().default(0),
  conversionRate: z.number().default(0),

  // Product metrics
  topProducts: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    unitsSold: z.number(),
    revenue: z.number()
  })).default([]),

  // Funnel metrics
  cartAbandonmentRate: z.number().default(0),
  checkoutCompletionRate: z.number().default(0),
  checkoutAbandonmentRate: z.number().default(0),

  // Engagement
  pageViews: z.number().default(0),
  uniqueVisitors: z.number().default(0),
  bounceRate: z.number().default(0),
  avgSessionDuration: z.number().default(0),

  // Growth
  growthRate: z.number().default(0),
  momGrowth: z.number().optional(),
  yoyGrowth: z.number().optional(),

  computedAt: z.date()
});

export type CommerceMetrics = z.infer<typeof CommerceMetricsSchema>;

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

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
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
