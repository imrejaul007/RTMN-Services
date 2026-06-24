/**
 * REZ Payment Client
 *
 * Wraps rez-payment-service: Razorpay integration, payments,
 * refunds, webhook verification.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'emi';
export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface Payment {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  razorpaySignature?: string;
  walletCredited: boolean;
  walletCreditTxId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
}

export interface Refund {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  reason?: string;
  processedAt?: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface WebhookEvent {
  event: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export class PaymentClient {
  constructor(private config: HojaiConfig) {}

  // ── Payments ──────────────────────────────────────────────
  async create(input: CreatePaymentInput): Promise<RazorpayOrder> {
    return request<RazorpayOrder>(this.config, 'POST', '/pay/create', input);
  }

  async verify(input: VerifyPaymentInput): Promise<{ verified: boolean; paymentId: string }> {
    return request(this.config, 'POST', '/pay/verify', input);
  }

  async get(paymentId: string): Promise<Payment> {
    return request<Payment>(this.config, 'GET', `/pay/${encodeURIComponent(paymentId)}`);
  }

  async capture(paymentId: string, input: { amount: number; currency?: string }): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/pay/${encodeURIComponent(paymentId)}/capture`, input);
  }

  // ── Refunds ───────────────────────────────────────────────
  async refund(paymentId: string, input: { amount?: number; reason?: string; speed?: 'normal' | 'optimum' }): Promise<Refund> {
    return request<Refund>(this.config, 'POST', `/pay/${encodeURIComponent(paymentId)}/refund`, input);
  }

  async listRefunds(paymentId: string): Promise<Refund[]> {
    return request<Refund[]>(this.config, 'GET', `/pay/${encodeURIComponent(paymentId)}/refunds`);
  }

  // ── Webhooks ──────────────────────────────────────────────
  async handleWebhook(event: WebhookEvent): Promise<{ processed: boolean; duplicate: boolean }> {
    return request(this.config, 'POST', '/pay/webhook/razorpay', event);
  }

  // ── Admin ─────────────────────────────────────────────────
  async listDlq(): Promise<Array<{ id: string; jobId: string; payload: Record<string, unknown>; failedAt: string; reason: string }>> {
    return request(this.config, 'GET', '/admin/dlq');
  }
}