/**
 * Nexha Distribution Network Client
 *
 * Wraps nexha-distribution-network: shipment booking, tracking,
 * status transitions (advance, cancel, fail, return), quote requests.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type ShipmentStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned' | 'cancelled';

export interface Shipment {
  id: string;
  tenantId: string;
  origin: { name: string; address: string; lat?: number; lng?: number };
  destination: { name: string; address: string; lat?: number; lng?: number };
  carrier?: string;
  status: ShipmentStatus;
  weightKg?: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  items?: Array<{ sku: string; quantity: number; description?: string }>;
  trackingNumber?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface ShipmentInput {
  tenantId?: string;
  origin: { name: string; address: string; lat?: number; lng?: number };
  destination: { name: string; address: string; lat?: number; lng?: number };
  carrier?: string;
  weightKg?: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  items?: Array<{ sku: string; quantity: number; description?: string }>;
  metadata?: Record<string, unknown>;
}

export interface QuoteRequest {
  origin: { country: string; city?: string; postalCode?: string };
  destination: { country: string; city?: string; postalCode?: string };
  weightKg: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  serviceLevel?: 'economy' | 'standard' | 'express' | 'overnight';
}

export interface Quote {
  carrier: string;
  serviceLevel: string;
  price: { amount: number; currency: string };
  estimatedDays: number;
  estimatedDeliveryAt: string;
}

export class DistributionClient {
  constructor(private config: HojaiConfig) {}

  async quote(request_: QuoteRequest): Promise<Quote[]> {
    return request<Quote[]>(this.config, 'POST', '/api/v1/quote', request_);
  }

  async createShipment(input: ShipmentInput): Promise<Shipment> {
    return request<Shipment>(this.config, 'POST', '/api/v1/shipments', input);
  }

  async listShipments(options: { tenantId?: string; status?: ShipmentStatus; limit?: number } = {}): Promise<Shipment[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Shipment[]>(this.config, 'GET', `/api/v1/shipments?${params.toString()}`);
  }

  async getShipment(id: string): Promise<Shipment> {
    return request<Shipment>(this.config, 'GET', `/api/v1/shipments/${encodeURIComponent(id)}`);
  }

  async advance(id: string, note?: string): Promise<Shipment> {
    return request<Shipment>(this.config, 'PATCH', `/api/v1/shipments/${encodeURIComponent(id)}/advance`, { note });
  }

  async cancel(id: string, reason: string): Promise<Shipment> {
    return request<Shipment>(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/cancel`, { reason });
  }

  async fail(id: string, reason: string): Promise<Shipment> {
    return request<Shipment>(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/fail`, { reason });
  }

  async return(id: string, reason: string): Promise<Shipment> {
    return request<Shipment>(this.config, 'POST', `/api/v1/shipments/${encodeURIComponent(id)}/return`, { reason });
  }
}