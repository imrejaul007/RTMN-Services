/**
 * RAZO Keyboard — Channels client.
 *
 * Manage multi-channel connectivity (WhatsApp, Telegram, SMS, Email,
 * Push, Web). Verify, send test messages, list + activate/deactivate.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Channel, ChannelKind, Message } from './types.js';

export interface CreateChannelRequest {
  kind: ChannelKind;
  name: string;
  /** Channel-specific config (e.g. WhatsApp business ID, Telegram bot token) */
  config: Record<string, unknown>;
}

export class ChannelsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: ensureLocalhostPort(config) };
  }

  async list(input: { kind?: ChannelKind; active?: boolean } = {}): Promise<Channel[]> {
    return request<Channel[]>(this.config, 'GET', `/api/channels${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(channelId: string): Promise<Channel> {
    return request<Channel>(this.config, 'GET', `/api/channels/${encodeURIComponent(channelId)}`);
  }

  async create(input: CreateChannelRequest): Promise<Channel> {
    return request<Channel>(this.config, 'POST', '/api/channels', input);
  }

  async activate(channelId: string): Promise<Channel> {
    return request<Channel>(this.config, 'POST', `/api/channels/${encodeURIComponent(channelId)}/activate`);
  }

  async deactivate(channelId: string): Promise<Channel> {
    return request<Channel>(this.config, 'POST', `/api/channels/${encodeURIComponent(channelId)}/deactivate`);
  }

  /** Verify a channel by sending a verification challenge (channel-specific). */
  async verify(channelId: string, input: { code: string }): Promise<{ verified: boolean; channelId: string }> {
    return request(this.config, 'POST', `/api/channels/${encodeURIComponent(channelId)}/verify`, input);
  }

  // ─── Channel-specific send helpers (convenience over /api/messages/send) ─

  async sendWhatsApp(channelId: string, to: string, body: string): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/channels/whatsapp', { channelId, to, body });
  }

  async sendTelegram(channelId: string, to: string, body: string): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/channels/telegram', { channelId, to, body });
  }

  async sendSms(channelId: string, to: string, body: string): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/channels/sms', { channelId, to, body });
  }

  async sendEmail(channelId: string, to: string, body: string, subject?: string): Promise<Message> {
    return request<Message>(this.config, 'POST', '/api/channels/email', { channelId, to, body, subject });
  }
}

function ensureLocalhostPort(config: HojaiConfig): string {
  if (config.baseUrl?.includes('localhost')) {
    return `http://localhost:4299`;
  }
  return config.baseUrl;
}
