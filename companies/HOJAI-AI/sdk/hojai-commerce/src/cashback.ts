/**
 * REZ Cashback Client
 *
 * Wraps rez-cashback-service: cashback accrual, redemption,
 * rates management.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type CashbackStatus = 'pending' | 'available' | 'redeemed' | 'expired' | 'cancelled';

export interface CashbackEntry {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  source: string; // e.g. "order:ord-123"
  rate: number; // percentage
  status: CashbackStatus;
  expiresAt?: string;
  accruedAt: string;
  redeemedAt?: string;
}

export interface CashbackBalance {
  userId: string;
  available: number;
  pending: number;
  expired: number;
  totalEarned: number;
  totalRedeemed: number;
  currency: string;
}

export interface CashbackRate {
  id: string;
  category: string;
  rate: number;
  minOrderAmount?: number;
  maxCashbackAmount?: number;
  validFrom: string;
  validUntil?: string;
  active: boolean;
}

export interface AccrualRequest {
  userId: string;
  amount: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface RedemptionRequest {
  userId: string;
  amount: number;
  destination: 'wallet' | 'gift-card' | 'order-discount';
  orderId?: string;
}

export class CashbackClient {
  constructor(private config: HojaiConfig) {}

  async accrue(input: AccrualRequest): Promise<CashbackEntry> {
    return request<CashbackEntry>(this.config, 'POST', '/api/cashback/accrue', input);
  }

  async getBalance(userId: string): Promise<CashbackBalance> {
    return request<CashbackBalance>(this.config, 'GET', `/api/cashback/balance/${encodeURIComponent(userId)}`);
  }

  async getHistory(userId: string, input: { status?: CashbackStatus; limit?: number } = {}): Promise<CashbackEntry[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<CashbackEntry[]>(this.config, 'GET', `/api/cashback/history/${encodeURIComponent(userId)}?${params.toString()}`);
  }

  async redeem(input: RedemptionRequest): Promise<CashbackEntry> {
    return request<CashbackEntry>(this.config, 'POST', '/api/cashback/redeem', input);
  }

  async getPendingRedemptions(): Promise<CashbackEntry[]> {
    return request<CashbackEntry[]>(this.config, 'GET', '/api/cashback/pending');
  }

  async approveRedemption(id: string): Promise<CashbackEntry> {
    return request<CashbackEntry>(this.config, 'POST', `/api/cashback/approve/${encodeURIComponent(id)}`);
  }

  async getRates(input: { category?: string; activeOnly?: boolean } = {}): Promise<CashbackRate[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<CashbackRate[]>(this.config, 'GET', `/api/cashback/rates?${params.toString()}`);
  }

  async updateRates(rates: Array<Pick<CashbackRate, 'category' | 'rate'> & Partial<CashbackRate>>): Promise<CashbackRate[]> {
    return request<CashbackRate[]>(this.config, 'PUT', '/api/cashback/rates', { rates });
  }
}