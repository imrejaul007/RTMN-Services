/**
 * Media OS — Content Client.
 *
 * Video / show / movie / live content CRUD, viewing events,
 * recommendations, trending, platform analytics.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Video, PlatformAnalytics } from './types.js';

export class MediaContentClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async list(input: { category?: string; creatorId?: string; tag?: string; visibility?: Video['visibility']; limit?: number } = {}): Promise<Video[]> {
    return request<Video[]>(this.config, 'GET', `/api/content${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Video> {
    return request<Video>(this.config, 'GET', `/api/content/${encodeURIComponent(id)}`);
  }
  async upload(input: { title: string; description: string; videoUrl: string; thumbnailUrl: string; durationSec: number; creatorId: string; channelId?: string; tags?: string[]; category?: string; visibility?: Video['visibility']; drmProtected?: boolean }): Promise<Video> {
    return request<Video>(this.config, 'POST', '/api/content', input);
  }
  async update(id: string, patch: Partial<Video>): Promise<Video> {
    return request<Video>(this.config, 'PATCH', `/api/content/${encodeURIComponent(id)}`, patch);
  }
  async recordView(id: string): Promise<{ recorded: boolean; viewCount: number }> {
    return request(this.config, 'POST', `/api/content/${encodeURIComponent(id)}/view`);
  }
  async getRecommendations(input: { userId: string; limit?: number }): Promise<Video[]> {
    return request<Video[]>(this.config, 'GET', `/api/recommendations${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getTrending(limit = 10): Promise<Video[]> {
    return request<Video[]>(this.config, 'GET', `/api/trending${buildQueryString({ limit })}`);
  }
  async getAnalytics(id: string): Promise<{ views: number; watchTimeMin: number; likes: number; comments: number }> {
    return request(this.config, 'GET', `/api/analytics/video/${encodeURIComponent(id)}`);
  }
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    return request<PlatformAnalytics>(this.config, 'GET', '/api/analytics/platform');
  }
  // Modules + AI agents
  async listModules(): Promise<Array<{ id: string; name: string; description: string }>> {
    const res = await request<{ modules: Array<{ id: string; name: string; description: string }> }>(this.config, 'GET', '/api/modules');
    return res.modules;
  }
  async listAgents(): Promise<Array<{ id: string; name: string; purpose: string }>> {
    const res = await request<{ agents: Array<{ id: string; name: string; purpose: string }> }>(this.config, 'GET', '/api/agents');
    return res.agents;
  }
  async getAgent(id: string): Promise<{ id: string; name: string; purpose: string; config?: Record<string, unknown> }> {
    return request(this.config, 'GET', `/api/agents/${encodeURIComponent(id)}`);
  }
}
