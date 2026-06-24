/**
 * Reputation Leaderboard Client — cross-service leaderboard aggregator.
 *
 * Unified leaderboards across all reputation sub-systems:
 *  - Agents by trust score (agent-reputation)
 *  - Merchants by transaction volume (SADA)
 *  - Risk-fewest entities
 *  - Most-endorsed entities (trust-network)
 *
 * Useful for marketplaces, directories, and federation dashboards.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type LeaderboardType = 'agent_trust' | 'merchant_trust' | 'most_endorsed' | 'lowest_risk' | 'highest_volume';

export interface LeaderboardEntry {
  rank: number;
  entityId: string;
  entityType: string;
  entityName?: string;
  score: number;
  metric: number;
  band?: string;
  metadata?: Record<string, unknown>;
}

export interface Leaderboard {
  type: LeaderboardType;
  period: { from?: string; to?: string };
  entries: LeaderboardEntry[];
  totalEntities: number;
  generatedAt: string;
}

export class LeaderboardClient {
  constructor(private config: HojaiConfig) {}

  async get(type: LeaderboardType, params: { limit?: number; from?: string; to?: string } = {}): Promise<Leaderboard> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Leaderboard>(this.config, 'GET', `/api/leaderboard/${encodeURIComponent(type)}${suffix}`);
  }

  // Convenience shortcuts
  async agentTopTrusted(limit?: number): Promise<LeaderboardEntry[]> {
    const lb = await this.get('agent_trust', { limit });
    return lb.entries;
  }

  async merchantTopTrusted(limit?: number): Promise<LeaderboardEntry[]> {
    const lb = await this.get('merchant_trust', { limit });
    return lb.entries;
  }

  async mostEndorsed(limit?: number): Promise<LeaderboardEntry[]> {
    const lb = await this.get('most_endorsed', { limit });
    return lb.entries;
  }

  async lowestRisk(limit?: number): Promise<LeaderboardEntry[]> {
    const lb = await this.get('lowest_risk', { limit });
    return lb.entries;
  }

  async highestVolume(limit?: number): Promise<LeaderboardEntry[]> {
    const lb = await this.get('highest_volume', { limit });
    return lb.entries;
  }
}