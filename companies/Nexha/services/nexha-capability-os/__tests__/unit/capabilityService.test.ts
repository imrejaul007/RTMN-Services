/**
 * nexha-capability-os — Capability service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import capabilityService from '../../src/services/capabilityService.js';

describe('Capability Service — seeding', () => {
  beforeEach(() => {
    capabilityService.clear();
  });

  it('seeds demo capabilities on first call', () => {
    const count = capabilityService.seedDemoCapabilities();
    expect(count).toBeGreaterThan(0);
    expect(capabilityService.total()).toBe(count);
  });

  it('does not double-seed', () => {
    capabilityService.seedDemoCapabilities();
    const firstCount = capabilityService.total();
    capabilityService.seedDemoCapabilities();
    expect(capabilityService.total()).toBe(firstCount);
  });

  it('seeds capabilities with valid categories', () => {
    capabilityService.seedDemoCapabilities();
    const all = capabilityService.listAll();
    const categories = new Set(all.map((c) => c.category));
    expect(categories.size).toBeGreaterThan(0);
    // Each capability must have at least one tag
    for (const cap of all) {
      expect(cap.tags.length).toBeGreaterThan(0);
    }
  });
});

describe('Capability Service — CRUD', () => {
  beforeEach(() => {
    capabilityService.clear();
  });

  it('registers a new capability with generated id + timestamps', () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'Test Capability',
      description: 'For unit testing',
      category: 'service',
      tags: ['test'],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: ['US'],
      languages: ['en'],
      status: 'active'
    });
    expect(cap.id).toMatch(/^cap-/);
    expect(cap.createdAt).toBeTruthy();
    expect(cap.updatedAt).toBeTruthy();
  });

  it('rejects registration without required fields', () => {
    expect(() => capabilityService.register({
      nexhaId: '',
      name: 'x',
      description: 'x',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    })).toThrow(/nexhaId/);
  });

  it('updates existing capability', async () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'Original',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    });
    // Wait at least 1ms so updatedAt timestamp differs
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = capabilityService.update(cap.id, { name: 'Renamed' });
    expect(updated?.name).toBe('Renamed');
    expect(updated?.id).toBe(cap.id); // id preserved
    expect(updated?.updatedAt > cap.updatedAt).toBe(true); // timestamp advanced
  });

  it('returns null when updating non-existent capability', () => {
    const result = capabilityService.update('cap-does-not-exist', { name: 'x' });
    expect(result).toBeNull();
  });

  it('deletes a capability', () => {
    const cap = capabilityService.register({
      nexhaId: 'nexha-test',
      name: 'ToDelete',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: false, kycLevel: 'none' },
      regions: [],
      languages: [],
      status: 'active'
    });
    expect(capabilityService.delete(cap.id)).toBe(true);
    expect(capabilityService.get(cap.id)).toBeNull();
    expect(capabilityService.delete(cap.id)).toBe(false);
  });
});

describe('Capability Service — match scoring', () => {
  beforeEach(() => {
    capabilityService.clear();
    capabilityService.seedDemoCapabilities();
  });

  it('returns all capabilities with no filters', () => {
    const result = capabilityService.match({});
    expect(result.total).toBeGreaterThan(0);
    expect(result.matches.length).toBeGreaterThan(0);
    // Sorted by score desc
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
    }
  });

  it('filters by category', () => {
    const result = capabilityService.match({ category: 'agent' });
    for (const m of result.matches) {
      expect(m.capability.category).toBe('agent');
    }
  });

  it('filters by nexhaId', () => {
    const result = capabilityService.match({ nexhaId: 'nexha-maya-collective' });
    for (const m of result.matches) {
      expect(m.capability.nexhaId).toBe('nexha-maya-collective');
    }
  });

  it('filters by region', () => {
    const result = capabilityService.match({ region: 'IN' });
    for (const m of result.matches) {
      expect(m.capability.regions).toContain('IN');
    }
  });

  it('filters by language', () => {
    const result = capabilityService.match({ language: 'hi' });
    for (const m of result.matches) {
      expect(m.capability.languages).toContain('hi');
    }
  });

  it('filters by verifiedOnly', () => {
    const result = capabilityService.match({ verifiedOnly: true });
    for (const m of result.matches) {
      expect(m.capability.trust.verified).toBe(true);
    }
  });

  it('filters by max price + currency', () => {
    const result = capabilityService.match({ maxPrice: 100, currency: 'USD' });
    for (const m of result.matches) {
      if (m.capability.pricing.amount !== undefined) {
        expect(m.capability.pricing.amount).toBeLessThanOrEqual(100);
        expect(m.capability.pricing.currency).toBe('USD');
      }
    }
  });

  it('free-text search boosts score', () => {
    const result = capabilityService.match({ q: 'fashion' });
    const top = result.matches[0];
    expect(top.capability.name.toLowerCase()).toContain('fashion') ||
           top.capability.description.toLowerCase().includes('fashion') ||
           top.capability.tags.some((t) => t.includes('fashion'));
  });

  it('tag overlap contributes to score', () => {
    const result = capabilityService.match({ tags: ['negotiation', 'procurement'] });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    // Tag overlap + verified bonus yields ~0.29
    expect(top.score).toBeGreaterThan(0.25);
  });

  it('reasons are explainable', () => {
    const result = capabilityService.match({
      category: 'agent',
      tags: ['negotiation'],
      region: 'IN',
      verifiedOnly: true
    });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    expect(top.reasons.length).toBeGreaterThan(0);
    expect(top.reasons.some((r) => r.startsWith('category:'))).toBe(true);
  });

  it('pagination works (limit + offset)', () => {
    const all = capabilityService.match({});
    expect(all.matches.length).toBeGreaterThan(2);
    const page1 = capabilityService.match({ limit: 2, offset: 0 });
    const page2 = capabilityService.match({ limit: 2, offset: 2 });
    expect(page1.matches.length).toBe(2);
    expect(page1.matches[0].capability.id).not.toBe(page2.matches[0].capability.id);
  });
});

describe('Capability Service — stats', () => {
  beforeEach(() => {
    capabilityService.clear();
    capabilityService.seedDemoCapabilities();
  });

  it('computes per-Nexha stats', () => {
    const stats = capabilityService.getNexhaStats('nexha-maya-collective');
    expect(stats.nexhaId).toBe('nexha-maya-collective');
    expect(stats.totalCapabilities).toBeGreaterThan(0);
    // Sum of categories should equal total
    const sum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalCapabilities);
  });

  it('computes federation-wide stats', () => {
    const stats = capabilityService.getFederationStats();
    expect(stats.nexhas).toBeGreaterThan(0);
    expect(stats.totalCapabilities).toBeGreaterThan(0);
    expect(stats.byNexha.length).toBe(stats.nexhas);
  });

  it('returns empty stats for unknown nexha', () => {
    const stats = capabilityService.getNexhaStats('nexha-does-not-exist');
    expect(stats.totalCapabilities).toBe(0);
  });
});