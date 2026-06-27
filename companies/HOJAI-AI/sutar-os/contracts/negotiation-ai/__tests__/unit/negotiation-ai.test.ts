/**
 * Negotiation AI Service Unit Tests
 * Advanced ML-powered negotiation strategies, counter-offer generation, persona generation
 */

import { describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._data = new Map(); this.size = 0; }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); this.size = this._data.size; return this; }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

vi.stubGlobal('uuid', () => 'neg-ai-test-uuid');

const {
  STRATEGY_TYPES,
  calculateOptimalCounter,
  shouldAcceptOrContinue,
  predictFinalPrice,
  generatePersona,
  analyzeOutcome,
} = await import('../../src/index.js');

describe('Negotiation AI Service', () => {

  // =========================================================================
  // Strategy Types
  // =========================================================================
  describe('Strategy Types', () => {
    it('should define all 6 negotiation strategies', () => {
      expect(STRATEGY_TYPES.COMPETITIVE).toBe('competitive');
      expect(STRATEGY_TYPES.COLLABORATIVE).toBe('collaborative');
      expect(STRATEGY_TYPES.ACCOMMODATING).toBe('accommodating');
      expect(STRATEGY_TYPES.AVOIDING).toBe('avoiding');
      expect(STRATEGY_TYPES.COMPROMISING).toBe('compromising');
      expect(STRATEGY_TYPES.PRINCIPLED).toBe('principled');
    });
  });

  // =========================================================================
  // Optimal Counter Calculation
  // =========================================================================
  describe('calculateOptimalCounter', () => {
    it('should return principled counter based on market price', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70, marketPrice: 95 }
      );

      expect(result.counterPrice).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.acceptableRange).toBeDefined();
      expect(result.acceptableRange.min).toBe(70);
      expect(result.acceptableRange.max).toBe(120);
    });

    it('should use collaborative strategy for urgent deals', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70, urgency: 'urgent' }
      );

      expect(result.strategy).toBe('collaborative');
      expect(result.reasoning).toContain('Time pressure');
    });

    it('should use collaborative strategy for high-relationship deals', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70, relationship: 'high' }
      );

      expect(result.strategy).toBe('collaborative');
      expect(result.reasoning).toContain('Strong relationship');
    });

    it('should use competitive strategy when seller has low flexibility', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70, sellerFlexibility: 'low' }
      );

      expect(result.strategy).toBe('competitive');
      expect(result.reasoning).toContain('firm');
    });

    it('should use BATNA-based for low urgency deals', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70, urgency: 'low' }
      );

      expect(result.strategy).toBe('principled');
      expect(result.reasoning).toContain('No rush');
    });

    it('should provide alternatives for all strategies', () => {
      const result = calculateOptimalCounter(
        { price: 100 },
        { targetPrice: 80, maxPrice: 120, minPrice: 70 }
      );

      expect(result.alternatives.competitive).toBeDefined();
      expect(result.alternatives.collaborative).toBeDefined();
      expect(result.alternatives.batna).toBeDefined();
    });
  });

  // =========================================================================
  // Accept or Continue Decision
  // =========================================================================
  describe('shouldAcceptOrContinue', () => {
    it('should accept offer at or below target price', () => {
      const result = shouldAcceptOrContinue(
        { price: 75 },
        { targetPrice: 80, maxPrice: 120, currentRound: 1, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('accept');
      expect(result.confidence).toBe(0.95);
    });

    it('should accept offer within 5% of target', () => {
      const result = shouldAcceptOrContinue(
        { price: 84 }, // 5% above 80
        { targetPrice: 80, maxPrice: 120, currentRound: 1, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('accept');
      expect(result.confidence).toBe(0.85);
    });

    it('should accept at max rounds if within max price', () => {
      const result = shouldAcceptOrContinue(
        { price: 115 }, // Above target but below max
        { targetPrice: 80, maxPrice: 120, currentRound: 5, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('accept');
    });

    it('should reject at max rounds if above max price', () => {
      const result = shouldAcceptOrContinue(
        { price: 130 }, // Above max
        { targetPrice: 80, maxPrice: 120, currentRound: 5, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('reject');
    });

    it('should reject when above walk-away point', () => {
      const result = shouldAcceptOrContinue(
        { price: 105 }, // Above walk-away
        { targetPrice: 80, maxPrice: 120, currentRound: 2, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('reject');
      expect(result.confidence).toBe(0.8);
    });

    it('should counter when in acceptable range', () => {
      const result = shouldAcceptOrContinue(
        { price: 90 },
        { targetPrice: 80, maxPrice: 120, currentRound: 2, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(result.action).toBe('counter');
      expect(result.counterOffer).toBeDefined();
      expect(result.counterOffer.price).toBeLessThan(90);
    });

    it('should decrease confidence as rounds increase', () => {
      const r1 = shouldAcceptOrContinue(
        { price: 90 },
        { targetPrice: 80, maxPrice: 120, currentRound: 1, maxRounds: 5, walkAwayPoint: 100 },
        []
      );
      const r3 = shouldAcceptOrContinue(
        { price: 90 },
        { targetPrice: 80, maxPrice: 120, currentRound: 3, maxRounds: 5, walkAwayPoint: 100 },
        []
      );

      expect(r3.confidence).toBeLessThan(r1.confidence);
    });
  });

  // =========================================================================
  // Price Prediction
  // =========================================================================
  describe('predictFinalPrice', () => {
    it('should return target price when no offers', () => {
      const result = predictFinalPrice([], 100);
      // When no offers, returns the targetPrice directly
      expect(result).toBe(100);
    });

    it('should predict based on convergence pattern', () => {
      const offers = [
        { price: 100 },
        { price: 90 },
        { price: 85 },
      ];

      const result = predictFinalPrice(offers, 80);

      expect(result.predictedPrice).toBeGreaterThan(80);
      expect(result.roundsAnalyzed).toBe(3);
    });

    it('should track convergence rate', () => {
      const offers = [
        { price: 100 },
        { price: 90 },
      ];

      const result = predictFinalPrice(offers, 80);

      expect(result.convergenceRate).toBeDefined();
      expect(parseFloat(result.convergenceRate)).toBeGreaterThanOrEqual(0);
    });

    it('should return confidence based on convergence', () => {
      const offers = [
        { price: 100 },
        { price: 90 },
        { price: 85 },
        { price: 82 },
      ];

      const result = predictFinalPrice(offers, 80);

      expect(result.confidence).toBeLessThanOrEqual(0.9);
    });
  });

  // =========================================================================
  // Persona Generation
  // =========================================================================
  describe('generatePersona', () => {
    it('should generate aggressive persona', () => {
      const persona = generatePersona('aggressive');

      expect(persona.style).toBe('aggressive');
      expect(persona.openingDiscount).toBe(0.20);
      expect(persona.maxConcession).toBe(0.08);
      expect(persona.tactics).toContain('anchor_high');
      expect(persona.tactics).toContain('walk_away_threat');
    });

    it('should generate moderate persona', () => {
      const persona = generatePersona('moderate');

      expect(persona.style).toBe('moderate');
      expect(persona.openingDiscount).toBe(0.15);
      expect(persona.maxConcession).toBe(0.12);
    });

    it('should generate diplomatic persona', () => {
      const persona = generatePersona('diplomatic');

      expect(persona.style).toBe('diplomatic');
      expect(persona.openingDiscount).toBe(0.10);
      expect(persona.maxConcession).toBe(0.15);
      expect(persona.tactics).toContain('relationship_focus');
    });

    it('should generate analytical persona', () => {
      const persona = generatePersona('analytical');

      expect(persona.style).toBe('analytical');
      expect(persona.tactics).toContain('market_data');
      expect(persona.tactics).toContain('cost_breakdown');
    });

    it('should default to moderate for unknown style', () => {
      const persona = generatePersona('unknown-style');

      expect(persona.style).toBe('moderate');
    });

    it('should merge custom traits', () => {
      const persona = generatePersona('moderate', {
        customField: 'value',
        tone: 'very_friendly',
      });

      expect(persona.customField).toBe('value');
      expect(persona.tone).toBe('very_friendly');
    });

    it('should have different tones per persona', () => {
      expect(generatePersona('aggressive').tone).toBe('firm');
      expect(generatePersona('moderate').tone).toBe('professional');
      expect(generatePersona('diplomatic').tone).toBe('friendly');
      expect(generatePersona('analytical').tone).toBe('data_driven');
    });
  });

  // =========================================================================
  // Outcome Analysis
  // =========================================================================
  describe('analyzeOutcome', () => {
    it('should analyze successful negotiation', () => {
      const session = {
        offers: [{ price: 100 }, { price: 85 }],
        targetPrice: 80,
        finalPrice: 82,
        rounds: 3,
        duration: 60000,
        strategy: 'collaborative',
      };

      const analysis = analyzeOutcome(session);

      expect(analysis.summary.rounds).toBe(3);
      expect(analysis.summary.savings).toBe(18); // 100 - 82
      expect(analysis.summary.targetAchievement).toBeDefined();
    });

    it('should calculate effectiveness', () => {
      const session = {
        offers: [{ price: 100 }, { price: 70 }],
        targetPrice: 80,
        finalPrice: 70,
        rounds: 2,
        duration: 30000,
        strategy: 'competitive',
      };

      const analysis = analyzeOutcome(session);

      expect(analysis.effectiveness.discountAchieved).toBeDefined();
      expect(analysis.effectiveness.roundsEfficiency).toBeDefined();
    });

    it('should classify rounds efficiency', () => {
      const high = analyzeOutcome({ ...mockSession(), rounds: 2 });
      const medium = analyzeOutcome({ ...mockSession(), rounds: 4 });
      const low = analyzeOutcome({ ...mockSession(), rounds: 6 });

      expect(high.effectiveness.roundsEfficiency).toBe('high');
      expect(medium.effectiveness.roundsEfficiency).toBe('medium');
      expect(low.effectiveness.roundsEfficiency).toBe('low');
    });

    it('should classify speed', () => {
      const fast = analyzeOutcome({ ...mockSession(), duration: 300000 }); // < 1hr
      const medium = analyzeOutcome({ ...mockSession(), duration: 3600000 }); // 1hr
      const slow = analyzeOutcome({ ...mockSession(), duration: 90000000 }); // > 24hr

      expect(fast.effectiveness.speed).toBe('fast');
      expect(medium.effectiveness.speed).toBe('medium');
      expect(slow.effectiveness.speed).toBe('slow');
    });

    it('should generate insights', () => {
      const highSavings = analyzeOutcome({
        ...mockSession(),
        offers: [{ price: 100 }, { price: 70 }],
        finalPrice: 70,
      });

      const manyRounds = analyzeOutcome({
        ...mockSession(),
        rounds: 6,
        finalPrice: 82,
      });

      const exceeded = analyzeOutcome({
        ...mockSession(),
        finalPrice: 90,
        targetPrice: 80,
      });

      expect(highSavings.insights.some(i => i.includes('significant savings'))).toBe(true);
      expect(manyRounds.insights.some(i => i.includes('decisive'))).toBe(true);
      expect(exceeded.insights.some(i => i.includes('exceeded'))).toBe(true);
    });

    it('should rate strategy effectiveness', () => {
      const high = analyzeOutcome({
        ...mockSession(),
        offers: [{ price: 100 }, { price: 70 }],
        finalPrice: 70,
      });

      const low = analyzeOutcome({
        ...mockSession(),
        offers: [{ price: 100 }, { price: 95 }],
        finalPrice: 95,
      });

      expect(high.strategy.effectivenessRating).toBe('highly_effective');
      expect(low.strategy.effectivenessRating).toBe('needs_improvement');
    });
  });
});

// Helper to create mock session
function mockSession() {
  return {
    offers: [{ price: 100 }],
    targetPrice: 80,
    finalPrice: 80,
    rounds: 3,
    duration: 60000,
    strategy: 'moderate',
  };
}
