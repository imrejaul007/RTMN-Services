/**
 * SUTAR Negotiation Engine - ZOPA Algorithm Unit Tests
 */

import {
  computeZOPA,
  generateBuyerCounter,
  generateSellerCounter,
  buildConcessionSchedule,
  STRATEGY_PRESETS,
  diagnostics,
} from '../../src/services/zopa.service.js';

describe('computeZOPA', () => {
  it('returns overlap when buyerMax > sellerMin', () => {
    const result = computeZOPA({ buyerMax: 100, sellerMin: 60 });
    expect(result.hasOverlap).toBe(true);
    expect(result.zopaLow).toBe(60);
    expect(result.zopaHigh).toBe(100);
    expect(result.zopaWidth).toBe(40);
    expect(result.zopaMidpoint).toBe(80);
  });

  it('returns no overlap when buyerMax <= sellerMin', () => {
    const result = computeZOPA({ buyerMax: 50, sellerMin: 60 });
    expect(result.hasOverlap).toBe(false);
    expect(result.zopaWidth).toBe(-10);
    expect(result.noOverlapReason).toBe('buyer_below_seller');
  });

  it('treats equal values as no overlap', () => {
    const result = computeZOPA({ buyerMax: 100, sellerMin: 100 });
    expect(result.hasOverlap).toBe(false);
  });

  it('handles tight ZOPA (1 unit gap)', () => {
    const result = computeZOPA({ buyerMax: 101, sellerMin: 100 });
    expect(result.hasOverlap).toBe(true);
    expect(result.zopaWidth).toBe(1);
    expect(result.zopaMidpoint).toBe(100.5);
  });

  it('handles wide ZOPA (huge gap)', () => {
    const result = computeZOPA({ buyerMax: 1000, sellerMin: 10 });
    expect(result.zopaWidth).toBe(990);
  });

  it('throws on non-positive values', () => {
    expect(() => computeZOPA({ buyerMax: 0, sellerMin: 50 })).toThrow();
    expect(() => computeZOPA({ buyerMax: 100, sellerMin: -1 })).toThrow();
  });
});

describe('generateBuyerCounter', () => {
  it('recommends accept when offer is within budget', () => {
    const result = generateBuyerCounter({
      currentOffer: 80,
      buyerMax: 100,
      sellerMin: 60,
    });
    expect(result.reasoning).toContain('Recommend accept');
    expect(result.amount).toBe(80);
    expect(result.isWithinZOPA).toBe(true);
    expect(result.shouldWalkAway).toBe(false);
  });

  it('generates a counter within ZOPA when offer exceeds budget', () => {
    const result = generateBuyerCounter({
      currentOffer: 150,
      buyerMax: 100,
      sellerMin: 60,
      round: 1,
    });
    expect(result.amount).toBeLessThan(150);
    expect(result.amount).toBeGreaterThanOrEqual(60);
    expect(result.isWithinZOPA).toBe(true);
    expect(result.reasoning).toContain('Round 1');
  });

  it('concessions decay across rounds (collaborative)', () => {
    // Set up a scenario where buyerMax < currentOffer (so we go through the counter branch)
    // and the counter doesn't saturate at buyerMax.
    // currentOffer=120, buyerMax=110, sellerMin=50.
    // r1 (collaborative, decay=1): 50% concession of gap 70 = 35, counter = 85 (within ZOPA, doesn't saturate).
    // r3 (decay=0.6^2=0.36): 18% concession of 70 = 12.6, counter = 107.4.
    // So r3.amount > r1.amount AND r3.concessionFraction < r1.concessionFraction.
    const r1 = generateBuyerCounter({ currentOffer: 120, buyerMax: 110, sellerMin: 50, strategy: 'collaborative', round: 1 });
    const r3 = generateBuyerCounter({ currentOffer: 120, buyerMax: 110, sellerMin: 50, strategy: 'collaborative', round: 3 });
    // Round 3 makes a smaller concession, so its counter is closer to current offer
    expect(r3.amount).toBeGreaterThan(r1.amount);
    expect(r3.concessionFraction).toBeLessThan(r1.concessionFraction);
  });

  it('recommends walk-away when no ZOPA', () => {
    const result = generateBuyerCounter({
      currentOffer: 150,
      buyerMax: 50,
      sellerMin: 80,
    });
    expect(result.shouldWalkAway).toBe(true);
    expect(result.isWithinZOPA).toBe(false);
    expect(result.reasoning).toContain('No zone of possible agreement');
  });

  it('walks away after max rounds (compromising strategy, max 5)', () => {
    const r6 = generateBuyerCounter({
      currentOffer: 150,
      buyerMax: 100,
      sellerMin: 60,
      strategy: 'compromising',
      round: 6,
    });
    expect(r6.shouldWalkAway).toBe(true);
    expect(r6.reasoning).toContain('Exceeded max rounds');
  });

  it('competitive strategy is more aggressive (less initial concession)', () => {
    // With a wide gap, all strategies counter close to buyerMax; competitive
    // gives a smaller initial concession, so its counter is higher (closer to
    // seller's offer) but still capped at buyerMax.
    const comp = generateBuyerCounter({ currentOffer: 200, buyerMax: 100, sellerMin: 60, strategy: 'competitive', round: 1 });
    const col = generateBuyerCounter({ currentOffer: 200, buyerMax: 100, sellerMin: 60, strategy: 'collaborative', round: 1 });
    // When capped, both may equal buyerMax; in that case, check the raw
    // concessionFraction which IS different.
    if (comp.amount === col.amount) {
      expect(comp.concessionFraction).toBeLessThan(col.concessionFraction);
    } else {
      expect(comp.amount).toBeGreaterThanOrEqual(col.amount);
    }
  });

  it('accommodating strategy is more generous (larger initial concession)', () => {
    const acc = generateBuyerCounter({ currentOffer: 200, buyerMax: 100, sellerMin: 60, strategy: 'accommodating', round: 1 });
    const col = generateBuyerCounter({ currentOffer: 200, buyerMax: 100, sellerMin: 60, strategy: 'collaborative', round: 1 });
    // Accommodating makes a bigger first concession, so its counter is lower
    if (acc.amount === col.amount) {
      expect(acc.concessionFraction).toBeGreaterThan(col.concessionFraction);
    } else {
      expect(acc.amount).toBeLessThanOrEqual(col.amount);
    }
  });

  it('trust adjustment increases concession for high-trust counterparties', () => {
    const lowTrust = generateBuyerCounter({ currentOffer: 150, buyerMax: 100, sellerMin: 60, round: 1, customParams: { trustScore: 20 } });
    const highTrust = generateBuyerCounter({ currentOffer: 150, buyerMax: 100, sellerMin: 60, round: 1, customParams: { trustScore: 95 } });
    // High trust → larger concession → counter is lower (better for buyer)
    expect(highTrust.amount).toBeLessThanOrEqual(lowTrust.amount);
  });

  it('confidence decreases with more rounds', () => {
    const r1 = generateBuyerCounter({ currentOffer: 150, buyerMax: 100, sellerMin: 60, round: 1 });
    const r5 = generateBuyerCounter({ currentOffer: 150, buyerMax: 100, sellerMin: 60, round: 5 });
    expect(r5.confidence).toBeLessThan(r1.confidence);
  });

  it('throws on invalid inputs', () => {
    expect(() => generateBuyerCounter({ currentOffer: 0, buyerMax: 100, sellerMin: 60 })).toThrow();
    expect(() => generateBuyerCounter({ currentOffer: 100, buyerMax: 0, sellerMin: 60 })).toThrow();
    expect(() => generateBuyerCounter({ currentOffer: 100, buyerMax: 100, sellerMin: 0 })).toThrow();
    expect(() => generateBuyerCounter({ currentOffer: 100, buyerMax: 100, sellerMin: 60, round: 0 })).toThrow();
  });

  it('counter is capped at sellerMin (won\'t go below seller\'s floor)', () => {
    // Pathological case: very aggressive buyer trying to push below sellerMin
    const result = generateBuyerCounter({
      currentOffer: 200,
      buyerMax: 100,
      sellerMin: 95,
      strategy: 'accommodating',
      round: 1,
    });
    // With accommodating + huge gap, concession could push below sellerMin
    expect(result.amount).toBeGreaterThanOrEqual(95);
  });
});

describe('generateSellerCounter', () => {
  it('recommends accept when offer meets minimum', () => {
    const result = generateSellerCounter({
      currentOffer: 80,
      buyerMax: 100,
      sellerMin: 60,
    });
    expect(result.reasoning).toContain('Recommend accept');
    expect(result.amount).toBe(80);
  });

  it('generates an upward counter when offer is too low', () => {
    const result = generateSellerCounter({
      currentOffer: 40,
      buyerMax: 100,
      sellerMin: 60,
      round: 1,
    });
    expect(result.amount).toBeGreaterThan(40);
    expect(result.amount).toBeLessThanOrEqual(100);
  });

  it('walks away when no ZOPA (seller min > buyer max)', () => {
    const result = generateSellerCounter({
      currentOffer: 40,
      buyerMax: 50,
      sellerMin: 60,
    });
    expect(result.shouldWalkAway).toBe(true);
  });
});

describe('buildConcessionSchedule', () => {
  it('returns a schedule with one entry per round up to maxRounds', () => {
    const result = buildConcessionSchedule({
      openingOffer: 150,
      buyerMax: 100,
      sellerMin: 60,
      side: 'buyer',
      strategy: 'collaborative',
    });
    // collaborative maxRounds = 12
    expect(result.schedule.length).toBe(12);
  });

  it('returns empty schedule when no ZOPA', () => {
    const result = buildConcessionSchedule({
      openingOffer: 150,
      buyerMax: 50,
      sellerMin: 60,
      side: 'buyer',
    });
    expect(result.schedule.length).toBe(0);
    expect(result.favorableRounds).toBe(0);
  });

  it('each successive round makes a smaller concession (monotonic for buyer)', () => {
    const result = buildConcessionSchedule({
      openingOffer: 150,
      buyerMax: 100,
      sellerMin: 60,
      side: 'buyer',
      strategy: 'collaborative',
    });
    for (let i = 1; i < result.schedule.length; i++) {
      const prev = result.schedule[i - 1];
      const curr = result.schedule[i];
      // Buyer's counter moves toward buyerMax as rounds increase
      expect(curr.amount).toBeGreaterThanOrEqual(prev.amount);
      expect(curr.concessionFraction).toBeLessThanOrEqual(prev.concessionFraction);
    }
  });

  it('favorableRounds counts rounds where counter is at or below ZOPA midpoint', () => {
    const result = buildConcessionSchedule({
      openingOffer: 150,
      buyerMax: 100,
      sellerMin: 60, // midpoint = 80
      side: 'buyer',
      strategy: 'collaborative',
    });
    // All buyer counters should be > 80 (above midpoint) because starting from 150
    // Favorable for buyer = at or below midpoint
    expect(result.favorableRounds).toBe(0);
  });
});

describe('STRATEGY_PRESETS', () => {
  it('has all 5 documented strategies', () => {
    expect(Object.keys(STRATEGY_PRESETS).sort()).toEqual(
      ['accommodating', 'collaborative', 'competitive', 'compromising', 'principled'].sort()
    );
  });

  it('all presets have valid parameters', () => {
    for (const [name, params] of Object.entries(STRATEGY_PRESETS)) {
      expect(params.initialConcession).toBeGreaterThan(0);
      expect(params.initialConcession).toBeLessThanOrEqual(1);
      expect(params.decayRate).toBeGreaterThan(0);
      expect(params.decayRate).toBeLessThanOrEqual(1);
      expect(params.minConcession).toBeGreaterThanOrEqual(0);
      expect(params.minConcession).toBeLessThanOrEqual(params.initialConcession);
      expect(params.maxRounds).toBeGreaterThan(0);
      expect(params.trustScore).toBeGreaterThanOrEqual(0);
      expect(params.trustScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('diagnostics', () => {
  it('reports healthy for sensible reservations', () => {
    const result = diagnostics({ buyerMax: 100, sellerMin: 60 });
    expect(result.healthy).toBe(true);
    expect(result.checks.positive_values.pass).toBe(true);
  });

  it('reports unhealthy for zero values', () => {
    const result = diagnostics({ buyerMax: 0, sellerMin: 60 });
    expect(result.healthy).toBe(false);
    expect(result.checks.positive_values.pass).toBe(false);
  });
});
