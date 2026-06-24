/**
 * BAM ROI Calculator Client
 *
 * Wraps the roi-calculator service (port 4259). Compute payback, NPV, IRR
 * for a BAM asset purchase or subscription. Compare alternative
 * investments side-by-side.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface RoiInputs {
  /** One-time upfront cost (minor units) */
  upfrontCost?: number;
  /** Recurring subscription cost per period */
  recurringCost?: number;
  /** Expected monthly gain (revenue, savings, productivity) */
  monthlyGain?: number;
  /** Time horizon in months */
  months?: number;
  /** Annual discount rate as a decimal (e.g. 0.10 = 10%) */
  discountRate?: number;
  /** Tax rate as decimal (applied to gain) */
  taxRate?: number;
}

export interface RoiResult {
  totalCost: number;
  totalGain: number;
  netProfit: number;
  /** Months until cumulative gain ≥ cumulative cost. -1 if never. */
  paybackMonths: number;
  /** Net present value */
  npv: number;
  /** Internal rate of return as a decimal */
  irr: number;
  /** ROI as a ratio */
  roi: number;
}

export interface RoiCalculation {
  id: string;
  name: string;
  inputs: RoiInputs;
  result: RoiResult;
  createdAt: string;
}

export interface CreateCalculationRequest {
  name: string;
  inputs: RoiInputs;
}

export interface CompareRoiRequest {
  calculations: Array<{ name: string; inputs: RoiInputs }>;
}

export interface CompareRoiResult {
  results: RoiResult[];
  /** name → result */
  byName: Record<string, RoiResult>;
  /** Highest-NPV calculation's name */
  winnerName: string;
}

export interface QuickRoiRequest {
  upfrontCost?: number;
  recurringCost?: number;
  monthlyGain?: number;
  months?: number;
}

export interface RoiTemplate {
  id: string;
  name: string;
  description: string;
  defaultInputs: RoiInputs;
  category: 'subscription' | 'one-time' | 'usage' | 'workforce';
}

export class RoiClient {
  constructor(private config: HojaiConfig) {}

  /** Create a persistent ROI calculation (auth required). */
  async calculate(input: CreateCalculationRequest): Promise<RoiCalculation> {
    return request<RoiCalculation>(this.config, 'POST', '/api/calculations', input);
  }

  /** List stored calculations. */
  async list(input: { limit?: number; offset?: number } = {}): Promise<RoiCalculation[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<RoiCalculation[]>(this.config, 'GET', `/api/calculations${qs}`);
  }

  /** Get a stored calculation by id. */
  async get(id: string): Promise<RoiCalculation> {
    return request<RoiCalculation>(this.config, 'GET', `/api/calculations/${encodeURIComponent(id)}`);
  }

  /** Delete a stored calculation (auth required). */
  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/calculations/${encodeURIComponent(id)}`);
  }

  /** Compare multiple ROI inputs without persisting (auth required). */
  async compare(input: CompareRoiRequest): Promise<CompareRoiResult> {
    return request<CompareRoiResult>(this.config, 'POST', '/api/calculations/compare', input);
  }

  /** Quick one-shot ROI calculation (auth required). */
  async quick(input: QuickRoiRequest): Promise<RoiResult> {
    return request<RoiResult>(this.config, 'POST', '/api/quick-roi', input);
  }

  /** List ROI templates (no auth required). */
  async templates(): Promise<RoiTemplate[]> {
    return request<RoiTemplate[]>(this.config, 'GET', '/api/templates');
  }
}
