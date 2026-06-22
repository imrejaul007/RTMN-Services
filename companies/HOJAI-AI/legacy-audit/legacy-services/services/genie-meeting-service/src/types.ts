/**
 * GENIE Meeting Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Meeting intelligence - summaries, action items, decisions
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Meeting Status
 */
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Action Item Status
 */
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Action Item Priority
 */
export type ActionItemPriority = 'high' | 'medium' | 'low';

/**
 * Meeting Participant Role
 */
export type ParticipantRole = 'organizer' | 'attendee' | 'observer';

/**
 * Meeting Interface
 */
export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  meeting_url?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: MeetingStatus;
  participants: Participant[];
  transcript?: string;
  summary?: string;
  key_points: string[];
  action_items: ActionItem[];
  decisions: string[];
  follow_up_meeting_id?: string;
  source: 'calendar' | 'manual' | 'import';
  created_at: string;
  updated_at?: string;
}

/**
 * Participant Interface
 */
export interface Participant {
  id: string;
  name: string;
  email?: string;
  role: ParticipantRole;
  joined_at?: string;
  left_at?: string;
}

/**
 * Action Item Interface
 */
export interface ActionItem {
  id: string;
  content: string;
  assignee?: string;
  assignee_email?: string;
  due_date?: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  completed_at?: string;
  created_at: string;
}

/**
 * Meeting Input (for creation)
 */
export interface MeetingInput {
  title: string;
  description?: string;
  meeting_url?: string;
  start_time: string;
  end_time?: string;
  participants?: ParticipantInput[];
  source?: 'calendar' | 'manual' | 'import';
}

/**
 * Participant Input
 */
export interface ParticipantInput {
  name: string;
  email?: string;
  role?: ParticipantRole;
}

/**
 * Transcript Input
 */
export interface TranscriptInput {
  speaker: string;
  text: string;
  timestamp: string;
}

/**
 * Update Meeting Input
 */
export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  status?: MeetingStatus;
  end_time?: string;
  summary?: string;
  key_points?: string[];
  action_items?: ActionItem[];
  decisions?: string[];
}

/**
 * Add Transcript Input
 */
export interface AddTranscriptInput {
  transcript: TranscriptInput[];
  raw_transcript?: string;
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

export interface MeetingStats {
  total_meetings: number;
  completed_meetings: number;
  upcoming_meetings: number;
  total_action_items: number;
  pending_action_items: number;
  completed_action_items: number;
  average_duration_minutes?: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Meeting Status Schema
export const MeetingStatusSchema = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']);

// Action Item Status Schema
export const ActionItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Action Item Priority Schema
export const ActionItemPrioritySchema = z.enum(['high', 'medium', 'low']);

// Participant Role Schema
export const ParticipantRoleSchema = z.enum(['organizer', 'attendee', 'observer']);

// Create Meeting Schema
export const CreateMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  meeting_url: z.string().url().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  participants: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    role: ParticipantRoleSchema.default('attendee'),
  })).optional(),
  source: z.enum(['calendar', 'manual', 'import']).default('manual'),
});

// Update Meeting Schema
export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: MeetingStatusSchema.optional(),
  end_time: z.string().datetime().optional(),
  summary: z.string().max(5000).optional(),
  key_points: z.array(z.string().max(500)).max(50).optional(),
  action_items: z.array(z.object({
    id: z.string().optional(),
    content: z.string().min(1).max(500),
    assignee: z.string().optional(),
    assignee_email: z.string().email().optional(),
    due_date: z.string().datetime().optional(),
    status: ActionItemStatusSchema.default('pending'),
    priority: ActionItemPrioritySchema.default('medium'),
  })).optional(),
  decisions: z.array(z.string().max(500)).max(50).optional(),
});

// Add Transcript Schema
export const AddTranscriptSchema = z.object({
  transcript: z.array(z.object({
    speaker: z.string().min(1),
    text: z.string().min(1),
    timestamp: z.string(),
  })).optional(),
  raw_transcript: z.string().optional(),
});

// Transcript Input Schema
export const TranscriptInputSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  timestamp: z.string(),
});

// List Meetings Query Schema
export const ListMeetingsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: MeetingStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  sort_by: z.enum(['start_time', 'created_at', 'title']).default('start_time'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Update Action Item Schema
export const UpdateActionItemSchema = z.object({
  status: ActionItemStatusSchema.optional(),
  due_date: z.string().datetime().optional(),
  assignee: z.string().optional(),
  assignee_email: z.string().email().optional(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;
export type UpdateMeetingInputType = z.infer<typeof UpdateMeetingSchema>;
export type AddTranscriptInputType = z.infer<typeof AddTranscriptSchema>;
export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;
export type UpdateActionItemInput = z.infer<typeof UpdateActionItemSchema>;

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
