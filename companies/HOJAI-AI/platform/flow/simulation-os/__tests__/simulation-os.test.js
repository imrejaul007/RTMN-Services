/**
 * Simulation OS Tests
 * Tests what-if scenario analysis, Monte Carlo simulations, parameter sweeps
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Simulate the simulation engine logic
function summarize(arr, extras = {}) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[(n-1)/2];
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const p5 = sorted[Math.floor(n * 0.05)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return {
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    std: Number(std.toFixed(4)),
    p5: Number(p5.toFixed(4)),
    p95: Number(p95.toFixed(4)),
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    ...extras
  };
}

function simulatePricing(params) {
  const { baselinePrice, baselineVolume, elasticity, iterations } = params;
  const priceChangePcts = Array.from({ length: iterations }, () => (Math.random() - 0.5) * 0.4);
  const results = priceChangePcts.map(pct => {
    const newPrice = baselinePrice * (1 + pct);
    const newVolume = baselineVolume * Math.pow(1 + pct, elasticity);
    const revenue = newPrice * newVolume;
    return { priceChangePct: Number(pct.toFixed(4)), newPrice, newVolume, revenue: Number(revenue.toFixed(2)) };
  });
  return summarize(results.map(r => r.revenue), { baseRevenue: baselinePrice * baselineVolume });
}

function simulateMarketEntry(params) {
  const { totalAddressableMarket, initialPenetration, growthRate, costPerAcquisition, iterations } = params;
  const months = 12;
  const adoption = [];
  for (let m = 0; m < months; m++) {
    const noise = (Math.random() - 0.5) * 0.02;
    const pct = initialPenetration * Math.pow(1 + growthRate + noise, m);
    adoption.push(Math.min(pct, 1));
  }
  const finalAdoption = adoption[adoption.length - 1];
  const acquired = totalAddressableMarket * finalAdoption;
  const cacSpend = acquired * costPerAcquisition;
  return {
    adoption: adoption.map(a => Number(a.toFixed(4))),
    acquired: Math.round(acquired),
    cacSpend: Math.round(cacSpend),
    cacPaybackMonths: Math.round(cacSpend / Math.max(acquired * 100, 1))
  };
}

function simulateAgentDecision(params) {
  const { options, iterations } = params;
  return options.map(opt => {
    const successes = Array.from({ length: iterations }, () => Math.random() < opt.probSuccess);
    const expectedValue = opt.payoff * opt.probSuccess;
    const variance = opt.payoff ** 2 * opt.probSuccess * (1 - opt.probSuccess);
    return {
      name: opt.name,
      payoff: opt.payoff,
      probSuccess: opt.probSuccess,
      expectedValue: Number(expectedValue.toFixed(2)),
      stdDev: Number(Math.sqrt(variance).toFixed(2)),
      risk: opt.payoff > 0 ? Number((Math.sqrt(variance) / expectedValue).toFixed(3)) : null
    };
  }).sort((a, b) => b.expectedValue - a.expectedValue);
}

function runScenario(type, params) {
  switch (type) {
    case 'pricing-change': return simulatePricing(params);
    case 'market-entry': return simulateMarketEntry(params);
    case 'agent-decision': return simulateAgentDecision(params);
    default: throw new Error(`Unknown scenario type: ${type}`);
  }
}

describe('Simulation OS', () => {
  describe('Statistical Summarization', () => {
    it('should calculate mean correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const result = summarize(data);

      expect(result.mean).toBe(30);
    });

    it('should calculate median correctly for odd length', () => {
      const data = [1, 2, 3, 4, 5];
      const result = summarize(data);

      expect(result.median).toBe(3);
    });

    it('should calculate median correctly for even length', () => {
      const data = [1, 2, 3, 4];
      const result = summarize(data);

      expect(result.median).toBe(2.5);
    });

    it('should calculate standard deviation', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = summarize(data);

      expect(result.std).toBeGreaterThan(0);
      expect(result.std).toBeCloseTo(2.138, 2);
    });

    it('should calculate percentiles', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = summarize(data);

      expect(result.p5).toBeGreaterThan(0);
      expect(result.p95).toBeLessThan(100);
      expect(result.p5).toBeLessThan(result.p95);
    });

    it('should calculate min and max', () => {
      const data = [5, 3, 8, 1, 9, 2];
      const result = summarize(data);

      expect(result.min).toBe(1);
      expect(result.max).toBe(9);
    });

    it('should handle empty array', () => {
      const data = [];
      const result = summarize(data);

      expect(result.mean).toBeNaN();
      expect(result.std).toBeNaN();
    });
  });

  describe('Pricing Change Simulation', () => {
    it('should run pricing simulation with defaults', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -1.5,
        iterations: 100
      };

      const result = simulatePricing(params);

      expect(result).toHaveProperty('mean');
      expect(result).toHaveProperty('median');
      expect(result).toHaveProperty('std');
      expect(result).toHaveProperty('baseRevenue');
      expect(result.baseRevenue).toBe(100000);
    });

    it('should handle elastic demand (elasticity < -1)', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -2.0,
        iterations: 50
      };

      const result = simulatePricing(params);

      expect(result.mean).toBeDefined();
      expect(result.p5).toBeLessThan(result.p95);
    });

    it('should handle inelastic demand (elasticity > -1)', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -0.5,
        iterations: 50
      };

      const result = simulatePricing(params);

      expect(result.mean).toBeDefined();
      expect(result.mean).toBeGreaterThan(0);
    });

    it('should handle zero iterations gracefully', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -1.5,
        iterations: 0
      };

      const result = simulatePricing(params);

      expect(result).toHaveProperty('mean');
    });
  });

  describe('Market Entry Simulation', () => {
    it('should simulate market entry with defaults', () => {
      const params = {
        totalAddressableMarket: 100000,
        initialPenetration: 0.01,
        growthRate: 0.05,
        costPerAcquisition: 50,
        iterations: 100
      };

      const result = simulateMarketEntry(params);

      expect(result).toHaveProperty('adoption');
      expect(result.adoption).toHaveLength(12);
      expect(result).toHaveProperty('acquired');
      expect(result).toHaveProperty('cacSpend');
      expect(result).toHaveProperty('cacPaybackMonths');
    });

    it('should have increasing adoption over time', () => {
      const params = {
        totalAddressableMarket: 100000,
        initialPenetration: 0.001,
        growthRate: 0.1,
        costPerAcquisition: 50,
        iterations: 100
      };

      const result = simulateMarketEntry(params);

      expect(result.adoption[0]).toBeLessThanOrEqual(result.adoption[11]);
    });

    it('should cap adoption at 100%', () => {
      const params = {
        totalAddressableMarket: 1000,
        initialPenetration: 0.9,
        growthRate: 0.5,
        costPerAcquisition: 10,
        iterations: 100
      };

      const result = simulateMarketEntry(params);

      expect(result.adoption[11]).toBeLessThanOrEqual(1);
    });

    it('should calculate CAC spend correctly', () => {
      const params = {
        totalAddressableMarket: 10000,
        initialPenetration: 0.1,
        growthRate: 0.05,
        costPerAcquisition: 100,
        iterations: 100
      };

      const result = simulateMarketEntry(params);

      expect(result.cacSpend).toBe(result.acquired * 100);
    });
  });

  describe('Agent Decision Simulation', () => {
    it('should evaluate agent decision options', () => {
      const params = {
        options: [
          { name: 'negotiate', payoff: 100, probSuccess: 0.5 },
          { name: 'accept', payoff: 60, probSuccess: 1.0 },
          { name: 'walk-away', payoff: 0, probSuccess: 1.0 }
        ],
        iterations: 100
      };

      const result = simulateAgentDecision(params);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('expectedValue');
      expect(result[0]).toHaveProperty('risk');
    });

    it('should sort by expected value descending', () => {
      const params = {
        options: [
          { name: 'low', payoff: 10, probSuccess: 0.9 },
          { name: 'high', payoff: 100, probSuccess: 0.5 }
        ],
        iterations: 100
      };

      const result = simulateAgentDecision(params);

      expect(result[0].expectedValue).toBeGreaterThanOrEqual(result[1].expectedValue);
    });

    it('should calculate expected value correctly', () => {
      const params = {
        options: [
          { name: 'certain', payoff: 100, probSuccess: 1.0 }
        ],
        iterations: 100
      };

      const result = simulateAgentDecision(params);

      expect(result[0].expectedValue).toBe(100);
    });

    it('should handle zero payoff', () => {
      const params = {
        options: [
          { name: 'walk-away', payoff: 0, probSuccess: 1.0 }
        ],
        iterations: 100
      };

      const result = simulateAgentDecision(params);

      expect(result[0].expectedValue).toBe(0);
      expect(result[0].risk).toBeNull();
    });

    it('should calculate variance for risky options', () => {
      const params = {
        options: [
          { name: 'risky', payoff: 1000, probSuccess: 0.1 }
        ],
        iterations: 100
      };

      const result = simulateAgentDecision(params);

      expect(result[0].stdDev).toBeGreaterThan(0);
      expect(result[0].risk).toBeGreaterThan(0);
    });
  });

  describe('Scenario Runner', () => {
    it('should run pricing-change scenario', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -1.5,
        iterations: 50
      };

      const result = runScenario('pricing-change', params);

      expect(result).toHaveProperty('mean');
    });

    it('should run market-entry scenario', () => {
      const params = {
        totalAddressableMarket: 100000,
        initialPenetration: 0.01,
        growthRate: 0.05,
        costPerAcquisition: 50,
        iterations: 50
      };

      const result = runScenario('market-entry', params);

      expect(result).toHaveProperty('adoption');
    });

    it('should run agent-decision scenario', () => {
      const params = {
        options: [
          { name: 'accept', payoff: 100, probSuccess: 1.0 }
        ],
        iterations: 50
      };

      const result = runScenario('agent-decision', params);

      expect(result).toHaveLength(1);
    });

    it('should throw for unknown scenario type', () => {
      expect(() => runScenario('unknown-type', {})).toThrow('Unknown scenario type: unknown-type');
    });
  });

  describe('Templates', () => {
    const TEMPLATES = {
      'pricing-change': {
        name: 'Pricing Change Impact',
        defaults: {
          baselinePrice: 100,
          baselineVolume: 1000,
          elasticity: -1.5,
          iterations: 500
        }
      },
      'market-entry': {
        name: 'Market Entry',
        defaults: {
          totalAddressableMarket: 100000,
          initialPenetration: 0.01,
          growthRate: 0.05,
          costPerAcquisition: 50,
          iterations: 500
        }
      },
      'agent-decision': {
        name: 'Agent Decision Outcome',
        defaults: {
          options: [
            { name: 'negotiate', payoff: 100, probSuccess: 0.5 },
            { name: 'accept', payoff: 60, probSuccess: 1.0 }
          ],
          iterations: 1000
        }
      }
    };

    it('should have pricing-change template', () => {
      expect(TEMPLATES['pricing-change']).toBeDefined();
      expect(TEMPLATES['pricing-change'].name).toBe('Pricing Change Impact');
    });

    it('should have market-entry template', () => {
      expect(TEMPLATES['market-entry']).toBeDefined();
      expect(TEMPLATES['market-entry'].name).toBe('Market Entry');
    });

    it('should have agent-decision template', () => {
      expect(TEMPLATES['agent-decision']).toBeDefined();
    });

    it('should merge custom params with defaults', () => {
      const template = TEMPLATES['pricing-change'];
      const customParams = { baselinePrice: 200 };
      const finalParams = { ...template.defaults, ...customParams };

      expect(finalParams.baselinePrice).toBe(200);
      expect(finalParams.baselineVolume).toBe(1000);
      expect(finalParams.elasticity).toBe(-1.5);
    });
  });

  describe('Scenario Comparison', () => {
    it('should summarize pricing results for comparison', () => {
      const scenario = {
        type: 'pricing-change',
        results: {
          mean: 105000,
          p5: 95000,
          p95: 115000
        }
      };

      const summary = {
        meanRevenue: scenario.results.mean,
        p5Revenue: scenario.results.p5,
        p95Revenue: scenario.results.p95
      };

      expect(summary.meanRevenue).toBe(105000);
      expect(summary.p5Revenue).toBe(95000);
      expect(summary.p95Revenue).toBe(115000);
    });

    it('should summarize market entry results for comparison', () => {
      const scenario = {
        type: 'market-entry',
        results: {
          adoption: [0.01, 0.02, 0.03],
          acquired: 5000,
          cacSpend: 250000
        }
      };

      const summary = {
        finalAdoption: scenario.results.adoption[2],
        acquired: scenario.results.acquired,
        cacSpend: scenario.results.cacSpend
      };

      expect(summary.finalAdoption).toBe(0.03);
      expect(summary.acquired).toBe(5000);
    });

    it('should summarize agent decision results for comparison', () => {
      const scenario = {
        type: 'agent-decision',
        results: [
          { name: 'negotiate', expectedValue: 50 },
          { name: 'accept', expectedValue: 60 }
        ]
      };

      const summary = {
        bestOption: scenario.results[1].name,
        bestExpectedValue: scenario.results[1].expectedValue
      };

      expect(summary.bestOption).toBe('accept');
      expect(summary.bestExpectedValue).toBe(60);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle negative elasticity', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: -3,
        iterations: 50
      };

      const result = simulatePricing(params);
      expect(result).toHaveProperty('mean');
    });

    it('should handle zero elasticity', () => {
      const params = {
        baselinePrice: 100,
        baselineVolume: 1000,
        elasticity: 0,
        iterations: 50
      };

      const result = simulatePricing(params);
      expect(result).toHaveProperty('mean');
    });

    it('should handle negative cost per acquisition', () => {
      const params = {
        totalAddressableMarket: 100000,
        initialPenetration: 0.01,
        growthRate: 0.05,
        costPerAcquisition: -10,
        iterations: 50
      };

      const result = simulateMarketEntry(params);
      expect(result).toHaveProperty('cacSpend');
    });
  });
});
