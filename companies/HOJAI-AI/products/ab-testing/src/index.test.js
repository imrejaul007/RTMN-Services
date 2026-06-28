/**
 * Unit tests for A/B Testing
 */
import { describe, it, expect } from 'vitest';

function assignVariant(userId, variants) {
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const total = variants.reduce((a, v) => a + (v.weight || 1), 0);
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += (variant.weight || 1) / total;
    if ((hash % 100) / 100 < cumulative) return variant.id;
  }
  return variants[0].id;
}

function calculateSignificance(conversionsA, visitorsA, conversionsB, visitorsB) {
  if (!visitorsA || !visitorsB) return 0;
  const pA = conversionsA / visitorsA;
  const pB = conversionsB / visitorsB;
  const pooled = (conversionsA + conversionsB) / (visitorsA + visitorsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1/visitorsA + 1/visitorsB));
  if (se === 0) return 0;
  const z = Math.abs(pA - pB) / se;
  // Approximate p-value from z-score
  return Math.round((1 - Math.exp(-0.717 * z - 0.416 * z * z)) * 100);
}

function declareWinner(experiment) {
  if (!experiment.variants || experiment.variants.length < 2) return null;
  const sorted = [...experiment.variants].sort((a, b) => {
    const rateA = a.conversions / Math.max(1, a.visitors);
    const rateB = b.conversions / Math.max(1, b.visitors);
    return rateB - rateA;
  });
  const winner = sorted[0];
  const runnerUp = sorted[1];
  const lift = ((winner.conversions / winner.visitors) - (runnerUp.conversions / runnerUp.visitors)) / (runnerUp.conversions / runnerUp.visitors);
  return { winner: winner.id, lift: Math.round(lift * 100), confidence: winner.confidence || 95 };
}

describe('A/B Testing', () => {
  it('should assign variant based on user ID', () => {
    const variants = [{ id: 'control' }, { id: 'variant_a' }];
    const result1 = assignVariant('user123', variants);
    const result2 = assignVariant('user123', variants);
    expect(result1).toBe(result2); // deterministic
  });

  it('should distribute across variants', () => {
    const variants = [{ id: 'control', weight: 50 }, { id: 'variant', weight: 50 }];
    const assignments = { control: 0, variant: 0 };
    for (let i = 0; i < 100; i++) {
      assignments[assignVariant(`user${i}`, variants)]++;
    }
    // Should have roughly equal distribution
    expect(assignments.control).toBeGreaterThan(30);
    expect(assignments.variant).toBeGreaterThan(30);
  });

  it('should calculate statistical significance', () => {
    const sig = calculateSignificance(100, 1000, 80, 1000);
    expect(sig).toBeGreaterThan(0);
    expect(sig).toBeLessThan(100);
  });

  it('should handle zero visitors', () => {
    expect(calculateSignificance(10, 0, 10, 100)).toBe(0);
  });

  it('should declare winner', () => {
    const exp = {
      variants: [
        { id: 'control', visitors: 1000, conversions: 50 },
        { id: 'variant', visitors: 1000, conversions: 75 }
      ]
    };
    const winner = declareWinner(exp);
    expect(winner.winner).toBe('variant');
    expect(winner.lift).toBeGreaterThan(0);
  });
});
