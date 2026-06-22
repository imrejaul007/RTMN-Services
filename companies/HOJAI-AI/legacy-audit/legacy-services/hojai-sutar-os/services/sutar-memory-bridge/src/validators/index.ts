// ============================================================================
// SUTAR Memory Bridge - Validators
// ============================================================================

import { z } from 'zod';
import { MemoryType, SharePermission } from '../types/index';

// Memory creation schema
export const createMemorySchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  type: z.enum(['context', 'fact', 'preference', 'history', 'session']).optional().default('context'),
  content: z.string().min(1, 'content is required').max(1000000, 'content too large'),
  metadata: z.record(z.unknown()).optional().default({}),
  tags: z.array(z.string()).max(50, 'maximum 50 tags allowed').optional().default([]),
  generateEmbedding: z.boolean().optional().default(false),
  ttlSeconds: z.number().int().min(1).max(31536000).optional(),
  source: z.string().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Memory update schema
export const updateMemorySchema = z.object({
  content: z.string().min(1, 'content cannot be empty').max(1000000, 'content too large').optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).max(50, 'maximum 50 tags allowed').optional(),
  embedding: z.array(z.number()).length(1536, 'embedding must have 1536 dimensions').optional(),
  status: z.enum(['active', 'archived', 'deleted', 'expired']).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Memory filter schema
export const filterMemorySchema = z.object({
  entityId: z.string().optional(),
  type: z.enum(['context', 'fact', 'preference', 'history', 'session']).optional(),
  types: z.array(z.enum(['context', 'fact', 'preference', 'history', 'session'])).optional(),
  status: z.enum(['active', 'archived', 'deleted', 'expired']).optional(),
  statuses: z.array(z.enum(['active', 'archived', 'deleted', 'expired'])).optional(),
  tags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  accessedAfter: z.string().datetime().optional(),
  accessedBefore: z.string().datetime().optional(),
  minAccessCount: z.number().int().min(0).optional(),
  maxAccessCount: z.number().int().min(0).optional(),
  hasEmbedding: z.boolean().optional(),
  hasTTL: z.boolean().optional(),
  expired: z.boolean().optional(),
  sharedWith: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1, 'query is required'),
  entityId: z.string().optional(),
  type: z.enum(['context', 'fact', 'preference', 'history', 'session']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  minSimilarity: z.number().min(0).max(1).optional().default(0),
});

// Share schema
export const shareMemorySchema = z.object({
  toEntityId: z.string().min(1, 'toEntityId is required'),
  permission: z.enum(['read', 'write', 'admin']).optional().default('read'),
  expiresIn: z.number().int().min(1).optional(),
});

// TTL schema
export const setTTLSchema = z.object({
  ttlSeconds: z.number().int().min(1, 'ttlSeconds must be at least 1').max(31536000, 'ttlSeconds cannot exceed 1 year'),
  autoRenew: z.boolean().optional().default(false),
  maxRenewals: z.number().int().min(0).max(100).optional().default(0),
});

// Version schema
export const createVersionSchema = z.object({
  content: z.string().min(1, 'content is required'),
  changes: z.array(z.string()).optional().default([]),
  createdBy: z.string().min(1, 'createdBy is required'),
});

// Backup schema
export const backupSchema = z.object({
  entityIds: z.array(z.string()).optional(),
  includeExpired: z.boolean().optional().default(false),
  includeDeleted: z.boolean().optional().default(false),
  compression: z.boolean().optional().default(false),
});

// Restore schema
export const restoreSchema = z.object({
  backupData: z.object({
    version: z.string(),
    metadata: z.object({
      id: z.string(),
      createdAt: z.string(),
      size: z.number(),
      memoryCount: z.number(),
      versionCount: z.number(),
      shareCount: z.number(),
      entityIds: z.array(z.string()),
      checksum: z.string(),
    }),
    memories: z.array(z.any()),
    versions: z.array(z.any()),
    shares: z.array(z.any()),
  }),
  overwrite: z.boolean().optional().default(false),
  merge: z.boolean().optional().default(true),
  validate: z.boolean().optional().default(true),
});

// Bulk delete schema
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'at least one id is required'),
});

// Batch create schema
export const batchCreateSchema = z.object({
  memories: z.array(createMemorySchema).min(1).max(100),
});

// Hybrid search schema
export const hybridSearchSchema = z.object({
  query: z.string().min(1, 'query is required'),
  entityId: z.string().optional(),
  type: z.enum(['context', 'fact', 'preference', 'history', 'session']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  semanticWeight: z.number().min(0).max(1).optional().default(0.7),
  keywordWeight: z.number().min(0).max(1).optional().default(0.3),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
    }
    return { success: false, errors: ['Validation error'] };
  }
}
