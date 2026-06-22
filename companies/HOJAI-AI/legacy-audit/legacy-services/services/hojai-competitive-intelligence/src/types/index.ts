/**
 * HOJAI Competitive Intelligence - Type Definitions
 * Port: 4756
 */

import { z } from 'zod';

// ============================================
// COMPETITOR SCHEMAS
// ============================================

export const CompetitorStatusSchema = z.enum(['active', 'inactive', 'acquired', 'defunct']);
export type CompetitorStatus = z.infer<typeof CompetitorStatusSchema>;

export const CompetitorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  industry: z.string().max(100),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  founded: z.number().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().max(200).optional(),
  status: CompetitorStatusSchema.default('active'),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

// ============================================
// COMPETITOR PRODUCT SCHEMAS
// ============================================

export const CompetitorProductSchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'subscription', 'one_time', 'usage_based']),
    startingPrice: z.number().optional(),
    currency: z.string().default('USD'),
  }).optional(),
  targetMarket: z.array(z.string()).default([]),
  keyFeatures: z.array(z.string()).default([]),
  launchedAt: z.date().optional(),
  updatedAt: z.date().default(() => new Date()),
});
export type CompetitorProduct = z.infer<typeof CompetitorProductSchema>;

// ============================================
// COMPETITOR PRICING SCHEMAS
// ============================================

export const PricingChangeSchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  changeType: z.enum(['increase', 'decrease', 'new_tier', 'removed_tier', 'discount']),
  previousPrice: z.number().optional(),
  newPrice: z.number().optional(),
  percentageChange: z.number().optional(),
  reason: z.string().max(500).optional(),
  effectiveDate: z.date(),
  recordedAt: z.date().default(() => new Date()),
});
export type PricingChange = z.infer<typeof PricingChangeSchema>;

// ============================================
// COMPETITOR FUNDING SCHEMAS
// ============================================

export const FundingRoundSchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid(),
  roundType: z.enum(['seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'ipo', 'acquisition', 'other']),
  amount: z.number(),
  currency: z.string().default('USD'),
  valuation: z.number().optional(),
  investors: z.array(z.string()).default([]),
  announcedDate: z.date(),
  description: z.string().max(1000).optional(),
  recordedAt: z.date().default(() => new Date()),
});
export type FundingRound = z.infer<typeof FundingRoundSchema>;

// ============================================
// COMPETITOR HIRING SCHEMAS
// ============================================

export const HiringActivitySchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid(),
  jobTitle: z.string().min(1).max(200),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  remote: z.boolean().default(false),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD'),
  }).optional(),
  postedDate: z.date(),
  source: z.string().max(200).optional(),
  url: z.string().url().optional(),
  recordedAt: z.date().default(() => new Date()),
});
export type HiringActivity = z.infer<typeof HiringActivitySchema>;

// ============================================
// COMPETITOR NEWS SCHEMAS
// ============================================

export const NewsArticleSchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid(),
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  source: z.string().max(200),
  url: z.string().url(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  publishedAt: z.date(),
  category: z.enum(['product', 'funding', 'leadership', 'partnership', 'legal', 'Layoffs', 'expansion', 'other']).optional(),
  recordedAt: z.date().default(() => new Date()),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

// ============================================
// ALERT SCHEMAS
// ============================================

export const AlertTypeSchema = z.enum(['threat', 'opportunity', 'milestone', 'crisis']);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const AlertSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  competitorId: z.string().uuid().optional(),
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  source: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  acknowledged: z.boolean().default(false),
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});
export type Alert = z.infer<typeof AlertSchema>;

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const CreateCompetitorRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  industry: z.string().max(100),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  founded: z.number().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateCompetitorRequest = z.infer<typeof CreateCompetitorRequestSchema>;

export const UpdateCompetitorRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  founded: z.number().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().max(200).optional(),
  status: CompetitorStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateCompetitorRequest = z.infer<typeof UpdateCompetitorRequestSchema>;

export const CreateProductRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'subscription', 'one_time', 'usage_based']),
    startingPrice: z.number().optional(),
    currency: z.string().default('USD'),
  }).optional(),
  targetMarket: z.array(z.string()).default([]),
  keyFeatures: z.array(z.string()).default([]),
  launchedAt: z.date().optional(),
});
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

export const CreateFundingRequestSchema = z.object({
  roundType: z.enum(['seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'ipo', 'acquisition', 'other']),
  amount: z.number(),
  currency: z.string().default('USD'),
  valuation: z.number().optional(),
  investors: z.array(z.string()).default([]),
  announcedDate: z.date(),
  description: z.string().max(1000).optional(),
});
export type CreateFundingRequest = z.infer<typeof CreateFundingRequestSchema>;

export const CreateHiringRequestSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  department: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  remote: z.boolean().default(false),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD'),
  }).optional(),
  postedDate: z.date(),
  source: z.string().max(200).optional(),
  url: z.string().url().optional(),
});
export type CreateHiringRequest = z.infer<typeof CreateHiringRequestSchema>;

export const CreateNewsRequestSchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).optional(),
  source: z.string().max(200),
  url: z.string().url(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  publishedAt: z.date(),
  category: z.enum(['product', 'funding', 'leadership', 'partnership', 'legal', 'Layoffs', 'expansion', 'other']).optional(),
});
export type CreateNewsRequest = z.infer<typeof CreateNewsRequestSchema>;

export const CreateAlertRequestSchema = z.object({
  competitorId: z.string().uuid().optional(),
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  source: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
});
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;

// ============================================
// QUERY SCHEMAS
// ============================================

export const CompetitorListQuerySchema = z.object({
  industry: z.string().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  status: CompetitorStatusSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type CompetitorListQuery = z.infer<typeof CompetitorListQuerySchema>;

export const AlertListQuerySchema = z.object({
  competitorId: z.string().uuid().optional(),
  type: AlertTypeSchema.optional(),
  severity: AlertSeveritySchema.optional(),
  acknowledged: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type AlertListQuery = z.infer<typeof AlertListQuerySchema>;

export const NewsQuerySchema = z.object({
  competitorId: z.string().uuid().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  category: z.enum(['product', 'funding', 'leadership', 'partnership', 'legal', 'Layoffs', 'expansion', 'other']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type NewsQuery = z.infer<typeof NewsQuerySchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateCompetitor(data: unknown): Competitor {
  return CompetitorSchema.parse(data);
}

export function validateCompetitorProduct(data: unknown): CompetitorProduct {
  return CompetitorProductSchema.parse(data);
}

export function validateFundingRound(data: unknown): FundingRound {
  return FundingRoundSchema.parse(data);
}

export function validateHiringActivity(data: unknown): HiringActivity {
  return HiringActivitySchema.parse(data);
}

export function validateNewsArticle(data: unknown): NewsArticle {
  return NewsArticleSchema.parse(data);
}

export function validateAlert(data: unknown): Alert {
  return AlertSchema.parse(data);
}

export function validateCreateCompetitorRequest(data: unknown): CreateCompetitorRequest {
  return CreateCompetitorRequestSchema.parse(data);
}

export function validateUpdateCompetitorRequest(data: unknown): UpdateCompetitorRequest {
  return UpdateCompetitorRequestSchema.parse(data);
}

export function validateCreateProductRequest(data: unknown): CreateProductRequest {
  return CreateProductRequestSchema.parse(data);
}

export function validateCreateFundingRequest(data: unknown): CreateFundingRequest {
  return CreateFundingRequestSchema.parse(data);
}

export function validateCreateHiringRequest(data: unknown): CreateHiringRequest {
  return CreateHiringRequestSchema.parse(data);
}

export function validateCreateNewsRequest(data: unknown): CreateNewsRequest {
  return CreateNewsRequestSchema.parse(data);
}

export function validateCreateAlertRequest(data: unknown): CreateAlertRequest {
  return CreateAlertRequestSchema.parse(data);
}

// ============================================
// ALERT DETECTION HELPERS
// ============================================

export function detectThreatFromPricing(previousPrice: number, newPrice: number): boolean {
  return newPrice < previousPrice * 0.8; // 20%+ price drop
}

export function detectThreatFromNews(sentiment: string): boolean {
  return sentiment === 'negative';
}

export function detectOpportunityFromNews(sentiment: string): boolean {
  return sentiment === 'positive';
}

export function detectFundingThreat(competitorFunding: number, ourFunding: number): boolean {
  return competitorFunding > ourFunding * 2;
}
