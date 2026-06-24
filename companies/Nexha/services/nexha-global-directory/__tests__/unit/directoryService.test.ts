/**
 * nexha-global-directory — Directory service unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import directoryService from '../../src/services/directoryService.js';

describe('Directory Service — seeding', () => {
  beforeEach(() => {
    directoryService.reset();
  });

  it('seeds demo listings on first call', () => {
    const stats = directoryService.seedDemo();
    expect(stats.listings).toBeGreaterThan(10);
    expect(stats.nexhas).toBeGreaterThan(3);
  });

  it('does not double-seed', () => {
    directoryService.seedDemo();
    const first = directoryService.getStats();
    directoryService.seedDemo();
    expect(directoryService.getStats().totalListings).toBe(first.totalListings);
  });

  it('seeds with mix of kinds (nexha, capability, opportunity, service, data-feed)', () => {
    directoryService.seedDemo();
    const stats = directoryService.getStats();
    expect(stats.byKind.nexha).toBeGreaterThan(0);
    expect(stats.byKind.capability).toBeGreaterThan(0);
    expect(stats.byKind.opportunity).toBeGreaterThan(0);
  });
});

describe('Directory Service — search', () => {
  beforeEach(() => {
    directoryService.reset();
    directoryService.seedDemo();
  });

  it('searches all listings with no filter', () => {
    const result = directoryService.search({});
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by kind', () => {
    const result = directoryService.search({ kind: 'opportunity' });
    for (const m of result.matches) {
      expect(m.listing.kind).toBe('opportunity');
    }
  });

  it('filters by category', () => {
    const result = directoryService.search({ category: 'agent' });
    for (const m of result.matches) {
      expect(m.listing.category).toBe('agent');
    }
  });

  it('filters by region', () => {
    const result = directoryService.search({ region: 'IN' });
    for (const m of result.matches) {
      expect(m.listing.region).toBe('IN');
    }
  });

  it('filters by language', () => {
    const result = directoryService.search({ language: 'hi' });
    for (const m of result.matches) {
      expect(m.listing.languages).toContain('hi');
    }
  });

  it('filters by nexhaId', () => {
    const result = directoryService.search({ nexhaId: 'nexha-maya-collective' });
    for (const m of result.matches) {
      expect(m.listing.nexhaId).toBe('nexha-maya-collective');
    }
  });

  it('filters by tags (ALL must match)', () => {
    const result = directoryService.search({ tags: ['fashion', 'negotiation'] });
    for (const m of result.matches) {
      expect(m.listing.tags).toContain('fashion');
      expect(m.listing.tags).toContain('negotiation');
    }
  });

  it('filters by minAciBand (gold = 800+)', () => {
    const result = directoryService.search({ minAciBand: 'gold' });
    for (const m of result.matches) {
      if (m.listing.aci !== null) {
        expect(m.listing.aci).toBeGreaterThanOrEqual(800);
      }
    }
  });

  it('excludes rogue restricted Nexha listings (verifiedOnly)', () => {
    const result = directoryService.search({ verifiedOnly: true });
    for (const m of result.matches) {
      if (m.listing.aci !== null) {
        expect(m.listing.aci).toBeGreaterThanOrEqual(700);
      }
    }
  });

  it('free-text search boosts matching listings', () => {
    const result = directoryService.search({ q: 'fashion' });
    expect(result.matches.length).toBeGreaterThan(0);
    // The fashion agent should be in top results
    const top = result.matches[0];
    const isFashion = top.listing.name.toLowerCase().includes('fashion') ||
                      top.listing.tags.some((t) => t.includes('fashion'));
    expect(isFashion).toBe(true);
  });

  it('exposes explainable reasons for every match', () => {
    const result = directoryService.search({ q: 'fashion', region: 'IN' });
    for (const m of result.matches) {
      expect(m.reasons.length).toBeGreaterThan(0);
    }
  });

  it('trustBoost=0 → no boost applied', () => {
    const noBoost = directoryService.search({ q: 'agent' }, 0);
    const boosted = directoryService.search({ q: 'agent' }, 0.5);
    // Top result after boost should have higher or equal score
    expect(boosted.matches[0].reasons.length).toBeGreaterThanOrEqual(noBoost.matches[0].reasons.length);
  });

  it('rogue restricted Nexha is demoted in fashion search', () => {
    const result = directoryService.search({ q: 'fashion' }, 0.5);
    const mayaIdx = result.matches.findIndex((m) => m.listing.nexhaId === 'nexha-maya-collective');
    const rogueIdx = result.matches.findIndex((m) => m.listing.nexhaId === 'nexha-rogue-supplier');
    if (mayaIdx >= 0 && rogueIdx >= 0) {
      expect(mayaIdx).toBeLessThan(rogueIdx);
    }
  });

  it('sort=trust orders by ACI desc', () => {
    const result = directoryService.search({}, 0);
    result.matches.sort((a, b) => (b.listing.aci ?? 0) - (a.listing.aci ?? 0));
    // Note: result.matches is already sorted by relevance by default
    // Test that trust sort works
    const trustResult = directoryService.search({ sort: 'trust' }, 0);
    for (let i = 1; i < trustResult.matches.length; i++) {
      expect((trustResult.matches[i - 1].listing.aci ?? 0))
        .toBeGreaterThanOrEqual(trustResult.matches[i].listing.aci ?? 0);
    }
  });

  it('sort=recent orders by updatedAt desc', () => {
    const result = directoryService.search({ sort: 'recent' }, 0);
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].listing.updatedAt >= result.matches[i].listing.updatedAt).toBe(true);
    }
  });

  it('pagination with limit + offset', () => {
    const all = directoryService.search({});
    const page1 = directoryService.search({ limit: 3, offset: 0 });
    const page2 = directoryService.search({ limit: 3, offset: 3 });
    expect(page1.matches.length).toBe(3);
    expect(page1.matches[0].listing.id).not.toBe(page2.matches[0].listing.id);
  });

  it('returns breakdown in result', () => {
    const result = directoryService.search({});
    expect(result.breakdown).toBeTruthy();
    expect(result.breakdown.byKind).toBeTruthy();
    expect(result.breakdown.byNexha).toBeTruthy();
    expect(result.breakdown.averageAci).toBeGreaterThanOrEqual(0);
  });
});

describe('Directory Service — listing CRUD', () => {
  beforeEach(() => {
    directoryService.reset();
  });

  it('upserts a new listing with generated id', () => {
    const listing = directoryService.upsertListing({
      kind: 'capability', name: 'Test Skill', description: 'Test',
      nexhaId: 'nexha-test', nexhaName: 'Test', nexhaTier: 'standard',
      tags: ['test'], category: 'agent', region: 'US', languages: ['en'],
      aci: 500, band: 'bronze', status: 'active'
    });
    expect(listing.id).toMatch(/^capability-/);
    expect(listing.createdAt).toBeTruthy();
  });

  it('updates existing listing on (kind, nexhaId, name) match', () => {
    const l1 = directoryService.upsertListing({
      kind: 'capability', name: 'X', description: 'v1', nexhaId: 'n-1', nexhaName: 'n', nexhaTier: 'standard',
      tags: [], category: 'service', region: 'US', languages: ['en'],
      aci: 500, band: 'bronze', status: 'active'
    });
    const l2 = directoryService.upsertListing({
      kind: 'capability', name: 'X', description: 'v2', nexhaId: 'n-1', nexhaName: 'n', nexhaTier: 'standard',
      tags: [], category: 'service', region: 'US', languages: ['en'],
      aci: 800, band: 'gold', status: 'active'
    });
    expect(l1.id).toBe(l2.id);
    expect(l2.description).toBe('v2');
    expect(l2.aci).toBe(800);
  });

  it('removes a listing', () => {
    const l = directoryService.upsertListing({
      kind: 'service', name: 'X', description: 'd', nexhaId: 'n', nexhaName: 'n', nexhaTier: 'standard',
      tags: [], category: 'service', region: 'US', languages: ['en'],
      aci: 500, band: 'bronze', status: 'active'
    });
    expect(directoryService.remove(l.id)).toBe(true);
    expect(directoryService.get(l.id)).toBeNull();
  });
});

describe('Directory Service — federation stats', () => {
  beforeEach(() => {
    directoryService.reset();
    directoryService.seedDemo();
  });

  it('computes federation-wide stats', () => {
    const stats = directoryService.getStats();
    expect(stats.totalListings).toBeGreaterThan(0);
    expect(stats.totalNexhas).toBeGreaterThan(0);
    expect(stats.averageAci).toBeGreaterThan(0);
  });

  it('groups by kind sums to total', () => {
    const stats = directoryService.getStats();
    const kindSum = Object.values(stats.byKind).reduce((s, n) => s + n, 0);
    expect(kindSum).toBe(stats.totalListings);
  });

  it('groups by status sums to total', () => {
    const stats = directoryService.getStats();
    const statusSum = Object.values(stats.byStatus).reduce((s, n) => s + n, 0);
    expect(statusSum).toBe(stats.totalListings);
  });

  it('top nexhas sorted by count', () => {
    const stats = directoryService.getStats();
    for (let i = 1; i < stats.byNexha.length; i++) {
      expect(stats.byNexha[i - 1].count).toBeGreaterThanOrEqual(stats.byNexha[i].count);
    }
  });

  it('tracks verified percentage', () => {
    const stats = directoryService.getStats();
    expect(stats.verifiedPercentage).toBeGreaterThan(0);
    expect(stats.verifiedPercentage).toBeLessThanOrEqual(100);
  });
});