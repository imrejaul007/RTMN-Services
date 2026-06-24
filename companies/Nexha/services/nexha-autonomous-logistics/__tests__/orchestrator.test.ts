import { describe, it, expect, beforeEach } from 'vitest';
import { planShipment, bookShipment, trackShipment, cancelShipmentFn } from '../src/orchestrator/orchestrator.js';
import { bindInsurance } from '../src/insurance/binder.js';
import { calculateCarbon } from '../src/carbon/calculator.js';
import type { ShipmentRequest } from '../src/types.js';

describe('bindInsurance', () => {
  it('binds basic insurance at 0.3% rate', () => {
    const policy = bindInsurance({
      cargoValueUsd: 10000,
      route: { totalTransitHours: 100 } as any,
      coverage: 'basic'
    });
    expect(policy.premiumUsd).toBe(30);
    expect(policy.rate).toBe(0.003);
    expect(policy.coverage).toBe('basic');
    expect(policy.id).toMatch(/^INS-/);
  });
  it('binds all-risk insurance at 0.8% rate', () => {
    const policy = bindInsurance({
      cargoValueUsd: 10000,
      route: { totalTransitHours: 100 } as any,
      coverage: 'all-risk'
    });
    expect(policy.premiumUsd).toBe(80);
  });
});

describe('calculateCarbon', () => {
  it('calculates total kg CO2 and tree-days', () => {
    const route = {
      legs: [
        { carrierId: 'dhl-express', mode: 'air' as any, carbonKg: 5, distanceKm: 1000 },
        { carrierId: 'maersk', mode: 'sea' as any, carbonKg: 2, distanceKm: 5000 }
      ],
      totalCarbonKg: 7,
      totalDistanceKm: 6000
    } as any;
    const estimate = calculateCarbon(route);
    expect(estimate.totalKg).toBe(7);
    expect(estimate.intensity).toBeGreaterThan(0);
    expect(estimate.treeDays).toBeGreaterThan(0);
    expect(estimate.offsetCostUsd).toBeGreaterThan(0);
  });
});

describe('planShipment', () => {
  it('generates a plan with route + customs + alternatives', async () => {
    const request: ShipmentRequest = {
      origin: { country: 'US', city: 'New York' },
      destination: { country: 'DE', city: 'Berlin' },
      cargo: {
        type: 'textile',
        weightKg: 50,
        declaredValue: 5000,
        currency: 'USD',
        hsCode: '6203.42'
      },
      optimizeFor: 'cost'
    };
    const plan = await planShipment(request);
    expect(plan.id).toMatch(/^PLN-/);
    expect(plan.recommendedRoute).toBeDefined();
    expect(plan.recommendedRoute.legs.length).toBeGreaterThan(0);
    expect(plan.customsDocuments.length).toBeGreaterThan(0);
    expect(plan.estimatedCostUsd).toBeGreaterThan(0);
    expect(plan.carbonFootprintKg).toBeGreaterThan(0);
    expect(plan.estimatedDelivery).toMatch(/T/);
  });
  it('includes insurance when requested', async () => {
    const plan = await planShipment({
      origin: { country: 'US' },
      destination: { country: 'IN' },
      cargo: { type: 'electronics', weightKg: 10, declaredValue: 2000, currency: 'USD', hsCode: '8517.12' },
      optimizeFor: 'speed',
      insurance: { coverage: 'standard' }
    });
    expect(plan.insurance).toBeDefined();
    expect(plan.insurance?.coverage).toBe('standard');
    expect(plan.insurance?.premiumUsd).toBeGreaterThan(0);
  });
  it('honors optimizeFor: speed — top route has best speed score', async () => {
    const plan = await planShipment({
      origin: { country: 'CN' },
      destination: { country: 'US' },
      cargo: { type: 'documents', weightKg: 1, declaredValue: 50, currency: 'USD' },
      optimizeFor: 'speed'
    });
    expect(plan.recommendedRoute.scores.speed).toBe(1);
  });
});

describe('bookShipment', () => {
  let plan: any;
  beforeEach(async () => {
    plan = await planShipment({
      origin: { country: 'US' },
      destination: { country: 'DE' },
      cargo: { type: 'general', weightKg: 10, declaredValue: 500, currency: 'USD' }
    });
  });
  it('books a plan and returns shipment ID', async () => {
    const booking = await bookShipment(plan);
    expect(booking.shipmentId).toMatch(/^SHP-/);
    expect(booking.bookings.length).toBe(plan.recommendedRoute.legs.length);
    expect(booking.totalCostUsd).toBeGreaterThan(0);
  });
  it('allows booking with custom pickup time', async () => {
    const pickupTime = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const booking = await bookShipment(plan, { pickupTime });
    expect(booking.estimatedPickup).toBe(pickupTime);
  });
});

describe('trackShipment', () => {
  it('returns status for booked shipment', async () => {
    const plan = await planShipment({
      origin: { country: 'US' },
      destination: { country: 'DE' },
      cargo: { type: 'general', weightKg: 10, declaredValue: 500, currency: 'USD' }
    });
    const booking = await bookShipment(plan);
    const status = trackShipment(booking.shipmentId);
    expect(status).not.toBeNull();
    expect(status?.shipmentId).toBe(booking.shipmentId);
    expect(status?.legs.length).toBeGreaterThan(0);
  });
  it('returns null for unknown shipment', () => {
    expect(trackShipment('SHP-UNKNOWN')).toBeNull();
  });
});

describe('cancelShipment', () => {
  it('cancels a booked shipment', async () => {
    const plan = await planShipment({
      origin: { country: 'US' },
      destination: { country: 'DE' },
      cargo: { type: 'general', weightKg: 10, declaredValue: 500, currency: 'USD' }
    });
    const booking = await bookShipment(plan);
    const result = cancelShipmentFn(booking.shipmentId);
    expect(result.success).toBe(true);
    expect(trackShipment(booking.shipmentId)).toBeNull();
  });
  it('returns error for unknown shipment', () => {
    const result = cancelShipmentFn('SHP-UNKNOWN');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('shipment-not-found');
  });
});