/**
 * Warehouse service — pure functions over in-memory stores.
 * Seeded with 6 Indian warehouses (Mumbai, Bengaluru, Delhi NCR, Hyderabad,
 * Chennai, Pune) so the discovery endpoint returns realistic data out of the
 * box.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Booking,
  BookingRequest,
  Slot,
  SlotQuery,
  Warehouse,
  WarehouseQuery,
} from './types.js';

const WAREHOUSES = new Map<string, Warehouse>();
const SLOTS = new Map<string, Slot>();
const BOOKINGS = new Map<string, Booking>();

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────

function seed(): void {
  if (WAREHOUSES.size > 0) return;
  const now = new Date().toISOString();
  const seeds: Omit<Warehouse, 'id' | 'createdAt'>[] = [
    {
      name: 'Nexha Bhiwandi Hub',
      operatorId: 'op-1',
      address: { line1: 'Plot 14, MIDC', city: 'Bhiwandi', state: 'MH', pincode: '421302', lat: 19.296, lon: 73.063 },
      capabilities: { temperatureControlled: true, hazardous: false, bonded: true, coldChain: true, maxWeightKg: 25000, maxVolumeM3: 8000 },
      hourlyRateInr: 12,
      rating: 4.6,
      active: true,
    },
    {
      name: 'Nexha Bengaluru Whitefield',
      operatorId: 'op-2',
      address: { line1: 'KIADB Industrial Area', city: 'Bengaluru', state: 'KA', pincode: '560066', lat: 12.97, lon: 77.74 },
      capabilities: { temperatureControlled: true, hazardous: true, bonded: false, coldChain: true, maxWeightKg: 18000, maxVolumeM3: 5500 },
      hourlyRateInr: 18,
      rating: 4.4,
      active: true,
    },
    {
      name: 'Nexha Gurgaon Fulfilment',
      operatorId: 'op-3',
      address: { line1: 'IMT Manesar', city: 'Gurugram', state: 'HR', pincode: '122051', lat: 28.35, lon: 76.93 },
      capabilities: { temperatureControlled: false, hazardous: false, bonded: true, coldChain: false, maxWeightKg: 12000, maxVolumeM3: 4200 },
      hourlyRateInr: 15,
      rating: 4.2,
      active: true,
    },
    {
      name: 'Nexha Hyderabad Medchal',
      operatorId: 'op-4',
      address: { line1: 'Medchal IDA', city: 'Hyderabad', state: 'TG', pincode: '501401', lat: 17.62, lon: 78.48 },
      capabilities: { temperatureControlled: true, hazardous: false, bonded: false, coldChain: true, maxWeightKg: 15000, maxVolumeM3: 4800 },
      hourlyRateInr: 14,
      rating: 4.3,
      active: true,
    },
    {
      name: 'Nexha Chennai Sriperumbudur',
      operatorId: 'op-5',
      address: { line1: 'SIPCOT Industrial Park', city: 'Sriperumbudur', state: 'TN', pincode: '602105', lat: 12.97, lon: 79.94 },
      capabilities: { temperatureControlled: true, hazardous: true, bonded: true, coldChain: true, maxWeightKg: 30000, maxVolumeM3: 10000 },
      hourlyRateInr: 16,
      rating: 4.7,
      active: true,
    },
    {
      name: 'Nexha Pune Chakan',
      operatorId: 'op-6',
      address: { line1: 'Chakan MIDC Phase 2', city: 'Pune', state: 'MH', pincode: '410501', lat: 18.76, lon: 73.86 },
      capabilities: { temperatureControlled: false, hazardous: true, bonded: false, coldChain: false, maxWeightKg: 20000, maxVolumeM3: 6500 },
      hourlyRateInr: 13,
      rating: 4.1,
      active: true,
    },
  ];
  for (const s of seeds) {
    const id = `wh-${uuidv4()}`;
    WAREHOUSES.set(id, { ...s, id, createdAt: now });
    // Seed 14 days of slots, 2 per day per warehouse, alternating inbound/outbound.
    const start = new Date();
    start.setHours(8, 0, 0, 0);
    for (let d = 0; d < 14; d++) {
      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const slotStart = new Date(start);
        slotStart.setDate(slotStart.getDate() + d);
        slotStart.setHours(sIdx === 0 ? 8 : 14, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotStart.getHours() + 4);
        const sid = `slot-${uuidv4()}`;
        SLOTS.set(sid, {
          id: sid,
          warehouseId: id,
          direction: sIdx === 0 ? 'inbound' : 'outbound',
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          capacity: 40,
          booked: Math.floor(Math.random() * 20), // 0-19 booked out of 40
        });
      }
    }
  }
}

seed();

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

export function searchWarehouses(q: WarehouseQuery): Warehouse[] {
  const all = Array.from(WAREHOUSES.values()).filter(w => w.active);
  const matches = all.filter(w => {
    if (q.state && w.address.state !== q.state) return false;
    if (q.pincode && w.address.pincode !== q.pincode) return false;
    if (q.needsColdChain && !w.capabilities.coldChain) return false;
    if (q.needsHazardous && !w.capabilities.hazardous) return false;
    if (q.minRating !== undefined && w.rating < q.minRating) return false;
    if (q.minCapacityKg !== undefined && w.capabilities.maxWeightKg < q.minCapacityKg) return false;
    return true;
  });
  return matches.sort((a, b) => b.rating - a.rating);
}

export function getWarehouse(id: string): Warehouse | null {
  return WAREHOUSES.get(id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot lookup
// ─────────────────────────────────────────────────────────────────────────────

export function findSlots(q: SlotQuery): Slot[] {
  const fromMs = new Date(q.fromIso).getTime();
  const toMs = new Date(q.toIso).getTime();
  return Array.from(SLOTS.values())
    .filter(s => s.warehouseId === q.warehouseId)
    .filter(s => s.direction === q.direction)
    .filter(s => {
      const startMs = new Date(s.start).getTime();
      return startMs >= fromMs && startMs <= toMs;
    })
    .filter(s => s.capacity - s.booked >= q.minPallets)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function getSlot(id: string): Slot | null {
  return SLOTS.get(id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────

export function bookSlot(req: BookingRequest): Booking | { error: string } {
  const slot = SLOTS.get(req.slotId);
  if (!slot) return { error: 'slot_not_found' };
  if (slot.capacity - slot.booked < req.pallets) return { error: 'insufficient_capacity' };
  if (new Date(slot.start).getTime() < Date.now()) return { error: 'slot_in_past' };

  const id = `bk-${uuidv4()}`;
  const booking: Booking = {
    id,
    slotId: slot.id,
    warehouseId: slot.warehouseId,
    customerId: req.customerId,
    direction: slot.direction,
    pallets: req.pallets,
    weightKg: req.weightKg,
    status: 'confirmed',
    bookedAt: new Date().toISOString(),
  };
  slot.booked += req.pallets;
  BOOKINGS.set(id, booking);
  return booking;
}

export function cancelBooking(id: string): Booking | null {
  const b = BOOKINGS.get(id);
  if (!b || b.status !== 'confirmed') return null;
  b.status = 'cancelled';
  const slot = SLOTS.get(b.slotId);
  if (slot) slot.booked = Math.max(0, slot.booked - b.pallets);
  return b;
}

export function listBookings(customerId?: string): Booking[] {
  const all = Array.from(BOOKINGS.values());
  return customerId ? all.filter(b => b.customerId === customerId) : all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export function networkStats(): {
  warehouses: number;
  activeWarehouses: number;
  totalSlots: number;
  openSlots: number;
  bookings: number;
} {
  const activeWarehouses = Array.from(WAREHOUSES.values()).filter(w => w.active).length;
  const totalSlots = SLOTS.size;
  const openSlots = Array.from(SLOTS.values()).filter(s => s.booked < s.capacity).length;
  return {
    warehouses: WAREHOUSES.size,
    activeWarehouses,
    totalSlots,
    openSlots,
    bookings: BOOKINGS.size,
  };
}

export function _resetForTests(): void {
  WAREHOUSES.clear();
  SLOTS.clear();
  BOOKINGS.clear();
  seed();
}
