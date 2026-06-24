/**
 * Agent Reputation Client — HOJAI AI agent-reputation service.
 *
 * AI-agent-specific reputation: trust scores, transaction history,
 * verification, block/unblock, leaderboard. Used to score autonomous
 * agents that buy/sell on the SUTAR / Nexha network.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type AgentStatus = 'active' | 'verified' | 'blocked' | 'suspended';
export type TrustBand = 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted';

export interface AgentReputation {
  agentId: string;
  trustScore: number;
  trustBand: TrustBand;
  status: AgentStatus;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  disputesRaised: number;
  disputesAgainst: number;
  lastActivityAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTransaction {
  id: string;
  agentId: string;
  counterpartyAgentId?: string;
  type: 'sale' | 'purchase' | 'service' | 'refund' | 'transfer';
  amount: number;
  currency: string;
  outcome: 'success' | 'failed' | 'partial' | 'disputed';
  reference?: string;
  occurredAt: string;
}

export class AgentReputationClient {
  constructor(private config: HojaiConfig) {}

  // ── Reputation CRUD ────────────────────────────────────────────────
  async create(req: { agentId: string; metadata?: Record<string, unknown> }): Promise<AgentReputation> {
    return request<AgentReputation>(this.config, 'POST', '/api/reputation', req);
  }

  async get(agentId: string): Promise<AgentReputation> {
    return request<AgentReputation>(this.config, 'GET', `/api/reputation/${encodeURIComponent(agentId)}`);
  }

  async getTrust(agentId: string): Promise<{ agentId: string; trustScore: number; trustBand: TrustBand }> {
    return request(this.config, 'GET', `/api/reputation/${encodeURIComponent(agentId)}/trust`);
  }

  // ── Transactions ───────────────────────────────────────────────────
  async recordTransaction(req: {
    agentId: string;
    counterpartyAgentId?: string;
    type: AgentTransaction['type'];
    amount: number;
    currency: string;
    outcome: AgentTransaction['outcome'];
    reference?: string;
  }): Promise<AgentTransaction> {
    return request<AgentTransaction>(this.config, 'POST', `/api/reputation/${encodeURIComponent(req.agentId)}/transactions`, req);
  }

  async listTransactions(agentId: string, params: { type?: AgentTransaction['type']; outcome?: AgentTransaction['outcome']; limit?: number } = {}): Promise<AgentTransaction[]> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.outcome) qs.set('outcome', params.outcome);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<AgentTransaction[]>(this.config, 'GET', `/api/reputation/${encodeURIComponent(agentId)}/transactions${suffix}`);
  }

  async raiseDispute(req: { agentId: string; transactionId: string; reason: string; evidence?: Record<string, unknown> }): Promise<{ disputeId: string; agentId: string; status: string; createdAt: string }> {
    return request(this.config, 'POST', `/api/reputation/${encodeURIComponent(req.agentId)}/disputes`, req);
  }

  // ── Verification + Moderation ─────────────────────────────────────
  async verify(agentId: string, evidence?: Record<string, unknown>): Promise<AgentReputation> {
    return request<AgentReputation>(this.config, 'POST', `/api/reputation/${encodeURIComponent(agentId)}/verify`, evidence !== undefined ? { evidence } : undefined);
  }

  async block(agentId: string, reason?: string): Promise<AgentReputation> {
    return request<AgentReputation>(this.config, 'POST', `/api/reputation/${encodeURIComponent(agentId)}/block`, reason !== undefined ? { reason } : undefined);
  }

  async unblock(agentId: string): Promise<AgentReputation> {
    return request<AgentReputation>(this.config, 'POST', `/api/reputation/${encodeURIComponent(agentId)}/unblock`);
  }

  // ── Leaderboard + Stats ──────────────────────────────────────────
  async getLeaderboard(params: { limit?: number; band?: TrustBand } = {}): Promise<Array<{
    agentId: string;
    trustScore: number;
    trustBand: TrustBand;
    totalTransactions: number;
  }>> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.band) qs.set('band', params.band);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(this.config, 'GET', `/api/reputation/leaderboard${suffix}`);
  }

  async getStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    blockedAgents: number;
    verifiedAgents: number;
    avgTrustScore: number;
  }> {
    return request(this.config, 'GET', '/api/reputation/stats');
  }
}