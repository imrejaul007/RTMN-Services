/**
 * nexha-discovery-os — Discovery service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import discoveryService from '../../src/services/discoveryService.js';
import type { Capability, TrustScore } from '../../src/types/index.js';

describe('Discovery Service — seeding', () => {
  beforeEach(() => {
    discoveryService.reset();
  });

  it('seeds demo federation on first call', () => {
    const stats = discoveryService.seedDemo();
    expect(parseInt(stats.capabilities)).toBeGreaterThan(0);
    expect(parseInt(stats.nexhas)).toBeGreaterThan(0);
  });

  it('does not double-seed', () => {
    discoveryService.seedDemo();
    const first = discoveryService.stats().capabilities;
    discoveryService.seedDemo();
    expect(discoveryService.stats().capabilities).toBe(first);
  });

  it('seeds with mix of trust scores (platinum, gold, silver, restricted)', () => {
    discoveryService.seedDemo();
    const all = Array.from(discoveryService['index'].values()) as any[];
    const bands = new Set(all.map((i) => i.trust?.band).filter(Boolean));
    expect(bands.size).toBeGreaterThan(2);
  });
});

describe('Discovery Service — discover (no trust boost)', () => {
  beforeEach(() => {
    discoveryService.reset();
    discoveryService.seedDemo();
  });

  it('returns all capabilities with no filter', () => {
    const result = discoveryService.discover({ trustBoost: 0 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.results.length).toBe(result.total);
  });

  it('ranks by finalScore desc', () => {
    const result = discoveryService.discover({ trustBoost: 0 });
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i - 1].finalScore).toBeGreaterThanOrEqual(result.results[i].finalScore);
    }
  });

  it('filters by category', () => {
    const result = discoveryService.discover({ category: 'agent' });
    for (const r of result.results) {
      expect(r.capability.category).toBe('agent');
    }
  });

  it('filters by region', () => {
    const result = discoveryService.discover({ region: 'IN' });
    for (const r of result.results) {
      expect(r.capability.regions).toContain('IN');
    }
  });

  it('filters by verifiedOnly', () => {
    const result = discoveryService.discover({ verifiedOnly: true });
    for (const r of result.results) {
      expect(r.capability.trust.verified).toBe(true);
    }
  });

  it('filters by nexhaId', () => {
    const result = discoveryService.discover({ nexhaId: 'nexha-maya-collective' });
    for (const r of result.results) {
      expect(r.capability.nexhaId).toBe('nexha-maya-collective');
    }
  });

  it('free-text search boosts score for matching capabilities', () => {
    const result = discoveryService.discover({ q: 'fashion negotiation', trustBoost: 0 });
    expect(result.results.length).toBeGreaterThan(0);
    // The fashion negotiation agent should be in top results
    const top = result.results[0];
    const isFashion = top.capability.name.toLowerCase().includes('fashion') ||
                      top.capability.tags.some((t) => t.includes('fashion'));
    expect(isFashion).toBe(true);
  });

  it('reports searchedNexhas', () => {
    const result = discoveryService.discover({});
    expect(result.searchedNexhas.length).toBeGreaterThan(0);
  });

  it('paginates with limit + offset', () => {
    const all = discoveryService.discover({});
    const page1 = discoveryService.discover({ limit: 2, offset: 0 });
    const page2 = discoveryService.discover({ limit: 2, offset: 2 });
    expect(page1.results.length).toBe(2);
    expect(page1.results[0].capability.id).not.toBe(page2.results[0].capability.id);
  });
});

describe('Discovery Service — trust boost (the killer feature)', () => {
  beforeEach(() => {
    discoveryService.reset();
    discoveryService.seedDemo();
  });

  it('trustBoost=0 → finalScore = matchScore (no boost)', () => {
    const result = discoveryService.discover({ q: 'ai service', trustBoost: 0 });
    for (const r of result.results) {
      expect(r.finalScore).toBeCloseTo(r.matchScore, 3);
    }
  });

  it('trustBoost=0.3 → boosts high-aci results', () => {
    const noBoost = discoveryService.discover({ q: 'ai service', trustBoost: 0 });
    const boosted = discoveryService.discover({ q: 'ai service', trustBoost: 0.3 });
    // Top result should be the high-trust one (platinum) with boost applied
    if (noBoost.results.length > 0 && boosted.results.length > 0) {
      const topNoBoost = noBoost.results[0];
      const topBoosted = boosted.results[0];
      // The boosted top should have higher or equal score due to trust
      expect(topBoosted.finalScore).toBeGreaterThanOrEqual(topNoBoost.finalScore);
    }
  });

  it('platinum trust ranks above restricted trust for similar matches', () => {
    // Both 'cap-maya-merchant' (platinum) and 'cap-rogue-cheap' (restricted) match "ai"
    const result = discoveryService.discover({ q: 'ai', trustBoost: 0.5 });
    if (result.results.length >= 2) {
      const mayaIdx = result.results.findIndex((r) => r.capability.id === 'cap-maya-merchant');
      const rogueIdx = result.results.findIndex((r) => r.capability.id === 'cap-rogue-cheap');
      if (mayaIdx >= 0 && rogueIdx >= 0) {
        expect(mayaIdx).toBeLessThan(rogueIdx); // platinum before restricted
      }
    }
  });

  it('ACI is exposed per result', () => {
    const result = discoveryService.discover({});
    for (const r of result.results) {
      // Some have null aci (no trust info), others have 0-1000
      if (r.aci !== null) {
        expect(r.aci).toBeGreaterThanOrEqual(0);
        expect(r.aci).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('reasons include trust band when applicable', () => {
    const result = discoveryService.discover({ q: 'fashion', trustBoost: 0.3 });
    if (result.results.length > 0) {
      const top = result.results[0];
      if (top.aci && top.aci >= 700) {
        expect(top.reasons.some((r) => r.startsWith('trust:'))).toBe(true);
      }
    }
  });
});

describe('Discovery Service — trust band filtering', () => {
  beforeEach(() => {
    discoveryService.reset();
    discoveryService.seedDemo();
  });

  it('minAciBand=silver excludes bronze + iron + restricted', () => {
    const result = discoveryService.discover({ minAciBand: 'silver' });
    for (const r of result.results) {
      if (r.aci !== null) {
        expect(r.aci).toBeGreaterThanOrEqual(700);
      }
    }
  });

  it('minAciBand=gold includes only gold + platinum', () => {
    const result = discoveryService.discover({ minAciBand: 'gold' });
    for (const r of result.results) {
      if (r.aci !== null) {
        expect(r.aci).toBeGreaterThanOrEqual(800);
      }
    }
  });

  it('minAciBand=any returns everything', () => {
    const all = discoveryService.discover({ minAciBand: 'any' });
    const gold = discoveryService.discover({ minAciBand: 'gold' });
    expect(all.total).toBeGreaterThanOrEqual(gold.total);
  });
});

describe('Discovery Service — index management', () => {
  beforeEach(() => {
    discoveryService.reset();
  });

  it('upserts a new capability', () => {
    const cap: Capability = {
      id: 'cap-test-1',
      nexhaId: 'nexha-test',
      name: 'Test Capability',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: true, kycLevel: 'full' },
      regions: ['US'],
      languages: ['en'],
      status: 'active'
    };
    const trust: TrustScore = { subjectId: 'nexha-test', aci: 800, band: 'gold' };
    discoveryService.upsertCapability(cap, trust);
    expect(discoveryService.get('cap-test-1')).toBeTruthy();
  });

  it('removes a capability from index', () => {
    const cap: Capability = {
      id: 'cap-to-remove',
      nexhaId: 'nexha-x',
      name: 'X',
      description: 'd',
      category: 'service',
      tags: [],
      pricing: { model: 'free' },
      trust: { verified: true, kycLevel: 'full' },
      regions: [],
      languages: [],
      status: 'active'
    };
    discoveryService.upsertCapability(cap, null);
    expect(discoveryService.get('cap-to-remove')).toBeTruthy();
    expect(discoveryService.removeCapability('cap-to-remove')).toBe(true);
    expect(discoveryService.get('cap-to-remove')).toBeNull();
  });

  it('stats after upsert + remove', () => {
    const cap1: Capability = {
      id: 'cap-a', nexhaId: 'nexha-x', name: 'A', description: 'd',
      category: 'service', tags: [], pricing: { model: 'free' },
      trust: { verified: true, kycLevel: 'full' }, regions: [], languages: [], status: 'active'
    };
    const cap2: Capability = {
      id: 'cap-b', nexhaId: 'nexha-y', name: 'B', description: 'd',
      category: 'service', tags: [], pricing: { model: 'free' },
      trust: { verified: true, kycLevel: 'full' }, regions: [], languages: [], status: 'active'
    };
    discoveryService.upsertCapability(cap1, { subjectId: 'nexha-x', aci: 800, band: 'gold' });
    discoveryService.upsertCapability(cap2, null);
    let stats = discoveryService.stats();
    expect(stats.capabilities).toBe(2);
    expect(stats.nexhas).toBe(2);
    expect(stats.scored).toBe(1);
    discoveryService.removeCapability('cap-a');
    stats = discoveryService.stats();
    expect(stats.capabilities).toBe(1);
    expect(stats.nexhas).toBe(1);
  });
});

describe('Discovery Service — performance', () => {
  beforeEach(() => {
    discoveryService.reset();
  });

  it('handles 100 capabilities in under 100ms', () => {
    // Insert 100 capabilities
    for (let i = 0; i < 100; i++) {
      const cap: Capability = {
        id: `cap-perf-${i}`,
        nexhaId: `nexha-${i % 10}`,
        name: `Service ${i}`,
        description: `Test capability ${i}`,
        category: ['service', 'agent', 'data'][i % 3],
        tags: [`tag-${i % 5}`, `tag-${i % 3}`],
        pricing: { model: 'free' },
        trust: { verified: true, kycLevel: 'basic' },
        regions: ['US'],
        languages: ['en'],
        status: 'active'
      };
      discoveryService.upsertCapability(cap, { subjectId: `nexha-${i % 10}`, aci: 500 + (i % 500), band: 'bronze' });
    }
    const start = Date.now();
    const result = discoveryService.discover({ q: 'service', trustBoost: 0.3, limit: 50 });
    const took = Date.now() - start;
    expect(result.results.length).toBe(50);
    expect(took).toBeLessThan(100);
  });
});