/**
 * REZ Bill Payments Client
 *
 * Wraps rez-bill-payments-service: utility bill payments, BBPS,
 * provider discovery, history.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type BillerCategory = 'electricity' | 'gas' | 'water' | 'telecom' | 'dth' | 'broadband' | 'insurance' | 'credit_card' | 'rent';

export interface Biller {
  id: string;
  name: string;
  category: BillerCategory;
  fetchSupported: boolean;
  paySupported: boolean;
  logoUrl?: string;
  parameters: Array<{ name: string; label: string; required: boolean; regex?: string; maxLength?: number }>;
}

export interface BillFetchInput {
  billerId: string;
  parameters: Record<string, string>;
}

export interface FetchedBill {
  billerId: string;
  billerName: string;
  customerName: string;
  amount: number;
  dueDate: string;
  billNumber?: string;
  status: 'due' | 'overdue' | 'paid';
  metadata?: Record<string, unknown>;
}

export interface BillPaymentInput {
  billerId: string;
  parameters: Record<string, string>;
  amount: number;
  customerId: string;
  paymentMethod: 'wallet' | 'upi' | 'card' | 'netbanking';
  metadata?: Record<string, unknown>;
}

export interface BillPayment {
  id: string;
  billerId: string;
  customerId: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  paymentMethod: BillPaymentInput['paymentMethod'];
  reference?: string;
  failureReason?: string;
  paidAt?: string;
}

export interface BillRefund {
  id: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  reason?: string;
  processedAt?: string;
}

export class BillPaymentsClient {
  constructor(private config: HojaiConfig) {}

  async listBillers(input: { category?: BillerCategory } = {}): Promise<Biller[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Biller[]>(this.config, 'GET', `/api/bills/providers?${params.toString()}`);
  }

  async listProviders(): Promise<Biller[]> {
    return request<Biller[]>(this.config, 'GET', '/api/bills/providers');
  }

  async fetchBill(input: BillFetchInput): Promise<FetchedBill> {
    return request<FetchedBill>(this.config, 'POST', '/api/bills/fetch', input);
  }

  async payBill(input: BillPaymentInput): Promise<BillPayment> {
    return request<BillPayment>(this.config, 'POST', '/api/bills/pay', input);
  }

  async getPaymentHistory(input: { customerId?: string; billerId?: string; status?: BillPayment['status']; limit?: number } = {}): Promise<BillPayment[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<BillPayment[]>(this.config, 'GET', `/api/bills/history?${params.toString()}`);
  }

  async refundPayment(input: { paymentId: string; amount?: number; reason?: string }): Promise<BillRefund> {
    return request<BillRefund>(this.config, 'POST', '/api/bills/refund', input);
  }
}