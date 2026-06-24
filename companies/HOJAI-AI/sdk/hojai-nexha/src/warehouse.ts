/**
 * Nexha Warehouse Network Client
 *
 * Wraps nexha-warehouse-network: warehouses, slot booking, bins,
 * stock management, transfers, pick lists.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Warehouse {
  id: string;
  name: string;
  location: { country: string; city?: string; address: string; lat?: number; lng?: number };
  capacityKg: number;
  usedKg: number;
  totalBins: number;
  availableBins: number;
  amenities: string[];
  active: boolean;
}

export interface Slot {
  id: string;
  warehouseId: string;
  startsAt: string;
  endsAt: string;
  capacityKg: number;
  pricePerKg: { amount: number; currency: string };
  available: boolean;
}

export interface Booking {
  id: string;
  warehouseId: string;
  slotId: string;
  customerId: string;
  weightKg: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  startsAt: string;
  endsAt: string;
  totalPrice: { amount: number; currency: string };
}

export interface BookingInput {
  warehouseId: string;
  slotId: string;
  customerId: string;
  weightKg: number;
  metadata?: Record<string, unknown>;
}

export interface Bin {
  id: string;
  warehouseId: string;
  code: string;
  capacityKg: number;
  usedKg: number;
  zone?: string;
}

export interface Transfer {
  id: string;
  warehouseId: string;
  sourceBinId: string;
  destinationBinId: string;
  items: Array<{ sku: string; quantity: number }>;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  pickedAt?: string;
  completedAt?: string;
}

export class WarehouseClient {
  constructor(private config: HojaiConfig) {}

  // ── Warehouses ────────────────────────────────────────────
  async listWarehouses(input: { country?: string; city?: string; minCapacityKg?: number } = {}): Promise<Warehouse[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Warehouse[]>(this.config, 'GET', `/api/v1/warehouses?${params.toString()}`);
  }

  async getWarehouse(id: string): Promise<Warehouse> {
    return request<Warehouse>(this.config, 'GET', `/api/v1/warehouses/${encodeURIComponent(id)}`);
  }

  async listSlots(warehouseId: string, input: { fromDate?: string; toDate?: string; minCapacityKg?: number } = {}): Promise<Slot[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Slot[]>(this.config, 'GET', `/api/v1/warehouses/${encodeURIComponent(warehouseId)}/slots?${params.toString()}`);
  }

  // ── Bookings ──────────────────────────────────────────────
  async createBooking(input: BookingInput): Promise<Booking> {
    return request<Booking>(this.config, 'POST', '/api/v1/bookings', input);
  }

  async cancelBooking(id: string): Promise<{ cancelled: boolean }> {
    return request(this.config, 'DELETE', `/api/v1/bookings/${encodeURIComponent(id)}`);
  }

  async listBookings(input: { customerId?: string; warehouseId?: string; status?: Booking['status'] } = {}): Promise<Booking[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Booking[]>(this.config, 'GET', `/api/v1/bookings?${params.toString()}`);
  }

  // ── Bins & Stock ─���────────────────────────────────────────
  async listBins(input: { warehouseId?: string; zone?: string; available?: boolean } = {}): Promise<Bin[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Bin[]>(this.config, 'GET', `/api/v1/bins?${params.toString()}`);
  }

  async getBin(id: string): Promise<Bin> {
    return request<Bin>(this.config, 'GET', `/api/v1/bins/${encodeURIComponent(id)}`);
  }

  async listStock(input: { warehouseId?: string; sku?: string } = {}): Promise<Array<{ sku: string; binId: string; quantity: number; warehouseId: string }>> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request(this.config, 'GET', `/api/v1/stock?${params.toString()}`);
  }

  async receiveStock(input: { warehouseId: string; binId: string; sku: string; quantity: number; weightKg: number; metadata?: Record<string, unknown> }): Promise<{ received: boolean; sku: string; newQuantity: number }> {
    return request(this.config, 'POST', '/api/v1/stock/receive', input);
  }

  async adjustStock(input: { warehouseId: string; binId: string; sku: string; deltaQuantity: number; reason: string }): Promise<{ adjusted: boolean; newQuantity: number }> {
    return request(this.config, 'POST', '/api/v1/stock/adjust', input);
  }

  // ── Transfers ─────────────────────────────────────────────
  async createTransfer(input: { warehouseId: string; sourceBinId: string; destinationBinId: string; items: Array<{ sku: string; quantity: number }> }): Promise<Transfer> {
    return request<Transfer>(this.config, 'POST', '/api/v1/transfers', input);
  }

  async pickTransfer(id: string): Promise<Transfer> {
    return request<Transfer>(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/pick`);
  }

  async receiveTransfer(id: string, input: { destBinId: string; weightKgPerUnit: number }): Promise<Transfer> {
    return request<Transfer>(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/receive`, input);
  }

  async cancelTransfer(id: string): Promise<Transfer> {
    return request<Transfer>(this.config, 'POST', `/api/v1/transfers/${encodeURIComponent(id)}/cancel`);
  }

  async getTransfer(id: string): Promise<Transfer> {
    return request<Transfer>(this.config, 'GET', `/api/v1/transfers/${encodeURIComponent(id)}`);
  }

  // ── Pick Lists ────────────────────────────────────────────
  async createPickList(input: { warehouseId: string; orderId: string; items: Array<{ sku: string; quantity: number }> }): Promise<{ pickListId: string; status: string }> {
    return request(this.config, 'POST', '/api/v1/picklists', input);
  }

  async pickFromList(id: string, input: { binId: string; sku: string; quantity: number }): Promise<{ picked: boolean; remaining: number }> {
    return request(this.config, 'POST', `/api/v1/picklists/${encodeURIComponent(id)}/pick`, input);
  }
}