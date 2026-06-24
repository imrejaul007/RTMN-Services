/**
 * RABTUL Bill Payments Client — rez-bill-payments-service.
 *
 * Wraps rez-bill-payments-service: BBPS bill fetch + pay, history,
 * providers, refunds. Used for utility bill payments (electricity,
 * gas, water, telecom, DTH, insurance, etc.).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type BillCategory = 'electricity' | 'gas' | 'water' | 'telecom' | 'dth' | 'broadband' | 'insurance' | 'credit_card' | 'rent' | 'subscription';
export type BillStatus = 'fetched' | 'paid' | 'failed' | 'expired' | 'refunded';

export interface BillProvider {
  id: string;
  name: string;
  category: BillCategory;
  logoUrl?: string;
  regions: string[];
  parameters: {
    name: string;
    label: string;
    regex?: string;
    required: boolean;
  }[];
  fetchFee?: number;
  active: boolean;
}

export interface FetchedBill {
  billId: string;
  providerId: string;
  consumerNumber: string;
  customerName?: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  amount: number;
  lateFee?: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'partial';
  metadata?: Record<string, unknown>;
  fetchedAt: string;
  expiresAt: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  providerId: string;
  amount: number;
  convenienceFee: number;
  totalAmount: number;
  status: BillStatus;
  paymentId?: string;
  transactionRef?: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
}

export interface PayBillRequest {
  billId: string;
  paymentMethod: 'upi' | 'card' | 'wallet' | 'netbanking';
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
}

export class BillClient {
  constructor(private config: HojaiConfig) {}

  // ── Providers ──────────────────────────────────────────────────────
  async listProviders(category?: BillCategory): Promise<BillProvider[]> {
    const suffix = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<BillProvider[]>(this.config, 'GET', `/api/bill/providers${suffix}`);
  }

  async getProvider(providerId: string): Promise<BillProvider> {
    return request<BillProvider>(this.config, 'GET', `/api/bill/providers/${encodeURIComponent(providerId)}`);
  }

  // ── Fetch & pay ────────────────────────────────────────────────────
  async fetchBill(req: { providerId: string; consumerNumber: string; parameters?: Record<string, string> }): Promise<FetchedBill> {
    return request<FetchedBill>(this.config, 'POST', '/api/bill/fetch', req);
  }

  async payBill(req: PayBillRequest): Promise<BillPayment> {
    return request<BillPayment>(this.config, 'POST', '/api/bill/pay', req);
  }

  // ── History & refunds ──────────────────────────────────────────────
  async getHistory(params: { from?: string; to?: string; category?: BillCategory; limit?: number } = {}): Promise<BillPayment[]> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.category) qs.set('category', params.category);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<BillPayment[]>(this.config, 'GET', `/api/bill/history${suffix}`);
  }

  async getPayment(paymentId: string): Promise<BillPayment> {
    return request<BillPayment>(this.config, 'GET', `/api/bill/payment/${encodeURIComponent(paymentId)}`);
  }

  async refundBill(req: { paymentId: string; reason: string }): Promise<BillPayment> {
    return request<BillPayment>(this.config, 'POST', '/api/bill/refund', req);
  }
}
