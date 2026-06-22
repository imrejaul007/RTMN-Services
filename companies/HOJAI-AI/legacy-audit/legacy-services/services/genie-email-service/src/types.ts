/**
 * GENIE Email Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'manual';
export type EmailPriority = 'high' | 'normal' | 'low';

export interface Email {
  id: string;
  user_id: string;
  thread_id: string;
  subject: string;
  body: string;
  snippet: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  labels: string[];
  attachments: Attachment[];
  read: boolean;
  starred: boolean;
  important: boolean;
  priority: EmailPriority;
  hasAttachments: boolean;
  received_at: string;
  sent_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface EmailAddress {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
}

export interface EmailThread {
  id: string;
  user_id: string;
  subject: string;
  messages: Email[];
  participants: EmailAddress[];
  last_message_at: string;
  message_count: number;
  unread_count: number;
}

export interface EmailFilter {
  from?: string;
  to?: string;
  subject?: string;
  label?: string;
  unread_only?: boolean;
  starred_only?: boolean;
  start_date?: string;
  end_date?: string;
  has_attachments?: boolean;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const EmailAddressSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export const AttachmentSchema = z.object({
  filename: z.string().min(1),
  mime_type: z.string(),
  size: z.number().positive(),
  url: z.string().url().optional(),
});

export const CreateEmailSchema = z.object({
  to: z.array(EmailAddressSchema).min(1),
  cc: z.array(EmailAddressSchema).optional(),
  bcc: z.array(EmailAddressSchema).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  attachments: z.array(AttachmentSchema).optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

export const UpdateEmailSchema = z.object({
  read: z.boolean().optional(),
  starred: z.boolean().optional(),
  important: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
});

export const SendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  from_name: z.string().optional(),
  reply_to: z.string().email().optional(),
});

export const ListEmailsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  folder: z.enum(['inbox', 'sent', 'drafts', 'trash', 'spam']).default('inbox'),
  unread_only: z.boolean().optional(),
  starred_only: z.boolean().optional(),
  label: z.string().optional(),
  search: z.string().optional(),
});

export const LabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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
