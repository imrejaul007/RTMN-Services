import { describe, it, expect } from 'vitest';

/**
 * SimulationOS Gateway Unit Tests
 */

function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function runMonteCarlo(model, iterations = 100) {
  const outcomes = [];
  for (let i = 0; i < iterations; i++) {
    const outcome = {};
    for (const [key, param] of Object.entries(model)) {
      if (typeof param.mean === 'number') {
        outcome[key] = randomNormal(param.mean, param.stdDev || param.mean * 0.1);
      } else {
        outcome[key] = param;
      }
    }
    outcomes.push(outcome);
  }
  return outcomes;
}

function calculateStatistics(outcomes, key) {
  const values = outcomes.map(o => o[key]).filter(v => typeof v === 'number');
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  return { mean: Math.round(mean * 100) / 100, count: values.length };
}

describe('SimulationOS - Monte Carlo', () => {
  it('should generate random outcomes', () => {
    const outcome = randomNormal(100, 10);
    expect(typeof outcome).toBe('number');
    expect(outcome).toBeGreaterThan(0);
  });

  it('should run multiple iterations', () => {
    const model = { revenue: { mean: 1000, stdDev: 100 } };
    const outcomes = runMonteCarlo(model, 50);
    expect(outcomes.length).toBe(50);
    expect(outcomes[0].revenue).toBeDefined();
  });

  it('should respect mean and stdDev', () => {
    const model = { value: { mean: 100, stdDev: 5 } };
    const outcomes = runMonteCarlo(model, 100);
    const avg = outcomes.reduce((s, o) => s + o.value, 0) / outcomes.length;
    expect(avg).toBeGreaterThan(80);
    expect(avg).toBeLessThan(120);
  });
});

describe('SimulationOS - Statistics', () => {
  it('should calculate mean', () => {
    const outcomes = [
      { value: 100 },
      { value: 200 },
      { value: 150 }
    ];
    const stats = calculateStatistics(outcomes, 'value');
    expect(stats.mean).toBe(150);
  });

  it('should handle empty outcomes', () => {
    const stats = calculateStatistics([], 'value');
    expect(stats).toBeNull();
  });

  it('should handle non-numeric values', () => {
    const outcomes = [
      { value: 'text' },
      { value: null }
    ];
    const stats = calculateStatistics(outcomes, 'value');
    expect(stats).toBeNull();
  });
});

describe('SimulationOS - Pricing Simulation', () => {
  it('should calculate price elasticity impact', () => {
    const currentPrice = 100;
    const currentDemand = 1000;
    const discount = 0.1;
    const elasticity = -1.5;

    const newPrice = currentPrice * (1 - discount);
    const priceChange = (newPrice - currentPrice) / currentPrice;
    const demandChange = elasticity * priceChange;
    const newDemand = currentDemand * (1 + demandChange);

    expect(newPrice).toBe(90);
    expect(demandChange).toBeCloseTo(0.15, 1);
    expect(newDemand).toBeGreaterThan(currentDemand); // Elasticity < 0 means price down = demand up
  });

  it('should calculate revenue impact', () => {
    const currentRevenue = 1000 * 100;
    const newPrice = 90;
    const newDemand = 1150;
    const newRevenue = newPrice * newDemand;

    expect(newRevenue).toBeGreaterThan(currentRevenue);
  });
});

describe('SimulationOS - Market Simulation', () => {
  it('should apply bullish modifier', () => {
    const marketSize = 1000000;
    const bullishModifier = 1.3;

    const projectedSize = marketSize * bullishModifier;
    expect(projectedSize).toBe(1300000);
  });

  it('should apply bearish modifier', () => {
    const marketSize = 1000000;
    const bearishModifier = 0.7;

    const projectedSize = marketSize * bearishModifier;
    expect(projectedSize).toBe(700000);
  });

  it('should calculate expected value', () => {
    const scenarios = [
      { probability: 0.5, revenue: 1000000 },
      { probability: 0.25, revenue: 1300000 },
      { probability: 0.25, revenue: 700000 }
    ];

    const expected = scenarios.reduce((sum, s) => sum + s.revenue * s.probability, 0);
    expect(expected).toBe(1000000);
  });
});

describe('SimulationOS - Company Simulation', () => {
  it('should calculate marketing impact', () => {
    const marketingSpend = 50000;
    const roi = 2.5;
    const revenueImpact = marketingSpend * roi;

    expect(revenueImpact).toBe(125000);
  });

  it('should calculate hiring impact', () => {
    const hiringCost = 200000;
    const currentProfit = 500000;

    const newProfit = currentProfit - hiringCost;
    expect(newProfit).toBe(300000);
  });

  it('should calculate automation savings', () => {
    const automationCost = 100000;
    const savingsRate = 0.5;
    const annualSavings = automationCost * savingsRate;

    expect(annualSavings).toBe(50000);
  });
});

describe('SimulationOS - Integration', () => {
  it('should model complete pricing decision', () => {
    const currentPrice = 99;
    const currentDemand = 1000;
    const elasticity = -1.5;
    const discount = 0.15;

    // Calculate new price
    const newPrice = currentPrice * (1 - discount);

    // Calculate demand change
    const priceChange = (newPrice - currentPrice) / currentPrice;
    const demandChange = elasticity * priceChange;
    const newDemand = Math.round(currentDemand * (1 + demandChange));

    // Calculate revenue
    const currentRevenue = currentPrice * currentDemand;
    const newRevenue = newPrice * newDemand;
    const revenueChange = ((newRevenue - currentRevenue) / currentRevenue) * 100;

    expect(newPrice).toBeCloseTo(84.15, 1);
    expect(demandChange).toBeCloseTo(0.225, 1);
    expect(revenueChange).toBeGreaterThan(0); // Price drop should increase revenue
  });

  it('should model market expansion decision', () => {
    const marketSize = 10000000;
    const currentShare = 0.1;
    const shareGrowth = 0.02;
    const avgPrice = 50;

    const currentRevenue = marketSize * currentShare * avgPrice;
    const newShare = currentShare + shareGrowth;
    const newRevenue = marketSize * newShare * avgPrice;

    expect(newRevenue).toBeGreaterThan(currentRevenue);
    // Share grows from 10% to 12%, so revenue grows by 20%
    expect((newRevenue - currentRevenue) / currentRevenue).toBeCloseTo(0.2, 1);
  });

  it('should compare investment options', () => {
    const options = [
      { name: 'marketing', investment: 100000, roi: 2.5, risk: 0.3 },
      { name: 'automation', investment: 200000, roi: 1.8, risk: 0.2 },
      { name: 'hiring', investment: 150000, roi: 1.5, risk: 0.4 }
    ];

    const scores = options.map(o => ({
      name: o.name,
      expectedReturn: o.investment * o.roi,
      riskAdjustedScore: (o.investment * o.roi) * (1 - o.risk)
    }));

    scores.sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);

    // Automation has highest risk-adjusted score: 200000 * 1.8 * 0.8 = 288000
    expect(scores[0].name).toBe('automation');
  });
});

describe('SimulationOS - Edge Cases', () => {
  it('should handle zero values', () => {
    const model = { value: { mean: 0, stdDev: 0 } };
    const outcomes = runMonteCarlo(model, 10);
    expect(outcomes.every(o => o.value === 0)).toBe(true);
  });

  it('should handle negative values', () => {
    const model = { value: { mean: -100, stdDev: 10 } };
    const outcomes = runMonteCarlo(model, 10);
    expect(outcomes.some(o => o.value < 0)).toBe(true);
  });

  it('should handle very large numbers', () => {
    const model = { value: { mean: 1000000000, stdDev: 100000000 } };
    const outcomes = runMonteCarlo(model, 10);
    const avg = outcomes.reduce((s, o) => s + o.value, 0) / outcomes.length;
    expect(avg).toBeGreaterThan(500000000);
  });
});
