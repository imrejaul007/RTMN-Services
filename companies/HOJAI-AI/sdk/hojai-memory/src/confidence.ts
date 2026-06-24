/**
 * Memory Confidence Client (port 4152) — per-fact reliability scoring.
 *
 * Tracks per-fact reliability using (base × decay × contradiction) model.
 * Provides reinforce/contradict/recall operations and staleness reports.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface Fact {
  id: string;
  subject: string;
  /** The fact statement */
  content: string;
  /** 0-1 base confidence */
  baseConfidence: number;
  /** 0-1 current effective confidence (after decay × contradiction) */
  effectiveConfidence: number;
  /** Last time the fact was reinforced */
  lastReinforcedAt?: string;
  /** Source of the fact (e.g. user-stated, inferred, observed) */
  source: string;
  /** Number of times this fact has been contradicted */
  contradictions: number;
  /** Number of times reinforced */
  reinforcements: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFactRequest {
  subject: string;
  content: string;
  baseConfidence?: number;
  source?: string;
}

export interface ConfidenceReport {
  twinId: string;
  factCount: number;
  averageConfidence: number;
  staleCount: number;
  contradictedCount: number;
  stalenessBreakdown: { fresh: number; aging: number; stale: number; rotten: number };
  generatedAt: string;
}

export class MemoryConfidenceClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4152` }; }

  async listFacts(input: { subject?: string; minConfidence?: number; limit?: number } = {}): Promise<Fact[]> {
    return request<Fact[]>(this.config, 'GET', `/api/facts${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getFact(factId: string): Promise<Fact> {
    return request<Fact>(this.config, 'GET', `/api/facts/${encodeURIComponent(factId)}`);
  }
  async createFact(input: CreateFactRequest): Promise<Fact> {
    return request<Fact>(this.config, 'POST', '/api/facts', input);
  }
  async updateFact(factId: string, patch: Partial<CreateFactRequest>): Promise<Fact> {
    return request<Fact>(this.config, 'PATCH', `/api/facts/${encodeURIComponent(factId)}`, patch);
  }
  async removeFact(factId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/facts/${encodeURIComponent(factId)}`);
  }
  /** Reinforce a fact (increases its effective confidence). */
  async reinforce(factId: string, input: { source?: string; amount?: number } = {}): Promise<Fact> {
    return request<Fact>(this.config, 'POST', `/api/facts/${encodeURIComponent(factId)}/reinforce`, input);
  }
  /** Contradict a fact (decreases its effective confidence). */
  async contradict(factId: string, input: { evidence?: string; source?: string } = {}): Promise<Fact> {
    return request<Fact>(this.config, 'POST', `/api/facts/${encodeURIComponent(factId)}/contradict`, input);
  }
  /** Recall facts relevant to a query for a twin (for LLM context). */
  async recall(input: { twinId: string; query: string; limit?: number; minConfidence?: number }): Promise<Array<{ fact: Fact; relevance: number }>> {
    return request(this.config, 'POST', `/api/facts/${encodeURIComponent(input.twinId)}/recall`, input);
  }
  /** Get a confidence/staleness report for a twin. */
  async getReport(twinId: string): Promise<ConfidenceReport> {
    return request<ConfidenceReport>(this.config, 'GET', `/api/report/${encodeURIComponent(twinId)}`);
  }
  /** Get just the staleness breakdown for a twin. */
  async getStaleness(twinId: string): Promise<{ fresh: number; aging: number; stale: number; rotten: number }> {
    return request(this.config, 'GET', `/api/report/${encodeURIComponent(twinId)}/staleness`);
  }
  /** Sync facts from MemoryOS (denormalize). */
  async syncFromMemoryOs(input: { twinId: string; since?: string }): Promise<{ synced: number }> {
    return request<{ synced: number }>(this.config, 'POST', '/api/sync-from-memoryos', input);
  }
}
