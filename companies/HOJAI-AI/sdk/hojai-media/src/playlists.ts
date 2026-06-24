/**
 * Media OS — Playlists Client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Playlist } from './types.js';

export class MediaPlaylistsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5600` }; }

  async list(input: { ownerId?: string; visibility?: Playlist['visibility']; limit?: number } = {}): Promise<Playlist[]> {
    return request<Playlist[]>(this.config, 'GET', `/api/playlists${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Playlist> {
    return request<Playlist>(this.config, 'GET', `/api/playlists/${encodeURIComponent(id)}`);
  }
  async create(input: { name: string; description?: string; ownerId: string; videoIds?: string[]; visibility?: Playlist['visibility'] }): Promise<Playlist> {
    return request<Playlist>(this.config, 'POST', '/api/playlists', input);
  }
  async addVideo(playlistId: string, videoId: string): Promise<Playlist> {
    return request<Playlist>(this.config, 'POST', `/api/playlists/${encodeURIComponent(playlistId)}/videos`, { videoId });
  }
  async removeVideo(playlistId: string, videoId: string): Promise<Playlist> {
    return request<Playlist>(this.config, 'DELETE', `/api/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`);
  }
  async delete(playlistId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/playlists/${encodeURIComponent(playlistId)}`);
  }
}
