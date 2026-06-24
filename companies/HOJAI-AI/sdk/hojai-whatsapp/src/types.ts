/**
 * WhatsApp OS types.
 */

export const WHATSAPP_PORT = 4860;

export type ProviderKind = '360dialog' | 'twilio' | 'meta-cloud-api';

export interface Provider {
  id: string;
  kind: ProviderKind;
  name: string;
  /** Whether this provider is currently active */
  active: boolean;
  /** Configured webhook URL */
  webhookUrl?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  /** Template body with {{1}}, {{2}} placeholders */
  body: string;
  /** Example variables for documentation */
  variables: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface TemplateRenderResult {
  rendered: string;
  /** Original placeholders + their resolved values */
  resolved: Record<string, string>;
}

export interface Contact {
  id: string;
  /** E.164 phone number */
  phone: string;
  name?: string;
  /** Tags for segmentation */
  tags: string[];
  /** Custom fields */
  fields: Record<string, string>;
  createdAt: string;
  lastSeenAt?: string;
}

export interface Message {
  id: string;
  to: string;
  body: string;
  /** Template used (if any) */
  templateId?: string;
  /** Rendered variables */
  variables?: Record<string, string>;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
}

export interface Conversation {
  phone: string;
  contactId: string;
  messages: Array<{ from: 'me' | 'them'; body: string; at: string }>;
  lastMessageAt: string;
  unread: number;
}
