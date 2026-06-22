/**
 * sutar-trust-engine — Reputation service unit tests
 */

import { describe, it, expect } from 'vitest';
import reputationService from '../../src/services/reputationService';

describe('ReputationService — basic reputation', () => {
  it('returns null for unknown entity', () => {
    const r = reputationService.getReputation(`unknown-${Date.now()}-${Math.random()}`);
    expect(r).toBeNull();
  });

  it('creates a default reputation for new entity', () => {
    const entityId = `rep-${Date.now()}-${Math.random()}`;
    const rep = reputationService.getOrCreateReputation(entityId);
    expect(rep.entityId).toBe(entityId);
    expect(rep.avgRating).toBeGreaterThanOrEqual(0);
    expect(rep.avgRating).toBeLessThanOrEqual(5);
  });

  it('returns the same reputation on second call', () => {
    const entityId = `rep-same-${Date.now()}-${Math.random()}`;
    const r1 = reputationService.getOrCreateReputation(entityId);
    const r2 = reputationService.getOrCreateReputation(entityId);
    expect(r1.avgRating).toBe(r2.avgRating);
    expect(r1.totalReviews).toBe(r2.totalReviews);
  });

  it('returns a summary for an entity', () => {
    const entityId = `rep-summary-${Date.now()}-${Math.random()}`;
    reputationService.getOrCreateReputation(entityId);
    const summary = reputationService.getReputationSummary(entityId);
    expect(summary).toBeDefined();
    expect(summary.entityId).toBe(entityId);
  });

  it('aggregates multiple entity reputations', () => {
    const ids = [
      `agg1-${Date.now()}-${Math.random()}`,
      `agg2-${Date.now()}-${Math.random()}`,
    ];
    reputationService.getOrCreateReputation(ids[0]);
    reputationService.getOrCreateReputation(ids[1]);
    const agg = reputationService.aggregateReputation(ids);
    expect(agg.entityId).toBeDefined();
    expect(agg.avgRating).toBeGreaterThanOrEqual(0);
    expect(agg.avgRating).toBeLessThanOrEqual(5);
  });
});
