import { describe, it, expect } from 'vitest';

/**
 * SUTAR Agent Emotional Context Unit Tests
 */

function calculateTrustScore(history) {
  if (history.length === 0) return 0.5;
  const positive = history.filter(i => i.outcome === 'success' || i.outcome === 'accepted').length;
  const negative = history.filter(i => i.outcome === 'rejected' || i.outcome === 'failed').length;
  const baseScore = positive / (positive + negative + 1);
  const recencyBonus = history.length > 5 ? 0.1 : 0;
  return Math.min(1, baseScore + recencyBonus);
}

function analyzeEmotionalState(context) {
  const state = { confidence: 0.8, stress: 0.2, trust: 0.7, urgency: context.urgency || 0.5, cooperation: 0.8 };
  if (context.phase === 'opening') {
    state.confidence = 0.7;
    state.trust = 0.6;
  } else if (context.phase === 'closing') {
    state.urgency = 0.8;
    state.cooperation = 0.9;
  } else if (context.phase === 'impasse') {
    state.stress = 0.6;
    state.confidence = 0.5;
  }
  return state;
}

function getNegotiationStrategy(type, agentState, counterpartState) {
  const avgTrust = (agentState.trust + counterpartState.trust) / 2;
  let aggressiveness = 'balanced';
  if (avgTrust < 0.4) aggressiveness = 'aggressive';
  else if (avgTrust > 0.8) aggressiveness = 'conservative';
  return { aggressiveness, recommendedTone: avgTrust > 0.7 ? 'warm' : avgTrust > 0.4 ? 'professional' : 'formal' };
}

describe('Agent Emotional Context - Trust Calculation', () => {
  it('should return neutral trust for empty history', () => {
    expect(calculateTrustScore([])).toBe(0.5);
  });

  it('should calculate high trust for positive outcomes', () => {
    const history = [
      { outcome: 'success' },
      { outcome: 'success' },
      { outcome: 'accepted' }
    ];
    expect(calculateTrustScore(history)).toBeGreaterThan(0.7);
  });

  it('should calculate low trust for negative outcomes', () => {
    const history = [
      { outcome: 'rejected' },
      { outcome: 'failed' }
    ];
    expect(calculateTrustScore(history)).toBeLessThan(0.4);
  });

  it('should apply recency bonus for many interactions', () => {
    const manyHistory = Array(10).fill({ outcome: 'success' });
    const fewHistory = Array(3).fill({ outcome: 'success' });
    expect(calculateTrustScore(manyHistory)).toBeGreaterThan(calculateTrustScore(fewHistory));
  });
});

describe('Agent Emotional Context - Emotional State Analysis', () => {
  it('should set default state', () => {
    const state = analyzeEmotionalState({});
    expect(state.confidence).toBe(0.8);
    expect(state.stress).toBe(0.2);
  });

  it('should adjust for opening phase', () => {
    const state = analyzeEmotionalState({ phase: 'opening' });
    expect(state.confidence).toBe(0.7);
    expect(state.trust).toBe(0.6);
  });

  it('should adjust for closing phase', () => {
    const state = analyzeEmotionalState({ phase: 'closing' });
    expect(state.urgency).toBe(0.8);
    expect(state.cooperation).toBe(0.9);
  });

  it('should adjust for impasse phase', () => {
    const state = analyzeEmotionalState({ phase: 'impasse' });
    expect(state.stress).toBe(0.6);
    expect(state.confidence).toBe(0.5);
  });
});

describe('Agent Emotional Context - Negotiation Strategy', () => {
  it('should return balanced strategy for medium trust', () => {
    const agentState = { trust: 0.5 };
    const counterpartState = { trust: 0.5 };
    const strategy = getNegotiationStrategy('price', agentState, counterpartState);
    expect(strategy.aggressiveness).toBe('balanced');
  });

  it('should return aggressive strategy for low trust', () => {
    const agentState = { trust: 0.2 };
    const counterpartState = { trust: 0.2 };
    const strategy = getNegotiationStrategy('price', agentState, counterpartState);
    expect(strategy.aggressiveness).toBe('aggressive');
  });

  it('should return conservative strategy for high trust', () => {
    const agentState = { trust: 0.9 };
    const counterpartState = { trust: 0.9 };
    const strategy = getNegotiationStrategy('price', agentState, counterpartState);
    expect(strategy.aggressiveness).toBe('conservative');
  });

  it('should recommend warm tone for high trust', () => {
    const strategy = getNegotiationStrategy('default', { trust: 0.9 }, { trust: 0.9 });
    expect(strategy.recommendedTone).toBe('warm');
  });

  it('should recommend formal tone for low trust', () => {
    const strategy = getNegotiationStrategy('default', { trust: 0.2 }, { trust: 0.2 });
    expect(strategy.recommendedTone).toBe('formal');
  });
});

describe('Agent Emotional Context - Negotiation Phases', () => {
  it('should track opening phase emotions', () => {
    const opening = analyzeEmotionalState({ phase: 'opening' });
    expect(opening.confidence).toBeLessThan(opening.trust + 0.2);
  });

  it('should track closing phase emotions', () => {
    const closing = analyzeEmotionalState({ phase: 'closing' });
    expect(closing.urgency).toBe(0.8);
    expect(closing.cooperation).toBe(0.9);
  });

  it('should track impasse phase emotions', () => {
    const impasse = analyzeEmotionalState({ phase: 'impasse' });
    expect(impasse.stress).toBeGreaterThan(0.5);
  });
});

describe('Agent Emotional Context - Trust Evolution', () => {
  it('should evolve trust with positive interactions', () => {
    const history = [];
    let trust = calculateTrustScore(history);

    // Add positive interactions
    for (let i = 0; i < 5; i++) {
      history.push({ outcome: 'success' });
      trust = calculateTrustScore(history);
    }

    expect(trust).toBeGreaterThan(0.7);
  });

  it('should degrade trust with negative interactions', () => {
    const history = [
      { outcome: 'success' },
      { outcome: 'success' },
      { outcome: 'rejected' },
      { outcome: 'failed' }
    ];

    const trust = calculateTrustScore(history);
    expect(trust).toBeLessThan(0.6);
  });
});

describe('Agent Emotional Context - Strategy Selection', () => {
  it('should select appropriate strategy for price negotiation', () => {
    const agentState = { trust: 0.6, confidence: 0.7 };
    const counterpartState = { trust: 0.6, confidence: 0.7 };
    const strategy = getNegotiationStrategy('price', agentState, counterpartState);
    expect(strategy).toBeDefined();
    expect(strategy.aggressiveness).toBe('balanced');
  });

  it('should select appropriate strategy for partnership', () => {
    const agentState = { trust: 0.9, confidence: 0.7 };
    const counterpartState = { trust: 0.9, confidence: 0.7 };
    const strategy = getNegotiationStrategy('partnership', agentState, counterpartState);
    expect(strategy).toBeDefined();
    expect(strategy.aggressiveness).toBe('conservative');
  });
});

describe('Agent Emotional Context - Integration', () => {
  it('should model complete negotiation flow', () => {
    // Phase 1: Opening
    const openingState = analyzeEmotionalState({ phase: 'opening' });
    expect(openingState.trust).toBe(0.6);

    // Phase 2: Negotiation
    const negState = analyzeEmotionalState({ phase: 'general' });
    expect(negState.confidence).toBe(0.8);

    // Phase 3: Closing
    const closingState = analyzeEmotionalState({ phase: 'closing' });
    expect(closingState.urgency).toBe(0.8);

    // Calculate final trust
    const history = [
      { outcome: 'success' },
      { outcome: 'success' },
      { outcome: 'accepted' }
    ];
    const finalTrust = calculateTrustScore(history);
    expect(finalTrust).toBeGreaterThan(0.6);
  });

  it('should support supplier negotiation', () => {
    const agentState = { trust: 0.7, confidence: 0.8 };
    const counterpartState = { trust: 0.5, confidence: 0.6 };
    const strategy = getNegotiationStrategy('price', agentState, counterpartState);

    expect(strategy.aggressiveness).toBe('balanced');
    expect(strategy.recommendedTone).toBe('professional');
  });

  it('should support partner collaboration', () => {
    const agentState = { trust: 0.9, confidence: 0.8 };
    const counterpartState = { trust: 0.9, confidence: 0.8 };
    const strategy = getNegotiationStrategy('partnership', agentState, counterpartState);

    expect(strategy.aggressiveness).toBe('conservative');
    expect(strategy.recommendedTone).toBe('warm');
  });
});
