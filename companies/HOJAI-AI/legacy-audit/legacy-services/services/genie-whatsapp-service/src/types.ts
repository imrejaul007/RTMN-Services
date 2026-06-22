/**
 * GENIE WhatsApp Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type WhatsAppMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker';

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  chat_id: string;
  from: string;
  to: string;
  type: WhatsAppMessageType;
  content: string;
  media_url?: string;
  media_mime_type?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  read: boolean;
  delivered: boolean;
  timestamp: string;
  created_at: string;
}

export interface WhatsAppChat {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_group: boolean;
  participants?: WhatsAppParticipant[];
  last_message?: WhatsAppMessage;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppParticipant {
  user_id: string;
  name: string;
  phone: string;
  is_admin: boolean;
}

export interface WhatsAppStatus {
  id: string;
  user_id: string;
  posted_by: string;
  content: string;
  media_url?: string;
  views: number;
  posted_at: string;
  expires_at?: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const SendMessageSchema = z.object({
  to: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']).default('text'),
  content: z.string().min(1),
  media_url: z.string().url().optional(),
  caption: z.string().max(1000).optional(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  participants: z.array(z.object({
    phone: z.string().min(1),
    name: z.string().min(1),
  })).min(2),
});

export const UpdateChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  archived: z.boolean().optional(),
  muted: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const ListMessagesQuerySchema = z.object({
  chat_id: z.string().min(1),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
