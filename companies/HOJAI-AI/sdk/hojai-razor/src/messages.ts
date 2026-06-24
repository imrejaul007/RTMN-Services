/**
 * RAZO Keyboard — Messages client.
 *
 * Send, schedule, broadcast, and template messages across all configured
 * channels (WhatsApp, Telegram, SMS, Email, Push, Web).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Message, MessageTemplate, BroadcastResult, ChannelKind } from './types.js';

export interface SendMessageRequest {
  channelId: string;
  to: string;
  body: string;
  /** Optional variables to substitute in template-style messages */
  variables?: Record<string, string>;
  /** Send at a future time */
  scheduledFor?: string;
}

export interface ScheduleMessageRequest extends SendMessageRequest {
  scheduledFor: string;
}

export interface BroadcastRequest {
  channelId: string;
  to: string[];
  body: string;
  variables?: Record<string, string>;
}

export class MessagesClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: ensureLocalhostPort(config) };
  }


  /** Send a message immediately. */
  async send(input: SendMessageRequest): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/messages/send', input);
  }

  /** Schedule a message for future delivery. */
  async schedule(input: ScheduleMessageRequest): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/messages/schedule', input);
  }

  /** Broadcast a single message to many recipients. */
  async broadcast(input: BroadcastRequest): Promise<BroadcastResult> {
    return request<BroadcastResult>(this.config, 'POST', '/api/messages/broadcast', input);
  }

  /** List scheduled messages. */
  async listScheduled(input: { channelId?: string; limit?: number } = {}): Promise<Message[]> {
    return request<Message[]>(this.config, 'GET', `/api/messages/scheduled${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  /** Cancel a scheduled message. */
  async cancelScheduled(messageId: string): Promise<{ cancelled: boolean; id: string }> {
    return request(this.config, 'DELETE', `/api/messages/scheduled/${encodeURIComponent(messageId)}`);
  }

  // ─── Templates ────────────────────────────────────────────────

  async listTemplates(input: { channel?: ChannelKind } = {}): Promise<MessageTemplate[]> {
    return request<MessageTemplate[]>(this.config, 'GET', `/api/messages/templates${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getTemplate(templateId: string): Promise<MessageTemplate> {
    return request<MessageTemplate>(this.config, 'GET', `/api/messages/templates/${encodeURIComponent(templateId)}`);
  }

  async createTemplate(input: { name: string; channel: ChannelKind; body: string; variables: string[] }): Promise<MessageTemplate> {
    return request<MessageTemplate>(this.config, 'POST', '/api/messages/templates', input);
  }

  /** Render a template by substituting variables, then optionally send. */
  async renderAndSend(templateId: string, variables: Record<string, string>, send: Omit<SendMessageRequest, 'body'>): Promise<Message> {
    const tpl = await this.getTemplate(templateId);
    const body = Object.entries(variables).reduce(
      (s, [k, v]) => s.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v),
      tpl.body
    );
    return this.send({ ...send, body });
  }
}

function ensureLocalhostPort(config: HojaiConfig): string {
  if (config.baseUrl?.includes('localhost')) {
    return `http://localhost:4299`;
  }
  return config.baseUrl;
}
