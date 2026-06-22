/**
 * HOJAI Research Assistant - Type Definitions
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Market research, competitor analysis, report generation
 *
 * Tagline: "AI-powered research that delivers insights, not just data."
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Research status
 */
export type ResearchStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Report format
 */
export type ReportFormat = 'summary' | 'detailed' | 'comprehensive';

/**
 * Trend category
 */
export type TrendCategory = 'technology' | 'market' | 'consumer' | 'industry' | 'competitive';

/**
 * Data source type
 */
export type DataSourceType = 'web' | 'api' | 'database' | 'internal';

/**
 * Analysis depth
 */
export type AnalysisDepth = 'quick' | 'standard' | 'deep';

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search query input
 */
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

/**
 * Search filters
 */
export interface SearchFilters {
  dateRange?: {
    from: string;
    to: string;
  };
  sources?: string[];
  language?: string;
  region?: string;
}

/**
 * Search result item
 */
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

/**
 * Search response
 */
export interface SearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  facets?: Record<string, string[]>;
  tookMs: number;
}

// ============================================================================
// Competitor Analysis Types
// ============================================================================

/**
 * Competitor analysis input
 */
export interface CompetitorAnalysisInput {
  company: string;
  competitors?: string[];
  includeProducts?: boolean;
  includePricing?: boolean;
  includeMarketShare?: boolean;
}

/**
 * Competitor info
 */
export interface CompetitorInfo {
  name: string;
  website?: string;
  description?: string;
  founded?: string;
  headquarters?: string;
  employees?: string;
  funding?: string;
  socialLinks?: Record<string, string>;
}

/**
 * Product offering
 */
export interface ProductOffering {
  name: string;
  description?: string;
  price?: string;
  category?: string;
  features?: string[];
}

/**
 * Competitor analysis result
 */
export interface CompetitorAnalysis {
  id: string;
  targetCompany: string;
  competitors: CompetitorInfo[];
  marketPosition?: string;
  swot?: SWOTAnalysis;
  products?: ProductOffering[];
  pricingComparison?: PricingComparison[];
  marketShare?: number;
  generatedAt: string;
}

/**
 * SWOT Analysis
 */
export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/**
 * Pricing comparison
 */
export interface PricingComparison {
  productType: string;
  yourPrice?: string;
  competitorPrices: Record<string, string>;
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Report generation input
 */
export interface ReportGenerationInput {
  topic: string;
  format: ReportFormat;
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  sections?: ReportSection[];
  audience?: string;
  timeframe?: string;
}

/**
 * Report section
 */
export interface ReportSection {
  title: string;
  content: string;
  order: number;
}

/**
 * Generated report
 */
export interface GeneratedReport {
  id: string;
  title: string;
  topic: string;
  format: ReportFormat;
  summary: string;
  sections: ReportSection[];
  recommendations?: string[];
  dataPoints?: Record<string, unknown>;
  sources?: string[];
  generatedAt: string;
  tookMs: number;
}

// ============================================================================
// Trend Types
// ============================================================================

/**
 * Trend item
 */
export interface TrendItem {
  id: string;
  title: string;
  description: string;
  category: TrendCategory;
  sentiment: 'positive' | 'negative' | 'neutral';
  volume: number;
  velocity: 'rising' | 'stable' | 'declining';
  sources: string[];
  relatedTerms?: string[];
  firstSeen: string;
  lastUpdated: string;
}

/**
 * Trend summary
 */
export interface TrendSummary {
  category: TrendCategory;
  trends: TrendItem[];
  totalTrends: number;
  topMovers: TrendItem[];
  generatedAt: string;
}

/**
 * All trends response
 */
export interface TrendsResponse {
  allTrends: TrendSummary[];
  topOverall: TrendItem[];
  emerging: TrendItem[];
  generatedAt: string;
}

// ============================================================================
// Summary Types
// ============================================================================

/**
 * Content summarization input
 */
export interface SummarizeInput {
  content: string;
  contentType?: 'article' | 'document' | 'webpage' | 'text';
  maxLength?: number;
  style?: 'brief' | 'standard' | 'detailed';
  includeKeyPoints?: boolean;
}

/**
 * Summarized content
 */
export interface SummaryResult {
  id: string;
  originalLength: number;
  summaryLength: number;
  summary: string;
  keyPoints?: string[];
  keywords?: string[];
  topics?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  generatedAt: string;
  tookMs: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
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

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Search Schema
export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  filters: z.object({
    dateRange: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    }).optional(),
    sources: z.array(z.string()).optional(),
    language: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

// Competitor Analysis Schema
export const CompetitorAnalysisSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(200),
  competitors: z.array(z.string()).optional(),
  includeProducts: z.boolean().default(true),
  includePricing: z.boolean().default(false),
  includeMarketShare: z.boolean().default(true),
});

// Report Generation Schema
export const ReportGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  format: z.enum(['summary', 'detailed', 'comprehensive']).default('detailed'),
  includeCharts: z.boolean().default(false),
  includeRecommendations: z.boolean().default(true),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    order: z.number(),
  })).optional(),
  audience: z.string().max(100).optional(),
  timeframe: z.string().max(100).optional(),
});

// Trends Query Schema
export const TrendsQuerySchema = z.object({
  category: z.enum(['technology', 'market', 'consumer', 'industry', 'competitive']).optional(),
  limit: z.number().min(1).max(50).default(20),
  timeframe: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
});

// Summarize Schema
export const SummarizeSchema = z.object({
  content: z.string().min(1, 'Content is required').max(100000, 'Content too long'),
  contentType: z.enum(['article', 'document', 'webpage', 'text']).default('text'),
  maxLength: z.number().min(50).max(5000).default(500),
  style: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  includeKeyPoints: z.boolean().default(true),
});

// ============================================================================
// Type Inference
// ============================================================================

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type CompetitorAnalysisInputType = z.infer<typeof CompetitorAnalysisSchema>;
export type ReportGenerationInputType = z.infer<typeof ReportGenerationSchema>;
export type TrendsQueryInput = z.infer<typeof TrendsQuerySchema>;
export type SummarizeInputType = z.infer<typeof SummarizeSchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

// ============================================================================
// Express Request Extension
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
