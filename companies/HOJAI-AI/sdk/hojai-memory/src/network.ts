/**
 * Memory Network Client (port 4794) — tiered memory + cross-tier aggregation.
 *
 * 5 tiers (personal / business / industry / ecosystem / agent) with
 * federation between them, plus auto-propagation rules and bulk operations.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { MemoryUnit, TierStats } from './types.js';

export type MemoryTier = 'personal' | 'business' | 'industry' | 'ecosystem' | 'agent';

export interface AggregateRequest {
  ownerId: string;
  /** Tiers to aggregate from */
  tiers: MemoryTier[];
  /** 'rank' | 'recent' | 'confidence' | 'recency' */
  sortBy?: 'rank' | 'recent' | 'confidence' | 'recency';
  limit?: number;
}

export interface PropagationRule {
  id: string;
  fromTier: MemoryTier;
  toTier: MemoryTier;
  /** Filter on the source memory (e.g. 'industry=fashion') */
  filter: Record<string, unknown>;
  enabled: boolean;
}

export class MemoryNetworkClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4794` }; }

  // Tier CRUD
  async createInTier(tier: MemoryTier, input: { ownerId: string; type: string; content: string; tags?: string[]; metadata?: Record<string, unknown> }): Promise<MemoryUnit> {
    return request<MemoryUnit>(this.config, 'POST', `/api/memory/${encodeURIComponent(tier)}`, input);
  }
  async listInTier(tier: MemoryTier, ownerId: string, input: { limit?: number; offset?: number } = {}): Promise<MemoryUnit[]> {
    return request<MemoryUnit[]>(this.config, 'GET', `/api/memory/${encodeURIComponent(tier)}/${encodeURIComponent(ownerId)}${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getFromTier(tier: MemoryTier, memoryId: string): Promise<MemoryUnit> {
    return request<MemoryUnit>(this.config, 'GET', `/api/memory/${encodeURIComponent(tier)}/${encodeURIComponent(memoryId)}`);
  }
  async searchTier(tier: MemoryTier, input: { ownerId: string; q: string; limit?: number }): Promise<MemoryUnit[]> {
    return request<MemoryUnit[]>(this.config, 'POST', `/api/memory/${encodeURIComponent(tier)}/search`, input);
  }
  async getTierStats(tier: MemoryTier, ownerId: string): Promise<TierStats> {
    return request<TierStats>(this.config, 'GET', `/api/memory/${encodeURIComponent(tier)}/stats/${encodeURIComponent(ownerId)}`);
  }
  async getContext(ownerId: string, input: { query?: string; tiers?: MemoryTier[]; maxItems?: number } = {}): Promise<MemoryUnit[]> {
    return request<MemoryUnit[]>(this.config, 'GET', `/api/memory/context/${encodeURIComponent(ownerId)}${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async aggregate(input: AggregateRequest): Promise<MemoryUnit[]> {
    return request<MemoryUnit[]>(this.config, 'POST', '/api/memory/aggregate', input);
  }
  async getRelated(memoryId: string): Promise<MemoryUnit[]> {
    return request<MemoryUnit[]>(this.config, 'GET', `/api/memory/related/${encodeURIComponent(memoryId)}`);
  }
  // Bulk + history
  async bulkCreate(tier: MemoryTier, memories: Array<{ ownerId: string; type: string; content: string }>): Promise<{ inserted: number }> {
    return request(this.config, 'POST', `/api/memory/${encodeURIComponent(tier)}/bulk`, { memories });
  }
  async getHistory(ownerId: string): Promise<Array<{ tier: MemoryTier; memoryId: string; action: string; at: string }>> {
    return request(this.config, 'GET', `/api/memory/history/${encodeURIComponent(ownerId)}`);
  }
  // Auto-propagation
  async autoPropagate(input: { ownerId: string; memoryId: string; targetTiers: MemoryTier[] }): Promise<{ propagated: number; targets: MemoryTier[] }> {
    return request(this.config, 'POST', '/api/memory/propagate', input);
  }
  // Federation
  async federate(input: { sourceOwner: string; targetOwner: string; tiers: MemoryTier[]; bidirectional?: boolean }): Promise<{ federated: number }> {
    return request(this.config, 'POST', '/api/memory/federate', input);
  }
}
