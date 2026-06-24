/**
 * Media OS — Comments Client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Comment } from './types.js';

export class MediaCommentsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async listForVideo(videoId: string, input: { limit?: number; sort?: 'newest' | 'top' } = {}): Promise<Comment[]> {
    return request<Comment[]>(this.config, 'GET', `/api/comments/video/${encodeURIComponent(videoId)}${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async create(input: { videoId: string; authorId: string; authorName: string; body: string; parentId?: string }): Promise<Comment> {
    return request<Comment>(this.config, 'POST', '/api/comments', input);
  }
  async like(commentId: string): Promise<Comment> {
    return request<Comment>(this.config, 'POST', `/api/comments/${encodeURIComponent(commentId)}/like`);
  }
  async unlike(commentId: string): Promise<Comment> {
    return request<Comment>(this.config, 'DELETE', `/api/comments/${encodeURIComponent(commentId)}/like`);
  }
}
