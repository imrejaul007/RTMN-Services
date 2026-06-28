/**
 * SUTAR OS — Simulation OS Tests
 */
import { describe, it, expect } from 'vitest';

describe('Simulation — Seeded Random', () => {
  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  it('produces deterministic sequence', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(99);
    const v1 = rng1();
    const v2 = rng2();
    expect(v1).not.toBe(v2);
  });

  it('produces values between 0 and 1', () => {
    const rng = seededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Simulation — Distribution Sampling', () => {
  function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  function sampleFrom(distribution, variable, rng) {
    const { min = 0, max = 100 } = variable;
    switch (distribution) {
      case 'uniform': return min + rng() * (max - min);
      case 'triangular': {
        const mode = variable.mode || ((min + max) / 2);
        const u = rng();
        const fc = (mode - min) / (max - min);
        if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
      case 'bernoulli': return rng() < (variable.probability || 0.5) ? (variable.successValue || 1) : (variable.failureValue || 0);
      default: return min + rng() * (max - min);
    }
  }

  it('uniform samples within range', () => {
    const rng = seededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = sampleFrom('uniform', { min: 10, max: 20 }, rng);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('uniform respects custom min/max', () => {
    const rng = seededRandom(456);
    for (let i = 0; i < 100; i++) {
      const v = sampleFrom('uniform', { min: 1000, max: 2000 }, rng);
      expect(v).toBeGreaterThanOrEqual(1000);
      expect(v).toBeLessThan(2000);
    }
  });

  it('triangular samples are bounded', () => {
    const rng = seededRandom(789);
    for (let i = 0; i < 100; i++) {
      const v = sampleFrom('triangular', { min: 0, max: 100 }, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('bernoulli returns success or failure value', () => {
    const rng = seededRandom(321);
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(sampleFrom('bernoulli', { probability: 0.5, successValue: 1, failureValue: 0 }, rng));
    }
    expect(results.has(1)).toBe(true);
    expect(results.has(0)).toBe(true);
  });

  it('bernoulli with 100% probability always returns success', () => {
    const rng = seededRandom(654);
    for (let i = 0; i < 10; i++) {
      expect(sampleFrom('bernoulli', { probability: 1, successValue: 10 }, rng)).toBe(10);
    }
  });
});

describe('Simulation — Monte Carlo Results', () => {
  function runMonteCarlo(variables, iterations) {
    const outcomes = [];
    const rng = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();

    for (let i = 0; i < iterations; i++) {
      let outcome = 0;
      for (const v of variables) {
        outcome += v.min + rng() * (v.max - v.min);
      }
      outcomes.push(outcome);
    }
    outcomes.sort((a, b) => a - b);

    const mean = outcomes.reduce((s, v) => s + v, 0) / outcomes.length;
    const p = (pct) => outcomes[Math.floor(pct * outcomes.length)];

    return { mean: Math.round(mean), p50: p(0.5), p95: p(0.95), min: outcomes[0], max: outcomes[outcomes.length - 1] };
  }

  it('computes mean of uniform distribution', () => {
    const result = runMonteCarlo([{ min: 0, max: 100 }], 10000);
    expect(result.mean).toBeGreaterThan(45);
    expect(result.mean).toBeLessThan(55);
  });

  it('p50 is within expected range', () => {
    const result = runMonteCarlo([{ min: 0, max: 100 }], 1000);
    expect(result.p50).toBeGreaterThan(40);
    expect(result.p50).toBeLessThan(60);
  });

  it('min is at least the minimum', () => {
    const result = runMonteCarlo([{ min: 10, max: 20 }], 100);
    expect(result.min).toBeGreaterThanOrEqual(10);
    expect(result.max).toBeLessThan(20);
  });

  it('p95 is in upper quartile', () => {
    const result = runMonteCarlo([{ min: 0, max: 100 }], 1000);
    expect(result.p95).toBeGreaterThan(result.p50);
  });

  it('handles multiple variables', () => {
    const result = runMonteCarlo([{ min: 0, max: 100 }, { min: 50, max: 150 }], 1000);
    expect(result.mean).toBeGreaterThan(95);
    expect(result.mean).toBeLessThan(105);
  });
});

describe('Simulation — Constraint Evaluation', () => {
  function evaluateConstraint(outcome, constraint) {
    switch (constraint.operator) {
      case '>': return outcome > constraint.value;
      case '>=': return outcome >= constraint.value;
      case '<': return outcome < constraint.value;
      case '<=': return outcome <= constraint.value;
      case '==': return outcome === constraint.value;
      default: return true;
    }
  }

  it('evaluates greater than', () => {
    expect(evaluateConstraint(100, { operator: '>', value: 50 })).toBe(true);
    expect(evaluateConstraint(100, { operator: '>', value: 100 })).toBe(false);
    expect(evaluateConstraint(49, { operator: '>', value: 50 })).toBe(false);
  });

  it('evaluates less than', () => {
    expect(evaluateConstraint(49, { operator: '<', value: 50 })).toBe(true);
    expect(evaluateConstraint(50, { operator: '<', value: 50 })).toBe(false);
  });

  it('evaluates greater than or equal', () => {
    expect(evaluateConstraint(50, { operator: '>=', value: 50 })).toBe(true);
    expect(evaluateConstraint(51, { operator: '>=', value: 50 })).toBe(true);
  });

  it('evaluates equality', () => {
    expect(evaluateConstraint(50, { operator: '==', value: 50 })).toBe(true);
    expect(evaluateConstraint(51, { operator: '==', value: 50 })).toBe(false);
  });
});
