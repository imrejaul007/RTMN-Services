/**
 * @hojai/razor — RAZO Keyboard types.
 *
 * RAZO Keyboard is the Communication OS for HOJAI. It transforms text
 * input into actionable intents and routes them across 24 industry
 * operating systems, DO App, SUTAR OS, and Genie AI.
 */

export const RAZOR_PORT = 4299; // RAZO Keyboard default port (master plan says 4725 but service runs on 4299)

/** 22 industry categories the intent router classifies against. */
export type IntentDomain =
  | 'commerce' | 'payment' | 'restaurant' | 'hotel' | 'healthcare' | 'retail'
  | 'logistics' | 'real-estate' | 'education' | 'travel' | 'beauty' | 'fitness'
  | 'crm' | 'erp' | 'finance' | 'hr' | 'marketing' | 'support' | 'operations'
  | 'genie' | 'sutar' | 'nexha';

export interface IntentEntity {
  type: string;
  value: string;
  /** 0-1 extraction confidence */
  confidence: number;
}

export interface DetectedIntent {
  id: string;
  /** 'order_food' | 'book_room' | 'send_money' | ... */
  name: string;
  domain: IntentDomain;
  /** 0-1 classification confidence */
  confidence: number;
  entities: IntentEntity[];
  /** Original user text */
  rawText: string;
  detectedAt: string;
}

export interface ParsedIntent extends DetectedIntent {
  /** Validated/normalized parameters ready for execution */
  parameters: Record<string, unknown>;
}

export interface Message {
  id: string;
  channelId: string;
  to: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}

export type ChannelKind = 'whatsapp' | 'telegram' | 'sms' | 'email' | 'push' | 'web';

export interface Channel {
  id: string;
  kind: ChannelKind;
  name: string;
  /** Whether this channel is currently active and verified */
  active: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: ChannelKind;
  body: string;
  variables: string[];
  createdAt: string;
}

export interface ConversationSession {
  id: string;
  userId: string;
  channelId: string;
  status: 'active' | 'ended';
  /** Conversation context (accumulated entities, intent history) */
  context: {
    entities: IntentEntity[];
    recentIntents: string[];
    metadata?: Record<string, unknown>;
  };
  startedAt: string;
  endedAt?: string;
}

export interface BroadcastResult {
  broadcastId: string;
  totalRecipients: number;
  queued: number;
  failed: number;
}
