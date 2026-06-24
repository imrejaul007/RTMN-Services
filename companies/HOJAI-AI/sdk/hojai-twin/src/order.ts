/**
 * Order Twin Client (port 5310) — Cart, Order, Shipment, Return.
 *
 * Specialized surface for the order lifecycle twin.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money } from './types.js';

export type OrderStatus = 'cart' | 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';

export interface OrderLine {
  productId: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: Money;
}

export interface OrderTwin {
  id: string;
  customerId: string;
  status: OrderStatus;
  lines: OrderLine[];
  total: Money;
  shippingAddress?: Record<string, string>;
  shipmentId?: string;
  placedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'returned' | 'lost';
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
}

export interface Return {
  id: string;
  orderId: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount?: Money;
  requestedAt: string;
  resolvedAt?: string;
}

export class OrderTwinClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:5310` }; }

  async listOrders(input: { customerId?: string; status?: OrderStatus; limit?: number } = {}): Promise<OrderTwin[]> {
    return request<OrderTwin[]>(this.config, 'GET', `/api/twins/orders${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getOrder(id: string): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'GET', `/api/twins/order/${encodeURIComponent(id)}`);
  }
  async createOrder(input: { customerId: string; lines: OrderLine[]; shippingAddress?: Record<string, string> }): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'POST', '/api/twins/order', input);
  }
  async updateOrder(id: string, patch: Partial<OrderTwin>): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'PUT', `/api/twins/order/${encodeURIComponent(id)}`, patch);
  }
  async transitionStatus(id: string, status: OrderStatus): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'POST', `/api/twins/order/${encodeURIComponent(id)}/status`, { status });
  }
  async addShipment(id: string, shipment: Omit<Shipment, 'id' | 'orderId'>): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'POST', `/api/twins/order/${encodeURIComponent(id)}/shipment`, shipment);
  }
  async requestReturn(id: string, reason: string): Promise<Return> {
    return request<Return>(this.config, 'POST', `/api/twins/order/${encodeURIComponent(id)}/return`, { reason });
  }
  async getCart(customerId: string): Promise<OrderTwin | null> {
    return request<OrderTwin | null>(this.config, 'GET', `/api/twins/cart/${encodeURIComponent(customerId)}`);
  }
  async checkoutCart(customerId: string): Promise<OrderTwin> {
    return request<OrderTwin>(this.config, 'POST', `/api/twins/cart/${encodeURIComponent(customerId)}/checkout`);
  }
}
