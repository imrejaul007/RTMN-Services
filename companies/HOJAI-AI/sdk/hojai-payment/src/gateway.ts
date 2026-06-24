/**
 * RABTUL Payment Gateway Client — REZ-payment-gateway.
 *
 * Wraps REZ-payment-gateway: the unified orchestration layer that
 * routes a payment through the cheapest/most-appropriate rail
 * (Razorpay / UPI / SEPA / wallet / BNPL), normalizes status events,
 * and exposes a single idempotent API for cross-rail scenarios.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type GatewayRail = 'razorpay' | 'upi_collect' | 'upi_intent' | 'card' | 'netbanking' | 'wallet' | 'bnpl' | 'sepa_sct' | 'sepa_inst' | 'sdd';
export type GatewayStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partial_refund' | 'voided' | 'expired';
export type Currency = 'INR' | 'EUR' | 'USD' | 'GBP' | 'AED' | 'SGD';

export interface GatewayPayment {
  id: string;
  rail: GatewayRail;
  status: GatewayStatus;
  amount: number;
  currency: Currency;
  orderId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  fees?: {
    gateway: number;
    tax: number;
    total: number;
  };
  intent?: {
    type: 'redirect' | 'collect' | 'sdk';
    url?: string;
    qrCode?: string;
    token?: string;
  };
  capturedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateGatewayPaymentRequest {
  amount: number;
  currency: Currency;
  orderId?: string;
  customerId?: string;
  description?: string;
  preferredRails?: GatewayRail[];
  metadata?: Record<string, unknown>;
  expiresInMin?: number;
}

export interface GatewayRefund {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  reason?: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
  settledAt?: string;
}

export class GatewayClient {
  constructor(private config: HojaiConfig) {}

  // ── Orchestrated payment ───────────────────────────────────────────
  async create(req: CreateGatewayPaymentRequest): Promise<GatewayPayment> {
    return request<GatewayPayment>(this.config, 'POST', '/api/gateway/payments', req);
  }

  async get(paymentId: string): Promise<GatewayPayment> {
    return request<GatewayPayment>(this.config, 'GET', `/api/gateway/payments/${encodeURIComponent(paymentId)}`);
  }

  async list(params: { status?: GatewayStatus; rail?: GatewayRail; customerId?: string; limit?: number; cursor?: string } = {}): Promise<{ items: GatewayPayment[]; nextCursor?: string }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.rail) qs.set('rail', params.rail);
    if (params.customerId) qs.set('customerId', params.customerId);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(this.config, 'GET', `/api/gateway/payments${suffix}`);
  }

  // ── Actions ────────────────────────────────────────────────────────
  async capture(paymentId: string, amount?: number): Promise<GatewayPayment> {
    return request<GatewayPayment>(this.config, 'POST', `/api/gateway/payments/${encodeURIComponent(paymentId)}/capture`, amount !== undefined ? { amount } : undefined);
  }

  async void(paymentId: string): Promise<GatewayPayment> {
    return request<GatewayPayment>(this.config, 'POST', `/api/gateway/payments/${encodeURIComponent(paymentId)}/void`);
  }

  async refund(paymentId: string, req: { amount: number; reason?: string }): Promise<GatewayRefund> {
    return request<GatewayRefund>(this.config, 'POST', `/api/gateway/payments/${encodeURIComponent(paymentId)}/refunds`, req);
  }

  async listRefunds(paymentId: string): Promise<GatewayRefund[]> {
    return request<GatewayRefund[]>(this.config, 'GET', `/api/gateway/payments/${encodeURIComponent(paymentId)}/refunds`);
  }
}
