/**
 * sutar-logistics — service unit tests
 */

import { describe, it, expect } from 'vitest';
import logisticsService from '../../src/services/logistics.service.js';
import type { QuoteRequest } from '../../src/types/index.js';

const baseRequest: QuoteRequest = {
  origin: { street: 'A-1', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'IN' },
  destination: { street: 'B-2', city: 'Delhi', state: 'DL', pincode: '110001', country: 'IN' },
  package: { weightKg: 5 },
};

describe('Logistics — geo helpers', () => {
  it('computes haversine distance', () => {
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const delhi = { lat: 28.7041, lng: 77.1025 };
    const d = logisticsService.haversineKm(mumbai, delhi);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1300);
  });

  it('resolves city coordinates', () => {
    const c = logisticsService.coordsOf({ street: 'x', city: 'Mumbai', state: 'MH', pincode: '400001', country: 'IN' });
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(19.076, 2);
  });

  it('uses explicit lat/lng when provided', () => {
    const c = logisticsService.coordsOf({ street: 'x', city: 'Nowhere', state: 'XX', pincode: '000000', country: 'IN', lat: 1, lng: 2 });
    expect(c).toEqual({ lat: 1, lng: 2 });
  });
});

describe('Logistics — quote generation', () => {
  it('returns multiple quotes for a known route', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    expect(quotes.length).toBeGreaterThan(0);
  });

  it('ranks quotes cheapest first', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    for (let i = 1; i < quotes.length; i++) {
      expect(quotes[i].cost).toBeGreaterThanOrEqual(quotes[i - 1].cost);
    }
  });

  it('express costs more than economy', () => {
    const econ = logisticsService.getQuotes({ ...baseRequest, serviceLevel: 'economy' });
    const expr = logisticsService.getQuotes({ ...baseRequest, serviceLevel: 'express' });
    expect(econ.length).toBeGreaterThan(0);
    expect(expr.length).toBeGreaterThan(0);
    expect(expr[0].cost).toBeGreaterThan(econ[0].cost);
  });

  it('express is faster than economy', () => {
    const econ = logisticsService.getQuotes({ ...baseRequest, serviceLevel: 'economy' });
    const expr = logisticsService.getQuotes({ ...baseRequest, serviceLevel: 'express' });
    expect(expr[0].transitHours).toBeLessThan(econ[0].transitHours);
  });

  it('applies maxCost filter', () => {
    const quotes = logisticsService.getQuotes({ ...baseRequest, maxCost: 1000 });
    expect(quotes.every(q => q.cost <= 1000)).toBe(true);
  });

  it('applies maxTransitHours filter', () => {
    const quotes = logisticsService.getQuotes({ ...baseRequest, maxTransitHours: 30 });
    expect(quotes.every(q => q.transitHours <= 30)).toBe(true);
  });

  it('returns empty quotes for unknown cities', () => {
    const quotes = logisticsService.getQuotes({
      ...baseRequest,
      destination: { ...baseRequest.destination, city: 'Atlantis' },
    });
    expect(quotes).toHaveLength(0);
  });

  it('applies cold-chain surcharge when requested', () => {
    const normal = logisticsService.getQuotes({ ...baseRequest, package: { weightKg: 5 } });
    const cold = logisticsService.getQuotes({ ...baseRequest, package: { weightKg: 5, specialHandling: ['cold_chain'] } });
    expect(cold[0].cost).toBeGreaterThan(normal[0].cost);
  });

  it('returns valid CO2 estimate', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    expect(quotes[0].co2Kg).toBeGreaterThan(0);
  });

  it('attaches a reason string to each quote', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    expect(quotes.every(q => typeof q.reason === 'string' && q.reason.length > 0)).toBe(true);
  });
});

describe('Logistics — booking & tracking', () => {
  it('books a shipment from a valid quote', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const q = quotes[0];
    const s = logisticsService.bookShipment(q.id, q.carrier, baseRequest);
    expect(s).toBeDefined();
    expect(s!.status).toBe('booked');
    expect(s!.trackingNumber).toBeTruthy();
    expect(s!.events.length).toBeGreaterThan(0);
  });

  it('returns null when booking with a bad quoteId', () => {
    const s = logisticsService.bookShipment('nonexistent', 'any', baseRequest);
    expect(s).toBeNull();
  });

  it('retrieves a booked shipment', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    const got = logisticsService.getShipment(s!.id);
    expect(got).toBeDefined();
    expect(got!.id).toBe(s!.id);
  });

  it('advances shipment status through the state machine', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    logisticsService.simulateNextEvent(s!.id);
    const after = logisticsService.getShipment(s!.id);
    expect(['picked_up', 'delivered']).toContain(after!.status);
  });

  it('cancels a booked shipment', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    const cancelled = logisticsService.cancelShipment(s!.id, 'changed mind');
    expect(cancelled!.status).toBe('cancelled');
  });

  it('does not cancel a delivered shipment', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    logisticsService.updateShipmentStatus(s!.id, 'delivered', 'done');
    const result = logisticsService.cancelShipment(s!.id, 'too late');
    expect(result!.status).toBe('delivered');
  });

  it('lists shipments filtered by status', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    const booked = logisticsService.listShipments({ status: 'booked' });
    expect(booked.every(s => s.status === 'booked')).toBe(true);
  });

  it('records picked_up timestamp when status changes to picked_up', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    logisticsService.updateShipmentStatus(s!.id, 'picked_up', 'picked up at warehouse');
    const after = logisticsService.getShipment(s!.id);
    expect(after!.pickedUpAt).toBeTruthy();
  });

  it('records delivered timestamp when status changes to delivered', () => {
    const quotes = logisticsService.getQuotes(baseRequest);
    const s = logisticsService.bookShipment(quotes[0].id, quotes[0].carrier, baseRequest);
    logisticsService.updateShipmentStatus(s!.id, 'delivered', 'success');
    const after = logisticsService.getShipment(s!.id);
    expect(after!.deliveredAt).toBeTruthy();
  });
});
