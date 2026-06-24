/**
 * MarketOS — Type definitions
 *
 * Market intelligence: pricing trends, demand signals, supply gaps.
 * Reads from CapabilityOS (supply) + OpportunityOS (demand) snapshots
 * to produce market reports.
 */

/** Pricing model types (mirrors CapabilityOS). */
export type PricingModel = 'free' | 'per-call' | 'per-hour' | 'per-transaction' | 'subscription' | 'quote';

/** Region (ISO country code). */
export type Region = string;

/** Currency (ISO 4217). */
export type Currency = string;

/** A single price observation (one capability at one time). */
export interface PriceObservation {
  capabilityId: string;
  capabilityName: string;
  category: string;
  nexhaId: string;
  pricingModel: PricingModel;
  amount: number;
  currency: Currency;
  region: Region;
  observedAt: string;
}

/** Aggregated market price for a category × region × currency. */
export interface MarketPrice {
  category: string;
  region: Region;
  currency: Currency;
  /** Median price across all observations */
  median: number;
  /** Average price */
  mean: number;
  /** Min and max for context */
  min: number;
  max: number;
  /** Number of observations */
  sampleSize: number;
  /** p25 / p75 quartiles for distribution */
  p25: number;
  p75: number;
  /** Standard deviation (volatility) */
  stddev: number;
  /** Time window this aggregation covers */
  window: { from: string; to: string };
}

/** Demand signal — what opportunities want. */
export interface DemandSignal {
  category: string;
  region: Region;
  /** Number of open opportunities in this segment */
  openOpportunities: number;
  /** Total budget demanded in USD-equivalent */
  totalBudgetUsd: number;
  /** Average budget per opportunity */
  averageBudgetUsd: number;
  /** Most common tags */
  topTags: string[];
  /** Most common priority */
  topPriority: 'low' | 'normal' | 'high' | 'urgent';
}

/** Supply signal — what capabilities offer. */
export interface SupplySignal {
  category: string;
  region: Region;
  /** Number of active capabilities */
  activeCapabilities: number;
  /** Average price (in USD-equivalent) */
  averagePriceUsd: number;
  /** Total capacity proxy = active capabilities × average trust score */
  totalCapacity: number;
  /** Average trust score of offering Nexhas (ACI 0-1000) */
  averageTrust: number;
}

/** Supply/demand gap for a (category, region) cell. */
export interface MarketGap {
  category: string;
  region: Region;
  demand: DemandSignal;
  supply: SupplySignal | null;
  /** Computed gap score (positive = supply < demand, negative = oversupply) */
  gapScore: number;
  /** Classification */
  status: 'underserved' | 'balanced' | 'saturated' | 'no-supply' | 'no-demand';
  /** Plain-English recommendation */
  recommendation: string;
  /** As-of timestamp */
  asOf: string;
}

/** A market trend — how a price has moved over time. */
export interface PriceTrend {
  category: string;
  region: Region;
  currency: Currency;
  /** Recent observations (oldest first) */
  observations: PriceObservation[];
  /** Change from oldest to newest observation */
  changePercent: number;
  /** Trend direction */
  direction: 'up' | 'down' | 'flat';
  /** Window */
  window: { from: string; to: string };
}

/** Federation-wide market report. */
export interface MarketReport {
  totalCapabilities: number;
  totalOpportunities: number;
  totalBudgetUsd: number;
  averageAci: number;
  topDemandedCategories: Array<{ category: string; openOpportunities: number; totalBudgetUsd: number }>;
  topSuppliedCategories: Array<{ category: string; activeCapabilities: number; averageTrust: number }>;
  biggestGaps: MarketGap[];
  generatedAt: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  priceObservations: number;
  gaps: number;
  timestamp: string;
}