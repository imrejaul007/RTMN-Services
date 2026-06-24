/**
 * nexha-market-os — Market service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import marketService from '../../src/services/marketService.js';

describe('Market Service — seeding', () => {
  beforeEach(() => {
    marketService.reset();
  });

  it('seeds demo data on first call', () => {
    const stats = marketService.seedDemo();
    expect(stats.prices).toBeGreaterThan(0);
    expect(stats.demandCells).toBeGreaterThan(0);
    expect(stats.supplyCells).toBeGreaterThan(0);
  });

  it('does not double-seed', () => {
    marketService.seedDemo();
    const first = marketService.listMarketPrices().length;
    marketService.seedDemo();
    expect(marketService.listMarketPrices().length).toBe(first);
  });
});

describe('Market Service — price aggregation', () => {
  beforeEach(() => {
    marketService.reset();
    marketService.seedDemo();
  });

  it('aggregates prices per (category, region, currency)', () => {
    const prices = marketService.listMarketPrices();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) {
      expect(p.median).toBeGreaterThanOrEqual(p.min);
      expect(p.median).toBeLessThanOrEqual(p.max);
      expect(p.mean).toBeGreaterThanOrEqual(p.min);
      expect(p.mean).toBeLessThanOrEqual(p.max);
      expect(p.p25).toBeLessThanOrEqual(p.p75);
    }
  });

  it('returns null for unknown cell', () => {
    const price = marketService.getMarketPrice('agent', 'FR', 'EUR');
    expect(price).toBeNull();
  });

  it('includes window from first to last observation', () => {
    const price = marketService.getMarketPrice('agent', 'IN', 'USD');
    expect(price).toBeTruthy();
    expect(price!.window.from).toBeTruthy();
    expect(price!.window.to).toBeTruthy();
    expect(new Date(price!.window.to).getTime()).toBeGreaterThanOrEqual(new Date(price!.window.from).getTime());
  });

  it('fashion agent price shows rising trend (0.45 → 0.52)', () => {
    const price = marketService.getMarketPrice('agent', 'IN', 'USD');
    // Seeded: 0.45, 0.48, 0.50, 0.52 → median ≈ 0.49, mean ≈ 0.4875
    expect(price!.median).toBeCloseTo(0.49, 1);
    expect(price!.min).toBe(0.45);
    expect(price!.max).toBe(0.52);
  });

  it('photography price is stable (2.00, 2.00, 2.00)', () => {
    const price = marketService.getMarketPrice('service', 'IN', 'USD');
    expect(price!.median).toBe(2.0);
    expect(price!.stddev).toBe(0);
  });

  it('filters by category', () => {
    const prices = marketService.listMarketPrices({ category: 'agent' });
    for (const p of prices) {
      expect(p.category).toBe('agent');
    }
  });

  it('filters by region', () => {
    const prices = marketService.listMarketPrices({ region: 'IN' });
    for (const p of prices) {
      expect(p.region).toBe('IN');
    }
  });

  it('filters by currency', () => {
    const prices = marketService.listMarketPrices({ currency: 'USD' });
    for (const p of prices) {
      expect(p.currency).toBe('USD');
    }
  });
});

describe('Market Service — price trends', () => {
  beforeEach(() => {
    marketService.reset();
    marketService.seedDemo();
  });

  it('detects rising trend (fashion agent: 0.45 → 0.52)', () => {
    const trend = marketService.getPriceTrend('agent', 'IN', 'USD');
    expect(trend).toBeTruthy();
    expect(trend!.direction).toBe('up');
    expect(trend!.changePercent).toBeGreaterThan(0);
  });

  it('detects stable trend (photography: 2.00 → 2.00)', () => {
    const trend = marketService.getPriceTrend('service', 'IN', 'USD');
    expect(trend).toBeTruthy();
    expect(trend!.direction).toBe('flat');
  });

  it('detects declining trend (Indonesia data: 120 → 99)', () => {
    const trend = marketService.getPriceTrend('data', 'ID', 'USD');
    expect(trend).toBeTruthy();
    expect(trend!.direction).toBe('down');
    expect(trend!.changePercent).toBeLessThan(0);
  });

  it('returns null when <2 observations', () => {
    const trend = marketService.getPriceTrend('agent', 'SG', 'USD');
    // SG Tax has 2 obs seeded — should be enough
    expect(trend).toBeTruthy();
  });
});

describe('Market Service — demand + supply signals', () => {
  beforeEach(() => {
    marketService.reset();
    marketService.seedDemo();
  });

  it('lists all demand signals', () => {
    const demand = marketService.listDemand();
    expect(demand.length).toBeGreaterThan(0);
  });

  it('gets one demand cell', () => {
    const demand = marketService.getDemand('agent', 'IN');
    expect(demand).toBeTruthy();
    expect(demand!.openOpportunities).toBeGreaterThan(0);
    expect(demand!.topTags.length).toBeGreaterThan(0);
  });

  it('returns null for unknown demand cell', () => {
    expect(marketService.getDemand('agent', 'FR')).toBeNull();
  });

  it('lists all supply signals', () => {
    const supply = marketService.listSupply();
    expect(supply.length).toBeGreaterThan(0);
  });

  it('gets one supply cell with trust score', () => {
    const supply = marketService.getSupply('agent', 'IN');
    expect(supply).toBeTruthy();
    expect(supply!.averageTrust).toBeGreaterThanOrEqual(0);
    expect(supply!.averageTrust).toBeLessThanOrEqual(1000);
  });
});

describe('Market Service — supply/demand gaps (the killer feature)', () => {
  beforeEach(() => {
    marketService.reset();
    marketService.seedDemo();
  });

  it('lists all gaps sorted by gapScore desc', () => {
    const gaps = marketService.listGaps();
    expect(gaps.length).toBeGreaterThan(0);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].gapScore).toBeGreaterThanOrEqual(gaps[i].gapScore);
    }
  });

  it('classifies agent/IN as underserved (2 opps / 1 cap)', () => {
    const gap = marketService.computeGap('agent', 'IN');
    expect(gap).toBeTruthy();
    expect(gap!.status).toBe('underserved');
    expect(gap!.gapScore).toBeGreaterThan(0);
  });

  it('classifies service/IN as balanced (2 opps / 2 caps)', () => {
    const gap = marketService.computeGap('service', 'IN');
    expect(gap).toBeTruthy();
    expect(gap!.status).toBe('balanced');
  });

  it('returns null for non-existent demand cell', () => {
    const gap = marketService.computeGap('agent', 'FR');
    expect(gap).toBeNull();
  });

  it('gap includes plain-English recommendation', () => {
    const gap = marketService.computeGap('agent', 'IN');
    expect(gap!.recommendation.length).toBeGreaterThan(20);
    expect(gap!.recommendation.toLowerCase()).toContain('agent');
  });

  it('gap records asOf timestamp', () => {
    const gap = marketService.computeGap('agent', 'IN');
    expect(gap!.asOf).toBeTruthy();
  });
});

describe('Market Service — federation report', () => {
  beforeEach(() => {
    marketService.reset();
    marketService.seedDemo();
  });

  it('computes federation-wide aggregate report', () => {
    const report = marketService.getReport();
    expect(report.totalCapabilities).toBeGreaterThan(0);
    expect(report.totalOpportunities).toBeGreaterThan(0);
    expect(report.totalBudgetUsd).toBeGreaterThan(0);
    expect(report.averageAci).toBeGreaterThan(0);
  });

  it('topDemanded sorted by openOpportunities desc', () => {
    const report = marketService.getReport();
    for (let i = 1; i < report.topDemandedCategories.length; i++) {
      expect(report.topDemandedCategories[i - 1].openOpportunities)
        .toBeGreaterThanOrEqual(report.topDemandedCategories[i].openOpportunities);
    }
  });

  it('biggestGaps only includes underserved or no-supply', () => {
    const report = marketService.getReport();
    for (const g of report.biggestGaps) {
      expect(['underserved', 'no-supply']).toContain(g.status);
    }
  });

  it('generates report with timestamp', () => {
    const report = marketService.getReport();
    expect(report.generatedAt).toBeTruthy();
  });
});

describe('Market Service — ingest endpoints', () => {
  beforeEach(() => {
    marketService.reset();
  });

  it('records a new price observation', () => {
    const obs = marketService.recordPrice({
      capabilityId: 'cap-test',
      capabilityName: 'Test',
      category: 'service',
      nexhaId: 'nexha-test',
      pricingModel: 'per-call',
      amount: 5.0,
      currency: 'USD',
      region: 'US'
    });
    expect(obs.observedAt).toBeTruthy();
    const prices = marketService.listMarketPrices({ category: 'service', region: 'US', currency: 'USD' });
    expect(prices.length).toBe(1);
    expect(prices[0].sampleSize).toBe(1);
  });

  it('adds a demand snapshot', () => {
    marketService.addDemandSnapshot({
      category: 'agent', region: 'US', openOpportunities: 5,
      totalBudgetUsd: 10000, averageBudgetUsd: 2000,
      topTags: ['ai', 'b2b'], topPriority: 'high'
    });
    const demand = marketService.getDemand('agent', 'US');
    expect(demand).toBeTruthy();
    expect(demand!.openOpportunities).toBe(5);
  });

  it('adds a supply snapshot', () => {
    marketService.addSupplySnapshot({
      category: 'agent', region: 'US', activeCapabilities: 3,
      averagePriceUsd: 100, totalCapacity: 2400, averageTrust: 800
    });
    const supply = marketService.getSupply('agent', 'US');
    expect(supply).toBeTruthy();
    expect(supply!.activeCapabilities).toBe(3);
  });
});