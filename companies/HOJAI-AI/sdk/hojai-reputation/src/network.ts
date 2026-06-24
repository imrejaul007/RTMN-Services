/**
 * Trust Network Client — HOJAI AI trust-network service.
 *
 * Cross-entity trust graph: entities, endorsements, verifications,
 * risk flags, and audit trail. The graph view of who-trusts-whom
 * across the ecosystem.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type TrustEntityType = 'agent' | 'user' | 'merchant' | 'organization' | 'service' | 'asset';
export type TrustVerificationType = 'identity' | 'business' | 'kyc' | 'credentials';

export interface TrustEntity {
  id: string;
  type: TrustEntityType;
  name: string;
  trustScore: number;
  endorsementCount: number;
  verificationCount: number;
  riskFlagCount: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TrustEndorsement {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  weight: number;
  context?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface TrustVerification {
  id: string;
  entityId: string;
  type: TrustVerificationType;
  evidenceUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
}

export interface TrustRiskFlag {
  id: string;
  entityId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  flaggedBy: string;
  flaggedAt: string;
  clearedAt?: string;
}

export class TrustNetworkClient {
  constructor(private config: HojaiConfig) {}

  // ── Entities ──────────────────────────────────────────────────────
  async listEntities(params: { type?: TrustEntityType; minScore?: number; limit?: number } = {}): Promise<TrustEntity[]> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.minScore !== undefined) qs.set('minScore', String(params.minScore));
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustEntity[]>(this.config, 'GET', `/api/entities${suffix}`);
  }

  async getEntity(entityId: string): Promise<TrustEntity> {
    return request<TrustEntity>(this.config, 'GET', `/api/entities/${encodeURIComponent(entityId)}`);
  }

  async createEntity(req: { id: string; type: TrustEntityType; name: string; metadata?: Record<string, unknown> }): Promise<TrustEntity> {
    return request<TrustEntity>(this.config, 'POST', '/api/entities', req);
  }

  async listByType(type: TrustEntityType): Promise<TrustEntity[]> {
    return request<TrustEntity[]>(this.config, 'GET', `/api/by-type/${encodeURIComponent(type)}`);
  }

  async getTopTrusted(params: { type?: TrustEntityType; limit?: number } = {}): Promise<TrustEntity[]> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustEntity[]>(this.config, 'GET', `/api/top-trusted${suffix}`);
  }

  // ── Endorsements ──────────────────────────────────────────────────
  async endorse(req: { fromEntityId: string; toEntityId: string; weight: number; context?: string; expiresAt?: string }): Promise<TrustEndorsement> {
    return request<TrustEndorsement>(this.config, 'POST', '/api/endorsements', req);
  }

  async listEndorsements(params: { fromEntityId?: string; toEntityId?: string } = {}): Promise<TrustEndorsement[]> {
    const qs = new URLSearchParams();
    if (params.fromEntityId) qs.set('fromEntityId', params.fromEntityId);
    if (params.toEntityId) qs.set('toEntityId', params.toEntityId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustEndorsement[]>(this.config, 'GET', `/api/endorsements${suffix}`);
  }

  // ── Verifications ─────────────────────────────────────────────────
  async submitVerification(req: { entityId: string; type: TrustVerificationType; evidenceUrl?: string }): Promise<TrustVerification> {
    return request<TrustVerification>(this.config, 'POST', '/api/verifications', req);
  }

  async listVerifications(params: { entityId?: string; status?: TrustVerification['status'] } = {}): Promise<TrustVerification[]> {
    const qs = new URLSearchParams();
    if (params.entityId) qs.set('entityId', params.entityId);
    if (params.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustVerification[]>(this.config, 'GET', `/api/verifications${suffix}`);
  }

  // ── Risk flags ────────────────────────────────────────────────────
  async raiseRiskFlag(req: { entityId: string; severity: TrustRiskFlag['severity']; category: string; description: string }): Promise<TrustRiskFlag> {
    return request<TrustRiskFlag>(this.config, 'POST', '/api/risk-flags', req);
  }

  async listRiskFlags(params: { entityId?: string; severity?: TrustRiskFlag['severity']; cleared?: boolean } = {}): Promise<TrustRiskFlag[]> {
    const qs = new URLSearchParams();
    if (params.entityId) qs.set('entityId', params.entityId);
    if (params.severity) qs.set('severity', params.severity);
    if (params.cleared !== undefined) qs.set('cleared', String(params.cleared));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TrustRiskFlag[]>(this.config, 'GET', `/api/risk-flags${suffix}`);
  }

  // ── Audit log ─────────────────────────────────────────────────────
  async getAudit(params: { entityId?: string; limit?: number } = {}): Promise<Array<{
    id: string;
    action: string;
    entityId: string;
    actor: string;
    occurredAt: string;
  }>> {
    const qs = new URLSearchParams();
    if (params.entityId) qs.set('entityId', params.entityId);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(this.config, 'GET', `/api/audit${suffix}`);
  }
}