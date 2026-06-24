/**
 * REZ Loyalty Client
 *
 * Wraps rez-loyalty-gateway + rez-loyalty-monitoring: tier management,
 * points earning, balance, transactions, events.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'prive';

export interface TierInfo {
  userId: string;
  tier: LoyaltyTier;
  points: number;
  pointsToNextTier?: number;
  nextTier?: LoyaltyTier;
  benefits: string[];
  validUntil: string;
}

export interface UpgradePreview {
  userId: string;
  currentTier: LoyaltyTier;
  projectedTier: LoyaltyTier;
  additionalPointsNeeded: number;
  additionalSpendNeeded?: number;
}

export interface LoyaltyBalance {
  userId: string;
  coinType: string;
  balance: number;
  pending: number;
  expiringSoon: number;
  currency: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  coinType: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  amount: number;
  reason: string;
  reference?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface EarnRequest {
  userId: string;
  coinType: string;
  amount: number;
  reason: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchEarnRequest {
  entries: EarnRequest[];
}

export interface LoyaltySummary {
  userId: string;
  totalBalance: number;
  byCoinType: Record<string, number>;
  tier: LoyaltyTier;
  recentActivity: LoyaltyTransaction[];
}

export interface SubscribeRequest {
  event: string;
  callbackUrl: string;
  secret?: string;
}

export class LoyaltyClient {
  constructor(private config: HojaiConfig) {}

  // ── Tiers ─────────────────────────────────────────────────
  async getTier(userId: string): Promise<TierInfo> {
    return request<TierInfo>(this.config, 'GET', `/api/loyalty/tiers/${encodeURIComponent(userId)}`);
  }

  async previewUpgrade(userId: string): Promise<UpgradePreview> {
    return request<UpgradePreview>(this.config, 'GET', `/api/loyalty/tiers/${encodeURIComponent(userId)}/upgrade-preview`);
  }

  async getPriveStatus(userId: string): Promise<{ userId: string; eligible: boolean; criteria: string[]; benefits?: string[] }> {
    return request(this.config, 'GET', `/api/loyalty/tiers/${encodeURIComponent(userId)}/prive`);
  }

  async listRezTiers(): Promise<Array<{ tier: LoyaltyTier; minPoints: number; benefits: string[] }>> {
    return request(this.config, 'GET', '/api/loyalty/tiers/all/rez');
  }

  async listPriveTiers(): Promise<Array<{ tier: LoyaltyTier; minPoints: number; benefits: string[] }>> {
    return request(this.config, 'GET', '/api/loyalty/tiers/all/prive');
  }

  async compareTiers(): Promise<Array<{ tier: LoyaltyTier; rez: any; prive: any; differences: string[] }>> {
    return request(this.config, 'GET', '/api/loyalty/tiers/compare');
  }

  // ── Balance ───────────────────────────────────────────────
  async getBalance(userId: string, coinType?: string): Promise<LoyaltyBalance> {
    const path = coinType
      ? `/api/loyalty/balance/${encodeURIComponent(userId)}/${encodeURIComponent(coinType)}`
      : `/api/loyalty/balance/${encodeURIComponent(userId)}`;
    return request<LoyaltyBalance>(this.config, 'GET', path);
  }

  async getTotalBalance(userId: string): Promise<{ userId: string; total: number; currency: string }> {
    return request(this.config, 'GET', `/api/loyalty/balance/${encodeURIComponent(userId)}/total`);
  }

  // ── Earn ──────────────────────────────────────────────────
  async earn(input: EarnRequest): Promise<LoyaltyTransaction> {
    return request<LoyaltyTransaction>(this.config, 'POST', '/api/loyalty/earn', input);
  }

  async earnBatch(input: BatchEarnRequest): Promise<{ processed: number; errors: number; transactionIds: string[] }> {
    return request(this.config, 'POST', '/api/loyalty/earn/batch', input);
  }

  // ── Transactions ──────────────────────────────────────────
  async getTransactions(userId: string, input: { coinType?: string; type?: LoyaltyTransaction['type']; limit?: number } = {}): Promise<LoyaltyTransaction[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<LoyaltyTransaction[]>(this.config, 'GET', `/api/loyalty/transactions/${encodeURIComponent(userId)}?${params.toString()}`);
  }

  async getSummary(userId: string): Promise<LoyaltySummary> {
    return request<LoyaltySummary>(this.config, 'GET', `/api/loyalty/transactions/${encodeURIComponent(userId)}/summary`);
  }

  // ── Events ────────────────────────────────────────────────
  async subscribe(input: SubscribeRequest): Promise<{ subscriptionId: string; secret: string }> {
    return request(this.config, 'POST', '/api/loyalty/events/subscribe', input);
  }

  async getEventStatus(): Promise<{ activeSubscriptions: number; recentEvents: Array<{ event: string; deliveredAt: string; status: string }> }> {
    return request(this.config, 'GET', '/api/loyalty/events/status');
  }

  // ── Health ────────────────────────────────────────────────
  async health(): Promise<{ status: 'ok' | 'degraded' | 'down'; uptime: number; version: string }> {
    return request(this.config, 'GET', '/api/loyalty/health');
  }

  async liveness(): Promise<{ status: 'ok' }> {
    return request(this.config, 'GET', '/api/loyalty/health/live');
  }

  async readiness(): Promise<{ ready: boolean; mongo: boolean; redis: boolean }> {
    return request(this.config, 'GET', '/api/loyalty/health/ready');
  }

  async fullHealth(): Promise<{ status: string; dependencies: Record<string, { ok: boolean; latencyMs?: number }> }> {
    return request(this.config, 'GET', '/api/loyalty/health/full');
  }

  async circuitBreakers(): Promise<{ open: string[]; closed: string[]; halfOpen: string[] }> {
    return request(this.config, 'GET', '/api/loyalty/health/circuit-breakers');
  }
}