/**
 * GENIE Telegram Service - Type Definitions
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Telegram bot integration for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Telegram User Status
 */
export type TelegramUserStatus = 'active' | 'inactive' | 'blocked' | 'pending_verification';

/**
 * Telegram Chat Type
 */
export type ChatType = 'private' | 'group' | 'supergroup' | 'channel';

/**
 * Message Direction
 */
export type MessageDirection = 'incoming' | 'outgoing';

/**
 * Telegram Message Interface
 */
export interface TelegramMessage {
  id: string;
  telegram_message_id: string;
  user_id: string;
  chat_id: string;
  chat_type: ChatType;
  direction: MessageDirection;
  content: string;
  entities?: TelegramMessageEntity[];
  has_media: boolean;
  media_type?: 'photo' | 'video' | 'audio' | 'document' | 'sticker' | 'voice';
  media_url?: string;
  caption?: string;
  reply_to_message_id?: string;
  forwarded_from?: {
    chat_id: string;
    message_id: string;
  };
  timestamp: Date;
  created_at: Date;
}

/**
 * Telegram Message Entity (for text parsing)
 */
export interface TelegramMessageEntity {
  type: 'mention' | 'hashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'code' | 'pre';
  offset: number;
  length: number;
  url?: string;
  language?: string;
}

/**
 * Telegram User Interface
 */
export interface TelegramUser {
  id: string;
  telegram_user_id: string;
  telegram_username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
  photo_url?: string;
  status: TelegramUserStatus;
  linked_user_id?: string; // REZ user ID
  linked_at?: Date;
  last_interaction?: Date;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Telegram Chat Interface
 */
export interface TelegramChat {
  id: string;
  telegram_chat_id: string;
  type: ChatType;
  title?: string; // For groups
  username?: string;
  description?: string;
  linked_user_id?: string;
  member_count?: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Telegram Session Interface
 */
export interface TelegramSession {
  id: string;
  user_id: string;
  telegram_chat_id: string;
  started_at: Date;
  last_activity?: Date;
  message_count: number;
  is_active: boolean;
}

/**
 * Telegram Command Interface
 */
export interface TelegramCommand {
  command: string;
  description: string;
  handler: string;
  required_role?: string;
  is_group_allowed: boolean;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Connect Telegram Request
 */
export interface ConnectTelegramRequest {
  telegram_user_id: string;
  verification_code?: string;
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  user_id?: string;
  chat_id?: string;
  content: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_to_message_id?: string;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

/**
 * Sync Messages Request
 */
export interface SyncMessagesRequest {
  user_id: string;
  telegram_chat_id: string;
  limit?: number;
  offset_date?: number; // Unix timestamp
}

/**
 * Telegram Webhook Update (from Telegram API)
 */
export interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramIncomingMessage;
  edited_message?: TelegramIncomingMessage;
  channel_post?: TelegramIncomingMessage;
  edited_channel_post?: TelegramIncomingMessage;
  callback_query?: TelegramCallbackQuery;
}

/**
 * Telegram Incoming Message
 */
export interface TelegramIncomingMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
    language?: string;
  }>;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  video?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_unique_id: string;
    filename?: string;
    mime_type: string;
    file_size?: number;
  };
  sticker?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    is_animated: boolean;
    thumbnail?: {
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size: number;
    };
  };
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type: string;
    file_size?: number;
  };
  reply_to_message?: TelegramIncomingMessage;
  forward_from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  forward_from_chat?: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
}

/**
 * Telegram Callback Query
 */
export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat_instance: string;
  data?: string;
  game_short_name?: string;
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
  };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const ConnectTelegramSchema = z.object({
  telegram_user_id: z.string().min(1, 'Telegram user ID is required'),
  verification_code: z.string().optional(),
});

export const SendMessageSchema = z.object({
  user_id: z.string().optional(),
  chat_id: z.string().optional(),
  content: z.string().min(1, 'Message content is required').max(4096, 'Message too long'),
  parse_mode: z.enum(['Markdown', 'HTML']).optional(),
  reply_to_message_id: z.string().optional(),
  disable_web_page_preview: z.boolean().default(false),
  disable_notification: z.boolean().default(false),
});

export const SyncMessagesSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  telegram_chat_id: z.string().min(1, 'Telegram chat ID is required'),
  limit: z.coerce.number().min(1).max(100).default(100),
  offset_date: z.number().optional(),
});

export const SetWebhookSchema = z.object({
  url: z.string().url('Valid URL required'),
  secret_token: z.string().optional(),
  max_connections: z.number().min(1).max(100).default(40),
  allowed_updates: z.array(z.enum([
    'message', 'edited_message', 'message_reaction', 'message_reaction_count',
    'callback_query', 'inline_query', 'chosen_inline_result',
    'shipping_query', 'pre_checkout_query', 'poll', 'poll_answer',
    'my_chat_member', 'chat_member', 'chat_join_request'
  ])).optional(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type ConnectTelegramInput = z.infer<typeof ConnectTelegramSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SyncMessagesInput = z.infer<typeof SyncMessagesSchema>;

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
