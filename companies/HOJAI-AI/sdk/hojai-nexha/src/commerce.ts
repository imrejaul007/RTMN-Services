/**
 * Nexha Commerce Runtime Client
 *
 * Wraps nexha-commerce-runtime: per-tenant orders, payments, returns.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type OrderStatus = 'draft' | 'placed' | 'fulfilled' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: { amount: number; currency: string }; metadata?: Record<string, unknown> }>;
  subtotal: { amount: number; currency: string };
  tax?: { amount: number; currency: string };
  shipping?: { amount: number; currency: string };
  total: { amount: number; currency: string };
  status: OrderStatus;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderInput {
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: { amount: number; currency: string }; metadata?: Record<string, unknown> }>;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  amount: { amount: number; currency: string };
  method: 'card' | 'wallet' | 'bank_transfer' | 'bnpl' | 'crypto';
  status: PaymentStatus;
  provider?: string;
  providerPaymentId?: string;
  createdAt: string;
  capturedAt?: string;
  completedAt?: string;
}

export interface PaymentInput {
  orderId: string;
  amount: { amount: number; currency: string };
  method: Payment['method'];
  metadata?: Record<string, unknown>;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'in_transit' | 'received' | 'completed' | 'refunded';

export interface Return {
  id: string;
  tenantId: string;
  orderId: string;
  items: Array<{ sku: string; quantity: number; reason: string }>;
  status: ReturnStatus;
  refundAmount?: { amount: number; currency: string };
  createdAt: string;
  completedAt?: string;
}

export interface ReturnInput {
  orderId: string;
  items: Array<{ sku: string; quantity: number; reason: string }>;
}

export class CommerceClient {
  constructor(private config: HojaiConfig) {}

  // ── Orders ────────────────────────────────────────────────
  async createOrder(input: OrderInput): Promise<Order> {
    return request<Order>(this.config, 'POST', '/api/orders', input);
  }

  async listOrders(input: { customerId?: string; status?: OrderStatus; limit?: number } = {}): Promise<Order[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Order[]>(this.config, 'GET', `/api/orders?${params.toString()}`);
  }

  async getOrder(id: string): Promise<Order> {
    return request<Order>(this.config, 'GET', `/api/orders/${encodeURIComponent(id)}`);
  }

  async updateOrder(id: string, patch: Partial<OrderInput>): Promise<Order> {
    return request<Order>(this.config, 'PATCH', `/api/orders/${encodeURIComponent(id)}`, patch);
  }

  async placeOrder(id: string): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/place`);
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/cancel`, { reason });
  }

  async fulfillOrder(id: string): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/fulfill`);
  }

  async shipOrder(id: string, input: { trackingNumber: string; carrier: string }): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/ship`, input);
  }

  async deliverOrder(id: string): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/deliver`);
  }

  async completeOrder(id: string): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/complete`);
  }

  async refundOrder(id: string, input: { amount?: { amount: number; currency: string }; reason: string }): Promise<Order> {
    return request<Order>(this.config, 'POST', `/api/orders/${encodeURIComponent(id)}/refund`, input);
  }

  // ── Payments ──────────────────────────────────────────────
  async createPayment(input: PaymentInput): Promise<Payment> {
    return request<Payment>(this.config, 'POST', '/api/payments', input);
  }

  async listPayments(input: { orderId?: string; status?: PaymentStatus } = {}): Promise<Payment[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Payment[]>(this.config, 'GET', `/api/payments?${params.toString()}`);
  }

  async getPayment(id: string): Promise<Payment> {
    return request<Payment>(this.config, 'GET', `/api/payments/${encodeURIComponent(id)}`);
  }

  async authorizePayment(id: string): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/authorize`);
  }

  async capturePayment(id: string): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/capture`);
  }

  async completePayment(id: string): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/complete`);
  }

  async failPayment(id: string, reason: string): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/fail`, { reason });
  }

  async cancelPayment(id: string): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/cancel`);
  }

  async refundPayment(id: string, input: { amount?: { amount: number; currency: string }; reason: string }): Promise<Payment> {
    return request<Payment>(this.config, 'POST', `/api/payments/${encodeURIComponent(id)}/refund`, input);
  }

  // ── Returns ───────────────────────────────────────────────
  async createReturn(input: ReturnInput): Promise<Return> {
    return request<Return>(this.config, 'POST', '/api/returns', input);
  }

  async listReturns(input: { orderId?: string; status?: ReturnStatus } = {}): Promise<Return[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Return[]>(this.config, 'GET', `/api/returns?${params.toString()}`);
  }

  async getReturn(id: string): Promise<Return> {
    return request<Return>(this.config, 'GET', `/api/returns/${encodeURIComponent(id)}`);
  }

  async approveReturn(id: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/approve`);
  }

  async rejectReturn(id: string, reason: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/reject`, { reason });
  }

  async markReturnInTransit(id: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/in-transit`);
  }

  async markReturnReceived(id: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/received`);
  }

  async completeReturn(id: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/complete`);
  }

  async refundReturn(id: string, input: { amount: { amount: number; currency: string } }): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/returns/${encodeURIComponent(id)}/refund`, input);
  }

  // ── Stats ─────────────────────────────────────────────────
  async stats(): Promise<{ orders: number; payments: number; returns: number; revenue: { amount: number; currency: string } }> {
    return request(this.config, 'GET', '/api/stats');
  }
}