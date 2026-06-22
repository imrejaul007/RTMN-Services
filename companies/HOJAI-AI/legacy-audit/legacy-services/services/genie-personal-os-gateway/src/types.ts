/**
 * GENIE Personal OS Gateway - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: API Gateway - Orchestrates all Genie services
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Context Types
 */
export interface PersonalContext {
  user_id: string;
  memories: MemorySummary[];
  relationships: RelationshipSummary[];
  upcoming_meetings: MeetingSummary[];
  recent_briefings: BriefingSummary[];
  preferences: Preference[];
}

export interface MemorySummary {
  id: string;
  content: string;
  category: string;
  importance: string;
  created_at: string;
}

export interface RelationshipSummary {
  id: string;
  name: string;
  relationship_type: string;
  last_interaction?: string;
  interaction_count: number;
}

export interface MeetingSummary {
  id: string;
  title: string;
  start_time: string;
  participants_count: number;
}

export interface BriefingSummary {
  id: string;
  title: string;
  created_at: string;
  type: string;
}

export interface Preference {
  key: string;
  value: unknown;
  category: string;
}

/**
 * Query Types
 */
export interface UnifiedSearchResult {
  memories: MemoryResult[];
  relationships: RelationshipResult[];
  meetings: MeetingResult[];
  briefings: BriefingResult[];
}

export interface MemoryResult {
  id: string;
  content: string;
  category: string;
  relevance_score: number;
}

export interface RelationshipResult {
  id: string;
  name: string;
  relationship_type: string;
  relevance_score: number;
}

export interface MeetingResult {
  id: string;
  title: string;
  start_time: string;
  relevance_score: number;
}

export interface BriefingResult {
  id: string;
  title: string;
  created_at: string;
  relevance_score: number;
}

/**
 * AI Companion Types
 */
export interface AICompanionRequest {
  message: string;
  context?: {
    memories?: boolean;
    relationships?: boolean;
    meetings?: boolean;
    briefings?: boolean;
  };
}

export interface AICompanionResponse {
  message: string;
  actions?: AIAction[];
  context_used: string[];
}

export interface AIAction {
  type: 'create_memory' | 'update_relationship' | 'schedule_meeting' | 'create_briefing';
  data: Record<string, unknown>;
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

// ============================================================================
// Zod Schemas
// ============================================================================

export const UnifiedSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  types: z.array(z.enum(['memories', 'relationships', 'meetings', 'briefings'])).optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export const AICompanionSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  context: z.object({
    memories: z.boolean().optional(),
    relationships: z.boolean().optional(),
    meetings: z.boolean().optional(),
    briefings: z.boolean().optional(),
  }).optional(),
});

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  category: z.enum(['conversation', 'fact', 'preference', 'event', 'decision', 'idea', 'learning', 'personal', 'work', 'social']),
  tags: z.array(z.string()).optional(),
  importance: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
});

export const CreateRelationshipSchema = z.object({
  name: z.string().min(1).max(200),
  relationship_type: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type UnifiedSearchInput = z.infer<typeof UnifiedSearchSchema>;
export type AICompanionInput = z.infer<typeof AICompanionSchema>;
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
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
