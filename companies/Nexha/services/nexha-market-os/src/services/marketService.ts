/**
 * MarketOS — Market intelligence engine
 *
 * Aggregates data from CapabilityOS (supply) + OpportunityOS (demand) +
 * ReputationOS (trust) to produce market intelligence:
 *   - Market prices (median, mean, distribution) by category × region × currency
 *   - Demand signals (count, total budget, top tags) by category × region
 *   - Supply signals (count, avg trust, total capacity) by category × region
 *   - Supply/demand gaps with classification + recommendation
 *   - Price trends (old → new)
 *   - Federation-wide report
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PriceObservation,
  MarketPrice,
  DemandSignal,
  SupplySignal,
  MarketGap,
  PriceTrend,
  MarketReport,
  Currency
} from '../types/index.js';

// ─────────────────────────────────────────────────────────────────
// Currency conversion (FX rates for aggregation to USD)
// ─────────────────────────────────────────────────────────────────
const FX_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
  IDR: 0.000063,
  SGD: 0.74,
  AED: 0.272,
  JPY: 0.0066,
  AUD: 0.66
};

function toUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency] ?? 1.0;
  return amount * rate;
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────
class MarketService {
  /** Price observations: index by (category, region, currency) for fast lookup */
  private prices: PriceObservation[] = [];

  /** Demand signal cache — computed on demand from opportunities snapshot */
  private demandSnapshot: Array<{
    category: string;
    region: string;
    openOpportunities: number;
    totalBudgetUsd: number;
    averageBudgetUsd: number;
    topTags: string[];
    topPriority: 'low' | 'normal' | 'high' | 'urgent';
  }> = [];

  /** Supply signal cache */
  private supplySnapshot: Array<{
    category: string;
    region: string;
    activeCapabilities: number;
    averagePriceUsd: number;
    totalCapacity: number;
    averageTrust: number;
  }> = [];

  // ───────────────────────────────────────────────────────────────
  // Seed demo data
  // ───────────────────────────────────────────────────────────────
  seedDemo(): { prices: number; demandCells: number; supplyCells: number } {
    if (this.prices.length > 0) {
      return {
        prices: this.prices.length,
        demandCells: this.demandSnapshot.length,
        supplyCells: this.supplySnapshot.length
      };
    }

    const now = new Date().toISOString();
    const baseDate = new Date(Date.now() - 30 * 24 * 3600 * 1000); // 30 days ago

    // Seed price observations over time (for trend analysis)
    // baseDate = 30 days ago, so daysAgo=0 = OLDEST, daysAgo=30 = NEWEST
    type SeedPriceObs = Omit<PriceObservation, 'observedAt' | 'id'> & { daysAgo: number };
    const seedPriceObs: SeedPriceObs[] = [
      // Fashion agent pricing trend (rising: 0.45 → 0.52)
      { capabilityId: 'cap-maya-merchant', capabilityName: 'AI Fashion Negotiation', category: 'agent', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 0.45, currency: 'USD', region: 'IN', daysAgo: 0 },
      { capabilityId: 'cap-maya-merchant', capabilityName: 'AI Fashion Negotiation', category: 'agent', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 0.48, currency: 'USD', region: 'IN', daysAgo: 10 },
      { capabilityId: 'cap-maya-merchant', capabilityName: 'AI Fashion Negotiation', category: 'agent', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 0.50, currency: 'USD', region: 'IN', daysAgo: 20 },
      { capabilityId: 'cap-maya-merchant', capabilityName: 'AI Fashion Negotiation', category: 'agent', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 0.52, currency: 'USD', region: 'IN', daysAgo: 30 },

      // Photography pricing (stable: 2.00 throughout)
      { capabilityId: 'cap-maya-photo', capabilityName: 'AI Product Photography', category: 'service', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 2.00, currency: 'USD', region: 'IN', daysAgo: 0 },
      { capabilityId: 'cap-maya-photo', capabilityName: 'AI Product Photography', category: 'service', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 2.00, currency: 'USD', region: 'IN', daysAgo: 15 },
      { capabilityId: 'cap-maya-photo', capabilityName: 'AI Product Photography', category: 'service', nexhaId: 'nexha-maya-collective', pricingModel: 'per-call', amount: 2.00, currency: 'USD', region: 'IN', daysAgo: 30 },

      // Mumbai delivery (rising: 70 → 80)
      { capabilityId: 'cap-mumbai-delivery', capabilityName: 'Mumbai Same-Day Delivery', category: 'service', nexhaId: 'nexha-logistics-mumbai', pricingModel: 'per-transaction', amount: 70, currency: 'INR', region: 'IN', daysAgo: 0 },
      { capabilityId: 'cap-mumbai-delivery', capabilityName: 'Mumbai Same-Day Delivery', category: 'service', nexhaId: 'nexha-logistics-mumbai', pricingModel: 'per-transaction', amount: 75, currency: 'INR', region: 'IN', daysAgo: 15 },
      { capabilityId: 'cap-mumbai-delivery', capabilityName: 'Mumbai Same-Day Delivery', category: 'service', nexhaId: 'nexha-logistics-mumbai', pricingModel: 'per-transaction', amount: 80, currency: 'INR', region: 'IN', daysAgo: 30 },

      // SG Tax (subscription, stable: 499 throughout)
      { capabilityId: 'cap-tax-advisor', capabilityName: 'AI Tax Advisor (SG/IN)', category: 'agent', nexhaId: 'nexha-finance-singapore', pricingModel: 'subscription', amount: 499, currency: 'USD', region: 'SG', daysAgo: 0 },
      { capabilityId: 'cap-tax-advisor', capabilityName: 'AI Tax Advisor (SG/IN)', category: 'agent', nexhaId: 'nexha-finance-singapore', pricingModel: 'subscription', amount: 499, currency: 'USD', region: 'SG', daysAgo: 30 },

      // Contract review (stable: 50 throughout)
      { capabilityId: 'cap-contract-review', capabilityName: 'AI Contract Review', category: 'service', nexhaId: 'nexha-legal-london', pricingModel: 'per-call', amount: 50, currency: 'GBP', region: 'GB', daysAgo: 0 },
      { capabilityId: 'cap-contract-review', capabilityName: 'AI Contract Review', category: 'service', nexhaId: 'nexha-legal-london', pricingModel: 'per-call', amount: 50, currency: 'GBP', region: 'GB', daysAgo: 30 },

      // Indonesia data (declining: 99 → 80)
      { capabilityId: 'cap-indo-prices', capabilityName: 'Indonesia Retail Price Index', category: 'data', nexhaId: 'nexha-data-jakarta', pricingModel: 'subscription', amount: 99, currency: 'USD', region: 'ID', daysAgo: 0 },
      { capabilityId: 'cap-indo-prices', capabilityName: 'Indonesia Retail Price Index', category: 'data', nexhaId: 'nexha-data-jakarta', pricingModel: 'subscription', amount: 89, currency: 'USD', region: 'ID', daysAgo: 15 },
      { capabilityId: 'cap-indo-prices', capabilityName: 'Indonesia Retail Price Index', category: 'data', nexhaId: 'nexha-data-jakarta', pricingModel: 'subscription', amount: 80, currency: 'USD', region: 'ID', daysAgo: 30 }
    ];

    for (const seed of seedPriceObs) {
      const observedAt = new Date(baseDate.getTime() + seed.daysAgo * 24 * 3600 * 1000).toISOString();
      const { daysAgo: _, ...rest } = seed;
      this.prices.push({ ...rest, observedAt });
    }

    // Seed demand snapshot (from opportunity demographics)
    this.demandSnapshot = [
      { category: 'agent', region: 'IN', openOpportunities: 2, totalBudgetUsd: 250500, averageBudgetUsd: 125250, topTags: ['fashion', 'procurement', 'negotiation', 'sourcing', 'b2b'], topPriority: 'high' },
      { category: 'service', region: 'IN', openOpportunities: 2, totalBudgetUsd: 1010, averageBudgetUsd: 505, topTags: ['mumbai', 'same-day', 'fashion', 'ai', 'photography'], topPriority: 'urgent' },
      { category: 'agent', region: 'SG', openOpportunities: 1, totalBudgetUsd: 499, averageBudgetUsd: 499, topTags: ['tax', 'finance', 'singapore', 'india', 'compliance'], topPriority: 'normal' },
      { category: 'service', region: 'GB', openOpportunities: 1, totalBudgetUsd: 2500, averageBudgetUsd: 2500, topTags: ['legal', 'contracts', 'common-law', 'review', 'm&a'], topPriority: 'high' },
      { category: 'data', region: 'ID', openOpportunities: 1, totalBudgetUsd: 99, averageBudgetUsd: 99, topTags: ['prices', 'indonesia', 'retail', 'commodities', 'real-time'], topPriority: 'normal' }
    ];

    // Seed supply snapshot
    this.supplySnapshot = [
      { category: 'agent', region: 'IN', activeCapabilities: 1, averagePriceUsd: 0.5, totalCapacity: 990, averageTrust: 990 },
      { category: 'service', region: 'IN', activeCapabilities: 2, averagePriceUsd: 41, totalCapacity: 1757, averageTrust: 879 },
      { category: 'agent', region: 'SG', activeCapabilities: 1, averagePriceUsd: 499, totalCapacity: 720, averageTrust: 720 },
      { category: 'service', region: 'GB', activeCapabilities: 1, averagePriceUsd: 63.5, totalCapacity: 780, averageTrust: 780 },
      { category: 'data', region: 'ID', activeCapabilities: 1, averagePriceUsd: 99, totalCapacity: 580, averageTrust: 580 }
    ];

    return {
      prices: this.prices.length,
      demandCells: this.demandSnapshot.length,
      supplyCells: this.supplySnapshot.length
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Add new price observations (in production: called by CapabilityOS via webhook)
  // ───────────────────────────────────────────────────────────────
  recordPrice(obs: Omit<PriceObservation, 'observedAt'>): PriceObservation {
    const full: PriceObservation = { ...obs, observedAt: new Date().toISOString() };
    this.prices.push(full);
    return full;
  }

  // ───────────────────────────────────────────────────────────────
  // Market price aggregation
  // ───────────────────────────────────────────────────────────────
  getMarketPrice(category: string, region: string, currency: string): MarketPrice | null {
    const observations = this.prices.filter(
      (p) => p.category === category && p.region === region && p.currency === currency
    );
    if (observations.length === 0) return null;
    return this.aggregatePrices(observations);
  }

  listMarketPrices(filter: { category?: string; region?: string; currency?: string } = {}): MarketPrice[] {
    const cells = new Map<string, PriceObservation[]>();
    for (const p of this.prices) {
      if (filter.category && p.category !== filter.category) continue;
      if (filter.region && p.region !== filter.region) continue;
      if (filter.currency && p.currency !== filter.currency) continue;
      const key = `${p.category}|${p.region}|${p.currency}`;
      const arr = cells.get(key) ?? [];
      arr.push(p);
      cells.set(key, arr);
    }
    const out: MarketPrice[] = [];
    for (const arr of cells.values()) {
      out.push(this.aggregatePrices(arr));
    }
    return out.sort((a, b) => b.sampleSize - a.sampleSize);
  }

  private aggregatePrices(observations: PriceObservation[]): MarketPrice {
    const sortedByTime = [...observations].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
    const amounts = sortedByTime.map((o) => o.amount);
    const n = amounts.length;
    const sum = amounts.reduce((s, x) => s + x, 0);
    const mean = sum / n;
    // For min/max/median/quartiles, sort by amount (not by time)
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sortedAmounts[n / 2 - 1] + sortedAmounts[n / 2]) / 2
      : sortedAmounts[Math.floor(n / 2)];
    const min = sortedAmounts[0];
    const max = sortedAmounts[n - 1];
    const variance = amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);
    const p25 = n >= 4 ? sortedAmounts[Math.floor(n * 0.25)] : min;
    const p75 = n >= 4 ? sortedAmounts[Math.floor(n * 0.75)] : max;

    return {
      category: sortedByTime[0].category,
      region: sortedByTime[0].region,
      currency: sortedByTime[0].currency,
      median: Math.round(median * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      sampleSize: n,
      p25: Math.round(p25 * 100) / 100,
      p75: Math.round(p75 * 100) / 100,
      stddev: Math.round(stddev * 100) / 100,
      window: { from: sortedByTime[0].observedAt, to: sortedByTime[n - 1].observedAt }
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Price trends
  // ───────────────────────────────────────────────────────────────
  getPriceTrend(category: string, region: string, currency: string): PriceTrend | null {
    const observations = this.prices
      .filter((p) => p.category === category && p.region === region && p.currency === currency)
      .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
    if (observations.length < 2) return null;
    const first = observations[0].amount;
    const last = observations[observations.length - 1].amount;
    const changePercent = first === 0 ? 0 : ((last - first) / first) * 100;
    const direction: 'up' | 'down' | 'flat' = changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat';
    return {
      category,
      region,
      currency,
      observations,
      changePercent: Math.round(changePercent * 100) / 100,
      direction,
      window: { from: observations[0].observedAt, to: observations[observations.length - 1].observedAt }
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Demand + supply signals
  // ───────────────────────────────────────────────────────────────
  getDemand(category: string, region: string): DemandSignal | null {
    const cell = this.demandSnapshot.find((d) => d.category === category && d.region === region);
    if (!cell) return null;
    return { ...cell };
  }

  listDemand(): DemandSignal[] {
    return this.demandSnapshot.map((d) => ({ ...d }));
  }

  getSupply(category: string, region: string): SupplySignal | null {
    const cell = this.supplySnapshot.find((s) => s.category === category && s.region === region);
    if (!cell) return null;
    return { ...cell };
  }

  listSupply(): SupplySignal[] {
    return this.supplySnapshot.map((s) => ({ ...s }));
  }

  // ───────────────────────────────────────────────────────────────
  // Supply/demand gap analysis
  // ───────────────────────────────────────────────────────────────
  computeGap(category: string, region: string): MarketGap | null {
    const demand = this.getDemand(category, region);
    if (!demand) return null;
    const supply = this.getSupply(category, region);

    let gapScore = 0;
    let status: MarketGap['status'];
    let recommendation: string;

    if (!supply || supply.activeCapabilities === 0) {
      status = 'no-supply';
      gapScore = demand.openOpportunities * 100;
      recommendation = `High demand for ${category} in ${region} (${demand.openOpportunities} open opportunities) but no supply. Strong opportunity for new Nexha to enter this market.`;
    } else {
      // Ratio: demand (opportunities) vs supply (capabilities)
      // High ratio = underserved, low = saturated
      const ratio = demand.openOpportunities / Math.max(supply.activeCapabilities, 1);
      gapScore = Math.round((ratio - 1) * 100);
      if (ratio >= 2) {
        status = 'underserved';
        recommendation = `${category} in ${region} is underserved. ${demand.openOpportunities} opportunities competing for only ${supply.activeCapabilities} capabilities. New providers would face high demand.`;
      } else if (ratio >= 0.5) {
        status = 'balanced';
        recommendation = `${category} in ${region} is well-balanced. Steady demand (${demand.openOpportunities} opps) meets supply (${supply.activeCapabilities} caps). Healthy competition.`;
      } else {
        status = 'saturated';
        recommendation = `${category} in ${region} is saturated. ${supply.activeCapabilities} capabilities compete for only ${demand.openOpportunities} opportunities. Consider differentiation or new regions.`;
      }
    }

    return {
      category,
      region,
      demand,
      supply: supply || null,
      gapScore,
      status,
      recommendation,
      asOf: new Date().toISOString()
    };
  }

  listGaps(): MarketGap[] {
    const gaps: MarketGap[] = [];
    for (const d of this.demandSnapshot) {
      const gap = this.computeGap(d.category, d.region);
      if (gap) gaps.push(gap);
    }
    return gaps.sort((a, b) => b.gapScore - a.gapScore);
  }

  // ───────────────────────────────────────────────────────────────
  // Federation-wide report
  // ───────────────────────────────────────────────────────────────
  getReport(): MarketReport {
    const totalBudgetUsd = this.demandSnapshot.reduce((s, d) => s + d.totalBudgetUsd, 0);
    const averageAci = this.supplySnapshot.length > 0
      ? Math.round(this.supplySnapshot.reduce((s, x) => s + x.averageTrust, 0) / this.supplySnapshot.length)
      : 0;

    const topDemanded = [...this.demandSnapshot]
      .sort((a, b) => b.openOpportunities - a.openOpportunities)
      .slice(0, 5)
      .map((d) => ({ category: d.category, openOpportunities: d.openOpportunities, totalBudgetUsd: d.totalBudgetUsd }));

    const topSupplied = [...this.supplySnapshot]
      .sort((a, b) => b.activeCapabilities - a.activeCapabilities)
      .slice(0, 5)
      .map((s) => ({ category: s.category, activeCapabilities: s.activeCapabilities, averageTrust: s.averageTrust }));

    const biggestGaps = this.listGaps().filter((g) => g.status === 'underserved' || g.status === 'no-supply').slice(0, 5);

    return {
      totalCapabilities: this.supplySnapshot.reduce((s, x) => s + x.activeCapabilities, 0),
      totalOpportunities: this.demandSnapshot.reduce((s, d) => s + d.openOpportunities, 0),
      totalBudgetUsd,
      averageAci,
      topDemandedCategories: topDemanded,
      topSuppliedCategories: topSupplied,
      biggestGaps,
      generatedAt: new Date().toISOString()
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Add new supply/demand (in production: called via webhook)
  // ───────────────────────────────────────────────────────────────
  addDemandSnapshot(cell: { category: string; region: string; openOpportunities: number; totalBudgetUsd: number; averageBudgetUsd: number; topTags: string[]; topPriority: 'low' | 'normal' | 'high' | 'urgent' }): void {
    this.demandSnapshot.push(cell);
  }

  addSupplySnapshot(cell: { category: string; region: string; activeCapabilities: number; averagePriceUsd: number; totalCapacity: number; averageTrust: number }): void {
    this.supplySnapshot.push(cell);
  }

  reset(): void {
    this.prices = [];
    this.demandSnapshot = [];
    this.supplySnapshot = [];
  }
}

const marketService = new MarketService();
export default marketService;