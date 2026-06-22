/**
 * Hojai Data Models - Conversation Entity
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Conversation represents customer interactions across all channels.
 */

import { z } from 'zod';

// ============================================
// CONVERSATION TYPES
// ============================================

export type ConversationChannel = 'whatsapp' | 'instagram' | 'facebook' | 'webchat' | 'api' | 'voice' | 'sms';
export type ConversationStatus = 'open' | 'pending' | 'closed' | 'archived';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ResolutionType = 'resolved' | 'escalated' | 'closed_no_resolution' | 'transferred';
export type AssigneeType = 'user' | 'ai_employee' | 'team';

export interface Conversation {
  id: string;
  tenant_id: string;

  // Participants
  customer_id: string;
  merchant_id?: string;
  assigned_to_type?: AssigneeType;
  assigned_to_id?: string;

  // Channel
  channel: ConversationChannel;
  channel_conversation_id?: string;
  channel_user_id?: string;

  // Status
  status: ConversationStatus;
  priority: ConversationPriority;

  // Content
  subject?: string;
  first_message: string;
  last_message: string;
  message_count: number;

  // Tags
  tags: string[];
  category?: string;

  // Resolution
  resolution_type?: ResolutionType;
  resolution_time_minutes?: number;
  csat_score?: number;
  csat_submitted_at?: string;
  resolution_summary?: string;

  // AI Detection
  detected_intent?: string;
  detected_entities?: Record<string, string>;
  sentiment?: 'positive' | 'neutral' | 'negative';

  // Timestamps
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  closed_at?: string;
  first_response_at?: string;
}

export interface ConversationSummary {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  last_message: string;
  last_message_at: string;
  assigned_to?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;

  sender_type: 'customer' | 'user' | 'ai';
  sender_id: string;

  content: string;
  content_type: 'text' | 'image' | 'document' | 'video' | 'audio' | 'location' | 'sticker' | 'template' | 'button_response';
  media_url?: string;

  ai_metadata?: {
    generated: boolean;
    model?: string;
    confidence?: number;
    intent?: string;
  };

  delivery_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

  timestamps: {
    sent_at?: string;
    delivered_at?: string;
    read_at?: string;
  };

  created_at: string;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const ConversationCreateSchema = z.object({
  customer_id: z.string().min(1),
  channel: z.enum(['whatsapp', 'instagram', 'facebook', 'webchat', 'api', 'voice', 'sms']),
  subject: z.string().optional(),
  first_message: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  tags: z.array(z.string()).default([]),
});

export const ConversationUpdateSchema = z.object({
  status: z.enum(['open', 'pending', 'closed', 'archived']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_to_type: z.enum(['user', 'ai_employee', 'team']).optional(),
  assigned_to_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resolution_type: z.enum(['resolved', 'escalated', 'closed_no_resolution', 'transferred']).optional(),
  resolution_summary: z.string().optional(),
  csat_score: z.number().min(1).max(5).optional(),
});

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createConversation(
  tenantId: string,
  data: z.infer<typeof ConversationCreateSchema>
): Conversation {
  const now = new Date().toISOString();
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    customer_id: data.customer_id,
    channel: data.channel,
    subject: data.subject,
    first_message: data.first_message,
    last_message: data.first_message,
    message_count: 1,
    priority: data.priority,
    tags: data.tags,
    status: 'open',
    created_at: now,
    updated_at: now,
    last_message_at: now,
  };
}

export function closeConversation(
  conversation: Conversation,
  resolution: ResolutionType,
  resolutionTimeMinutes: number
): Conversation {
  const now = new Date().toISOString();
  return {
    ...conversation,
    status: 'closed',
    resolution_type: resolution,
    resolution_time_minutes: resolutionTimeMinutes,
    closed_at: now,
    updated_at: now,
  };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  Conversation,
  ConversationSummary,
  Message,
};
