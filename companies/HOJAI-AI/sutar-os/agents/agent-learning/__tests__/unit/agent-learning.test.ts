/**
 * Agent Learning Service Unit Tests
 * ML-powered learning from negotiations, preferences, and strategies
 */

import { describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._name = name; this._data = new Map(); }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); return this; }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

vi.stubGlobal('uuid', { v4: () => 'learning-test-uuid' });

const {
  LEARNING_TYPES,
  recordBehavior,
  updatePreferenceProfile,
  recordNegotiation,
  learnStrategy,
  predictPrice,
  getRecommendations,
  getOptimalStrategy,
} = await import('../../src/index.js');

describe('Agent Learning Service', () => {

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Learning Types', () => {
    it('should define all 6 learning types', () => {
      expect(LEARNING_TYPES.PREFERENCE).toBe('preference');
      expect(LEARNING_TYPES.NEGOTIATION).toBe('negotiation');
      expect(LEARNING_TYPES.PRICING).toBe('pricing');
      expect(LEARNING_TYPES.RECOMMENDATION).toBe('recommendation');
      expect(LEARNING_TYPES.TIMING).toBe('timing');
      expect(LEARNING_TYPES.BEHAVIOR).toBe('behavior');
    });
  });

  // =========================================================================
  // Behavior Recording
  // =========================================================================
  describe('recordBehavior', () => {
    it('should record purchase behavior', () => {
      const record = recordBehavior('user-1', {
        type: 'purchase',
        data: { itemId: 'prod-1', price: 99.99, category: 'electronics' },
      });

      expect(record.id).toBeDefined();
      expect(record.userId).toBe('user-1');
      expect(record.type).toBe('purchase');
      expect(record.data.price).toBe(99.99);
      expect(record.timestamp).toBeDefined();
    });

    it('should record view behavior', () => {
      const record = recordBehavior('user-2', {
        type: 'view',
        data: { category: 'fashion', brand: 'Nike' },
      });

      expect(record.type).toBe('view');
      expect(record.data.category).toBe('fashion');
    });

    it('should record search behavior', () => {
      const record = recordBehavior('user-3', {
        type: 'search',
        data: { query: 'wireless headphones' },
      });

      expect(record.type).toBe('search');
      expect(record.data.query).toBe('wireless headphones');
    });
  });

  // =========================================================================
  // Preference Profile Updates
  // =========================================================================
  describe('updatePreferenceProfile', () => {
    it('should create new profile with defaults', () => {
      const profile = updatePreferenceProfile('new-user', {
        type: 'view',
        data: {},
      });

      expect(profile.userId).toBe('new-user');
      expect(profile.preferences.priceRange.min).toBe(0);
      expect(profile.preferences.priceRange.max).toBe(1000);
      expect(profile.preferences.priceRange.avg).toBe(100);
      expect(profile.confidence).toBe(0);
      expect(profile.dataPoints).toBe(1);
    });

    it('should update price range from behavior', () => {
      // First record
      const profile1 = updatePreferenceProfile('price-user', {
        type: 'purchase',
        data: { price: 50 },
      });

      expect(profile1.preferences.priceRange.min).toBe(50);
      expect(profile1.preferences.priceRange.max).toBe(50);
      expect(profile1.preferences.priceRange.avg).toBe(50);

      // Second purchase at different price
      const profile2 = updatePreferenceProfile('price-user', {
        type: 'purchase',
        data: { price: 150 },
      });

      expect(profile2.preferences.priceRange.min).toBe(50);
      expect(profile2.preferences.priceRange.max).toBe(150);
    });

    it('should update category preferences', () => {
      updatePreferenceProfile('cat-user', {
        type: 'purchase',
        data: { category: 'electronics' },
      });
      updatePreferenceProfile('cat-user', {
        type: 'purchase',
        data: { category: 'electronics' },
      });
      const profile = updatePreferenceProfile('cat-user', {
        type: 'purchase',
        data: { category: 'fashion' },
      });

      expect(profile.preferences.categories['electronics']).toBe(2);
      expect(profile.preferences.categories['fashion']).toBe(1);
    });

    it('should update brand preferences', () => {
      updatePreferenceProfile('brand-user', {
        type: 'view',
        data: { brand: 'Apple' },
      });
      const profile = updatePreferenceProfile('brand-user', {
        type: 'view',
        data: { brand: 'Apple' },
      });

      expect(profile.preferences.brands['Apple']).toBe(2);
    });

    it('should update negotiation profile on negotiation behavior', () => {
      const profile = updatePreferenceProfile('neg-user', {
        type: 'negotiation',
        data: { rounds: 3, success: true },
      });

      expect(profile.preferences.negotiation.avgRounds).toBe(3);
      expect(profile.preferences.negotiation.successRate).toBe(1); // 1 out of 1 = 100%
    });

    it('should increase confidence with more data points', () => {
      // Each call increments dataPoints by 1
      // confidence = min(1, dataPoints / 50)
      for (let i = 0; i < 25; i++) {
        updatePreferenceProfile('conf-user', { type: 'view', data: {} });
      }

      const profile = updatePreferenceProfile('conf-user', { type: 'view', data: {} });

      expect(profile.confidence).toBe(0.52); // 26/50
      expect(profile.dataPoints).toBe(26);
    });

    it('should cap confidence at 1.0', () => {
      // Add many behaviors
      for (let i = 0; i < 100; i++) {
        updatePreferenceProfile('max-conf-user', { type: 'view', data: {} });
      }

      const profile = updatePreferenceProfile('max-conf-user', { type: 'view', data: {} });

      expect(profile.confidence).toBe(1.0);
    });
  });

  // =========================================================================
  // Negotiation Recording
  // =========================================================================
  describe('recordNegotiation', () => {
    it('should record successful negotiation', () => {
      const record = recordNegotiation('merchant-1', {
        id: 'neg-1',
        counterparty: 'genie-1',
        product: 'Laptop',
        category: 'electronics',
        initialOffer: 1000,
        finalPrice: 850,
        rounds: 4,
        duration: 120000,
        outcome: 'success',
        strategy: 'collaborative',
      });

      expect(record.agentId).toBe('merchant-1');
      expect(record.outcome).toBe('success');
      expect(record.finalPrice).toBe(850);
      expect(record.strategy).toBe('collaborative');
    });

    it('should record failed negotiation', () => {
      const record = recordNegotiation('merchant-2', {
        counterparty: 'genie-2',
        product: 'Watch',
        category: 'fashion',
        initialOffer: 200,
        finalPrice: 0,
        rounds: 5,
        outcome: 'failed',
        strategy: 'competitive',
      });

      expect(record.outcome).toBe('failed');
    });
  });

  // =========================================================================
  // Strategy Learning
  // =========================================================================
  describe('learnStrategy', () => {
    it('should create new strategy for agent', () => {
      const strategy = learnStrategy('new-agent', {
        category: 'electronics',
        strategy: 'collaborative',
        outcome: 'success',
        rounds: 3,
        finalPrice: 800,
      });

      expect(strategy.agentId).toBe('new-agent');
      expect(strategy.strategies['electronics']).toBeDefined();
      expect(strategy.strategies['electronics'].attempts).toBe(1);
      expect(strategy.strategies['electronics'].successes).toBe(1);
    });

    it('should update success rate', () => {
      learnStrategy('updating-agent', {
        category: 'fashion',
        strategy: 'competitive',
        outcome: 'success',
        rounds: 2,
        finalPrice: 50,
      });
      learnStrategy('updating-agent', {
        category: 'fashion',
        strategy: 'competitive',
        outcome: 'success',
        rounds: 2,
        finalPrice: 55,
      });
      learnStrategy('updating-agent', {
        category: 'fashion',
        strategy: 'competitive',
        outcome: 'failed',
        rounds: 5,
        finalPrice: 0,
      });

      const strategy = learnStrategy('updating-agent', {
        category: 'fashion',
        strategy: 'competitive',
        outcome: 'success',
        rounds: 2,
        finalPrice: 48,
      });

      // 3 successes, 1 failure = 75% success rate
      expect(strategy.strategies['fashion'].successRate).toBe(0.75);
    });

    it('should track average rounds', () => {
      learnStrategy('rounds-agent', { category: 'test', rounds: 5, outcome: 'success', finalPrice: 100 });
      learnStrategy('rounds-agent', { category: 'test', rounds: 3, outcome: 'success', finalPrice: 100 });

      const strategy = learnStrategy('rounds-agent', { category: 'test', rounds: 4, outcome: 'success', finalPrice: 100 });

      expect(strategy.strategies['test'].avgRounds).toBe(4); // (5+3+4)/3
    });

    it('should increment version on each update', () => {
      const v1 = learnStrategy('version-agent', { category: 'test', rounds: 1, outcome: 'success', finalPrice: 100 });
      const v2 = learnStrategy('version-agent', { category: 'test', rounds: 1, outcome: 'success', finalPrice: 100 });

      expect(v2.version).toBe(v1.version + 1);
    });
  });

  // =========================================================================
  // Price Prediction
  // =========================================================================
  describe('predictPrice', () => {
    it('should return base price with zero confidence when no data', () => {
      const prediction = predictPrice('prod-new', 'electronics', 500);

      expect(prediction.predictedPrice).toBe(500);
      expect(prediction.confidence).toBe(0);
    });

    it('should predict based on historical negotiations', () => {
      // Record some negotiations first
      recordNegotiation('pred-agent', {
        category: 'electronics',
        finalPrice: 800,
        rounds: 3,
        outcome: 'success',
        strategy: 'default',
      });
      recordNegotiation('pred-agent', {
        category: 'electronics',
        finalPrice: 850,
        rounds: 4,
        outcome: 'success',
        strategy: 'default',
      });

      const prediction = predictPrice('prod-1', 'electronics', 1000);

      expect(prediction.confidence).toBeGreaterThan(0);
      // Average of 800 and 850
      expect(prediction.predictedPrice).toBe('825.00');
    });

    it('should provide price range', () => {
      recordNegotiation('range-agent', {
        category: 'fashion',
        finalPrice: 100,
        rounds: 2,
        outcome: 'success',
        strategy: 'default',
      });
      recordNegotiation('range-agent', {
        category: 'fashion',
        finalPrice: 200,
        rounds: 2,
        outcome: 'success',
        strategy: 'default',
      });

      const prediction = predictPrice('prod-2', 'fashion', 150);

      expect(prediction.range.min).toBe('100.00');
      expect(prediction.range.max).toBe('200.00');
    });
  });

  // =========================================================================
  // Recommendations
  // =========================================================================
  describe('getRecommendations', () => {
    it('should return empty for unknown user', () => {
      const result = getRecommendations('unknown-user');

      expect(result.recommendations).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should recommend top categories', () => {
      // Build up category preferences
      for (let i = 0; i < 10; i++) {
        updatePreferenceProfile('rec-user', { type: 'purchase', data: { category: 'electronics', price: 100 } });
      }
      for (let i = 0; i < 5; i++) {
        updatePreferenceProfile('rec-user', { type: 'purchase', data: { category: 'fashion', price: 50 } });
      }

      const result = getRecommendations('rec-user');

      expect(result.recommendations.length).toBeGreaterThan(0);
      const catRec = result.recommendations.find(r => r.type === 'category');
      expect(catRec).toBeDefined();
    });

    it('should recommend based on frequently purchased', () => {
      updatePreferenceProfile('freq-user', { type: 'purchase', data: { itemId: 'coffee-1' } });
      updatePreferenceProfile('freq-user', { type: 'purchase', data: { itemId: 'coffee-1' } });

      const result = getRecommendations('freq-user');

      const repeatRec = result.recommendations.find(r => r.type === 'repeat');
      expect(repeatRec).toBeDefined();
    });

    it('should recommend based on search history', () => {
      updatePreferenceProfile('search-user', { type: 'search', data: { query: 'running shoes' } });

      const result = getRecommendations('search-user');

      const searchRec = result.recommendations.find(r => r.type === 'search_based');
      expect(searchRec).toBeDefined();
    });
  });

  // =========================================================================
  // Strategy Optimization
  // =========================================================================
  describe('getOptimalStrategy', () => {
    it('should return default strategy for unknown agent', () => {
      const result = getOptimalStrategy('unknown-agent', 'electronics');

      expect(result.strategy).toBe('moderate');
      expect(result.confidence).toBe(0);
    });

    it('should return best strategy for category', () => {
      // Record successful negotiations with collaborative strategy
      for (let i = 0; i < 10; i++) {
        recordNegotiation('optimal-agent', {
          category: 'software',
          strategy: 'collaborative',
          outcome: 'success',
          rounds: 3,
          finalPrice: 500,
        });
      }
      // Record some failures with competitive
      for (let i = 0; i < 2; i++) {
        recordNegotiation('optimal-agent', {
          category: 'software',
          strategy: 'competitive',
          outcome: 'failed',
          rounds: 6,
          finalPrice: 0,
        });
      }

      const result = getOptimalStrategy('optimal-agent', 'software');

      expect(result.strategy).toBe('collaborative');
      expect(result.successRate).toBeGreaterThan(0.5);
      expect(result.sampleSize).toBe(12);
    });
  });
});
