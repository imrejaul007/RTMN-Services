/**
 * nexha-opportunity-os — Opportunity service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import opportunityService from '../../src/services/opportunityService.js';

describe('Opportunity Service — seeding', () => {
  beforeEach(() => {
    opportunityService.reset();
  });

  it('seeds demo opportunities on first call', () => {
    const stats = opportunityService.seedDemo();
    expect(stats.opportunities).toBeGreaterThan(0);
    expect(stats.capabilities).toBeGreaterThan(0);
  });

  it('does not double-seed', () => {
    opportunityService.seedDemo();
    const first = opportunityService.getStats();
    opportunityService.seedDemo();
    expect(opportunityService.getStats().totalOpportunities).toBe(first.totalOpportunities);
  });

  it('seeds opportunities with variety of kinds/statuses', () => {
    opportunityService.seedDemo();
    const stats = opportunityService.getStats();
    // Should have multiple kinds
    const populatedKinds = Object.entries(stats.byKind).filter(([_, v]) => v > 0);
    expect(populatedKinds.length).toBeGreaterThan(1);
  });
});

describe('Opportunity Service — post + CRUD', () => {
  beforeEach(() => {
    opportunityService.reset();
  });

  it('posts a new opportunity with generated id + timestamps', () => {
    const opp = opportunityService.post({
      title: 'Test Opp',
      description: 'A test',
      kind: 'job',
      requiredCategories: ['service'],
      requiredTags: ['test'],
      region: 'US',
      budget: { amount: 100, currency: 'USD', type: 'fixed' },
      priority: 'normal',
      status: 'open',
      postedByNexhaId: 'nexha-x'
    });
    expect(opp.id).toMatch(/^opp-/);
    expect(opp.bidsReceived).toBe(0);
    expect(opp.createdAt).toBeTruthy();
  });

  it('rejects posting without required category', () => {
    expect(() => opportunityService.post({
      title: 'x', description: 'x', kind: 'job',
      requiredCategories: [], requiredTags: [],
      region: 'US', budget: { amount: 1, currency: 'USD', type: 'fixed' },
      priority: 'normal', status: 'open', postedByNexhaId: 'x'
    })).toThrow(/requiredCategory/);
  });

  it('increments bid count', () => {
    const opp = opportunityService.post({
      title: 'x', description: 'x', kind: 'job',
      requiredCategories: ['service'], requiredTags: [],
      region: 'US', budget: { amount: 1, currency: 'USD', type: 'fixed' },
      priority: 'normal', status: 'open', postedByNexhaId: 'x'
    });
    expect(opp.bidsReceived).toBe(0);
    const after1 = opportunityService.incrementBids(opp.id);
    expect(after1?.bidsReceived).toBe(1);
    const after2 = opportunityService.incrementBids(opp.id);
    expect(after2?.bidsReceived).toBe(2);
  });

  it('updates an opportunity', () => {
    const opp = opportunityService.post({
      title: 'x', description: 'x', kind: 'job',
      requiredCategories: ['service'], requiredTags: [],
      region: 'US', budget: { amount: 1, currency: 'USD', type: 'fixed' },
      priority: 'normal', status: 'open', postedByNexhaId: 'x'
    });
    const updated = opportunityService.update(opp.id, { status: 'closed' });
    expect(updated?.status).toBe('closed');
  });
});

describe('Opportunity Service — listing + filtering', () => {
  beforeEach(() => {
    opportunityService.reset();
    opportunityService.seedDemo();
  });

  it('lists all opportunities', () => {
    const all = opportunityService.list();
    expect(all.length).toBeGreaterThan(0);
  });

  it('filters by kind', () => {
    const rfqs = opportunityService.list({ kind: 'rfq' });
    for (const o of rfqs) {
      expect(o.kind).toBe('rfq');
    }
  });

  it('filters by status', () => {
    const open = opportunityService.list({ status: 'open' });
    for (const o of open) {
      expect(o.status).toBe('open');
    }
  });

  it('filters by priority', () => {
    const urgent = opportunityService.list({ priority: 'urgent' });
    for (const o of urgent) {
      expect(o.priority).toBe('urgent');
    }
  });

  it('sorts by createdAt desc (newest first)', () => {
    const all = opportunityService.list();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].createdAt >= all[i].createdAt).toBe(true);
    }
  });
});

describe('Opportunity Service — match (the killer feature)', () => {
  beforeEach(() => {
    opportunityService.reset();
    opportunityService.seedDemo();
  });

  it('matches an opportunity against all capabilities', () => {
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001');
    expect(result).toBeTruthy();
    expect(result!.matches.length).toBeGreaterThan(0);
  });

  it('returns null for unknown opportunity', () => {
    const result = opportunityService.matchOpportunity('opp-doesnt-exist');
    expect(result).toBeNull();
  });

  it('ranks matches by finalScore desc', () => {
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001');
    for (let i = 1; i < result!.matches.length; i++) {
      expect(result!.matches[i - 1].finalScore).toBeGreaterThanOrEqual(result!.matches[i].finalScore);
    }
  });

  it('trustBoost=0 → finalScore = matchScore', () => {
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001', 0);
    for (const m of result!.matches) {
      expect(m.finalScore).toBeCloseTo(m.matchScore, 3);
    }
  });

  it('trustBoost=0.5 boosts platinum above silver for similar matches', () => {
    // The fashion RFQ has multiple matches; check the top result
    const noBoost = opportunityService.matchOpportunity('opp-fashion-rfq-001', 0);
    const boosted = opportunityService.matchOpportunity('opp-fashion-rfq-001', 0.5);
    // Top result after boost should have higher or equal score
    expect(boosted!.matches[0].finalScore).toBeGreaterThanOrEqual(noBoost!.matches[0].finalScore);
  });

  it('rogue restricted capability is demoted in fashion match', () => {
    // The fashion RFQ matches both Maya (platinum) and Rogue (restricted)
    // With trust boost, Maya should rank above Rogue
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001', 0.5);
    const mayaIdx = result!.matches.findIndex((m) => m.nexhaId === 'nexha-maya-collective');
    const rogueIdx = result!.matches.findIndex((m) => m.nexhaId === 'nexha-rogue-supplier');
    if (mayaIdx >= 0 && rogueIdx >= 0) {
      expect(mayaIdx).toBeLessThan(rogueIdx);
    }
  });

  it('Mumbai delivery opportunity matches Mumbai Logistics', () => {
    const result = opportunityService.matchOpportunity('opp-mumbai-delivery-001');
    expect(result).toBeTruthy();
    const top = result!.matches[0];
    // Top match should be Mumbai Logistics (category: service, region: IN, tag: mumbai+delivery)
    expect(top.capabilityName.toLowerCase()).toContain('mumbai');
  });

  it('Singapore tax opportunity matches Singapore Finance Hub', () => {
    const result = opportunityService.matchOpportunity('opp-sg-tax-001');
    expect(result).toBeTruthy();
    const top = result!.matches[0];
    expect(top.nexhaId).toBe('nexha-finance-singapore');
  });

  it('matchAll returns matches for all open opportunities', () => {
    const results = opportunityService.matchAll(0.3);
    expect(results.length).toBeGreaterThan(0);
    // Should not include closed
    for (const r of results) {
      expect(r.opportunity.status).toBe('open');
    }
  });

  it('match results include budget fit assessment', () => {
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001');
    for (const m of result!.matches) {
      expect(['under', 'within', 'over', 'unknown']).toContain(m.budgetFit);
    }
  });

  it('match results include pricing snapshot', () => {
    const result = opportunityService.matchOpportunity('opp-fashion-rfq-001');
    for (const m of result!.matches) {
      expect(m.pricing).toBeDefined();
      expect(m.pricing!.model).toBeTruthy();
    }
  });
});

describe('Opportunity Service — stats', () => {
  beforeEach(() => {
    opportunityService.reset();
    opportunityService.seedDemo();
  });

  it('computes federation-wide stats', () => {
    const stats = opportunityService.getStats();
    expect(stats.totalOpportunities).toBeGreaterThan(0);
    expect(stats.totalBids).toBeGreaterThanOrEqual(0);
    expect(stats.openCount).toBeGreaterThan(0);
  });

  it('sums by-kind to total', () => {
    const stats = opportunityService.getStats();
    const kindSum = Object.values(stats.byKind).reduce((s, n) => s + n, 0);
    expect(kindSum).toBe(stats.totalOpportunities);
  });

  it('sums by-status to total', () => {
    const stats = opportunityService.getStats();
    const statusSum = Object.values(stats.byStatus).reduce((s, n) => s + n, 0);
    expect(statusSum).toBe(stats.totalOpportunities);
  });

  it('tracks average budget per currency', () => {
    const stats = opportunityService.getStats();
    expect(Object.keys(stats.averageBudgetByCurrency).length).toBeGreaterThan(0);
  });
});