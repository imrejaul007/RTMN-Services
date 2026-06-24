/**
 * RABTUL Settlement Client — cross-service settlement aggregator.
 *
 * Exposes settlement + reconciliation across all payment rails:
 *  - rez-payment-service  (Razorpay settlements)
 *  - rez-bill-payments-service  (BBPS commissions)
 *  - REZ-sepa-payment-service   (SEPA settlement batches)
 *  - REZ-payment-gateway  (cross-rail aggregated payouts)
 *
 * Useful for merchant dashboards, finance back-offices, and
 * reconciliation tooling.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type SettlementRail = 'razorpay' | 'upi' | 'sepa_sct' | 'sepa_inst' | 'billpay' | 'gateway_aggregate';
export type SettlementStatus = 'pending' | 'in_transit' | 'settled' | 'failed' | 'reversed';

export interface Settlement {
  id: string;
  rail: SettlementRail;
  merchantId: string;
  amount: number;
  currency: string;
  fees: number;
  tax: number;
  netAmount: number;
  status: SettlementStatus;
  period: { from: string; to: string };
  utr?: string;
  bankReference?: string;
  settledAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface ReconciliationReport {
  rail: SettlementRail;
  period: { from: string; to: string };
  totalCaptured: number;
  totalRefunded: number;
  totalFees: number;
  totalTax: number;
  totalNet: number;
  settlementCount: number;
  mismatchCount: number;
  mismatches: Array<{ paymentId: string; reason: string }>;
  generatedAt: string;
}

export class SettlementClient {
  constructor(private config: HojaiConfig) {}

  // ── Settlement list / detail ────────────────────────────────────────
  async list(params: { merchantId?: string; rail?: SettlementRail; status?: SettlementStatus; from?: string; to?: string; limit?: number } = {}): Promise<Settlement[]> {
    const qs = new URLSearchParams();
    if (params.merchantId) qs.set('merchantId', params.merchantId);
    if (params.rail) qs.set('rail', params.rail);
    if (params.status) qs.set('status', params.status);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Settlement[]>(this.config, 'GET', `/api/settlement/list${suffix}`);
  }

  async get(settlementId: string): Promise<Settlement> {
    return request<Settlement>(this.config, 'GET', `/api/settlement/${encodeURIComponent(settlementId)}`);
  }

  // ── Reconciliation ─────────────────────────────────────────────────
  async reconcile(req: { rail?: SettlementRail; from: string; to: string }): Promise<ReconciliationReport> {
    return request<ReconciliationReport>(this.config, 'POST', '/api/settlement/reconcile', req);
  }

  async getDiscrepancies(req: { from: string; to: string; rail?: SettlementRail }): Promise<Array<{
    paymentId: string;
    paymentAmount: number;
    settlementAmount?: number;
    gapInr: number;
    reason: string;
  }>> {
    return request(this.config, 'POST', '/api/settlement/discrepancies', req);
  }

  // ── Payouts (manual settlement request) ────────────────────────────
  async requestPayout(req: { merchantId: string; amount: number; currency?: string; rail?: SettlementRail }): Promise<Settlement> {
    return request<Settlement>(this.config, 'POST', '/api/settlement/payout', req);
  }

  async getPayoutStatus(payoutId: string): Promise<Settlement> {
    return request<Settlement>(this.config, 'GET', `/api/settlement/payout/${encodeURIComponent(payoutId)}`);
  }
}
