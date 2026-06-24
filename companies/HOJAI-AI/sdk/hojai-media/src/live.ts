/**
 * Media OS — Live Streams Client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { LiveStream } from './types.js';

export class MediaLiveClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async listLive(): Promise<LiveStream[]> {
    return request<LiveStream[]>(this.config, 'GET', '/api/live');
  }
  async get(id: string): Promise<LiveStream> {
    return request<LiveStream>(this.config, 'GET', `/api/live/${encodeURIComponent(id)}`);
  }
  async start(input: { title: string; description?: string; creatorId: string; ingestUrl: string; playbackUrl: string }): Promise<LiveStream> {
    return request<LiveStream>(this.config, 'POST', '/api/live/start', input);
  }
  async end(id: string): Promise<LiveStream> {
    return request<LiveStream>(this.config, 'POST', `/api/live/${encodeURIComponent(id)}/end`);
  }
}
