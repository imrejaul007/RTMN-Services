/**
 * HOJAI Product Intelligence - Type Definitions
 * Port: 4755
 */

import { z } from 'zod';

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const ProductStatusSchema = z.enum(['active', 'draft', 'archived', 'discontinued']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  subcategory: z.string().max(100).optional(),
  status: ProductStatusSchema.default('draft'),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  ownerId: z.string().optional(),
  teamId: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Product = z.infer<typeof ProductSchema>;

// ============================================
// PRODUCT FEATURE SCHEMAS
// ============================================

export const FeaturePrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type FeaturePriority = z.infer<typeof FeaturePrioritySchema>;

export const FeatureStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const ProductFeatureSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: FeaturePrioritySchema.default('medium'),
  status: FeatureStatusSchema.default('planned'),
  estimatedEffort: z.number().min(0).optional(),
  actualEffort: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ProductFeature = z.infer<typeof ProductFeatureSchema>;

// ============================================
// PRODUCT FEEDBACK SCHEMAS
// ============================================

export const FeedbackSentimentSchema = z.enum(['positive', 'neutral', 'negative']);
export type FeedbackSentiment = z.infer<typeof FeedbackSentimentSchema>;

export const FeedbackSourceSchema = z.enum(['in_app', 'email', 'support_ticket', 'social', 'review', 'survey', 'other']);
export type FeedbackSource = z.infer<typeof FeedbackSourceSchema>;

export const ProductFeedbackSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  featureId: z.string().uuid().optional(),
  userId: z.string().optional(),
  content: z.string().min(1).max(5000),
  sentiment: FeedbackSentimentSchema.optional(),
  source: FeedbackSourceSchema.default('in_app'),
  rating: z.number().min(1).max(5).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['new', 'reviewed', 'accepted', 'rejected', 'duplicate']).default('new'),
  response: z.string().max(2000).optional(),
  responderId: z.string().optional(),
  respondedAt: z.date().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ProductFeedback = z.infer<typeof ProductFeedbackSchema>;

// ============================================
// PRODUCT ROADMAP SCHEMAS
// ============================================

export const RoadmapItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.date(),
  type: z.enum(['feature', 'improvement', 'bug_fix', 'milestone', 'release']),
  status: z.enum(['planned', 'in_progress', 'completed', 'delayed', 'cancelled']).default('planned'),
  features: z.array(z.string()).default([]),
  progress: z.number().min(0).max(100).default(0),
  completedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;

// ============================================
// PRODUCT METRICS SCHEMAS
// ============================================

export const ProductMetricSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  metricType: z.enum([
    'daily_active_users',
    'monthly_active_users',
    'sessions',
    'session_duration',
    'retention_rate',
    'churn_rate',
    'nps_score',
    'csat_score',
    'feature_adoption_rate',
    'task_completion_rate',
    'error_rate',
    'response_time',
    'revenue',
    'conversions',
    'support_tickets',
    'page_views',
  ]),
  value: z.number(),
  unit: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('daily'),
  recordedAt: z.date().default(() => new Date()),
});
export type ProductMetric = z.infer<typeof ProductMetricSchema>;

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const CreateProductRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  subcategory: z.string().max(100).optional(),
  status: ProductStatusSchema.default('draft'),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  ownerId: z.string().optional(),
  teamId: z.string().optional(),
});
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

export const UpdateProductRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  status: ProductStatusSchema.optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const CreateFeatureRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: FeaturePrioritySchema.default('medium'),
  status: FeatureStatusSchema.default('planned'),
  estimatedEffort: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
});
export type CreateFeatureRequest = z.infer<typeof CreateFeatureRequestSchema>;

export const UpdateFeatureRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: FeaturePrioritySchema.optional(),
  status: FeatureStatusSchema.optional(),
  estimatedEffort: z.number().min(0).optional(),
  actualEffort: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});
export type UpdateFeatureRequest = z.infer<typeof UpdateFeatureRequestSchema>;

export const CreateFeedbackRequestSchema = z.object({
  featureId: z.string().uuid().optional(),
  userId: z.string().optional(),
  content: z.string().min(1).max(5000),
  sentiment: FeedbackSentimentSchema.optional(),
  source: FeedbackSourceSchema.default('in_app'),
  rating: z.number().min(1).max(5).optional(),
  category: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>;

export const RespondFeedbackRequestSchema = z.object({
  response: z.string().min(1).max(2000),
  status: z.enum(['reviewed', 'accepted', 'rejected', 'duplicate']).default('reviewed'),
});
export type RespondFeedbackRequest = z.infer<typeof RespondFeedbackRequestSchema>;

export const CreateRoadmapItemRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.date(),
  type: z.enum(['feature', 'improvement', 'bug_fix', 'milestone', 'release']).default('feature'),
  status: z.enum(['planned', 'in_progress', 'completed', 'delayed', 'cancelled']).default('planned'),
  features: z.array(z.string()).default([]),
});
export type CreateRoadmapItemRequest = z.infer<typeof CreateRoadmapItemRequestSchema>;

export const UpdateRoadmapItemRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  targetDate: z.date().optional(),
  type: z.enum(['feature', 'improvement', 'bug_fix', 'milestone', 'release']).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'delayed', 'cancelled']).optional(),
  features: z.array(z.string()).optional(),
  progress: z.number().min(0).max(100).optional(),
});
export type UpdateRoadmapItemRequest = z.infer<typeof UpdateRoadmapItemRequestSchema>;

export const RecordMetricRequestSchema = z.object({
  metricType: ProductMetricSchema.shape.metricType,
  value: z.number(),
  unit: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('daily'),
  recordedAt: z.date().optional(),
});
export type RecordMetricRequest = z.infer<typeof RecordMetricRequestSchema>;

// ============================================
// QUERY SCHEMAS
// ============================================

export const ProductListQuerySchema = z.object({
  status: ProductStatusSchema.optional(),
  category: z.string().optional(),
  ownerId: z.string().optional(),
  teamId: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const FeatureListQuerySchema = z.object({
  productId: z.string().uuid(),
  status: FeatureStatusSchema.optional(),
  priority: FeaturePrioritySchema.optional(),
  assignedTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type FeatureListQuery = z.infer<typeof FeatureListQuerySchema>;

export const FeedbackListQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  featureId: z.string().uuid().optional(),
  sentiment: FeedbackSentimentSchema.optional(),
  source: FeedbackSourceSchema.optional(),
  status: ProductFeedbackSchema.shape.status.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>;

export const RoadmapListQuerySchema = z.object({
  productId: z.string().uuid(),
  status: RoadmapItemSchema.shape.status.optional(),
  type: RoadmapItemSchema.shape.type.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type RoadmapListQuery = z.infer<typeof RoadmapListQuerySchema>;

export const MetricsQuerySchema = z.object({
  productId: z.string().uuid(),
  metricType: ProductMetricSchema.shape.metricType.optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(365).default(30),
});
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

// ============================================
// PRIORITIZATION SCHEMAS
// ============================================

export const FeaturePrioritizationSchema = z.object({
  featureId: z.string().uuid(),
  riceScore: z.object({
    reach: z.number().min(0),
    impact: z.number().min(0).max(3),
    confidence: z.number().min(0).max(1),
    effort: z.number().min(0),
  }),
  finalScore: z.number(),
  rank: z.number(),
  recommendation: z.enum(['implement', 'schedule', 'reconsider', 'reject']),
});
export type FeaturePrioritization = z.infer<typeof FeaturePrioritizationSchema>;

// ============================================
// ANALYTICS SCHEMAS
// ============================================

export const ProductAnalyticsSchema = z.object({
  productId: z.string().uuid(),
  overview: z.object({
    totalFeatures: z.number(),
    completedFeatures: z.number(),
    inProgressFeatures: z.number(),
    plannedFeatures: z.number(),
    totalFeedback: z.number(),
    avgSentiment: z.number().optional(),
    pmfScore: z.number().optional(),
  }),
  featureHealth: z.object({
    completionRate: z.number(),
    avgTimeToComplete: z.number().optional(),
    overdueFeatures: z.number(),
    blockedFeatures: z.number(),
  }),
  feedbackInsights: z.object({
    positiveCount: z.number(),
    neutralCount: z.number(),
    negativeCount: z.number(),
    topCategories: z.array(z.object({
      category: z.string(),
      count: z.number(),
    })),
    recentThemes: z.array(z.string()),
  }),
  metrics: z.object({
    latestValues: z.record(z.string(), z.number()),
    trends: z.record(z.string(), z.object({
      direction: z.enum(['up', 'down', 'stable']),
      changePercent: z.number(),
    })),
  }),
  generatedAt: z.date(),
});
export type ProductAnalytics = z.infer<typeof ProductAnalyticsSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateProduct(data: unknown): Product {
  return ProductSchema.parse(data);
}

export function validateProductFeature(data: unknown): ProductFeature {
  return ProductFeatureSchema.parse(data);
}

export function validateProductFeedback(data: unknown): ProductFeedback {
  return ProductFeedbackSchema.parse(data);
}

export function validateRoadmapItem(data: unknown): RoadmapItem {
  return RoadmapItemSchema.parse(data);
}

export function validateProductMetric(data: unknown): ProductMetric {
  return ProductMetricSchema.parse(data);
}

export function validateCreateProductRequest(data: unknown): CreateProductRequest {
  return CreateProductRequestSchema.parse(data);
}

export function validateUpdateProductRequest(data: unknown): UpdateProductRequest {
  return UpdateProductRequestSchema.parse(data);
}

export function validateCreateFeatureRequest(data: unknown): CreateFeatureRequest {
  return CreateFeatureRequestSchema.parse(data);
}

export function validateUpdateFeatureRequest(data: unknown): UpdateFeatureRequest {
  return UpdateFeatureRequestSchema.parse(data);
}

export function validateCreateFeedbackRequest(data: unknown): CreateFeedbackRequest {
  return CreateFeedbackRequestSchema.parse(data);
}

export function validateRespondFeedbackRequest(data: unknown): RespondFeedbackRequest {
  return RespondFeedbackRequestSchema.parse(data);
}

export function validateCreateRoadmapItemRequest(data: unknown): CreateRoadmapItemRequest {
  return CreateRoadmapItemRequestSchema.parse(data);
}

export function validateUpdateRoadmapItemRequest(data: unknown): UpdateRoadmapItemRequest {
  return UpdateRoadmapItemRequestSchema.parse(data);
}

export function validateRecordMetricRequest(data: unknown): RecordMetricRequest {
  return RecordMetricRequestSchema.parse(data);
}

// ============================================
// RICE SCORING HELPER
// ============================================

export function calculateRiceScore(
  reach: number,
  impact: number,
  confidence: number,
  effort: number
): number {
  if (effort === 0) return 0;
  return Math.round((reach * impact * confidence) / effort * 100) / 100;
}

export function getRiceRecommendation(score: number): 'implement' | 'schedule' | 'reconsider' | 'reject' {
  if (score >= 50) return 'implement';
  if (score >= 20) return 'schedule';
  if (score >= 5) return 'reconsider';
  return 'reject';
}
