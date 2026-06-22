/**
 * Warehouse service — Phase C.5
 *
 * Pure data layer. No HTTP, no side effects. Easy to unit test.
 * Keeps a singleton in-memory store for warehouses, routes, and bookings.
 */

import { randomUUID } from "node:crypto";
import type {
  SlotBooking,
  SlotStatus,
  Warehouse,
  WarehouseRoute,
  WarehouseSlot,
} from "../types/warehouse.js";

const BOOKING_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

class WarehouseService {
  private warehouses = new Map<string, Warehouse>();
  private routes: WarehouseRoute[] = [];
  private bookings = new Map<string, SlotBooking>();

  // ─────────────────────────────────────────────
  // Seed / reset (idempotent)
  // ─────────────────────────────────────────────

  seedDemoWarehouses(): number {
    if (this.warehouses.size > 0) return 0;

    const now = new Date();
    const future = (days: number) =>
      new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const w1: Warehouse = {
      id: "WH-BLR-001",
      name: "Bangalore Central Dry Goods",
      kind: "dry",
      location: { city: "Bangalore", state: "KA", country: "IN", pincode: "560001", lat: 12.97, lng: 77.59 },
      rating: 4.6,
      reliability: 92,
      capacityUnitsPerDay: 5000,
      operatingHours: { open: "06:00", close: "22:00" },
      trustScore: 88,
      totalOrders: 1234,
      slots: [
        { id: "SLOT-BLR-RICE", category: "groceries", item: "basmati_rice", availableUnits: 800, unit: "kg", pricePerUnit: 95, currency: "INR", freshnessUntil: future(45), minOrderUnits: 25 },
        { id: "SLOT-BLR-OIL", category: "groceries", item: "mustard_oil", availableUnits: 300, unit: "L", pricePerUnit: 175, currency: "INR", freshnessUntil: future(120), minOrderUnits: 10 },
        { id: "SLOT-BLR-FLOUR", category: "groceries", item: "wheat_flour", availableUnits: 500, unit: "kg", pricePerUnit: 42, currency: "INR", freshnessUntil: future(60), minOrderUnits: 25 },
      ],
    };

    const w2: Warehouse = {
      id: "WH-BLR-002",
      name: "Bangalore Cold Chain Hub",
      kind: "cold_chain",
      location: { city: "Bangalore", state: "KA", country: "IN", pincode: "560100", lat: 12.98, lng: 77.74 },
      rating: 4.4,
      reliability: 89,
      capacityUnitsPerDay: 1500,
      operatingHours: { open: "00:00", close: "23:59" },
      trustScore: 84,
      totalOrders: 612,
      slots: [
        { id: "SLOT-BLR-MILK", category: "groceries", item: "toned_milk", availableUnits: 1200, unit: "L", pricePerUnit: 56, currency: "INR", freshnessUntil: future(3), minOrderUnits: 50 },
        { id: "SLOT-BLR-PANEER", category: "groceries", item: "paneer", availableUnits: 80, unit: "kg", pricePerUnit: 380, currency: "INR", freshnessUntil: future(7), minOrderUnits: 5 },
      ],
    };

    const w3: Warehouse = {
      id: "WH-MUM-001",
      name: "Mumbai Port Bulk Depot",
      kind: "bulk",
      location: { city: "Mumbai", state: "MH", country: "IN", pincode: "400001", lat: 19.07, lng: 72.87 },
      rating: 4.2,
      reliability: 85,
      capacityUnitsPerDay: 20000,
      operatingHours: { open: "05:00", close: "23:00" },
      trustScore: 80,
      totalOrders: 2104,
      slots: [
        { id: "SLOT-MUM-RICE", category: "groceries", item: "sona_masuri_rice", availableUnits: 12000, unit: "kg", pricePerUnit: 48, currency: "INR", freshnessUntil: future(90), minOrderUnits: 500 },
        { id: "SLOT-MUM-ONION", category: "groceries", item: "red_onion", availableUnits: 4000, unit: "kg", pricePerUnit: 32, currency: "INR", freshnessUntil: future(30), minOrderUnits: 200 },
        { id: "SLOT-MUM-SUGAR", category: "groceries", item: "refined_sugar", availableUnits: 6000, unit: "kg", pricePerUnit: 44, currency: "INR", freshnessUntil: future(180), minOrderUnits: 100 },
      ],
    };

    const w4: Warehouse = {
      id: "WH-DEL-001",
      name: "Delhi NCR Pharma Whse",
      kind: "pharma",
      location: { city: "Delhi", state: "DL", country: "IN", pincode: "110001", lat: 28.61, lng: 77.21 },
      rating: 4.8,
      reliability: 96,
      capacityUnitsPerDay: 3000,
      operatingHours: { open: "00:00", close: "23:59" },
      trustScore: 94,
      totalOrders: 3210,
      slots: [
        { id: "SLOT-DEL-PARA", category: "medicine", item: "paracetamol_500mg", availableUnits: 50000, unit: "strip", pricePerUnit: 12, currency: "INR", freshnessUntil: future(365), minOrderUnits: 100 },
        { id: "SLOT-DEL-AMOX", category: "medicine", item: "amoxicillin_500mg", availableUnits: 12000, unit: "strip", pricePerUnit: 65, currency: "INR", freshnessUntil: future(180), minOrderUnits: 50 },
      ],
    };

    for (const w of [w1, w2, w3, w4]) this.warehouses.set(w.id, w);

    this.routes = [
      { fromId: w1.id, toId: w2.id, transitHours: 1.5, costMultiplier: 1.05, sameCorridor: true },
      { fromId: w2.id, toId: w1.id, transitHours: 1.5, costMultiplier: 1.05, sameCorridor: true },
      { fromId: w1.id, toId: w3.id, transitHours: 28, costMultiplier: 1.20, sameCorridor: false },
      { fromId: w3.id, toId: w1.id, transitHours: 28, costMultiplier: 1.20, sameCorridor: false },
      { fromId: w1.id, toId: w4.id, transitHours: 36, costMultiplier: 1.25, sameCorridor: false },
      { fromId: w4.id, toId: w1.id, transitHours: 36, costMultiplier: 1.25, sameCorridor: false },
      { fromId: w3.id, toId: w4.id, transitHours: 24, costMultiplier: 1.15, sameCorridor: true },
      { fromId: w4.id, toId: w3.id, transitHours: 24, costMultiplier: 1.15, sameCorridor: true },
    ];

    return this.warehouses.size;
  }

  resetAll(): void {
    this.warehouses.clear();
    this.routes = [];
    this.bookings.clear();
  }

  // ─────────────────────────────────────────────
  // Reads
  // ─────────────────────────────────────────────

  listWarehouses(filter?: { kind?: string; city?: string }): Warehouse[] {
    const all = Array.from(this.warehouses.values());
    return all.filter((w) => {
      if (filter?.kind && w.kind !== filter.kind) return false;
      if (filter?.city && w.location.city.toLowerCase() !== filter.city.toLowerCase()) return false;
      return true;
    });
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.get(id);
  }

  listRoutes(): WarehouseRoute[] {
    return [...this.routes];
  }

  findRoute(fromId: string, toId: string): WarehouseRoute | undefined {
    return this.routes.find((r) => r.fromId === fromId && r.toId === toId);
  }

  // ─────────────────────────────────────────────
  // Slot search
  // ─────────────────────────────────────────────

  searchSlots(query: {
    item?: string;
    category?: string;
    city?: string;
    maxPricePerUnit?: number;
    minTrustScore?: number;
    limit?: number;
  }): Array<{ warehouse: Warehouse; slot: WarehouseSlot }> {
    const limit = query.limit ?? 20;
    const results: Array<{ warehouse: Warehouse; slot: WarehouseSlot; score: number }> = [];
    const nowIso = new Date().toISOString();

    for (const w of this.warehouses.values()) {
      if (query.city && w.location.city.toLowerCase() !== query.city.toLowerCase()) continue;
      if (query.minTrustScore !== undefined && w.trustScore < query.minTrustScore) continue;

      for (const slot of w.slots) {
        if (new Date(slot.freshnessUntil).getTime() < Date.parse(nowIso)) continue;
        if (query.category && slot.category !== query.category) continue;
        if (query.item && !slot.item.toLowerCase().includes(query.item.toLowerCase())) continue;
        if (query.maxPricePerUnit !== undefined && slot.pricePerUnit > query.maxPricePerUnit) continue;
        if (slot.availableUnits < slot.minOrderUnits) continue;

        // Score = trust + cheapness + freshness
        const cheapness = Math.max(0, 100 - slot.pricePerUnit);
        const freshnessDays = Math.max(0, (Date.parse(slot.freshnessUntil) - Date.now()) / 86_400_000);
        const score = w.trustScore * 0.5 + cheapness * 0.3 + Math.min(50, freshnessDays) * 0.4;

        results.push({ warehouse: w, slot, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(({ warehouse, slot }) => ({ warehouse, slot }));
  }

  // ─────────────────────────────────────────────
  // Bookings
  // ─────────────────────────���───────────────────

  bookSlot(input: {
    warehouseId: string;
    slotId: string;
    units: number;
    reference?: string;
  }): SlotBooking | { error: string } {
    const w = this.warehouses.get(input.warehouseId);
    if (!w) return { error: `warehouse ${input.warehouseId} not found` };

    const slot = w.slots.find((s) => s.id === input.slotId);
    if (!slot) return { error: `slot ${input.slotId} not found in warehouse ${input.warehouseId}` };

    if (input.units < slot.minOrderUnits) {
      return { error: `units ${input.units} below min order ${slot.minOrderUnits}` };
    }
    if (input.units > slot.availableUnits) {
      return { error: `only ${slot.availableUnits} ${slot.unit} available` };
    }

    const now = Date.now();
    const id = `BOOK-${randomUUID().slice(0, 8)}`;
    const booking: SlotBooking = {
      id,
      warehouseId: w.id,
      slotId: slot.id,
      units: input.units,
      status: "reserved",
      createdAt: new Date(now).toISOString(),
      reservedUntil: new Date(now + BOOKING_TTL_MS).toISOString(),
      reference: input.reference,
    };

    slot.availableUnits -= input.units;
    this.bookings.set(id, booking);
    return booking;
  }

  fulfillBooking(id: string): SlotBooking | { error: string } {
    const b = this.bookings.get(id);
    if (!b) return { error: `booking ${id} not found` };
    if (b.status === "cancelled") return { error: "booking is cancelled" };
    if (b.status === "expired") return { error: "booking expired" };
    if (Date.parse(b.reservedUntil) < Date.now()) {
      b.status = "expired";
      return { error: "booking expired" };
    }
    b.status = "filled";
    b.fulfilledAt = new Date().toISOString();
    return b;
  }

  cancelBooking(id: string): SlotBooking | { error: string } {
    const b = this.bookings.get(id);
    if (!b) return { error: `booking ${id} not found` };
    if (b.status === "filled") return { error: "cannot cancel fulfilled booking" };

    // Refund the units
    const w = this.warehouses.get(b.warehouseId);
    const slot = w?.slots.find((s) => s.id === b.slotId);
    if (slot) slot.availableUnits += b.units;

    b.status = "cancelled";
    b.cancelledAt = new Date().toISOString();
    return b;
  }

  getBooking(id: string): SlotBooking | undefined {
    return this.bookings.get(id);
  }

  listBookings(filter?: { status?: SlotStatus; warehouseId?: string }): SlotBooking[] {
    const all = Array.from(this.bookings.values());
    return all.filter((b) => {
      if (filter?.status && b.status !== filter.status) return false;
      if (filter?.warehouseId && b.warehouseId !== filter.warehouseId) return false;
      return true;
    });
  }

  // ─────────────────────────────────────────────
  // Cost computation — used by the procurement flow
  // ─────────────────────────────────────────────

  computeCostForRoute(opts: {
    warehouseId: string;
    destinationWarehouseId?: string; // if cross-warehouse routing needed
    units: number;
    slotId: string;
  }): { baseCost: number; transitSurcharge: number; totalCost: number; currency: string; transitHours: number } | { error: string } {
    const w = this.warehouses.get(opts.warehouseId);
    if (!w) return { error: `warehouse ${opts.warehouseId} not found` };
    const slot = w.slots.find((s) => s.id === opts.slotId);
    if (!slot) return { error: `slot ${opts.slotId} not found` };

    const baseCost = slot.pricePerUnit * opts.units;
    let transitSurcharge = 0;
    let transitHours = 0;

    if (opts.destinationWarehouseId && opts.destinationWarehouseId !== opts.warehouseId) {
      const route = this.findRoute(opts.warehouseId, opts.destinationWarehouseId);
      if (!route) return { error: `no route from ${opts.warehouseId} to ${opts.destinationWarehouseId}` };
      const baseRate = 25 * opts.units; // synthetic per-unit transit rate (INR/kg)
      transitSurcharge = baseRate * (route.costMultiplier - 1);
      transitHours = route.transitHours;
    }

    return {
      baseCost,
      transitSurcharge: Math.round(transitSurcharge * 100) / 100,
      totalCost: Math.round((baseCost + transitSurcharge) * 100) / 100,
      currency: slot.currency,
      transitHours,
    };
  }
}

const warehouseService = new WarehouseService();
export default warehouseService;