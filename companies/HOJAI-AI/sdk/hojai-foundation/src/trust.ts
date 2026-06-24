/**
 * TrustOS Module (SADA)
 *
 * Trust verification and confidence scoring for entities, transactions,
 * and content. SADA is the trust layer that powers ReputationOS / TrustOS.
 */

import type { HojaiConfig } from './config.js';
import { request } from './utils.js';

export interface TrustScore {
  entityId: string;
  overall: number; // 0..1
  dimensions: {
    trust: number;
    quality: number;
    delivery: number;
    financial: number;
    compliance: number;
    sustainability: number;
  };
  lastUpdated: string;
  evidence?: Record<string, unknown>;
}

export interface VerifyRequest {
  entityId: string;
  evidence: Record<string, unknown>;
  verifyType: 'kyb' | 'kyc' | 'transaction' | 'identity' | 'content';
}

export interface VerifyResult {
  verified: boolean;
  confidence: number;
  checks: { name: string; passed: boolean; details?: string }[];
  evidence: Record<string, unknown>;
}

export class TrustClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Get trust score for an entity
   */
  async getScore(entityId: string): Promise<TrustScore> {
    return request<TrustScore>(this.config, 'GET', `/api/v1/trust/score/${encodeURIComponent(entityId)}`);
  }

  /**
   * Verify an entity (KYB/KYC/transaction)
   */
  async verify(input: VerifyRequest): Promise<VerifyResult> {
    return request<VerifyResult>(this.config, 'POST', '/api/v1/trust/verify', input);
  }

  /**
   * Compute trust score from raw evidence
   */
  async compute(entityId: string, evidence: Record<string, unknown>): Promise<TrustScore> {
    return request<TrustScore>(this.config, 'POST', `/api/v1/trust/score/${encodeURIComponent(entityId)}`, { evidence });
  }
}
