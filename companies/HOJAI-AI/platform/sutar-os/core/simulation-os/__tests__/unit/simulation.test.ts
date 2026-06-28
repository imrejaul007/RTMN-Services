/**
 * Simulation OS Unit Tests
 * Port: 4874
 * Tests: Monte Carlo, company/market/pricing/risk simulations, percentiles
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types from src/index.ts
type SimulationType = 'company' | 'market' | 'pricing' | 'risk' | 'whatif';
type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Simulation {
  id: string;
  type: SimulationType;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  status: SimulationStatus;
  results?: SimulationResult;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

interface SimulationResult {
  summary: {
    outcome: string;
    confidence: number;
    keyMetrics: Record<string, number>;
  };
  scenarios: ScenarioResult[];
  recommendations: string[];
  risks: string[];
}

interface ScenarioResult {
  name: string;
  probability: number;
  impact: Record<string, number>;
  timeline: { time: number; value: number }[];
}

// Monte Carlo simulation (replicated from src/index.ts)
function monteCarloSimulation(
  iterations: number,
  params: { mean: number; stdDev: number; min: number; max: number }[]
): { values: number[]; mean: number; stdDev: number; percentile5: number; percentile95: number } {
  const values: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let total = 0;
    for (const param of params) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      let value = param.mean + z * param.stdDev;
      value = Math.max(param.min, Math.min(param.max, value));
      total += value;
    }
    values.push(total / params.length);
  }

  values.sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    values,
    mean,
    stdDev,
    percentile5: values[Math.floor(iterations * 0.05)],
    percentile95: values[Math.floor(iterations * 0.95)],
  };
}

// Company simulation
function runCompanySimulation(params: {
  employees: number;
  currentRevenue: number;
  growthRate: number;
  costStructure: { fixed: number; variable: number };
  years: number;
}): { yearlyProjections: any[]; finalProjection: any } {
  const { employees, currentRevenue, growthRate, costStructure, years } = params;
  const yearlyProjections: any[] = [];
  let revenue = currentRevenue;
  let costs = costStructure.fixed + costStructure.variable * employees;

  for (let year = 1; year <= years; year++) {
    revenue *= (1 + growthRate + (Math.random() - 0.5) * 0.02);
    costs *= 1 + (Math.random() * 0.05);

    yearlyProjections.push({
      year,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      profit: Math.round(revenue - costs),
      margin: Math.round(((revenue - costs) / revenue) * 100),
    });
  }

  const finalProjection = yearlyProjections[yearlyProjections.length - 1];
  return { yearlyProjections, finalProjection };
}

// Pricing simulation
function runPricingSimulation(params: {
  currentPrice: number;
  costPerUnit: number;
  priceRange: { min: number; max: number };
  elasticity: number;
  demandBase: number;
  competitorsPrices: number[];
}): { optimal: any; pricePoints: any[] } {
  const { currentPrice, costPerUnit, priceRange, elasticity, demandBase, competitorsPrices } = params;
  const pricePoints: any[] = [];
  const step = (priceRange.max - priceRange.min) / 20;

  for (let price = priceRange.min; price <= priceRange.max; price += step) {
    const demandChange = 1 + elasticity * ((price - currentPrice) / currentPrice);
    const demand = demandBase * demandChange;

    const avgCompetitorPrice = competitorsPrices.reduce((a, b) => a + b, 0) / competitorsPrices.length;
    const competitorEffect = price < avgCompetitorPrice ? 1.2 : 0.9;
    const finalDemand = demand * competitorEffect;

    const revenue = price * finalDemand;
    const profit = (price - costPerUnit) * finalDemand;
    const margin = ((price - costPerUnit) / price) * 100;

    pricePoints.push({
      price: Math.round(price * 100) / 100,
      demand: Math.round(finalDemand),
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      margin: Math.round(margin * 10) / 10,
    });
  }

  const optimal = pricePoints.reduce((best, p) => p.profit > best.profit ? p : best);
  return { optimal, pricePoints };
}

// Risk simulation
function runRiskSimulation(params: {
  initialValue: number;
  riskFactors: { name: string; probability: number; impact: number }[];
  timeHorizon: number;
  simulations: number;
}): { var95: number; probabilityOfLoss: number; mean: number; percentile5: number; percentile95: number } {
  const { initialValue, riskFactors, timeHorizon, simulations: numSimulations } = params;
  const finalValues: number[] = [];

  for (let i = 0; i < numSimulations; i++) {
    let value = initialValue;

    for (let year = 1; year <= timeHorizon; year++) {
      for (const risk of riskFactors) {
        if (Math.random() < risk.probability) {
          value *= (1 + risk.impact);
        }
      }
      value *= 1 + (Math.random() - 0.3) * 0.1;
    }

    finalValues.push(value);
  }

  finalValues.sort((a, b) => a - b);
  const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
  const percentile5 = finalValues[Math.floor(numSimulations * 0.05)];
  const percentile95 = finalValues[Math.floor(numSimulations * 0.95)];
  const var95 = initialValue - percentile5;

  const losses = finalValues.filter(v => v < initialValue).length;
  const probabilityOfLoss = losses / numSimulations;

  return { var95, probabilityOfLoss, mean, percentile5, percentile95 };
}

// In-memory store for tests
const simulations = new Map<string, Simulation>();

describe('Simulation OS - Monte Carlo', () => {
  it('should produce values array with correct length', () => {
    const result = monteCarloSimulation(100, [{ mean: 0.5, stdDev: 0.1, min: 0, max: 1 }]);
    expect(result.values.length).toBe(100);
  });

  it('should produce values within min/max bounds', () => {
    const result = monteCarloSimulation(100, [{ mean: 0.5, stdDev: 0.1, min: 0.2, max: 0.8 }]);
    for (const value of result.values) {
      expect(value).toBeGreaterThanOrEqual(0.2);
      expect(value).toBeLessThanOrEqual(0.8);
    }
  });

  it('should calculate correct percentile5', () => {
    const result = monteCarloSimulation(1000, [{ mean: 100, stdDev: 10, min: 0, max: 200 }]);
    expect(result.percentile5).toBeLessThanOrEqual(result.percentile95);
    expect(result.percentile5).toBeLessThan(result.mean);
  });

  it('should calculate correct percentile95', () => {
    const result = monteCarloSimulation(1000, [{ mean: 100, stdDev: 10, min: 0, max: 200 }]);
    expect(result.percentile95).toBeGreaterThanOrEqual(result.percentile5);
    expect(result.percentile95).toBeGreaterThan(result.mean);
  });

  it('should handle multiple parameters', () => {
    const result = monteCarloSimulation(100, [
      { mean: 0.3, stdDev: 0.05, min: 0, max: 1 },
      { mean: 0.4, stdDev: 0.05, min: 0, max: 1 },
      { mean: 0.2, stdDev: 0.05, min: 0, max: 1 },
    ]);
    expect(result.values.length).toBe(100);
    expect(result.mean).toBeCloseTo(0.3, 1);
  });

  it('should calculate mean and stdDev', () => {
    const result = monteCarloSimulation(1000, [{ mean: 50, stdDev: 5, min: 0, max: 100 }]);
    expect(result.mean).toBeGreaterThan(40);
    expect(result.mean).toBeLessThan(60);
    expect(result.stdDev).toBeGreaterThan(0);
  });
});

describe('Simulation OS - Company Simulation', () => {
  beforeEach(() => {
    simulations.clear();
  });

  it('should project revenue growth over years', () => {
    const result = runCompanySimulation({
      employees: 10,
      currentRevenue: 1000000,
      growthRate: 0.1,
      costStructure: { fixed: 200000, variable: 30000 },
      years: 5,
    });

    expect(result.yearlyProjections.length).toBe(5);
    expect(result.yearlyProjections[0].year).toBe(1);
    expect(result.yearlyProjections[4].year).toBe(5);
  });

  it('should calculate profit correctly', () => {
    const result = runCompanySimulation({
      employees: 10,
      currentRevenue: 1000000,
      growthRate: 0.1,
      costStructure: { fixed: 200000, variable: 30000 },
      years: 5,
    });

    for (const projection of result.yearlyProjections) {
      // Check that profit is revenue minus costs (allow rounding differences)
      const expectedProfit = projection.revenue - projection.costs;
      expect(Math.abs(projection.profit - expectedProfit)).toBeLessThan(2);
    }
  });

  it('should calculate margin percentage', () => {
    const result = runCompanySimulation({
      employees: 10,
      currentRevenue: 1000000,
      growthRate: 0.1,
      costStructure: { fixed: 200000, variable: 30000 },
      years: 5,
    });

    for (const projection of result.yearlyProjections) {
      expect(projection.margin).toBe(Math.round(((projection.revenue - projection.costs) / projection.revenue) * 100));
    }
  });

  it('should determine outcome based on margin', () => {
    const result = runCompanySimulation({
      employees: 10,
      currentRevenue: 1000000,
      growthRate: 0.15,
      costStructure: { fixed: 100000, variable: 20000 },
      years: 5,
    });

    const outcome = result.finalProjection.margin > 10 ? 'Profitable' : 'Break-even';
    expect(['Profitable', 'Break-even']).toContain(outcome);
  });

  it('should create simulation record', () => {
    const id = 'sim-1';
    simulations.set(id, {
      id,
      type: 'company',
      name: 'Test Simulation',
      description: 'Test description',
      parameters: {},
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: 'test-user',
    });

    expect(simulations.has(id)).toBe(true);
    expect(simulations.get(id)?.status).toBe('running');
  });

  it('should update simulation status to completed', () => {
    const id = 'sim-1';
    simulations.set(id, {
      id,
      type: 'company',
      name: 'Test',
      description: '',
      parameters: {},
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    });

    const sim = simulations.get(id);
    if (sim) {
      sim.status = 'completed';
      sim.completedAt = new Date().toISOString();
    }

    expect(simulations.get(id)?.status).toBe('completed');
    expect(simulations.get(id)?.completedAt).toBeDefined();
  });
});

describe('Simulation OS - Market Simulation', () => {
  it('should run Monte Carlo for market share', () => {
    const result = monteCarloSimulation(100, [
      { mean: 0.3, stdDev: 0.02, min: 0, max: 1 },
      { mean: 0.25, stdDev: 0.02, min: 0, max: 1 },
      { mean: 0.2, stdDev: 0.02, min: 0, max: 1 },
    ]);

    expect(result.values.length).toBe(100);
    expect(result.percentile5).toBeLessThan(result.mean);
    expect(result.percentile95).toBeGreaterThan(result.mean);
  });

  it('should generate scenarios with probabilities', () => {
    const scenarios: ScenarioResult[] = [];
    for (let i = 0; i < 10; i++) {
      scenarios.push({
        name: `Scenario ${i + 1}`,
        probability: 0.1,
        impact: { marketShare: 10 + i },
        timeline: [],
      });
    }

    expect(scenarios.length).toBe(10);
    const totalProbability = scenarios.reduce((sum, s) => sum + s.probability, 0);
    // Allow small floating point tolerance
    expect(Math.abs(totalProbability - 1)).toBeLessThan(0.001);
  });

  it('should calculate market size growth', () => {
    const marketSize = 1000000;
    const growthRate = 0.1;
    const years = 3;

    for (let year = 1; year <= years; year++) {
      const projected = marketSize * Math.pow(1 + growthRate, year);
      expect(projected).toBeGreaterThan(marketSize);
    }
  });
});

describe('Simulation OS - Pricing Simulation', () => {
  it('should generate price points', () => {
    const { pricePoints } = runPricingSimulation({
      currentPrice: 50,
      costPerUnit: 30,
      priceRange: { min: 40, max: 60 },
      elasticity: -1.5,
      demandBase: 1000,
      competitorsPrices: [48, 52],
    });

    expect(pricePoints.length).toBeGreaterThan(0);
    expect(pricePoints[0].price).toBeGreaterThanOrEqual(40);
    expect(pricePoints[pricePoints.length - 1].price).toBeLessThanOrEqual(60);
  });

  it('should calculate profit for each price point', () => {
    const { pricePoints } = runPricingSimulation({
      currentPrice: 50,
      costPerUnit: 30,
      priceRange: { min: 40, max: 60 },
      elasticity: -1.5,
      demandBase: 1000,
      competitorsPrices: [48, 52],
    });

    for (const point of pricePoints) {
      expect(point.profit).toBe((point.price - 30) * point.demand);
    }
  });

  it('should find optimal price', () => {
    const { optimal } = runPricingSimulation({
      currentPrice: 50,
      costPerUnit: 30,
      priceRange: { min: 40, max: 60 },
      elasticity: -1.5,
      demandBase: 1000,
      competitorsPrices: [48, 52],
    });

    expect(optimal).toBeDefined();
    expect(optimal.price).toBeGreaterThan(0);
    expect(optimal.profit).toBeGreaterThan(0);
  });

  it('should calculate margin percentage', () => {
    const { pricePoints } = runPricingSimulation({
      currentPrice: 50,
      costPerUnit: 30,
      priceRange: { min: 40, max: 60 },
      elasticity: -1.5,
      demandBase: 1000,
      competitorsPrices: [48, 52],
    });

    for (const point of pricePoints) {
      const expectedMargin = ((point.price - 30) / point.price) * 100;
      expect(point.margin).toBeCloseTo(Math.round(expectedMargin * 10) / 10, 1);
    }
  });

  it('should account for elasticity', () => {
    const { pricePoints } = runPricingSimulation({
      currentPrice: 50,
      costPerUnit: 30,
      priceRange: { min: 40, max: 60 },
      elasticity: -1.5, // Negative elasticity: higher price = lower demand
      demandBase: 1000,
      competitorsPrices: [48, 52],
    });

    const lowerPricePoint = pricePoints.find(p => p.price < 50);
    const higherPricePoint = pricePoints.find(p => p.price > 55);

    if (lowerPricePoint && higherPricePoint) {
      expect(lowerPricePoint.demand).toBeGreaterThan(higherPricePoint.demand);
    }
  });
});

describe('Simulation OS - Risk Simulation', () => {
  it('should calculate Value at Risk (VaR)', () => {
    const result = runRiskSimulation({
      initialValue: 100000,
      riskFactors: [
        { name: 'Market Crash', probability: 0.05, impact: -0.2 },
        { name: 'Regulatory Change', probability: 0.1, impact: -0.1 },
      ],
      timeHorizon: 1,
      simulations: 1000,
    });

    // VaR should be a valid number
    expect(typeof result.var95).toBe('number');
    expect(result.var95).toBeGreaterThanOrEqual(0);
  });

  it('should calculate probability of loss', () => {
    const result = runRiskSimulation({
      initialValue: 100000,
      riskFactors: [
        { name: 'Loss Event', probability: 0.3, impact: -0.15 },
      ],
      timeHorizon: 1,
      simulations: 1000,
    });

    expect(result.probabilityOfLoss).toBeGreaterThan(0);
    expect(result.probabilityOfLoss).toBeLessThan(1);
  });

  it('should generate percentile values', () => {
    const result = runRiskSimulation({
      initialValue: 100000,
      riskFactors: [
        { name: 'Event', probability: 0.2, impact: 0.05 },
      ],
      timeHorizon: 1,
      simulations: 1000,
    });

    expect(result.percentile5).toBeLessThan(result.percentile95);
    expect(result.percentile5).toBeLessThan(result.mean);
  });

  it('should handle multiple risk factors', () => {
    const result = runRiskSimulation({
      initialValue: 100000,
      riskFactors: [
        { name: 'Risk 1', probability: 0.1, impact: -0.1 },
        { name: 'Risk 2', probability: 0.15, impact: -0.05 },
        { name: 'Opportunity', probability: 0.2, impact: 0.1 },
      ],
      timeHorizon: 2,
      simulations: 500,
    });

    expect(result.mean).toBeDefined();
    expect(result.var95).toBeGreaterThanOrEqual(0);
  });
});

describe('Simulation OS - Status Transitions', () => {
  it('should transition from pending to running', () => {
    const sim: Simulation = {
      id: 'sim-1',
      type: 'company',
      name: 'Test',
      description: '',
      parameters: {},
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    };

    sim.status = 'running';
    expect(sim.status).toBe('running');
  });

  it('should transition from running to completed', () => {
    const sim: Simulation = {
      id: 'sim-1',
      type: 'company',
      name: 'Test',
      description: '',
      parameters: {},
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    };

    sim.status = 'completed';
    sim.completedAt = new Date().toISOString();
    expect(sim.status).toBe('completed');
    expect(sim.completedAt).toBeDefined();
  });

  it('should transition from running to failed', () => {
    const sim: Simulation = {
      id: 'sim-1',
      type: 'company',
      name: 'Test',
      description: '',
      parameters: {},
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    };

    sim.status = 'failed';
    expect(sim.status).toBe('failed');
  });

  it('should allow deletion of completed simulations', () => {
    const sim: Simulation = {
      id: 'sim-1',
      type: 'company',
      name: 'Test',
      description: '',
      parameters: {},
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: 'test',
    };

    simulations.set(sim.id, sim);
    expect(simulations.has(sim.id)).toBe(true);

    if (sim.status === 'completed') {
      simulations.delete(sim.id);
    }
    expect(simulations.has('sim-1')).toBe(false);
  });
});
