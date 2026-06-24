import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  suggestMode,
  buildSingleLegRoute,
  buildMultiLegRoute,
  generateCandidateRoutes,
  scoreRoutes
} from '../src/routing/engine.js';

describe('haversineKm', () => {
  it('returns short distance for same country', () => {
    expect(haversineKm({ country: 'US' }, { country: 'US' })).toBe(500);
  });
  it('returns medium distance for same region', () => {
    expect(haversineKm({ country: 'DE' }, { country: 'FR' })).toBe(1200);
  });
  it('returns long distance for far countries', () => {
    expect(haversineKm({ country: 'US' }, { country: 'IN' })).toBe(8000);
  });
});

describe('suggestMode', () => {
  it('uses courier for very short distances', () => {
    expect(suggestMode(300, 'general', false)).toBe('courier');
  });
  it('uses road for medium distances', () => {
    expect(suggestMode(800, 'general', false)).toBe('road');
  });
  it('uses air for perishable long distance', () => {
    expect(suggestMode(6000, 'general', true)).toBe('air');
  });
  it('uses sea for long distance bulk goods', () => {
    expect(suggestMode(10000, 'general', false)).toBe('sea');
  });
});

describe('buildSingleLegRoute', () => {
  it('builds a route from origin to destination', () => {
    const carrier = {
      id: 'dhl-express', name: 'DHL Express',
      modes: ['air' as const, 'courier' as const],
      regions: [],
      reliability: 0.96,
      baseRatePerKg: 8.5,
      averageTransitHours: 48,
      carbonGramsPerKgKm: 0.85
    };
    const route = buildSingleLegRoute(carrier, {
      origin: { country: 'US' },
      destination: { country: 'DE' },
      cargo: { type: 'general', weightKg: 10, declaredValue: 1000, currency: 'USD' }
    });
    expect(route.legs).toHaveLength(1);
    expect(route.legs[0].carrierId).toBe('dhl-express');
    expect(route.totalCostUsd).toBeGreaterThan(0);
    expect(route.totalTransitHours).toBeGreaterThan(0);
    expect(route.totalCarbonKg).toBeGreaterThan(0);
    expect(route.reliabilityScore).toBe(0.96);
  });
});

describe('buildMultiLegRoute', () => {
  it('builds 3-leg route (truck → main → truck)', () => {
    const carrier = {
      id: 'maersk', name: 'Maersk',
      modes: ['sea' as const],
      regions: [],
      reliability: 0.92,
      baseRatePerKg: 0.45,
      averageTransitHours: 720,
      carbonGramsPerKgKm: 0.012
    };
    const route = buildMultiLegRoute(carrier, {
      origin: { country: 'CN' },
      destination: { country: 'US' },
      cargo: { type: 'general', weightKg: 1000, declaredValue: 50000, currency: 'USD' }
    });
    expect(route.legs).toHaveLength(3);
    expect(route.legs[1].mode).toBe('sea');
    expect(route.reliabilityScore).toBeLessThan(carrier.reliability);
  });
});

describe('generateCandidateRoutes', () => {
  it('returns 3+ candidates for short distance', () => {
    const routes = generateCandidateRoutes({
      origin: { country: 'US' },
      destination: { country: 'US' },
      cargo: { type: 'general', weightKg: 5, declaredValue: 100, currency: 'USD' }
    });
    expect(routes.length).toBeGreaterThanOrEqual(3);
  });
  it('returns sea freight options for long distance', () => {
    const routes = generateCandidateRoutes({
      origin: { country: 'CN' },
      destination: { country: 'US' },
      cargo: { type: 'general', weightKg: 1000, declaredValue: 5000, currency: 'USD' }
    });
    expect(routes.some((r) => r.legs.some((l) => l.mode === 'sea'))).toBe(true);
  });
});

describe('scoreRoutes', () => {
  it('returns routes sorted by composite score', () => {
    const routes = generateCandidateRoutes({
      origin: { country: 'US' },
      destination: { country: 'DE' },
      cargo: { type: 'general', weightKg: 10, declaredValue: 1000, currency: 'USD' }
    });
    const scored = scoreRoutes(routes, 'cost');
    expect(scored.length).toBe(routes.length);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });
  it('normalizes scores to 0-1 range', () => {
    const routes = generateCandidateRoutes({
      origin: { country: 'US' },
      destination: { country: 'IN' },
      cargo: { type: 'electronics', weightKg: 5, declaredValue: 2000, currency: 'USD' }
    });
    const scored = scoreRoutes(routes, 'reliability');
    for (const r of scored) {
      expect(r.scores.cost).toBeGreaterThanOrEqual(0);
      expect(r.scores.cost).toBeLessThanOrEqual(1);
      expect(r.scores.speed).toBeGreaterThanOrEqual(0);
      expect(r.scores.speed).toBeLessThanOrEqual(1);
    }
  });
  it('speed optimization favors faster routes', () => {
    const routes = generateCandidateRoutes({
      origin: { country: 'CN' },
      destination: { country: 'US' },
      cargo: { type: 'documents', weightKg: 1, declaredValue: 100, currency: 'USD' }
    });
    const scored = scoreRoutes(routes, 'speed');
    const top = scored[0];
    expect(top.scores.speed).toBe(1);
  });
});