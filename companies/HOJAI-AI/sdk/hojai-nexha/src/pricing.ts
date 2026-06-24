/**
 * Nexha Pricing Network Client
 *
 * Wraps nexha-pricing-network: product catalog, price points,
 * market comparison, price alerts, dynamic pricing.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Product {
  sku: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  metadata?: Record<string, unknown>;
}

export interface PricePoint {
  id: string;
  sku: string;
  source: string;
  price: { amount: number; currency: string };
  region?: string;
  inStock: boolean;
  observedAt: string;
}

export interface PriceInput {
  sku: string;
  source: string;
  price: { amount: number; currency: string };
  region?: string;
  inStock?: boolean;
}

export interface CompareResult {
  sku: string;
  lowest: PricePoint;
  highest: PricePoint;
  average: number;
  median: number;
  observations: number;
}

export interface BatchCompareInput {
  skus: string[];
  region?: string;
}

export interface PriceAlert {
  id: string;
  sku: string;
  threshold: { operator: 'lt' | 'gt' | 'lte' | 'gte'; value: number };
  active: boolean;
  createdAt: string;
}

export interface PriceAlertInput {
  sku: string;
  threshold: { operator: 'lt' | 'gt' | 'lte' | 'gte'; value: number };
}

export interface DynamicPriceRequest {
  sku: string;
  basePrice: number;
  demand: number;
  inventory: number;
  competitorAvg: number;
  seasonalityFactor?: number;
}

export interface DynamicPriceResult {
  recommended: number;
  factors: { demand: number; inventory: number; competition: number; seasonality: number };
  confidence: number;
}

export class PricingClient {
  constructor(private config: HojaiConfig) {}

  // ── Products ──────────────────────────────────────────────
  async registerProduct(input: ProductInput): Promise<Product> {
    return request<Product>(this.config, 'POST', '/api/v1/products', input);
  }

  async listProducts(input: { category?: string; limit?: number } = {}): Promise<Product[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Product[]>(this.config, 'GET', `/api/v1/products?${params.toString()}`);
  }

  async getProduct(sku: string): Promise<Product> {
    return request<Product>(this.config, 'GET', `/api/v1/products/${encodeURIComponent(sku)}`);
  }

  // ── Prices ────────────────────────────────────────────────
  async recordPrice(input: PriceInput): Promise<PricePoint> {
    return request<PricePoint>(this.config, 'POST', '/api/v1/prices', input);
  }

  async listPrices(input: { sku?: string; source?: string; region?: string; since?: string } = {}): Promise<PricePoint[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<PricePoint[]>(this.config, 'GET', `/api/v1/prices?${params.toString()}`);
  }

  // ── Compare ───────────────────────────────────────────────
  async compare(sku: string, input: { region?: string; sources?: string[] } = {}): Promise<CompareResult> {
    return request<CompareResult>(this.config, 'POST', '/api/v1/compare', { sku, ...input });
  }

  async compareBatch(input: BatchCompareInput): Promise<Record<string, CompareResult>> {
    return request(this.config, 'POST', '/api/v1/compare/batch', input);
  }

  // ── Alerts ────────────────────────────────────────────────
  async createAlert(input: PriceAlertInput): Promise<PriceAlert> {
    return request<PriceAlert>(this.config, 'POST', '/api/v1/alerts', input);
  }

  async listAlerts(input: { sku?: string; activeOnly?: boolean } = {}): Promise<PriceAlert[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<PriceAlert[]>(this.config, 'GET', `/api/v1/alerts?${params.toString()}`);
  }

  async deactivateAlert(id: string): Promise<PriceAlert> {
    return request<PriceAlert>(this.config, 'POST', `/api/v1/alerts/${encodeURIComponent(id)}/deactivate`);
  }

  async evaluateAlerts(): Promise<Array<{ alertId: string; sku: string; triggered: boolean; currentPrice: number }>> {
    return request(this.config, 'POST', '/api/v1/alerts/evaluate');
  }

  // ── Dynamic Pricing ───────────────────────────────────────
  async dynamicPrice(input: DynamicPriceRequest): Promise<DynamicPriceResult> {
    return request<DynamicPriceResult>(this.config, 'POST', '/api/v1/dynamic-price', input);
  }
}