/**
 * Media OS — Channels Client.
 *
 * Subscription-based channels (like YouTube channels).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Channel } from './types.js';

export class MediaChannelsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async list(input: { ownerId?: string; verified?: boolean; limit?: number } = {}): Promise<Channel[]> {
    return request<Channel[]>(this.config, 'GET', `/api/channels${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Channel> {
    return request<Channel>(this.config, 'GET', `/api/channels/${encodeURIComponent(id)}`);
  }
  async create(input: { name: string; description?: string; ownerId: string; bannerUrl?: string }): Promise<Channel> {
    return request<Channel>(this.config, 'POST', '/api/channels', input);
  }
  async subscribe(id: string, userId: string): Promise<{ subscribed: boolean; channelId: string; subscriberCount: number }> {
    return request(this.config, 'POST', `/api/channels/${encodeURIComponent(id)}/subscribe`, { userId });
  }
  async unsubscribe(id: string, userId: string): Promise<{ unsubscribed: boolean }> {
    return request(this.config, 'DELETE', `/api/channels/${encodeURIComponent(id)}/subscribe`, { userId });
  }
}
