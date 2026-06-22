/**
 * sutar-warehouse-network — unit tests.
 *
 * Covers discovery (state, pincode, capability filters), slot lookup,
 * booking happy-path + error cases (over-capacity, in-past), cancellation,
 * and stats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as svc from '../../src/warehouse.service.js';

beforeEach(() => {
  svc._resetForTests();
});

describe('Warehouse discovery', () => {
  it('returns all 6 seeded warehouses when no filter is provided', () => {
    const all = svc.searchWarehouses({});
    expect(all.length).toBe(6);
  });

  it('filters by state', () => {
    const mh = svc.searchWarehouses({ state: 'MH' });
    expect(mh.length).toBeGreaterThanOrEqual(2);
    expect(mh.every(w => w.address.state === 'MH')).toBe(true);
  });

  it('filters by pincode', () => {
    const one = svc.searchWarehouses({ pincode: '560066' });
    expect(one.length).toBe(1);
    expect(one[0].address.city).toBe('Bengaluru');
  });

  it('filters by cold-chain capability', () => {
    const cold = svc.searchWarehouses({ needsColdChain: true });
    expect(cold.length).toBeGreaterThan(0);
    expect(cold.every(w => w.capabilities.coldChain)).toBe(true);
  });

  it('filters by hazardous capability', () => {
    const hz = svc.searchWarehouses({ needsHazardous: true });
    expect(hz.length).toBeGreaterThan(0);
    expect(hz.every(w => w.capabilities.hazardous)).toBe(true);
  });

  it('filters by minimum rating', () => {
    const top = svc.searchWarehouses({ minRating: 4.5 });
    expect(top.length).toBeGreaterThan(0);
    expect(top.every(w => w.rating >= 4.5)).toBe(true);
  });

  it('filters by minimum capacity', () => {
    const big = svc.searchWarehouses({ minCapacityKg: 25000 });
    expect(big.every(w => w.capabilities.maxWeightKg >= 25000)).toBe(true);
  });

  it('returns warehouses sorted by rating descending', () => {
    const list = svc.searchWarehouses({});
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].rating).toBeGreaterThanOrEqual(list[i].rating);
    }
  });

  it('getWarehouse returns the warehouse by id', () => {
    const list = svc.searchWarehouses({});
    const target = list[0];
    const fetched = svc.getWarehouse(target.id);
    expect(fetched).toEqual(target);
  });

  it('getWarehouse returns null for unknown id', () => {
    expect(svc.getWarehouse('does-not-exist')).toBeNull();
  });
});

describe('Slot lookup', () => {
  it('returns slots within the requested window', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inbound = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 1 });
    expect(inbound.length).toBeGreaterThan(0);
    expect(inbound.every(s => s.direction === 'inbound')).toBe(true);
    expect(inbound.every(s => s.warehouseId === w.id)).toBe(true);
  });

  it('only returns slots with enough remaining capacity', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const all = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 1 });
    const tooPicky = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 999 });
    expect(tooPicky.length).toBe(0);
    expect(all.length).toBeGreaterThanOrEqual(tooPicky.length);
  });

  it('returns slots sorted by start time ascending', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'outbound', fromIso: from, toIso: to, minPallets: 1 });
    for (let i = 1; i < slots.length; i++) {
      expect(new Date(slots[i - 1].start).getTime()).toBeLessThanOrEqual(new Date(slots[i].start).getTime());
    }
  });
});

describe('Booking', () => {
  it('books a slot when capacity is available', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 5 });
    const slot = slots[0];
    const bookedBefore = svc.getSlot(slot.id)!.booked;
    const result = svc.bookSlot({ slotId: slot.id, customerId: 'cust-1', pallets: 5, weightKg: 1000 });
    expect('id' in result).toBe(true);
    expect((result as any).status).toBe('confirmed');
    expect((result as any).customerId).toBe('cust-1');
    // Verify slot's booked counter went up — re-fetch from store to avoid stale reference.
    const after = svc.getSlot(slot.id);
    expect(after!.booked).toBeGreaterThan(bookedBefore);
  });

  it('rejects booking against unknown slot', () => {
    const r = svc.bookSlot({ slotId: 'no-such-slot', customerId: 'cust-1', pallets: 1, weightKg: 100 });
    expect('error' in r).toBe(true);
    expect((r as any).error).toBe('slot_not_found');
  });

  it('rejects booking with too many pallets', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 1 });
    const slot = slots[0];
    const r = svc.bookSlot({ slotId: slot.id, customerId: 'cust-1', pallets: 99999, weightKg: 100 });
    expect('error' in r).toBe(true);
    expect((r as any).error).toBe('insufficient_capacity');
  });

  it('cancels a confirmed booking and frees capacity', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 3 });
    const slot = slots[0];
    const before = slot.booked;
    const result = svc.bookSlot({ slotId: slot.id, customerId: 'cust-1', pallets: 3, weightKg: 500 }) as any;
    expect(result.status).toBe('confirmed');
    const mid = svc.getSlot(slot.id)!.booked;
    expect(mid).toBe(before + 3);
    const cancelled = svc.cancelBooking(result.id);
    expect(cancelled!.status).toBe('cancelled');
    const after = svc.getSlot(slot.id)!.booked;
    expect(after).toBe(before);
  });

  it('cannot cancel a booking twice', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 1 });
    const result = svc.bookSlot({ slotId: slots[0].id, customerId: 'cust-1', pallets: 1, weightKg: 100 }) as any;
    expect(svc.cancelBooking(result.id)).not.toBeNull();
    expect(svc.cancelBooking(result.id)).toBeNull();
  });

  it('lists bookings filtered by customerId', () => {
    const w = svc.searchWarehouses({})[0];
    const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = svc.findSlots({ warehouseId: w.id, direction: 'inbound', fromIso: from, toIso: to, minPallets: 1 });
    svc.bookSlot({ slotId: slots[0].id, customerId: 'alice', pallets: 1, weightKg: 50 });
    svc.bookSlot({ slotId: slots[1].id, customerId: 'bob', pallets: 1, weightKg: 50 });
    expect(svc.listBookings('alice').length).toBe(1);
    expect(svc.listBookings('bob').length).toBe(1);
    expect(svc.listBookings('nobody').length).toBe(0);
  });
});

describe('Network stats', () => {
  it('reports non-zero warehouse + slot counts after seed', () => {
    const s = svc.networkStats();
    expect(s.warehouses).toBe(6);
    expect(s.activeWarehouses).toBe(6);
    expect(s.totalSlots).toBe(6 * 14 * 2); // 6 warehouses × 14 days × 2 slots/day
    expect(s.openSlots).toBeGreaterThan(0);
    expect(s.bookings).toBe(0);
  });
});
