/**
 * GENIE Personal OS Gateway - Type Definitions
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Unified gateway that orchestrates all GENIE services into a coherent Personal AI OS experience
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Service URLs
// ============================================================================

export const SERVICE_URLS = {
  memory: process.env.GENIE_MEMORY_SERVICE_URL || 'http://localhost:4703',
  relationship: process.env.GENIE_RELATIONSHIP_SERVICE_URL || 'http://localhost:4702',
  briefing: process.env.GENIE_BRIEFING_SERVICE_URL || 'http://localhost:4704',
  household: process.env.GENIE_HOUSEHOLD_SERVICE_URL || 'http://localhost:4706',
  sync: process.env.GENIE_SYNC_SERVICE_URL || 'http://localhost:4707',
  privacy: process.env.GENIE_PRIVACY_SERVICE_URL || 'http://localhost:4709',
  telegram: process.env.GENIE_TELEGRAM_SERVICE_URL || 'http://localhost:4710',
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4002',
  intent: process.env.REZ_INTENT_GRAPH_URL || 'http://localhost:3007',
  humanContext: process.env.REZ_HUMAN_CONTEXT_GRAPH_URL || 'http://localhost:4162',
  lifePattern: process.env.REZ_LIFE_PATTERN_ENGINE_URL || 'http://localhost:4161',
};

// ============================================================================
// Personal Context Types
// ============================================================================

export interface PersonalContext {
  user_id: string;
  tenant_id: string;
  memories: MemoryContext;
  relationships: RelationshipContext;
  household?: HouseholdContext;
  patterns: PatternContext;
  recent_activity: ActivityItem[];
  ai_insights: AIInsight[];
  pending_actions: PendingAction[];
}

export interface MemoryContext {
  recent_memories: Array<{
    id: string;
    content: string;
    category: string;
    created_at: string;
  }>;
  memory_count: number;
  top_tags: string[];
}

export interface RelationshipContext {
  top_contacts: Array<{
    id: string;
    name: string;
    interaction_count: number;
    last_interaction: string;
    importance_score: number;
  }>;
  relationship_insights: string[];
}

export interface HouseholdContext {
  id: string;
  name: string;
  member_count: number;
  active_tasks: number;
  upcoming_events: Array<{
    id: string;
    title: string;
    start_date: string;
  }>;
}

export interface PatternContext {
  daily_routine: Array<{
    time: string;
    activity: string;
    confidence: number;
  }>;
  weekly_patterns: string[];
  life_events: string[];
}

export interface ActivityItem {
  type: 'message' | 'memory_created' | 'relationship_interaction' | 'task_completed' | 'event_attended' | 'purchase';
  timestamp: string;
  summary: string;
  source: string;
}

export interface AIInsight {
  type: 'reminder' | 'suggestion' | 'prediction' | 'warning' | 'opportunity';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action?: {
    type: string;
    data: Record<string, unknown>;
  };
}

export interface PendingAction {
  id: string;
  type: string;
  title: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Unified Query Types
// ============================================================================

export interface UnifiedQuery {
  query: string;
  context?: 'memory' | 'relationship' | 'household' | 'commerce' | 'health' | 'all';
  limit?: number;
  user_intent?: string;
}

export interface UnifiedResponse {
  answer: string;
  sources: Array<{
    service: string;
    data: unknown[];
  }>;
  confidence: number;
  suggested_actions?: Array<{
    action: string;
    description: string;
  }>;
}

// ============================================================================
// Personal Timeline
// ============================================================================

export interface PersonalTimeline {
  events: TimelineEvent[];
  summary: {
    total_events: number;
    period: string;
    top_categories: string[];
  };
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'memory' | 'relationship' | 'task' | 'event' | 'purchase' | 'health' | 'work' | 'social';
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

// ============================================================================
// AI Companion Request
// ============================================================================

export interface AICompanionRequest {
  message: string;
  channel: 'telegram' | 'whatsapp' | 'voice' | 'app' | 'web';
  conversation_id?: string;
  include_context?: boolean;
  tone?: 'helpful' | 'friendly' | 'formal' | 'casual';
}

export interface AICompanionResponse {
  message: string;
  context_used: string[];
  actions_performed?: Array<{
    type: string;
    result: unknown;
  }>;
  suggested_follow_ups?: string[];
  memory_learned?: boolean;
}

// ============================================================================
// Daily Briefing
// ============================================================================

export interface DailyBriefing {
  date: string;
  greeting: string;
  summary: {
    events_today: number;
    tasks_pending: number;
    messages_unread: number;
    memories_learned: number;
  };
  schedule: Array<{
    time: string;
    event: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
  }>;
  insights: AIInsight[];
  weather?: {
    location: string;
    temperature: number;
    condition: string;
  };
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const UnifiedQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.enum(['memory', 'relationship', 'household', 'commerce', 'health', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const AICompanionRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  channel: z.enum(['telegram', 'whatsapp', 'voice', 'app', 'web']).default('app'),
  conversation_id: z.string().optional(),
  include_context: z.boolean().default(true),
  tone: z.enum(['helpful', 'friendly', 'formal', 'casual']).default('friendly'),
});

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(10000),
  category: z.enum(['conversation', 'fact', 'preference', 'event', 'decision', 'idea', 'learning', 'personal', 'work', 'social']).default('personal'),
  importance: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export const TimelineQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  types: z.array(z.enum(['memory', 'relationship', 'task', 'event', 'purchase', 'health', 'work', 'social'])).optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
});

// ============================================================================
// Type Inference
// ============================================================================

export type UnifiedQueryInput = z.infer<typeof UnifiedQuerySchema>;
export type AICompanionRequestInput = z.infer<typeof AICompanionRequestSchema>;
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type TimelineQueryInput = z.infer<typeof TimelineQuerySchema>;

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
    services_called?: string[];
  };
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}
