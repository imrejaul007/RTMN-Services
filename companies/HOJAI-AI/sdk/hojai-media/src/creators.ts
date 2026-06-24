/**
 * Media OS — Creators Client.
 *
 * Creator profiles, handle lookup, analytics.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Creator, CreatorAnalytics } from './types.js';

export class MediaCreatorsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async list(input: { verified?: boolean; limit?: number } = {}): Promise<Creator[]> {
    return request<Creator[]>(this.config, 'GET', `/api/creators${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Creator> {
    return request<Creator>(this.config, 'GET', `/api/creators/${encodeURIComponent(id)}`);
  }
  async getByHandle(handle: string): Promise<Creator> {
    return request<Creator>(this.config, 'GET', `/api/creators/handle/${encodeURIComponent(handle)}`);
  }
  async create(input: { handle: string; name: string; email?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }): Promise<Creator> {
    return request<Creator>(this.config, 'POST', '/api/creators', input);
  }
  async getAnalytics(id: string): Promise<CreatorAnalytics> {
    return request<CreatorAnalytics>(this.config, 'GET', `/api/creators/${encodeURIComponent(id)}/analytics`);
  }
}
