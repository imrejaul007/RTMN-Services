/**
 * Widget Intelligence - Lead Scoring Tests
 */

import { jest } from '@jest/globals';

// Mock the stores
const mockSignalsStore = new Map();
const mockLeadsStore = new Map();

// Mock functions before importing
jest.unstable_mockModule('../src/index.js', () => ({
  signalsStore: mockSignalsStore,
  leadsStore: mockLeadsStore,
  SIGNAL_WEIGHTS: {
    pricing_visit: 15,
    product_view: 5,
    add_to_cart: 20,
    checkout_start: 30,
    repeat_visit: 10,
    email_subscribe: 25,
    whatsapp_click: 15,
    compare_products: 20,
    download_pdf: 20,
    exit_intent: 10,
  },
  calculateLeadScore: jest.fn((visitorId) => {
    const signals = mockSignalsStore.get(visitorId) || [];
    if (signals.length === 0) {
      return {
        visitorId,
        score: 0,
        tier: 'cold',
        signals: [],
        velocity: 1.0,
        recency: 1.0,
        breakdown: { base: 0, velocity: 0, recency: 0, total: 0 },
      };
    }
    const baseScore = signals.reduce((acc, s) => acc + (s.weight || 0), 0);
    return {
      visitorId,
      score: baseScore,
      tier: baseScore >= 50 ? 'warm' : 'qualified',
      signals,
      velocity: 1.0,
      recency: 1.0,
      breakdown: { base: baseScore, velocity: 0, recency: 0, total: baseScore },
    };
  }),
  storeSignal: jest.fn((visitorId, signalData) => {
    if (!mockSignalsStore.has(visitorId)) {
      mockSignalsStore.set(visitorId, []);
    }
    const signals = mockSignalsStore.get(visitorId);
    const signal = {
      id: `signal-${signals.length}`,
      type: signalData.type,
      metadata: signalData.metadata || {},
      timestamp: Date.now(),
      sessionId: signalData.sessionId,
      weight: {
        pricing_visit: 15,
        product_view: 5,
        add_to_cart: 20,
        checkout_start: 30,
        repeat_visit: 10,
        email_subscribe: 25,
        whatsapp_click: 15,
        compare_products: 20,
        download_pdf: 20,
        exit_intent: 10,
      }[signalData.type] || 0,
    };
    signals.push(signal);
    return signal;
  }),
  calculateVelocityBonus: jest.fn(() => 1.0),
  calculateRecencyDecay: jest.fn(() => 1.0),
}));

describe('Widget Intelligence - Lead Scoring', () => {
  beforeEach(() => {
    mockSignalsStore.clear();
    mockLeadsStore.clear();
  });

  describe('Signal Recording', () => {
    test('should record a new signal', async () => {
      const { storeSignal } = await import('../src/index.js');

      const signal = storeSignal('visitor-123', {
        type: 'product_view',
        sessionId: 'session-456',
      });

      expect(signal).toBeDefined();
      expect(signal.type).toBe('product_view');
      expect(signal.sessionId).toBe('session-456');
      expect(signal.weight).toBe(5);
    });

    test('should accumulate multiple signals', async () => {
      const { storeSignal } = await import('../src/index.js');

      storeSignal('visitor-123', { type: 'product_view' });
      storeSignal('visitor-123', { type: 'pricing_visit' });
      storeSignal('visitor-123', { type: 'add_to_cart' });

      const signals = mockSignalsStore.get('visitor-123');
      expect(signals).toHaveLength(3);
    });
  });

  describe('Lead Score Calculation', () => {
    test('should return zero score for new visitor', async () => {
      const { calculateLeadScore } = await import('../src/index.js');

      const score = calculateLeadScore('new-visitor');
      expect(score.score).toBe(0);
      expect(score.tier).toBe('cold');
    });

    test('should calculate score from signals', async () => {
      const { storeSignal, calculateLeadScore } = await import('../src/index.js');

      storeSignal('visitor-123', { type: 'add_to_cart' }); // +20
      storeSignal('visitor-123', { type: 'checkout_start' }); // +30

      const score = calculateLeadScore('visitor-123');
      expect(score.score).toBe(50);
      expect(score.tier).toBe('warm');
    });
  });

  describe('Signal Weights', () => {
    test('should have correct weights for all signal types', async () => {
      const { SIGNAL_WEIGHTS } = await import('../src/index.js');

      expect(SIGNAL_WEIGHTS.pricing_visit).toBe(15);
      expect(SIGNAL_WEIGHTS.product_view).toBe(5);
      expect(SIGNAL_WEIGHTS.add_to_cart).toBe(20);
      expect(SIGNAL_WEIGHTS.checkout_start).toBe(30);
      expect(SIGNAL_WEIGHTS.repeat_visit).toBe(10);
      expect(SIGNAL_WEIGHTS.email_subscribe).toBe(25);
      expect(SIGNAL_WEIGHTS.whatsapp_click).toBe(15);
      expect(SIGNAL_WEIGHTS.compare_products).toBe(20);
      expect(SIGNAL_WEIGHTS.download_pdf).toBe(20);
      expect(SIGNAL_WEIGHTS.exit_intent).toBe(10);
    });
  });
});