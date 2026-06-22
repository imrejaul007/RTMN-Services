/**
 * nexha-supplier-network — supplier service unit tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import supplierService from '../../src/services/supplier.service.js';
import type { Supplier } from '../../src/types/index.js';

describe('Supplier Service — geo helpers', () => {
  it('computes haversine distance between two cities', () => {
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const delhi = { lat: 28.7041, lng: 77.1025 };
    const d = supplierService.haversineKm(mumbai, delhi);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1300);
  });

  it('returns 0 distance for same coords', () => {
    const d = supplierService.haversineKm(
      { lat: 19.076, lng: 72.8777 },
      { lat: 19.076, lng: 72.8777 },
    );
    expect(d).toBeCloseTo(0, 3);
  });

  it('geocodes known cities', () => {
    expect(supplierService.geocode('Mumbai')).not.toBeNull();
    expect(supplierService.geocode('mumbai')).not.toBeNull();
    expect(supplierService.geocode('Mumbai, MH')).not.toBeNull();
    expect(supplierService.geocode('Atlantis')).toBeNull();
  });
});

describe('Supplier Service — CRUD', () => {
  it('registers and retrieves a supplier', () => {
    const s = supplierService.registerSupplier({
      name: 'Test Supplier',
      status: 'active',
      tier: 'silver',
      categories: ['groceries'],
      capabilities: [{ category: 'groceries', items: ['rice'] }],
      location: { city: 'Mumbai', state: 'MH', country: 'IN', lat: 19.076, lng: 72.8777 },
      rating: { overall: 4.0, totalReviews: 10, reliability: 80, quality: 80, deliverySpeed: 80 },
      contact: {},
    } as any);
    expect(s.id).toBeTruthy();
    expect(s.createdAt).toBeTruthy();
    const got = supplierService.getSupplier(s.id);
    expect(got).toBeDefined();
    expect(got!.name).toBe('Test Supplier');
  });

  it('updates a supplier', () => {
    const s = supplierService.registerSupplier({
      name: 'Updatable',
      status: 'active',
      tier: 'bronze',
      categories: ['medicine'],
      capabilities: [{ category: 'medicine', items: ['paracetamol'] }],
      location: { city: 'Delhi', state: 'DL', country: 'IN' },
      rating: { overall: 3.5, totalReviews: 1, reliability: 70, quality: 70, deliverySpeed: 70 },
      contact: {},
    } as any);
    const updated = supplierService.updateSupplier(s.id, { tier: 'gold' });
    expect(updated).toBeDefined();
    expect(updated!.tier).toBe('gold');
  });

  it('returns null when updating non-existent supplier', () => {
    const r = supplierService.updateSupplier(`ghost-${Date.now()}`, { tier: 'gold' });
    expect(r).toBeNull();
  });

  it('returns null for unknown supplier', () => {
    expect(supplierService.getSupplier(`unknown-${Date.now()}`)).toBeNull();
  });

  it('deletes a supplier', () => {
    const s = supplierService.registerSupplier({
      name: 'Deletable',
      status: 'active',
      tier: 'bronze',
      categories: ['electronics'],
      capabilities: [{ category: 'electronics', items: ['laptop'] }],
      location: { city: 'Pune', state: 'MH', country: 'IN' },
      rating: { overall: 4.0, totalReviews: 0, reliability: 80, quality: 80, deliverySpeed: 80 },
      contact: {},
    } as any);
    expect(supplierService.deleteSupplier(s.id)).toBe(true);
    expect(supplierService.getSupplier(s.id)).toBeNull();
  });
});

describe('Supplier Service — search & match', () => {
  beforeAll(() => {
    // Ensure demo data is seeded (idempotent)
    supplierService.seedDemoSuppliers();
  });

  it('finds suppliers by category', () => {
    const result = supplierService.searchSuppliers({ category: 'groceries', limit: 10 });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every(m => m.supplier.categories.includes('groceries'))).toBe(true);
  });

  it('finds suppliers by item name', () => {
    const result = supplierService.searchSuppliers({ item: 'rice', limit: 10 });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(
      result.matches.some(m =>
        m.supplier.capabilities.some(c =>
          c.items.some(i => i.toLowerCase().includes('rice')),
        ),
      ),
    ).toBe(true);
  });

  it('respects the location filter', () => {
    const result = supplierService.searchSuppliers({ category: 'medicine', location: 'Delhi', limit: 10 });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every(m => m.supplier.location.city.toLowerCase() === 'delhi')).toBe(true);
  });

  it('respects minimum rating', () => {
    const result = supplierService.searchSuppliers({ category: 'groceries', minRating: 4.5, limit: 10 });
    expect(result.matches.every(m => m.supplier.rating.overall >= 4.5)).toBe(true);
  });

  it('respects minimum trust score', () => {
    const result = supplierService.searchSuppliers({ category: 'groceries', minTrustScore: 85, limit: 10 });
    expect(result.matches.every(m => (m.supplier.trustScore ?? 0) >= 85)).toBe(true);
  });

  it('ranks by distance when sortBy is distance', () => {
    const result = supplierService.searchSuppliers({
      category: 'groceries',
      location: 'Mumbai',
      sortBy: 'distance',
      limit: 10,
    });
    for (let i = 1; i < result.matches.length; i++) {
      const prev = result.matches[i - 1].distanceKm ?? Infinity;
      const curr = result.matches[i].distanceKm ?? Infinity;
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it('computes a match score with breakdown', () => {
    const result = supplierService.searchSuppliers({ category: 'medicine', location: 'Delhi', limit: 1 });
    expect(result.matches.length).toBe(1);
    const m = result.matches[0];
    expect(m.matchScore).toBeGreaterThan(0);
    expect(m.matchScore).toBeLessThanOrEqual(100);
    expect(m.scoreBreakdown).toBeDefined();
    expect(m.scoreBreakdown.category).toBeGreaterThan(0);
  });

  it('applies maxDistanceKm filter', () => {
    const result = supplierService.searchSuppliers({
      category: 'groceries',
      location: 'Mumbai',
      maxDistanceKm: 5,
      limit: 10,
    });
    expect(result.matches.every(m => (m.distanceKm ?? 0) <= 5)).toBe(true);
  });

  it('returns empty results for impossible filters', () => {
    const result = supplierService.searchSuppliers({
      category: 'raw_materials',
      minTrustScore: 99,
      minRating: 4.9,
      limit: 10,
    });
    expect(result.matches).toHaveLength(0);
  });
});

describe('Supplier Service — seed data', () => {
  it('seeds at least 5 demo suppliers', () => {
    supplierService.seedDemoSuppliers(true); // force re-seed
    const all = supplierService.listSuppliers();
    expect(all.length).toBeGreaterThanOrEqual(5);
  });

  it('seeds suppliers across multiple cities', () => {
    supplierService.seedDemoSuppliers(true);
    const all = supplierService.listSuppliers();
    const cities = new Set(all.map(s => s.location.city));
    expect(cities.size).toBeGreaterThanOrEqual(3);
  });

  it('seeds suppliers with valid trust scores', () => {
    supplierService.seedDemoSuppliers(true);
    const all = supplierService.listSuppliers();
    for (const s of all) {
      if (s.trustScore != null) {
        expect(s.trustScore).toBeGreaterThanOrEqual(0);
        expect(s.trustScore).toBeLessThanOrEqual(100);
      }
    }
  });
});
