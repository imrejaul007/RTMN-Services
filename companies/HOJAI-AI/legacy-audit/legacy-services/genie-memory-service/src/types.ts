/**
 * GENIE Memory Service - Type Definitions
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Personal memory storage and retrieval for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Memory Categories
 */
export type MemoryCategory =
  | 'conversation'
  | 'fact'
  | 'preference'
  | 'event'
  | 'decision'
  | 'idea'
  | 'learning'
  | 'personal'
  | 'work'
  | 'social';

/**
 * Memory Importance Level
 */
export type ImportanceLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Memory Emotional Tone
 */
export type EmotionalTone = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * Memory Source
 */
export type MemorySource = 'user_input' | 'conversation' | 'extraction' | 'import' | 'ai_generated';

/**
 * Memory Interface
 */
export interface Memory {
  id: string;
  user_id: string;
  content: string;
  summary?: string;
  category: MemoryCategory;
  tags: string[];
  entities: string[];
  importance: ImportanceLevel;
  emotional_tone?: EmotionalTone;
  source: MemorySource;
  context?: string;
  related_memory_ids: string[];
  recall_count: number;
  last_recalled?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

/**
 * Memory Input (for creation)
 */
export interface MemoryInput {
  content: string;
  summary?: string;
  category: MemoryCategory;
  tags?: string[];
  importance?: ImportanceLevel;
  emotional_tone?: EmotionalTone;
  source?: MemorySource;
  context?: string;
  expires_at?: string;
}

/**
 * Memory Update Input
 */
export interface MemoryUpdateInput {
  content?: string;
  summary?: string;
  category?: MemoryCategory;
  tags?: string[];
  importance?: ImportanceLevel;
  emotional_tone?: EmotionalTone;
  related_memory_ids?: string[];
  expires_at?: string;
}

/**
 * Memory Search Options
 */
export interface MemorySearchOptions {
  query?: string;
  category?: MemoryCategory;
  tags?: string[];
  importance?: ImportanceLevel;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Memory Recall Stats
 */
export interface MemoryRecallStats {
  memory_id: string;
  recall_count: number;
  last_recalled: string;
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

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    timestamp: string;
    requestId: string;
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

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Memory Category Schema
export const MemoryCategorySchema = z.enum([
  'conversation',
  'fact',
  'preference',
  'event',
  'decision',
  'idea',
  'learning',
  'personal',
  'work',
  'social'
]);

// Importance Level Schema
export const ImportanceLevelSchema = z.enum(['critical', 'high', 'medium', 'low']);

// Emotional Tone Schema
export const EmotionalToneSchema = z.enum(['positive', 'negative', 'neutral', 'mixed']);

// Memory Source Schema
export const MemorySourceSchema = z.enum(['user_input', 'conversation', 'extraction', 'import', 'ai_generated']);

// Create Memory Schema
export const CreateMemorySchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  summary: z.string().max(500).optional(),
  category: MemoryCategorySchema,
  tags: z.array(z.string().max(50)).max(20).default([]),
  importance: ImportanceLevelSchema.default('medium'),
  emotional_tone: EmotionalToneSchema.optional(),
  source: MemorySourceSchema.default('user_input'),
  context: z.string().max(1000).optional(),
  expires_at: z.string().datetime().optional(),
});

// Update Memory Schema
export const UpdateMemorySchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  summary: z.string().max(500).optional(),
  category: MemoryCategorySchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  importance: ImportanceLevelSchema.optional(),
  emotional_tone: EmotionalToneSchema.optional(),
  related_memory_ids: z.array(z.string()).max(50).optional(),
  expires_at: z.string().datetime().optional(),
});

// Search Memories Schema
export const SearchMemoriesSchema = z.object({
  query: z.string().max(500).optional(),
  category: MemoryCategorySchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  importance: ImportanceLevelSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Query Schemas
export const GetMemoryQuerySchema = z.object({
  category: MemoryCategorySchema.optional(),
  importance: ImportanceLevelSchema.optional(),
});

export const ListMemoriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  category: MemoryCategorySchema.optional(),
  importance: ImportanceLevelSchema.optional(),
  sort_by: z.enum(['created_at', 'importance', 'recall_count']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Recall Memory Schema
export const RecallMemorySchema = z.object({
  memory_ids: z.array(z.string()).min(1).max(50),
});

// Add Tags Schema
export const AddTagsSchema = z.object({
  tags: z.array(z.string().max(50)).min(1).max(20),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
export type SearchMemoriesInput = z.infer<typeof SearchMemoriesSchema>;
export type ListMemoriesQuery = z.infer<typeof ListMemoriesQuerySchema>;

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
