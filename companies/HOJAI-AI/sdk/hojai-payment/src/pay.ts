/**
 * RABTUL Payment Client — rez-payment-service.
 *
 * Wraps rez-payment-service: payment initiation, Razorpay integration,
 * capture, refund, status, settlements. The Razorpay flow is the primary
 * path — initiate returns a Razorpay order, capture verifies signature,
 * refund is server-side only.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'netbanking';
export type PaymentPurpose = 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service' | 'other';
export type PaymentStatus = 'initiated' | 'pending' | 'captured' | 'failed' | 'refunded' | 'partial_refund';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  purpose?: PaymentPurpose;
  status: PaymentStatus;
  userId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  capturedAt?: string;
  refundedAmount?: number;
}

export interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  purpose?: PaymentPurpose;
  orchestratorIdempotencyKey?: string;
  userDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CapturePaymentRequest {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: 'created' | 'attempted' | 'paid';
}

export interface RazorpayConfig {
  keyId: string;
  currency: string;
  companyName: string;
  imageUrl?: string;
}

export class PayClient {
  constructor(private config: HojaiConfig) {}

  // ── Core lifecycle ────────────────────────────────────────────────
  async initiate(req: InitiatePaymentRequest): Promise<Payment> {
    return request<Payment>(this.config, 'POST', '/api/payment/initiate', req);
  }

  async capture(req: CapturePaymentRequest): Promise<Payment> {
    return request<Payment>(this.config, 'POST', '/api/payment/capture', req);
  }

  async refund(req: RefundRequest): Promise<Payment> {
    return request<Payment>(this.config, 'POST', '/api/payment/refund', req);
  }

  async status(paymentId: string): Promise<Payment> {
    return request<Payment>(this.config, 'GET', `/api/payment/status/${encodeURIComponent(paymentId)}`);
  }

  // ── Razorpay helpers ──────────────────────────────────────────────
  async getRazorpayConfig(): Promise<RazorpayConfig> {
    return request<RazorpayConfig>(this.config, 'GET', '/api/razorpay/config');
  }

  async createRazorpayOrder(req: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    return request<RazorpayOrder>(this.config, 'POST', '/api/razorpay/create-order', req);
  }

  // ── Settlements (merchant-facing) ─────────────────────────────────
  async getMerchantSettlements(params: { merchantId?: string; from?: string; to?: string } = {}): Promise<{
    settlements: Array<{
      id: string;
      amount: number;
      currency: string;
      period: string;
      status: string;
      utr?: string;
      settledAt?: string;
    }>;
  }> {
    const qs = new URLSearchParams();
    if (params.merchantId) qs.set('merchantId', params.merchantId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(this.config, 'GET', `/api/payment/merchant/settlements${suffix}`);
  }
}
