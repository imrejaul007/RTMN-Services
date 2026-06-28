/**
 * Unit tests for Lookalike Generator
 */
import { describe, it, expect } from 'vitest';

function scoreCustomer(customer, profile) {
  let score = 0;
  let max = 0;

  for (const [key, weight] of Object.entries(profile.weights)) {
    max += weight;
    if (customer[key] === profile.ideal[key]) score += weight;
    else if (typeof profile.ideal[key] === 'number') {
      const diff = Math.abs(customer[key] - profile.ideal[key]);
      score += Math.max(0, weight - diff * weight / 10);
    }
  }

  return Math.round((score / max) * 100);
}

function generateLookalike(customers, topPercent = 10) {
  if (!customers.length) return null;
  const sorted = [...customers].sort((a, b) => (b.value || 0) - (a.value || 0));
  const top = sorted.slice(0, Math.ceil(customers.length * topPercent / 100));

  const profile = { ideal: {}, weights: {} };
  const keys = Object.keys(top[0] || {}).filter(k => k !== 'id' && k !== 'value');

  for (const key of keys) {
    const vals = top.map(c => c[key]).filter(v => typeof v === 'number');
    if (vals.length) {
      profile.ideal[key] = Math.round(vals.reduce((a, b) => a + b) / vals.length);
      profile.weights[key] = 10;
    }
  }

  return profile;
}

function rankAudience(customers, profile) {
  return customers
    .map(c => ({ ...c, lookalikeScore: scoreCustomer(c, profile) }))
    .sort((a, b) => b.lookalikeScore - a.lookalikeScore);
}

describe('Lookalike Generator', () => {
  it('should score customers against profile', () => {
    const profile = {
      ideal: { age: 30, income: 100000 },
      weights: { age: 5, income: 5 }
    };
    const customer = { age: 30, income: 100000 };
    expect(scoreCustomer(customer, profile)).toBe(100);
  });

  it('should penalize deviations', () => {
    const profile = {
      ideal: { age: 30 },
      weights: { age: 10 }
    };
    const c = { age: 20 };
    const score = scoreCustomer(c, profile);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it('should generate profile from top customers', () => {
    const customers = [
      { id: 1, age: 25, income: 80000, value: 1000 },
      { id: 2, age: 30, income: 90000, value: 2000 },
      { id: 3, age: 28, income: 85000, value: 1500 },
      { id: 4, age: 35, income: 120000, value: 500 },
      { id: 5, age: 40, income: 150000, value: 200 }
    ];
    const profile = generateLookalike(customers, 40);
    expect(profile).not.toBeNull();
    expect(profile.ideal.age).toBeGreaterThan(25);
    expect(profile.ideal.age).toBeLessThan(35);
  });

  it('should rank audience by lookalike score', () => {
    const profile = { ideal: { age: 30 }, weights: { age: 10 } };
    const customers = [
      { id: 1, age: 30 }, { id: 2, age: 35 }, { id: 3, age: 25 }
    ];
    const ranked = rankAudience(customers, profile);
    expect(ranked[0].id).toBe(1); // exact match
    expect(ranked[0].lookalikeScore).toBe(100);
  });
});
