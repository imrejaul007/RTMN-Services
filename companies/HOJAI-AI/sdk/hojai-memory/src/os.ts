/**
 * MemoryOS Client (port 4703) — the dumb store.
 *
 * 15 memory types (long-term, working, episodic, semantic, procedural, …),
 * knowledge graph, learning. This is the lowest-level read/write surface.
 * The other 4 memory-layer services build on top of this.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type MemoryType =
  | 'episodic' | 'semantic' | 'procedural' | 'working' | 'long-term'
  | 'declarative' | 'factual' | 'contextual' | 'preference' | 'skill'
  | 'relationship' | 'event' | 'observation' | 'inference' | 'plan';

export interface MemoryEntry {
  id: string;
  ownerId: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryRequest {
  ownerId: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  ttlSeconds?: number;
}

export class MemoryOsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4703` }; }

  async list(ownerId: string, input: { type?: MemoryType; tag?: string; limit?: number; offset?: number } = {}): Promise<MemoryEntry[]> {
    return request<MemoryEntry[]>(this.config, 'GET', `/api/memory/${encodeURIComponent(ownerId)}${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(memoryId: string): Promise<MemoryEntry> {
    return request<MemoryEntry>(this.config, 'GET', `/api/memory/${encodeURIComponent(memoryId)}`);
  }
  async create(input: CreateMemoryRequest): Promise<MemoryEntry> {
    return request<MemoryEntry>(this.config, 'POST', '/api/memory', input);
  }
  async update(memoryId: string, patch: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
    return request<MemoryEntry>(this.config, 'PUT', `/api/memory/${encodeURIComponent(memoryId)}`, patch);
  }
  async remove(memoryId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/memory/${encodeURIComponent(memoryId)}`);
  }
  async search(input: { ownerId: string; q: string; limit?: number }): Promise<MemoryEntry[]> {
    return request<MemoryEntry[]>(this.config, 'POST', '/api/memory/search', input);
  }
  async stats(ownerId: string): Promise<{ count: number; sizeBytes: number; byType: Record<MemoryType, number> }> {
    return request(this.config, 'GET', `/api/memory/${encodeURIComponent(ownerId)}/stats`);
  }
}
