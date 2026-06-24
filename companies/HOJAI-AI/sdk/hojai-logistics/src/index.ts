/**
 * Logistics SDK — Client for KHAIRMOVE logistics aggregator (port 4604).
 *
 * Multi-carrier shipping: Delhivery, BlueDart, DTDC, FedEx, DHL.
 * Includes rate shopping, shipment creation, tracking, and updates.
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export type CarrierType = 'delhivery' | 'bluedart' | 'dtdc' | 'fedex' | 'dhl';

export interface Carrier {
  id: CarrierType;
  name: string;
  active: boolean;
  supportedRegions: string[];
  serviceLevels: ('standard' | 'express' | 'same-day' | 'overnight')[];
}

export interface RateRequest {
  origin: { city: string; state?: string; country: string; postalCode: string };
  destination: { city: string; state?: string; country: string; postalCode: string };
  weightKg: number;
  dimensionsCm?: { length: number; width: number; height: number };
  serviceLevel?: 'standard' | 'express' | 'same-day' | 'overnight';
  declaredValue?: { amount: number; currency: string };
}

export interface RateQuote {
  carrier: CarrierType;
  serviceLevel: string;
  totalPrice: { amount: number; currency: string };
  estimatedDays: number;
  estimatedPickupAt: string;
  estimatedDeliveryAt: string;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  carrier: CarrierType;
  status: 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';
  awbNumber?: string;
  trackingUrl?: string;
  origin: RateRequest['origin'];
  destination: RateRequest['destination'];
  weightKg: number;
  totalPrice: { amount: number; currency: string };
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location?: string;
  notes?: string;
}

export class LogisticsClient {
  constructor(private config: HojaiConfig) {}

  /** List available carriers. */
  async listCarriers(): Promise<Carrier[]> {
    const r = await request<{ success: boolean; data: Carrier[] }>(this.config, 'GET', '/api/carriers');
    return r.data;
  }

  /** Get shipping rate quotes from multiple carriers. */
  async getRates(req: RateRequest): Promise<RateQuote[]> {
    const r = await request<{ success: boolean; data: RateQuote[] }>(this.config, 'POST', '/api/rates', req);
    return r.data;
  }

  /** Create a shipment (after choosing a carrier). */
  async createShipment(req: {
    orderId: string;
    carrier: CarrierType;
    origin: RateRequest['origin'];
    destination: RateRequest['destination'];
    weightKg: number;
    serviceLevel?: string;
  }): Promise<Shipment> {
    const r = await request<{ success: boolean; data: Shipment }>(this.config, 'POST', '/api/shipments', req);
    return r.data;
  }

  /** Get shipment by ID. */
  async getShipment(id: string): Promise<Shipment> {
    const r = await request<{ success: boolean; data: Shipment }>(this.config, 'GET', `/api/shipments/${encodeURIComponent(id)}`);
    return r.data;
  }

  /** Track a shipment. */
  async track(id: string): Promise<TrackingEvent[]> {
    const r = await request<{ success: boolean; data: TrackingEvent[] }>(this.config, 'GET', `/api/shipments/${encodeURIComponent(id)}/track`);
    return r.data;
  }

  /** Update shipment status. */
  async updateStatus(id: string, status: Shipment['status'], notes?: string): Promise<Shipment> {
    const r = await request<{ success: boolean; data: Shipment }>(this.config, 'POST', `/api/shipments/${encodeURIComponent(id)}/status`, { status, notes });
    return r.data;
  }

  /** List shipments. */
  async listShipments(): Promise<Shipment[]> {
    const r = await request<{ success: boolean; data: Shipment[] }>(this.config, 'GET', '/api/shipments');
    return r.data;
  }
}

export class Logistics {
  readonly logistics: LogisticsClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.logistics = new LogisticsClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as LogisticsHttpError } from './utils.js';
export default Logistics;