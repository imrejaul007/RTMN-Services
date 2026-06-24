/**
 * Gateway SDK — Client for Nexha Gateway (port 5002).
 *
 * Wraps warehouse + slot management + federation routing.
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Warehouse {
  id: string;
  name: string;
  region: string;
  capacity: number;
  utilization: number;
  nexhaId: string;
}

export interface Slot {
  id: string;
  warehouseId: string;
  start: string;
  end: string;
  capacity: number;
  reserved: number;
  status: 'available' | 'reserved' | 'full' | 'cancelled';
}

export interface Booking {
  id: string;
  slotId: string;
  customerId: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';
  totalPrice: { amount: number; currency: string };
  createdAt: string;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedHours: number;
  carriers: string[];
}

export interface SlotSearchQuery {
  warehouseId?: string;
  region?: string;
  startAfter?: string;
  startBefore?: string;
  minCapacity?: number;
}

export class GatewayClient {
  constructor(private config: HojaiConfig) {}

  /** List all warehouses. */
  async listWarehouses(): Promise<Warehouse[]> {
    const r = await request<{ success: boolean; data: Warehouse[] }>(this.config, 'GET', '/api/v1/warehouses');
    return r.data;
  }

  /** Get one warehouse. */
  async getWarehouse(id: string): Promise<Warehouse> {
    const r = await request<{ success: boolean; data: Warehouse }>(this.config, 'GET', `/api/v1/warehouses/${encodeURIComponent(id)}`);
    return r.data;
  }

  /** List federation routes. */
  async listRoutes(): Promise<Route[]> {
    const r = await request<{ success: boolean; data: Route[] }>(this.config, 'GET', '/api/v1/routes');
    return r.data;
  }

  /** Search for available slots. */
  async searchSlots(query: SlotSearchQuery = {}): Promise<Slot[]> {
    const r = await request<{ success: boolean; data: Slot[] }>(this.config, 'POST', '/api/v1/slots/search', query);
    return r.data;
  }

  /** Book a slot. */
  async bookSlot(slotId: string, quantity: number, customerId: string): Promise<Booking> {
    const r = await request<{ success: boolean; data: Booking }>(this.config, 'POST', '/api/v1/slots/book', { slotId, quantity, customerId });
    return r.data;
  }

  /** Fulfill a booking. */
  async fulfillBooking(bookingId: string): Promise<Booking> {
    const r = await request<{ success: boolean; data: Booking }>(this.config, 'POST', `/api/v1/slots/bookings/${encodeURIComponent(bookingId)}/fulfill`);
    return r.data;
  }

  /** Cancel a booking. */
  async cancelBooking(bookingId: string): Promise<Booking> {
    const r = await request<{ success: boolean; data: Booking }>(this.config, 'POST', `/api/v1/slots/bookings/${encodeURIComponent(bookingId)}/cancel`);
    return r.data;
  }

  /** List bookings. */
  async listBookings(): Promise<Booking[]> {
    const r = await request<{ success: boolean; data: Booking[] }>(this.config, 'GET', '/api/v1/slots/bookings');
    return r.data;
  }
}

export class Gateway {
  readonly gateway: GatewayClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.gateway = new GatewayClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as GatewayHttpError } from './utils.js';
export default Gateway;