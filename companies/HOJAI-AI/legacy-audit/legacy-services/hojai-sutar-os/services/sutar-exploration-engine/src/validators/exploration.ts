// ============================================================================
// SUTAR Exploration Engine - Validators
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Market Scanning Validators
// ============================================================================

export const ScanQuerySchema = z.object({
  query: z.string().min(1).max(500),
  industry: z.string().optional(),
  region: z.string().optional(),
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type ScanQueryInput = z.infer<typeof ScanQuerySchema>;

// ============================================================================
// Opportunity Validators
// ============================================================================

export const OpportunityQuerySchema = z.object({
  type: z.enum([
    'market_entry',
    'product_extension',
    'partnership',
    'acquisition',
    'pricing',
    'geographic_expansion',
    'feature_addition',
    'process_improvement',
  ]).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  minScore: z.number().min(0).max(100).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type OpportunityQueryInput = z.infer<typeof OpportunityQuerySchema>;

// ============================================================================
// Trend Validators
// ============================================================================

export const TrendQuerySchema = z.object({
  category: z.string().optional(),
  direction: z.enum(['upward', 'downward', 'stable']).optional(),
  minStrength: z.number().min(0).max(100).optional().default(0),
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type TrendQueryInput = z.infer<typeof TrendQuerySchema>;

// ============================================================================
// Competitor Validators
// ============================================================================

export const CompetitorQuerySchema = z.object({
  industry: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type CompetitorQueryInput = z.infer<typeof CompetitorQuerySchema>;

// ============================================================================
// Gap Analysis Validators
// ============================================================================

export const GapQuerySchema = z.object({
  industry: z.string().min(1).max(200),
  region: z.string().optional(),
  type: z.enum([
    'product',
    'pricing',
    'service',
    'technology',
    'geographic',
    'demographic',
    'feature',
    'channel',
  ]).optional(),
  minSeverity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export type GapQueryInput = z.infer<typeof GapQuerySchema>;

// ============================================================================
// Market Segment Validators
// ============================================================================

export const SegmentQuerySchema = z.object({
  industry: z.string().optional(),
  region: z.string().optional(),
  minSize: z.number().min(0).optional(),
  minGrowth: z.number().min(-100).max(100).optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type SegmentQueryInput = z.infer<typeof SegmentQuerySchema>;

// ============================================================================
// Intent/Event Validators
// ============================================================================

export const IntentPayloadSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
});

export type IntentPayloadInput = z.infer<typeof IntentPayloadSchema>;

export const EventPayloadSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
});

export type EventPayloadInput = z.infer<typeof EventPayloadSchema>;
