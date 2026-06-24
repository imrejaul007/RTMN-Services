/**
 * TwinOS Hub Client (port 4705) — generic twin CRUD + cross-twin operations.
 *
 * Wraps the central TwinOS Hub: twin CRUD, state, identity, profile,
 * context, lifecycle, relationships, sync, stats, categories.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { TwinRecord, TwinRelationship, TwinStats, TwinCategory } from './types.js';

export class TwinHubClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4705` }; }

  // ─── Twin CRUD ───
  async list(input: { type?: string; ownerCorpId?: string; limit?: number; offset?: number } = {}): Promise<TwinRecord[]> {
    return request<TwinRecord[]>(this.config, 'GET', `/api/twins${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<TwinRecord> {
    return request<TwinRecord>(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}`);
  }
  async create(input: { type: string; ownerCorpId?: string; name?: string; attributes?: Record<string, unknown>; identity?: Record<string, unknown>; profile?: Record<string, unknown> }): Promise<TwinRecord> {
    return request<TwinRecord>(this.config, 'POST', '/api/twins', input);
  }
  async update(id: string, patch: Partial<TwinRecord>): Promise<TwinRecord> {
    return request<TwinRecord>(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}`, patch);
  }
  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/twins/${encodeURIComponent(id)}`);
  }
  // State / identity / profile / context / lifecycle
  async getState(id: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}/state`);
  }
  async setState(id: string, state: Record<string, unknown>): Promise<{ updated: boolean }> {
    return request(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}/state`, state);
  }
  async getIdentity(id: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}/identity`);
  }
  async setIdentity(id: string, identity: Record<string, unknown>): Promise<{ updated: boolean }> {
    return request(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}/identity`, identity);
  }
  async getProfile(id: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}/profile`);
  }
  async setProfile(id: string, profile: Record<string, unknown>): Promise<{ updated: boolean }> {
    return request(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}/profile`, profile);
  }
  async getContext(id: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}/context`);
  }
  async setContext(id: string, context: Record<string, unknown>): Promise<{ updated: boolean }> {
    return request(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}/context`, context);
  }
  async getLifecycle(id: string): Promise<TwinRecord['lifecycle']> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(id)}/lifecycle`);
  }
  async setLifecycle(id: string, lifecycle: TwinRecord['lifecycle']): Promise<{ updated: boolean }> {
    return request(this.config, 'PUT', `/api/twins/${encodeURIComponent(id)}/lifecycle`, lifecycle);
  }
  async archive(id: string): Promise<{ archived: boolean; id: string }> {
    return request(this.config, 'POST', `/api/twins/${encodeURIComponent(id)}/archive`);
  }
  // Relationships
  async listRelationships(input: { fromTwinId?: string; toTwinId?: string; kind?: string } = {}): Promise<TwinRelationship[]> {
    return request<TwinRelationship[]>(this.config, 'GET', `/api/relationships${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async createRelationship(input: { fromTwinId: string; toTwinId: string; kind: string; metadata?: Record<string, unknown> }): Promise<TwinRelationship> {
    return request<TwinRelationship>(this.config, 'POST', '/api/relationships', input);
  }
  async removeRelationship(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/relationships/${encodeURIComponent(id)}`);
  }
  // Sync
  async syncOne(id: string): Promise<{ synced: boolean; id: string }> {
    return request(this.config, 'POST', `/api/sync/${encodeURIComponent(id)}`);
  }
  async syncAll(): Promise<{ synced: number; failed: number }> {
    return request(this.config, 'POST', '/api/sync');
  }
  async getSyncHistory(input: { limit?: number } = {}): Promise<Array<{ twinId: string; at: string; success: boolean; error?: string }>> {
    return request(this.config, 'GET', `/api/sync/history${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  // Stats + categories
  async stats(): Promise<TwinStats> {
    return request<TwinStats>(this.config, 'GET', '/api/stats');
  }
  async categories(): Promise<TwinCategory[]> {
    return request<TwinCategory[]>(this.config, 'GET', '/api/categories');
  }
  async listServices(): Promise<Array<{ name: string; url: string; status: string }>> {
    return request(this.config, 'GET', '/api/services');
  }
}
