import { describe, it, expect } from 'vitest';
import { CARRIERS, findCarriers, getCarrier, generateTrackingNumber, bookWithCarrier } from '../src/carriers/registry.js';

describe('CARRIERS catalog', () => {
  it('contains 12 built-in carriers per spec', () => {
    expect(CARRIERS).toHaveLength(12);
  });
  it('includes all required carrier IDs', () => {
    const required = [
      'dhl-express', 'fedex-international', 'ups-worldwide',
      'maersk', 'msc', 'cma-cgm',
      'emirates-skycargo',
      'bluedart', 'delhivery',
      'aramex',
      'sf-express', 'yamato'
    ];
    for (const id of required) {
      expect(CARRIERS.find((c) => c.id === id), `should include ${id}`).toBeDefined();
    }
  });
  it('has reliability scores in 0-1 range', () => {
    for (const c of CARRIERS) {
      expect(c.reliability).toBeGreaterThanOrEqual(0);
      expect(c.reliability).toBeLessThanOrEqual(1);
    }
  });
  it('has positive rates and transit times', () => {
    for (const c of CARRIERS) {
      expect(c.baseRatePerKg).toBeGreaterThan(0);
      expect(c.averageTransitHours).toBeGreaterThan(0);
    }
  });
});

describe('findCarriers', () => {
  it('filters by mode', () => {
    const airCarriers = findCarriers({ modes: ['air'] });
    expect(airCarriers.length).toBeGreaterThan(0);
    for (const c of airCarriers) {
      expect(c.modes).toContain('air');
    }
  });
  it('filters by country', () => {
    const indianCarriers = findCarriers({ country: 'IN' });
    expect(indianCarriers.some((c) => c.regions.includes('IN'))).toBe(true);
  });
  it('returns global carriers when no country specified', () => {
    const all = findCarriers({});
    expect(all.length).toBe(CARRIERS.length);
  });
  it('returns empty when no carrier matches', () => {
    // Find a mode nobody supports (impossible in our catalog, but tests the path)
    const matches = findCarriers({ modes: ['rocket'] as any });
    expect(matches.length).toBe(0);
  });
});

describe('getCarrier', () => {
  it('returns carrier by ID', () => {
    expect(getCarrier('maersk')?.name).toBe('Maersk');
  });
  it('returns undefined for unknown ID', () => {
    expect(getCarrier('unknown')).toBeUndefined();
  });
});

describe('generateTrackingNumber', () => {
  it('generates tracking number with carrier prefix', () => {
    const tn = generateTrackingNumber('dhl-express');
    expect(tn).toMatch(/^DHL-/);
  });
  it('generates unique tracking numbers', () => {
    const a = generateTrackingNumber('dhl-express');
    const b = generateTrackingNumber('dhl-express');
    expect(a).not.toBe(b);
  });
});

describe('bookWithCarrier', () => {
  it('returns a booking with tracking number and delivery time', async () => {
    const carrier = CARRIERS.find((c) => c.id === 'dhl-express')!;
    const booking = await bookWithCarrier(carrier, {
      origin: 'US',
      destination: 'DE',
      cargoType: 'general',
      weightKg: 5,
      pieces: 1,
      pickupTime: new Date().toISOString()
    });
    expect(booking.shipmentId).toMatch(/^SHP-/);
    expect(booking.trackingNumber).toMatch(/^DHL-/);
    expect(booking.status).toBe('confirmed');
    expect(booking.costUsd).toBeGreaterThan(0);
    expect(new Date(booking.deliveryTime).getTime()).toBeGreaterThan(Date.now());
  });
});