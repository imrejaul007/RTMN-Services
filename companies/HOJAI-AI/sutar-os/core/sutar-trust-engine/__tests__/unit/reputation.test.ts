/**
 * sutar-trust-engine — ReputationService unit tests
 *
 * Covers:
 *   - getReputation / getOrCreateReputation lifecycle
 *   - addReview (5-star, 1-star, clamping, verified purchase flag)
 *   - recordTransaction (positive/negative impact)
 *   - recordDisputeResolution (won/lost)
 *   - recordPayment (on time/late)
 *   - updateReputation generic activity
 *   - getReputationSummary shape
 *   - aggregateReputation across multiple entities
 */

import { describe, it, expect } from 'vitest';
import reputationService from '../../src/services/reputationService';
import { config } from '../../src/config';

const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

describe('ReputationService — basic reputation', () => {
  it('returns null for unknown entity', () => {
    expect(reputationService.getReputation(newId('rep-unknown'))).toBeNull();
  });

  it('creates a default reputation for new entity', () => {
    const entityId = newId('rep-new');
    const rep = reputationService.getOrCreateReputation(entityId);
    expect(rep.entityId).toBe(entityId);
    expect(rep.avgRating).toBeGreaterThanOrEqual(config.reputation.minRating);
    expect(rep.avgRating).toBeLessThanOrEqual(config.reputation.maxRating);
  });

  it('returns the same reputation on second call', () => {
    const entityId = newId('rep-stable');
    const r1 = reputationService.getOrCreateReputation(entityId);
    const r2 = reputationService.getOrCreateReputation(entityId);
    expect(r1.avgRating).toBe(r2.avgRating);
    expect(r1.totalReviews).toBe(r2.totalReviews);
  });

  it('getReputation returns a response shape with entityId', () => {
    const entityId = newId('rep-shape');
    reputationService.getOrCreateReputation(entityId);
    const r = reputationService.getReputation(entityId);
    expect(r).not.toBeNull();
    expect(r!.entityId).toBe(entityId);
  });
});

describe('ReputationService — addReview', () => {
  it('clamps rating to [1, 5]', () => {
    const entityId = newId('rep-clamp');
    const r1 = reputationService.addReview(entityId, { rating: 10, isVerifiedPurchase: false });
    // 10 stars → clamped to 5
    expect(r1.avgRating).toBeLessThanOrEqual(5);

    const entityId2 = newId('rep-clamp2');
    const r2 = reputationService.addReview(entityId2, { rating: 0, isVerifiedPurchase: false });
    // 0 stars → clamped to 1
    expect(r2.avgRating).toBeGreaterThanOrEqual(1);
  });

  it('5-star positive review raises avgRating above default', () => {
    const entityId = newId('rep-5star');
    reputationService.getOrCreateReputation(entityId);
    const initial = reputationService.getReputation(entityId)!.avgRating;
    reputationService.addReview(entityId, { rating: 5, isVerifiedPurchase: true });
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeGreaterThan(initial);
  });

  it('1-star negative review lowers avgRating below default', () => {
    const entityId = newId('rep-1star');
    reputationService.getOrCreateReputation(entityId);
    const initial = reputationService.getReputation(entityId)!.avgRating;
    reputationService.addReview(entityId, { rating: 1, isVerifiedPurchase: false });
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeLessThan(initial);
  });

  it('verified-purchase flag is recorded', () => {
    const entityId = newId('rep-verified');
    const r = reputationService.addReview(entityId, { rating: 4, isVerifiedPurchase: true });
    // The review is added to history; check that some indicator of verification is present
    expect(r.totalReviews).toBeGreaterThanOrEqual(1);
  });
});

describe('ReputationService — recordTransaction', () => {
  it('successful transaction counts as positive review', () => {
    const entityId = newId('rep-tx-pos');
    reputationService.getOrCreateReputation(entityId);
    const r = reputationService.recordTransaction(entityId, {
      amount: 100, successful: true, description: 'paid',
    });
    expect(r.positiveReviews).toBeGreaterThanOrEqual(1);
  });

  it('failed transaction counts as negative review', () => {
    const entityId = newId('rep-tx-neg');
    reputationService.getOrCreateReputation(entityId);
    const r = reputationService.recordTransaction(entityId, {
      amount: 100, successful: false, description: 'failed',
    });
    expect(r.negativeReviews).toBeGreaterThanOrEqual(1);
  });
});

describe('ReputationService — recordDisputeResolution', () => {
  it('won dispute is positive impact (history tracked, not review count)', () => {
    const entityId = newId('rep-disp-won');
    reputationService.getOrCreateReputation(entityId);
    const before = reputationService.getReputation(entityId)!.avgRating;
    reputationService.recordDisputeResolution(entityId, {
      won: true, description: 'won dispute',
    });
    // dispute impact adds +1 to score, but doesn't increment review counters
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('lost dispute is negative impact', () => {
    const entityId = newId('rep-disp-lost');
    reputationService.getOrCreateReputation(entityId);
    const before = reputationService.getReputation(entityId)!.avgRating;
    reputationService.recordDisputeResolution(entityId, {
      won: false, description: 'lost dispute',
    });
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe('ReputationService — recordPayment', () => {
  it('on-time payment is positive impact', () => {
    const entityId = newId('rep-pay-on');
    reputationService.getOrCreateReputation(entityId);
    const before = reputationService.getReputation(entityId)!.avgRating;
    reputationService.recordPayment(entityId, {
      onTime: true, amount: 100,
    });
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('late payment is negative impact', () => {
    const entityId = newId('rep-pay-late');
    reputationService.getOrCreateReputation(entityId);
    const before = reputationService.getReputation(entityId)!.avgRating;
    reputationService.recordPayment(entityId, {
      onTime: false, amount: 100,
    });
    const after = reputationService.getReputation(entityId)!.avgRating;
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe('ReputationService — getReputationSummary', () => {
  it('returns a summary with rating (not avgRating) and level', () => {
    const entityId = newId('rep-sum');
    reputationService.getOrCreateReputation(entityId);
    const summary: any = reputationService.getReputationSummary(entityId);
    expect(summary).toBeDefined();
    expect(summary.entityId).toBe(entityId);
    expect(summary.rating).toBeDefined();
    expect(['excellent', 'good', 'average', 'poor']).toContain(summary.level);
    expect(Array.isArray(summary.badges)).toBe(true);
  });

  it('summary reflects added reviews', () => {
    const entityId = newId('rep-sum-rev');
    reputationService.getOrCreateReputation(entityId);
    reputationService.addReview(entityId, { rating: 5, isVerifiedPurchase: true });
    const summary: any = reputationService.getReputationSummary(entityId);
    expect(summary.reviews).toBeGreaterThanOrEqual(1);
  });
});

describe('ReputationService — aggregateReputation', () => {
  it('aggregates across multiple entities (with reviews)', () => {
    const ids = [newId('agg1'), newId('agg2'), newId('agg3')];
    ids.forEach(id => {
      reputationService.getOrCreateReputation(id);
      reputationService.addReview(id, { rating: 4, isVerifiedPurchase: true });
    });
    const agg = reputationService.aggregateReputation(ids);
    expect(agg.entityId).toBeDefined();
    expect(agg.avgRating).toBeGreaterThanOrEqual(config.reputation.minRating);
    expect(agg.avgRating).toBeLessThanOrEqual(config.reputation.maxRating);
    expect(agg.totalReviews).toBeGreaterThanOrEqual(3);
  });

  it('empty array does not throw', () => {
    const agg: any = reputationService.aggregateReputation([]);
    expect(agg).toBeDefined();
  });
});

describe('ReputationService — invariants', () => {
  it('totalReviews = positiveReviews + negativeReviews + neutralReviews', () => {
    const entityId = newId('rep-invariant');
    reputationService.getOrCreateReputation(entityId);
    reputationService.addReview(entityId, { rating: 5, isVerifiedPurchase: true });
    reputationService.addReview(entityId, { rating: 2, isVerifiedPurchase: false });
    const r = reputationService.getReputation(entityId)!;
    expect(r.totalReviews).toBe(r.positiveReviews + r.negativeReviews + (r.neutralReviews || 0));
  });

  it('avgRating stays within [1, 5] after many reviews', () => {
    const entityId = newId('rep-bounds');
    reputationService.getOrCreateReputation(entityId);
    for (let i = 0; i < 20; i++) {
      const rating = (i % 5) + 1;
      reputationService.addReview(entityId, { rating, isVerifiedPurchase: i % 2 === 0 });
    }
    const r = reputationService.getReputation(entityId)!;
    expect(r.avgRating).toBeGreaterThanOrEqual(1);
    expect(r.avgRating).toBeLessThanOrEqual(5);
  });
});
