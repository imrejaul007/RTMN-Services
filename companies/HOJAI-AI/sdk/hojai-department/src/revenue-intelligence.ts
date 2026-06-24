/**
 * Revenue Intelligence OS SDK client (port 5400)
 *
 * The AI Revenue Department. Aggregates revenue from all sources
 * (subscription, one-time, usage, services, marketplace), forecasts
 * demand, optimizes pricing, tracks promotion ROI, cohort analysis,
 * and runs revenue scenarios through a digital twin.
 *
 * 8 AI revenue agents behind the scenes: AICRO, DemandForecaster,
 * PricingOptimizer, PromotionStrategist, CohortAnalyst, ChurnPredictor,
 * AnomalyDetector, ScenarioPlanner.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money, DateRange } from './types.js';

export type RevenueStreamKind = 'subscription' | 'one-time' | 'usage' | 'services' | 'marketplace' | 'ads' | 'other';
export type PricingModel = 'flat' | 'tiered' | 'usage-based' | 'dynamic' | 'freemium';

export interface RevenueStream {
  id: string;
  name: string;
  kind: RevenueStreamKind;
  pricingModel: PricingModel;
  /** Recurring MRR / ARR contribution */
  mrr: Money;
  arr: Money;
  /** Active customers */
  activeCustomers: number;
  /** Net revenue retention % */
  nrr: number;
  trend: 'up' | 'down' | 'flat';
}

export interface RevenueSnapshot {
  streamId: string;
  period: string; // 'YYYY-MM'
  revenue: Money;
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
  expansion: Money;
  contraction: Money;
}

export interface DemandSignal {
  id: string;
  signal: 'search-volume' | 'inbound-leads' | 'trial-signups' | 'pricing-page' | 'competitor-mention' | 'social-mention';
  value: number;
  delta: number; // % change
  source: string;
  capturedAt: string;
}

export interface PricingRecommendation {
  productId: string;
  productName: string;
  currentPrice: Money;
  recommendedPrice: Money;
  /** Predicted % change in revenue if applied */
  expectedImpact: number;
  confidence: number; // 0-1
  reasoning: string;
}

export interface Promotion {
  id: string;
  name: string;
  kind: 'discount' | 'bundle' | 'free-trial' | 'cashback' | 'referral';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  startAt: string;
  endAt: string;
  budget?: Money;
  /** ROI: revenue / cost */
  roi: number;
  attributedRevenue: Money;
}

export interface Cohort {
  id: string;
  cohort: string; // 'YYYY-MM' or segment id
  size: number;
  /** Per-period retention % */
  retention: number[];
  /** LTV projection */
  ltv: Money;
}

export interface RevenueScenario {
  id: string;
  name: string;
  description?: string;
  /** Inputs that vary from baseline */
  inputs: Record<string, unknown>;
  /** Projected 12-month revenue */
  projectedRevenue: Money;
  /** Confidence interval */
  confidenceInterval: { low: Money; high: Money };
  generatedAt: string;
}

export class RevenueIntelligenceClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5400` };
  }

  // ─── Revenue hub ───

  async getRevenueHub(): Promise<{ totalMrr: Money; totalArr: Money; streams: RevenueStream[]; period: string }> {
    return request(this.config, 'GET', '/api/revenue/hub');
  }

  async listRevenueStreams(): Promise<RevenueStream[]> {
    return request<RevenueStream[]>(this.config, 'GET', '/api/revenue/streams');
  }

  async getRevenueSnapshots(input: { streamId?: string; from: string; to: string }): Promise<RevenueSnapshot[]> {
    return request<RevenueSnapshot[]>(this.config, 'GET', `/api/revenue/snapshots${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Demand ───

  async listDemandSignals(input: { signal?: DemandSignal['signal']; from?: string; to?: string; limit?: number } = {}): Promise<DemandSignal[]> {
    return request<DemandSignal[]>(this.config, 'GET', `/api/demand/signals${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Forecast ───

  async forecast(input: { months: number; streamIds?: string[]; segments?: string[] }): Promise<{ months: number; projections: Array<{ period: string; revenue: Money; confidence: number }> }> {
    return request(this.config, 'POST', '/api/revenue/forecast', input);
  }

  // ─── Pricing ───

  async getPricingRecommendations(input: { productId?: string; minConfidence?: number } = {}): Promise<PricingRecommendation[]> {
    return request<PricingRecommendation[]>(this.config, 'GET', `/api/pricing/recommendations${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getDynamicPrice(input: { productId: string; context: Record<string, unknown> }): Promise<{ productId: string; price: Money; factors: Record<string, number> }> {
    return request(this.config, 'POST', '/api/pricing/dynamic', input);
  }

  // ─── Promotions ───

  async listPromotions(input: { status?: Promotion['status']; limit?: number } = {}): Promise<Promotion[]> {
    return request<Promotion[]>(this.config, 'GET', `/api/promotions${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createPromotion(input: { name: string; kind: Promotion['kind']; startAt: string; endAt: string; budget?: Money }): Promise<Promotion> {
    return request<Promotion>(this.config, 'POST', '/api/promotions', input);
  }

  // ─── Cohorts ───

  async listCohorts(input: { from?: string; to?: string; limit?: number } = {}): Promise<Cohort[]> {
    return request<Cohort[]>(this.config, 'GET', `/api/cohorts${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Scenarios ───

  async listScenarios(input: { limit?: number } = {}): Promise<RevenueScenario[]> {
    return request<RevenueScenario[]>(this.config, 'GET', `/api/scenarios${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async runScenario(input: { name: string; description?: string; inputs: Record<string, unknown> }): Promise<RevenueScenario> {
    return request<RevenueScenario>(this.config, 'POST', '/api/scenarios', input);
  }
}
