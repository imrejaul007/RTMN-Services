/**
 * TrustOS Module (SADA)
 *
 * Wraps SADA OS (port 4190) via Hub /api/foundation/sada-os/* routes.
 * Requires auth (authMiddleware on all endpoints).
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrustScore {
  entityId: string;
  trustScore: number;
  level: string;
  factors: Record<string, number>;
  riskFlags: string[];
  lastUpdated: string;
}

export interface TrustActivity {
  id: string;
  entityId: string;
  action: string;
  weight: number;
  impact: number;
  timestamp: string;
}

export interface VerifyRequest {
  entityId: string;
  verificationType: 'kyb' | 'kyc' | 'email' | 'phone' | 'document' | 'government';
  evidence: Record<string, unknown>;
  submittedBy?: string;
}

export interface VerifyResult {
  verificationId: string;
  entityId: string;
  status: 'pending' | 'approved' | 'rejected';
  verificationType: string;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Trust client
// ---------------------------------------------------------------------------

export class TrustClient {
  private readonly cfg: HojaiClientConfig;
  constructor(config: HojaiConfig, authState: AuthState) {
    this.cfg = { ...config, authState };
  }

  async getScore(entityId: string): Promise<TrustScore> {
    return request<TrustScore>(this.cfg, 'GET', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}`);
  }

  async verify(input: VerifyRequest): Promise<VerifyResult> {
    return request<VerifyResult>(this.cfg, 'POST', '/api/foundation/sada-os/verification', input);
  }

  async recordActivity(entityId: string, action: string, weight = 1.0, impact = 1.0): Promise<TrustScore> {
    return request<TrustScore>(this.cfg, 'POST', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}/activity`, { action, weight, impact });
  }

  async history(entityId: string): Promise<TrustActivity[]> {
    return request<TrustActivity[]>(this.cfg, 'GET', `/api/foundation/sada-os/trust/${encodeURIComponent(entityId)}/history`);
  }

  async leaderboard(limit = 10): Promise<TrustScore[]> {
    return request<TrustScore[]>(this.cfg, 'GET', `/api/foundation/sada-os/trust/leaderboard?limit=${limit}`);
  }

  async validate(params: { entityId: string; policyId?: string; action?: string }): Promise<{ valid: boolean; reason?: string }> {
    return request(this.cfg, 'POST', '/api/foundation/sada-os/governance/validate', params);
  }

  async assessRisk(entityId: string, context?: Record<string, unknown>): Promise<{ entityId: string; riskScore: number; riskLevel: string; factors: string[] }> {
    return request(this.cfg, 'POST', '/api/foundation/sada-os/risk/assess', { entityId, context });
  }
}
