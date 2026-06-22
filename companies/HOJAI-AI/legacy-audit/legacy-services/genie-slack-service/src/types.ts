/**
 * GENIE Slack Service - Type Definitions
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Slack workspace integration for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type SlackUserStatus = 'active' | 'inactive' | 'bot' | 'pending_link';
export type SlackChannelType = 'public' | 'private' | 'im' | 'mpim';
export type MessageDirection = 'incoming' | 'outgoing';
export type WorkspaceStatus = 'active' | 'inactive' | 'error';

// ============================================================================
// Slack Workspace
// ============================================================================

export interface SlackWorkspace {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_domain: string;
  bot_user_id?: string;
  bot_access_token?: string;
  user_access_token?: string;
  status: WorkspaceStatus;
  linked_user_id?: string;
  linked_at?: Date;
  last_sync?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// Slack User
// ============================================================================

export interface SlackUser {
  id: string;
  workspace_id: string;
  slack_user_id: string;
  slack_username?: string;
  display_name?: string;
  real_name?: string;
  email?: string;
  avatar_url?: string;
  status?: string;
  status_emoji?: string;
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
  linked_user_id?: string;
  linked_at?: Date;
  last_interaction?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// Slack Channel
// ============================================================================

export interface SlackChannel {
  id: string;
  workspace_id: string;
  slack_channel_id: string;
  name: string;
  type: SlackChannelType;
  is_private: boolean;
  topic?: string;
  purpose?: string;
  member_count: number;
  is_archived: boolean;
  created_at: Date;
  linked_user_id?: string;
  tenant_id: string;
  updated_at?: Date;
}

// ============================================================================
// Slack Message
// ============================================================================

export interface SlackMessage {
  id: string;
  workspace_id: string;
  channel_id: string;
  slack_message_id: string;
  user_id: string;
  thread_ts?: string;
  parent_ts?: string;
  content: string;
  attachments?: SlackAttachment[];
  has_files: boolean;
  file_count: number;
  reactions?: SlackReaction[];
  reply_count: number;
  direction: MessageDirection;
  timestamp: Date;
  tenant_id: string;
  created_at: Date;
}

export interface SlackAttachment {
  fallback?: string;
  text?: string;
  pretext?: string;
  title?: string;
  title_link?: string;
  thumb_url?: string;
  fields?: Array<{ title: string; value: string; short: boolean }>;
  color?: string;
  image_url?: string;
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

// ============================================================================
// Slack Thread Context
// ============================================================================

export interface SlackThreadContext {
  id: string;
  workspace_id: string;
  channel_id: string;
  thread_ts: string;
  parent_message_id: string;
  topic?: string;
  participant_ids: string[];
  message_count: number;
  last_activity?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// Slack Session
// ============================================================================

export interface SlackSession {
  id: string;
  workspace_id: string;
  user_id: string;
  slack_user_id: string;
  started_at: Date;
  last_activity?: Date;
  message_count: number;
  is_active: boolean;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// Slack Linkage
// ============================================================================

export interface SlackLinkage {
  id: string;
  tenant_id: string;
  user_id: string;
  workspace_id: string;
  slack_team_id: string;
  slack_user_id: string;
  verification_code?: string;
  verified_at?: Date;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const SlackOAuthSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  redirect_uri: z.string().url().optional(),
});

export const SendMessageSchema = z.object({
  channel: z.string().min(1),
  text: z.string().min(1).max(4000),
  thread_ts: z.string().optional(),
  attachments: z.array(z.object({
    fallback: z.string().optional(),
    text: z.string().optional(),
    pretext: z.string().optional(),
    title: z.string().optional(),
    title_link: z.string().url().optional(),
    color: z.string().optional(),
  })).optional(),
  blocks: z.array(z.unknown()).optional(),
});

export const CreateReminderSchema = z.object({
  channel: z.string().min(1),
  text: z.string().min(1).max(100),
  time: z.string().min(1),
});

export const SetStatusSchema = z.object({
  status_text: z.string().max(100).optional(),
  status_emoji: z.string().max(50).optional(),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: { timestamp: string; requestId: string };
}

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

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
