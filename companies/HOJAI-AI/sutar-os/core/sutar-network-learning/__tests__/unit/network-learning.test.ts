/**
 * SUTAR OS — Network Learning Tests
 */
import { describe, it, expect } from 'vitest';

describe('Network Learning — Pattern Extraction', () => {
  function extractPattern(outcome) {
    const patterns = [];
    if (outcome.actions?.length > 5) patterns.push('extended_negotiation');
    if (outcome.duration > 3600000) patterns.push('slow_resolution');
    if (outcome.value > 100000) patterns.push('high_value_deal');
    if (outcome.context?.urgency === 'high') patterns.push('urgent_timeline');
    return patterns;
  }

  it('detects extended negotiation pattern', () => {
    const patterns = extractPattern({ actions: [1, 2, 3, 4, 5, 6] });
    expect(patterns).toContain('extended_negotiation');
  });

  it('detects slow resolution pattern', () => {
    const patterns = extractPattern({ duration: 7200000 }); // 2 hours
    expect(patterns).toContain('slow_resolution');
  });

  it('detects high value deal pattern', () => {
    const patterns = extractPattern({ value: 500000 });
    expect(patterns).toContain('high_value_deal');
  });

  it('detects urgent timeline pattern', () => {
    const patterns = extractPattern({ context: { urgency: 'high' } });
    expect(patterns).toContain('urgent_timeline');
  });

  it('returns empty for simple outcomes', () => {
    const patterns = extractPattern({ actions: [1], duration: 1000, value: 1000 });
    expect(patterns).toEqual([]);
  });

  it('combines multiple patterns', () => {
    const patterns = extractPattern({ actions: [1, 2, 3, 4, 5, 6], duration: 7200000, value: 500000, context: { urgency: 'high' } });
    expect(patterns.length).toBe(4);
  });
});

describe('Network Learning — Strategy Performance', () => {
  function updateStrategyPerformance(strategy, outcome) {
    strategy.attempts = (strategy.attempts || 0) + 1;
    if (outcome.success) strategy.successes = (strategy.successes || 0) + 1;
    strategy.totalValue = (strategy.totalValue || 0) + (outcome.value || 0);
    strategy.avgDuration = ((strategy.avgDuration || 0) * (strategy.attempts - 1) + (outcome.duration || 0)) / strategy.attempts;
    strategy.successRate = strategy.successes / strategy.attempts;
    strategy.avgValue = strategy.totalValue / strategy.attempts;
    return strategy;
  }

  it('tracks attempt count', () => {
    const s = {};
    updateStrategyPerformance(s, { success: true });
    updateStrategyPerformance(s, { success: false });
    expect(s.attempts).toBe(2);
  });

  it('tracks success count', () => {
    const s = {};
    updateStrategyPerformance(s, { success: true });
    updateStrategyPerformance(s, { success: true });
    updateStrategyPerformance(s, { success: false });
    expect(s.successes).toBe(2);
  });

  it('calculates success rate', () => {
    const s = {};
    updateStrategyPerformance(s, { success: true });
    updateStrategyPerformance(s, { success: true });
    updateStrategyPerformance(s, { success: false });
    updateStrategyPerformance(s, { success: false });
    expect(s.successRate).toBe(0.5);
  });

  it('calculates average value', () => {
    const s = {};
    updateStrategyPerformance(s, { value: 100 });
    updateStrategyPerformance(s, { value: 300 });
    expect(s.avgValue).toBe(200);
  });

  it('calculates average duration', () => {
    const s = {};
    updateStrategyPerformance(s, { duration: 1000 });
    updateStrategyPerformance(s, { duration: 3000 });
    expect(s.avgDuration).toBe(2000);
  });
});

describe('Network Learning — Strategy Ranking', () => {
  function rankStrategies(strategies) {
    return strategies
      .filter(s => s.attempts >= 5)
      .map(s => ({
        ...s,
        score: (s.successRate * 0.6) + (Math.min(s.avgValue / 10000, 1) * 0.2) + (Math.min(s.avgDuration / 3600000, 1) * 0.2),
      }))
      .sort((a, b) => b.score - a.score);
  }

  it('filters strategies with less than 5 attempts', () => {
    const strategies = [
      { id: 'a', attempts: 3, successRate: 0.9 },
      { id: 'b', attempts: 10, successRate: 0.5 },
    ];
    const ranked = rankStrategies(strategies);
    expect(ranked.length).toBe(1);
    expect(ranked[0].id).toBe('b');
  });

  it('ranks by composite score', () => {
    const strategies = [
      { id: 'a', attempts: 10, successRate: 0.8, avgValue: 50000, avgDuration: 1000000 },
      { id: 'b', attempts: 10, successRate: 0.6, avgValue: 100000, avgDuration: 2000000 },
    ];
    const ranked = rankStrategies(strategies);
    // b has higher avgValue and duration which boosts score
    expect(ranked[0].id).toBe('b');
  });
});

describe('Network Learning — Confidence Calculation', () => {
  function calculateConfidence(outcome) {
    let confidence = 0.5;
    if (outcome.actions?.length > 0) confidence += 0.1;
    if (outcome.value > 0) confidence += 0.1;
    if (outcome.duration > 0) confidence += 0.1;
    if (outcome.success) confidence += 0.2;
    return Math.min(confidence, 0.95);
  }

  it('starts at 0.5 baseline', () => {
    expect(calculateConfidence({})).toBe(0.5);
  });

  it('adds 0.1 for actions', () => {
    expect(calculateConfidence({ actions: [1] })).toBe(0.6);
  });

  it('adds 0.1 for value', () => {
    expect(calculateConfidence({ value: 100 })).toBe(0.6);
  });

  it('adds 0.1 for duration', () => {
    expect(calculateConfidence({ duration: 1000 })).toBe(0.6);
  });

  it('adds 0.2 for success', () => {
    expect(calculateConfidence({ success: true })).toBe(0.7);
  });

  it('caps at 0.95', () => {
    const outcome = { actions: [1, 2, 3], value: 100000, duration: 7200000, success: true };
    expect(calculateConfidence(outcome)).toBe(0.95);
  });
});
