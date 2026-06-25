/**
 * ACS SDK — Agent Capability Index client
 *
 * Real-time agent capability scoring for the Nexha federation marketplace.
 * Connects to nexha-acs-engine (port 4260).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type {
  ACSAgent, ACSScore, SignalKind, RankingEntry, ACSStats
} from './types.js';

export class ACSClient {
  public readonly config: HojaiConfig;
  private readonly port: number;

  constructor(config: HojaiConfig, port: number = 4260) {
    this.port = port;
    this.config = { ...config, baseUrl: config.baseUrl.replace(/\/$/, '') };
  }

  /** Full URL for a path, using localhost:port for local dev */
  private path(path: string): string {
    const isLocal = this.config.baseUrl.includes('localhost') || this.config.baseUrl.includes('127.0.0.1');
    if (isLocal) return `http://localhost:${this.port}${path}`;
    return `${this.config.baseUrl}/api/v1${path}`;
  }

  // ── Agent management ───────────────────────────────

  async register(input: {
    agentId: string; name: string; ownerId?: string; domains?: string[]
  }): Promise<{ agent: ACSAgent; score: ACSScore; status: string }> {
    return request<{ agent: ACSAgent; score: ACSScore; status: string }>(
      this.config, 'POST', this.path('/agents'),
      { agentId: input.agentId, name: input.name, ownerId: input.ownerId, domains: input.domains || [] }
    );
  }

  async listAgents(input: { domain?: string; minScore?: number; ownerId?: string; limit?: number } = {}): Promise<{ items: ACSAgent[]; total: number }> {
    return request<{ items: ACSAgent[]; total: number }>(
      this.config, 'GET', this.path(`/agents${buildQueryString(input as unknown as Record<string, unknown>)}`)
    );
  }

  async getAgent(agentId: string): Promise<{ agent: ACSAgent; score: ACSScore }> {
    return request<{ agent: ACSAgent; score: ACSScore }>(
      this.config, 'GET', this.path(`/agents/${encodeURIComponent(agentId)}`)
    );
  }

  async updateAgent(agentId: string, patch: { name?: string; domains?: string[]; ownerId?: string }): Promise<{ agent: ACSAgent; score: ACSScore }> {
    return request<{ agent: ACSAgent; score: ACSScore }>(
      this.config, 'PATCH', this.path(`/agents/${encodeURIComponent(agentId)}`), patch
    );
  }

  async deregister(agentId: string): Promise<{ deregistered: boolean; agentId: string }> {
    return request<{ deregistered: boolean; agentId: string }>(
      this.config, 'DELETE', this.path(`/agents/${encodeURIComponent(agentId)}`)
    );
  }

  // ── Signal ingestion ──────────────────────────────

  async emit(input: {
    agentId: string; kind: SignalKind; weight?: number;
    domain?: string; meta?: Record<string, unknown>
  }): Promise<{ signal: unknown; agentScore: ACSScore }> {
    return request<{ signal: unknown; agentScore: ACSScore }>(
      this.config, 'POST', this.path('/signals'),
      { agentId: input.agentId, kind: input.kind, weight: input.weight || 1, domain: input.domain, meta: input.meta || {} }
    );
  }

  async emitBatch(signals: Array<{
    agentId: string; kind: SignalKind; weight?: number;
    domain?: string; meta?: Record<string, unknown>
  }>): Promise<{ ingested: number; errors: number; results: Array<{ signal: unknown; agentId: string; error: string | null }> }> {
    return request<{ ingested: number; errors: number; results: Array<{ signal: unknown; agentId: string; error: string | null }> }>(
      this.config, 'POST', this.path('/signals/batch'), { signals }
    );
  }

  // ── Scores ───────────────────────────────────────

  async getScore(agentId: string, domain?: string): Promise<ACSScore> {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    return request<ACSScore>(this.config, 'GET', this.path(`/scores/${encodeURIComponent(agentId)}${qs}`));
  }

  async rankings(input: { domain?: string; limit?: number } = {}): Promise<{ domain: string; items: RankingEntry[]; total: number }> {
    return request<{ domain: string; items: RankingEntry[]; total: number }>(
      this.config, 'GET', this.path(`/scores/rankings${buildQueryString(input as unknown as Record<string, unknown>)}`)
    );
  }

  // ── Stats ────────────────────────────────────────

  async stats(): Promise<ACSStats> {
    return request<ACSStats>(this.config, 'GET', this.path('/stats'));
  }

  // ── Info ────────────────────────────────────────

  async info(): Promise<{ service: string; version: string; weights: Record<string, number>; bands: Record<string, number>; domains: string[]; agents: number; signals: number }> {
    return request(this.config, 'GET', this.path('/info')) as Promise<{ service: string; version: string; weights: Record<string, number>; bands: Record<string, number>; domains: string[]; agents: number; signals: number }>;
  }
}
