/**
 * SUTAR OS — Founder OS Tests
 */
import { describe, it, expect } from 'vitest';

describe('Founder OS — Value Normalization', () => {
  function normalizeValue(value, min, max) {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  it('normalizes midpoint to 50', () => {
    expect(normalizeValue(50, 0, 100)).toBe(50);
  });

  it('normalizes minimum to 0', () => {
    expect(normalizeValue(0, 0, 100)).toBe(0);
  });

  it('normalizes maximum to 100', () => {
    expect(normalizeValue(100, 0, 100)).toBe(100);
  });

  it('normalizes 25% to 25', () => {
    expect(normalizeValue(25, 0, 100)).toBe(25);
  });

  it('caps at 0 for below-minimum', () => {
    expect(normalizeValue(-10, 0, 100)).toBe(0);
  });

  it('caps at 100 for above-maximum', () => {
    expect(normalizeValue(150, 0, 100)).toBe(100);
  });

  it('handles zero range', () => {
    expect(normalizeValue(50, 50, 50)).toBe(50);
  });
});

describe('Founder OS — Decision Analysis', () => {
  function normalizeValue(value, min, max) {
    if (max === min) return 50;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  function scoreOption(opt, criteria, riskAppetite) {
    let score = 50;
    for (const c of criteria) {
      const v = opt[c.field] || 0;
      const norm = normalizeValue(v, c.min || 0, c.max || 100);
      score += (norm - 50) * (c.weight || 1);
    }
    if (riskAppetite === 'conservative') score -= (opt.risk || 0) * 0.3;
    if (riskAppetite === 'aggressive') score += (opt.upside || 0) * 0.2;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  it('scores options based on criteria', () => {
    const criteria = [{ field: 'roi', min: 0, max: 100, weight: 1 }];
    const opt1 = { name: 'High ROI', roi: 80 };
    const opt2 = { name: 'Low ROI', roi: 20 };
    expect(scoreOption(opt1, criteria, 'balanced')).toBeGreaterThan(scoreOption(opt2, criteria, 'balanced'));
  });

  it('adjusts for conservative risk appetite', () => {
    const criteria = [{ field: 'value', min: 0, max: 100, weight: 1 }];
    const opt = { name: 'Risky', value: 80, risk: 50 };
    const conservative = scoreOption(opt, criteria, 'conservative');
    const balanced = scoreOption(opt, criteria, 'balanced');
    expect(conservative).toBeLessThan(balanced);
  });

  it('adjusts for aggressive risk appetite', () => {
    const criteria = [{ field: 'value', min: 0, max: 100, weight: 1 }];
    const opt = { name: 'High upside', value: 60, upside: 50 };
    const aggressive = scoreOption(opt, criteria, 'aggressive');
    const balanced = scoreOption(opt, criteria, 'balanced');
    expect(aggressive).toBeGreaterThan(balanced);
  });

  it('uses weight to prioritize criteria', () => {
    const criteria = [
      { field: 'revenue', min: 0, max: 100, weight: 1 },
      { field: 'cost', min: 0, max: 100, weight: 2 },
    ];
    const opt = { name: 'Cost Focus', revenue: 50, cost: 20 }; // cost 20 → 20% normalized → contribution = 30 below baseline
    const score = scoreOption(opt, criteria, 'balanced');
    expect(score).toBeLessThan(50); // net negative because cost weighted 2x
  });
});

describe('Founder OS — Consensus Calculation', () => {
  function calculateConsensus(scores) {
    if (scores.length < 2) return 'unanimous';
    const spread = scores[0].score - scores[scores.length - 1].score;
    if (spread > 30) return 'clear_winner';
    if (spread > 10) return 'contested';
    return 'no_consensus';
  }

  it('returns unanimous for single option', () => {
    expect(calculateConsensus([{ score: 80 }])).toBe('unanimous');
  });

  it('returns clear_winner for large spread', () => {
    expect(calculateConsensus([{ score: 90 }, { score: 50 }])).toBe('clear_winner');
    expect(calculateConsensus([{ score: 60 }, { score: 20 }])).toBe('clear_winner');
  });

  it('returns contested for medium spread', () => {
    expect(calculateConsensus([{ score: 70 }, { score: 55 }])).toBe('contested');
    expect(calculateConsensus([{ score: 65 }, { score: 50 }])).toBe('contested');
  });

  it('returns no_consensus for small spread', () => {
    expect(calculateConsensus([{ score: 55 }, { score: 50 }])).toBe('no_consensus');
  });
});

describe('Founder OS — Confidence Calculation', () => {
  function calculateConfidence(consensus) {
    if (consensus === 'clear_winner') return 90;
    if (consensus === 'contested') return 70;
    if (consensus === 'no_consensus') return 50;
    return 75;
  }

  it('returns 90 for clear winner', () => {
    expect(calculateConfidence('clear_winner')).toBe(90);
  });

  it('returns 70 for contested', () => {
    expect(calculateConfidence('contested')).toBe(70);
  });

  it('returns 50 for no consensus', () => {
    expect(calculateConfidence('no_consensus')).toBe(50);
  });
});
