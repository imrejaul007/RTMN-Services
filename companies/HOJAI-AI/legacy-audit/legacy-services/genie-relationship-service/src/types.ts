/**
 * GENIE Relationship Service - Type Definitions
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Personal relationship tracking for GENIE Personal Intelligence OS
 */

import { z } from 'zod';

/**
 * Relationship Types
 */
export type RelationshipType = 'family' | 'friend' | 'colleague' | 'client' | 'professional';

/**
 * Interaction Types
 */
export type InteractionType = 'call' | 'message' | 'meeting' | 'email' | 'note';

/**
 * Relationship Interface
 */
export interface Relationship {
  id: string;
  user_id: string;
  name: string;
  relationship_type: RelationshipType;
  importance_score: number;
  last_interaction: string;
  next_followup?: string;
  birthday?: string;
  tags: string[];
  notes: string;
  context: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Interaction Interface
 */
export interface Interaction {
  id: string;
  relationship_id: string;
  type: InteractionType;
  description: string;
  timestamp: string;
}

/**
 * API Response Types
 */
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

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Zod Schemas for Validation
 */

// Relationship Type Schema
export const RelationshipTypeSchema = z.enum(['family', 'friend', 'colleague', 'client', 'professional']);

// Interaction Type Schema
export const InteractionTypeSchema = z.enum(['call', 'message', 'meeting', 'email', 'note']);

// Create Relationship Schema
export const CreateRelationshipSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  relationship_type: RelationshipTypeSchema,
  importance_score: z.number().min(1).max(10).default(5),
  next_followup: z.string().optional(),
  birthday: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().default(''),
  context: z.array(z.string()).default([]),
});

// Update Relationship Schema
export const UpdateRelationshipSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  relationship_type: RelationshipTypeSchema.optional(),
  importance_score: z.number().min(1).max(10).optional(),
  next_followup: z.string().optional(),
  birthday: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  context: z.array(z.string()).optional(),
});

// Create Interaction Schema
export const CreateInteractionSchema = z.object({
  type: InteractionTypeSchema,
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  timestamp: z.string().optional(),
});

// List Relationships Query Schema
export const ListRelationshipsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  type: RelationshipTypeSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'importance_score', 'last_interaction', 'created_at']).default('importance_score'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// List Interactions Query Schema
export const ListInteractionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  type: InteractionTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Request Type Inference
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>;
export type CreateInteractionInput = z.infer<typeof CreateInteractionSchema>;
export type ListRelationshipsQuery = z.infer<typeof ListRelationshipsQuerySchema>;
export type ListInteractionsQuery = z.infer<typeof ListInteractionsQuerySchema>;

/**
 * Tenant Context (from hojai-core middleware)
 */
export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

/**
 * Express Request Extension
 */
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
