/**
 * BAM Reputation Aggregator Client
 *
 * Wraps the blr-reputation-aggregator service (port 4258). Cross-tenant
 * reputation scores for entities (publishers, agents, listings). Provides
 * the public leaderboard used by BAM's discovery UX.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type EntityKind = 'publisher' | 'agent' | 'company' | 'listing' | 'workflow';

export interface ReputationScore {
  dimension: string;
  value: number;
  weight?: number;
  source?: string;
  computedAt: string;
}

export interface ReputationEntity {
  id: string;
  kind: EntityKind;
  name: string;
  /** Composite 0-100 score */
  overallScore: number;
  scores: ReputationScore[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntityRequest {
  id: string;
  kind: EntityKind;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface AddScoreRequest {
  dimension: string;
  value: number;
  weight?: number;
  source?: string;
}

export interface LeaderboardEntry {
  rank: number;
  entityId: string;
  name: string;
  kind: EntityKind;
  overallScore: number;
}

export class ReputationClient {
  constructor(private config: HojaiConfig) {}

  /** Create a reputation entity (auth required). */
  async create(input: CreateEntityRequest): Promise<ReputationEntity> {
    return request<ReputationEntity>(this.config, 'POST', '/api/entities', input);
  }

  /** List reputation entities, optionally filtered. */
  async list(input: { kind?: EntityKind; limit?: number; offset?: number } = {}): Promise<ReputationEntity[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<ReputationEntity[]>(this.config, 'GET', `/api/entities${qs}`);
  }

  /** Get one entity's reputation. */
  async get(entityId: string): Promise<ReputationEntity> {
    return request<ReputationEntity>(this.config, 'GET', `/api/entities/${encodeURIComponent(entityId)}`);
  }

  /** Add a score dimension to an entity (auth required). */
  async addScore(entityId: string, input: AddScoreRequest): Promise<ReputationEntity> {
    return request<ReputationEntity>(this.config, 'POST', `/api/entities/${encodeURIComponent(entityId)}/scores`, input);
  }

  /** Trigger a re-sync of an entity's reputation (auth required). */
  async sync(entityId: string): Promise<{ synced: boolean; entityId: string; overallScore: number }> {
    return request<{ synced: boolean; entityId: string; overallScore: number }>(
      this.config,
      'POST',
      `/api/entities/${encodeURIComponent(entityId)}/sync`,
    );
  }

  /** Get the public leaderboard. */
  async leaderboard(input: { kind?: EntityKind; limit?: number } = {}): Promise<LeaderboardEntry[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<LeaderboardEntry[]>(this.config, 'GET', `/api/leaderboard${qs}`);
  }
}
