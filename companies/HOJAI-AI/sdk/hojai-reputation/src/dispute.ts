/**
 * Dispute Resolution Client — HOJAI AI dispute-resolution service.
 *
 * Arbitration, mediation, evidence collection, escalation. Used when
 * two parties (typically agents or merchants) disagree on a transaction.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type DisputeStatus = 'open' | 'evidence_gathering' | 'analyzing' | 'mediating' | 'arbitrating' | 'resolved' | 'rejected' | 'escalated';
export type DisputeReason = 'non_delivery' | 'quality_issue' | 'payment_not_received' | 'wrong_item' | 'service_misrepresentation' | 'breach_of_contract' | 'fraud' | 'other';

export interface Dispute {
  id: string;
  raisedBy: string;
  raisedAgainst: string;
  transactionId?: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  amount?: number;
  currency?: string;
  evidenceIds: string[];
  mediationId?: string;
  arbitrationId?: string;
  resolution?: {
    outcome: 'refund' | 'release' | 'partial' | 'no_action';
    notes?: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  disputeId: string;
  type: 'document' | 'image' | 'log' | 'communication' | 'other';
  url: string;
  description?: string;
  submittedBy: string;
  submittedAt: string;
}

export interface Mediation {
  id: string;
  disputeId: string;
  mediatorAgentId: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'expired';
  proposal?: {
    action: string;
    terms: string;
  };
  expiresAt?: string;
  createdAt: string;
}

export interface Arbitration {
  id: string;
  disputeId: string;
  arbitratorAgentId: string;
  status: 'pending' | 'decided' | 'appealed';
  decision?: {
    outcome: 'refund' | 'release' | 'partial' | 'no_action';
    awardedAmount?: number;
    reasoning: string;
  };
  decidedAt?: string;
}

export class DisputeClient {
  constructor(private config: HojaiConfig) {}

  // ── Dispute lifecycle ────────────────────────────────────────────
  async create(req: {
    raisedBy: string;
    raisedAgainst: string;
    transactionId?: string;
    reason: DisputeReason;
    description: string;
    amount?: number;
    currency?: string;
  }): Promise<Dispute> {
    return request<Dispute>(this.config, 'POST', '/api/disputes', req);
  }

  async get(disputeId: string): Promise<Dispute> {
    return request<Dispute>(this.config, 'GET', `/api/disputes/${encodeURIComponent(disputeId)}`);
  }

  async update(disputeId: string, req: Partial<Pick<Dispute, 'description' | 'status' | 'reason'>>): Promise<Dispute> {
    return request<Dispute>(this.config, 'PATCH', `/api/disputes/${encodeURIComponent(disputeId)}`, req);
  }

  async resolve(disputeId: string, req: { outcome: 'refund' | 'release' | 'partial' | 'no_action'; notes?: string; awardedAmount?: number }): Promise<Dispute> {
    return request<Dispute>(this.config, 'POST', `/api/disputes/${encodeURIComponent(disputeId)}/resolve`, req);
  }

  async escalate(disputeId: string, req: { reason: string; arbitrators?: string[] }): Promise<Dispute> {
    return request<Dispute>(this.config, 'POST', `/api/disputes/${encodeURIComponent(disputeId)}/escalate`, req);
  }

  async listByAgent(agentId: string, params: { status?: DisputeStatus; limit?: number } = {}): Promise<Dispute[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Dispute[]>(this.config, 'GET', `/api/disputes/agent/${encodeURIComponent(agentId)}${suffix}`);
  }

  async listByStatus(status: DisputeStatus): Promise<Dispute[]> {
    return request<Dispute[]>(this.config, 'GET', `/api/disputes/status/${encodeURIComponent(status)}`);
  }

  // ── Evidence ──────────────────────────────────────────────────────
  async addEvidence(req: { disputeId: string; type: Evidence['type']; url: string; description?: string }): Promise<Evidence> {
    return request<Evidence>(this.config, 'POST', `/api/disputes/${encodeURIComponent(req.disputeId)}/evidence`, req);
  }

  async listEvidence(disputeId: string): Promise<Evidence[]> {
    return request<Evidence[]>(this.config, 'GET', `/api/disputes/${encodeURIComponent(disputeId)}/evidence`);
  }

  // ── AI-assisted analysis ─────────────────────────────────────────
  async analyze(disputeId: string): Promise<{
    disputeId: string;
    recommendation: string;
    confidence: number;
    reasoning: string;
  }> {
    return request(this.config, 'POST', `/api/disputes/${encodeURIComponent(disputeId)}/analyze`);
  }

  // ── Mediation ─────────────────────────────────────────────────────
  async mediate(disputeId: string, mediatorAgentId: string): Promise<Mediation> {
    return request<Mediation>(this.config, 'POST', `/api/disputes/${encodeURIComponent(disputeId)}/mediate`, { mediatorAgentId });
  }

  async getMediation(mediationId: string): Promise<Mediation> {
    return request<Mediation>(this.config, 'GET', `/api/mediations/${encodeURIComponent(mediationId)}`);
  }

  async proposeMediation(mediationId: string, req: { action: string; terms: string; expiresAt?: string }): Promise<Mediation> {
    return request<Mediation>(this.config, 'POST', `/api/mediations/${encodeURIComponent(mediationId)}/propose`, req);
  }

  // ── Arbitration ──────────────────────────────────────────────────
  async decideArbitration(arbitrationId: string, req: {
    outcome: 'refund' | 'release' | 'partial' | 'no_action';
    awardedAmount?: number;
    reasoning: string;
  }): Promise<Arbitration> {
    return request<Arbitration>(this.config, 'POST', `/api/arbitrations/${encodeURIComponent(arbitrationId)}/decide`, req);
  }
}