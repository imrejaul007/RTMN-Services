/**
 * SADA Trust Client — HOJAI AI sada-os (Trust, Governance, Risk, Verification).
 *
 * The canonical trust backbone for the HOJAI ecosystem. Tracks trust scores
 * per entity, enforces governance policies, runs risk assessments, and
 * records verification proofs (KYC, business credentials, etc.).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type EntityType = 'agent' | 'user' | 'merchant' | 'organization' | 'service' | 'asset';

export interface TrustScore {
  entityId: string;
  entityType: EntityType;
  score: number;
  band: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted';
  components: {
    dimension: string;
    weight: number;
    score: number;
  }[];
  trend: 'rising' | 'stable' | 'falling';
  lastUpdated: string;
}

export interface TrustActivity {
  id: string;
  entityId: string;
  type: 'transaction_success' | 'transaction_failure' | 'dispute_raised' | 'dispute_resolved' | 'endorsement' | 'verification' | 'risk_event';
  delta: number;
  reason: string;
  occurredAt: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  rules: {
    when: Record<string, unknown>;
    then: 'allow' | 'deny' | 'review';
    reason?: string;
  }[];
  enabled: boolean;
  appliesTo: EntityType[];
  createdAt: string;
}

export interface PolicyValidation {
  valid: boolean;
  decision: 'allow' | 'deny' | 'review';
  matchedRule?: string;
  reason?: string;
  evaluatedAt: string;
}

export interface VerificationRecord {
  id: string;
  entityId: string;
  type: 'kyc' | 'business_registration' | 'gstin' | 'pan' | 'bank_account' | 'identity' | 'address' | 'other';
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  evidenceUrl?: string;
  verifiedAt?: string;
  expiresAt?: string;
  submittedAt: string;
}

export class SadaClient {
  constructor(private config: HojaiConfig) {}

  // ── Trust score ───────────────────────────────────────────────────
  async getTrust(entityId: string): Promise<TrustScore> {
    return request<TrustScore>(this.config, 'GET', `/api/trust/${encodeURIComponent(entityId)}`);
  }

  async recordTrust(req: {
    entityId: string;
    entityType: EntityType;
    score: number;
    components?: TrustScore['components'];
    reason?: string;
  }): Promise<TrustScore> {
    return request<TrustScore>(this.config, 'POST', '/api/trust', req);
  }

  async recordActivity(req: { entityId: string; type: TrustActivity['type']; delta: number; reason: string }): Promise<TrustActivity> {
    return request<TrustActivity>(this.config, 'POST', '/api/trust/activity', req);
  }

  async getHistory(entityId: string, params: { from?: string; to?: string; limit?: number } = {}): Promise<TrustActivity[]> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustActivity[]>(this.config, 'GET', `/api/trust/${encodeURIComponent(entityId)}/history${suffix}`);
  }

  async getLeaderboard(params: { entityType?: EntityType; band?: TrustScore['band']; limit?: number } = {}): Promise<TrustScore[]> {
    const qs = new URLSearchParams();
    if (params.entityType) qs.set('entityType', params.entityType);
    if (params.band) qs.set('band', params.band);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustScore[]>(this.config, 'GET', `/api/trust/leaderboard${suffix}`);
  }

  // ── Governance policies ───────────────────────────────────────────
  async listPolicies(): Promise<GovernancePolicy[]> {
    return request<GovernancePolicy[]>(this.config, 'GET', '/api/governance/policies');
  }

  async createPolicy(req: {
    name: string;
    description: string;
    rules: GovernancePolicy['rules'];
    appliesTo: EntityType[];
  }): Promise<GovernancePolicy> {
    return request<GovernancePolicy>(this.config, 'POST', '/api/governance/policies', req);
  }

  async validatePolicy(req: { entityType: EntityType; action: string; context?: Record<string, unknown> }): Promise<PolicyValidation> {
    return request<PolicyValidation>(this.config, 'POST', '/api/governance/validate', req);
  }

  // ── Verification ─────────────────────────────────────────────────
  async submitVerification(req: { entityId: string; type: VerificationRecord['type']; evidenceUrl?: string }): Promise<VerificationRecord> {
    return request<VerificationRecord>(this.config, 'POST', '/api/verifications', req);
  }

  async getVerification(entityId: string): Promise<VerificationRecord[]> {
    return request<VerificationRecord[]>(this.config, 'GET', `/api/verifications/${encodeURIComponent(entityId)}`);
  }

  async listVerifications(params: { status?: VerificationRecord['status']; type?: VerificationRecord['type']; limit?: number } = {}): Promise<VerificationRecord[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.type) qs.set('type', params.type);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<VerificationRecord[]>(this.config, 'GET', `/api/verifications${suffix}`);
  }

  async approveVerification(verificationId: string, notes?: string): Promise<VerificationRecord> {
    return request<VerificationRecord>(this.config, 'POST', `/api/verifications/${encodeURIComponent(verificationId)}/approve`, notes !== undefined ? { notes } : undefined);
  }

  // ── Audit log ─────────────────────────────────────────────────────
  async getAudit(params: { entityId?: string; from?: string; to?: string; limit?: number } = {}): Promise<Array<{
    id: string;
    action: string;
    entityId: string;
    actor: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }>> {
    const qs = new URLSearchParams();
    if (params.entityId) qs.set('entityId', params.entityId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(this.config, 'GET', `/api/audit${suffix}`);
  }
}