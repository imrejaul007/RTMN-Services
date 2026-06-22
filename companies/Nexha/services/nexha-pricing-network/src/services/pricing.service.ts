/**
 * Pricing Intelligence — Service
 * Phase C.6
 *
 * Pure functions over in-memory stores. No ML — all aggregations are
 * deterministic statistical summaries (best/worst/avg/median/stddev/confidence).
 *
 * Dynamic pricing rules:
 *   match    → recommended = market average
 *   undercut → recommended = (best × 0.98) — beat the best by 2%
 *   premium  → recommended = (market average × 1.10) — 10% premium
 *   floor    → never below (ourCost × (1 + marginFloor))
 *   ceiling  → never above (currentPrice × 1.20) if currentPrice given
 *
 * Confidence = clamp(suppliers / 5, 0, 1) × (1 - normalizedStdDev)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AlertType,
  DynamicPriceRecommendation,
  DynamicPriceRequest,
  PriceAlert,
  PriceComparison,
  PricePoint,
  PriceSource,
  Product,
  ProductCategory,
} from '../types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory stores
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = new Map<string, StoredProduct>();       // key: sku
const PRICES = new Map<string, PricePoint[]>();           // key: sku, unsorted
const ALERTS = new Map<string, PriceAlert>();
const ALERT_FIRES: Array<{ alertId: string; sku: string; at: string; price: number; currentPrice: number }> = [];

// ─────────────────────────────────────────────────────────────────────────────
// Product registry
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterProductInput {
  sku: string;
  name: string;
  category: ProductCategory;
  ourCost: number;
  currency: string;
  unit?: string;
  targetMargin?: number;
}

export interface StoredProduct extends Product {
  id: string;
  ourCost: number;
  currency: string;
  unit: string;
  targetMargin: number;
  createdAt: string;
  updatedAt: string;
}

export function registerProduct(input: RegisterProductInput): StoredProduct {
  const now = new Date().toISOString();
  const product: StoredProduct = {
    id: `prod-${uuidv4()}`,
    sku: input.sku,
    name: input.name,
    category: input.category,
    ourCost: input.ourCost,
    currency: input.currency,
    unit: input.unit ?? 'piece',
    targetMargin: input.targetMargin ?? 0.25,
    createdAt: now,
    updatedAt: now,
  };
  PRODUCTS.set(input.sku, product);
  return product;
}

export function getProduct(sku: string): StoredProduct | null {
  return PRODUCTS.get(sku) || null;
}

export function listProducts(category?: ProductCategory, q?: string): StoredProduct[] {
  let all = Array.from(PRODUCTS.values());
  if (category) all = all.filter(p => p.category === category);
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter(
      p => p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle),
    );
  }
  return all.sort((a, b) => a.sku.localeCompare(b.sku));
}

// ─────────────────────────────────────────────────────────────────────────────
// Price recording
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordPriceInput {
  sku: string;
  supplierId: string;
  supplierName: string;
  price: number;
  currency: string;
  inStock: boolean;
  source: PriceSource;
  minOrderQty?: number;
  isCompetitor?: boolean;
}

export function recordPrice(input: RecordPriceInput): PricePoint {
  const id = `pp-${uuidv4()}`;
  const recordedAt = new Date().toISOString();
  const pp: PricePoint = {
    id,
    sku: input.sku,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    price: input.price,
    currency: input.currency,
    inStock: input.inStock,
    minOrderQty: input.minOrderQty,
    source: input.source,
    recordedAt,
    isCompetitor: input.isCompetitor ?? false,
  };
  const existing = PRICES.get(input.sku) || [];
  existing.push(pp);
  // Bound memory: keep last 500 observations per SKU
  if (existing.length > 500) existing.shift();
  PRICES.set(input.sku, existing);
  return pp;
}

export function listPrices(sku?: string, supplierId?: string): PricePoint[] {
  if (sku) {
    const all = PRICES.get(sku) || [];
    return supplierId ? all.filter(p => p.supplierId === supplierId) : all;
  }
  const all = Array.from(PRICES.values()).flat();
  return supplierId ? all.filter(p => p.supplierId === supplierId) : all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────────────────────────────────────────

export function comparePrices(sku: string, currency?: string): PriceComparison | null {
  const product = PRODUCTS.get(sku);
  if (!product) return null;

  const all = PRICES.get(sku) || [];
  // Latest observation per supplier, in stock, currency match (if specified)
  const latestBySupplier = new Map<string, PricePoint>();
  for (const p of all) {
    if (!p.inStock) continue;
    if (currency && p.currency !== currency) continue;
    const cur = latestBySupplier.get(p.supplierId);
    if (!cur || new Date(p.recordedAt ?? 0).getTime() > new Date(cur.recordedAt ?? 0).getTime()) {
      latestBySupplier.set(p.supplierId, p);
    }
  }

  if (latestBySupplier.size === 0) return null;

  const observations = Array.from(latestBySupplier.values());
  const sorted = [...observations].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0].price;
  const maxPrice = sorted[sorted.length - 1].price;
  const sum = observations.reduce((s, p) => s + p.price, 0);
  const avgPrice = sum / observations.length;
  const medianPrice = sorted.length % 2
    ? sorted[Math.floor(sorted.length / 2)].price
    : (sorted[sorted.length / 2 - 1].price + sorted[sorted.length / 2].price) / 2;
  const variance = observations.reduce((s, p) => s + (p.price - avgPrice) ** 2, 0) / observations.length;
  const priceStdDev = Math.sqrt(variance);
  const normalizedStdDev = avgPrice > 0 ? Math.min(priceStdDev / avgPrice, 1) : 1;

  // Confidence: more suppliers + tighter spread = higher confidence
  const supplierFactor = Math.min(observations.length / 5, 1);
  const spreadFactor = 1 - normalizedStdDev;
  const confidence = Math.round(Math.max(0, Math.min(1, supplierFactor * spreadFactor)) * 100) / 100;

  const topSuppliers = sorted.slice(0, 3).map(p => ({
    supplierId: p.supplierId,
    supplierName: p.supplierName,
    price: p.price,
  }));
  const bottomSuppliers = [...sorted].reverse().slice(0, 3).map(p => ({
    supplierId: p.supplierId,
    supplierName: p.supplierName,
    price: p.price,
  }));

  return {
    sku,
    productName: product.name,
    supplierCount: observations.length,
    bestPrice: minPrice,
    worstPrice: maxPrice,
    minPrice,
    maxPrice,
    avgPrice: Math.round(avgPrice * 100) / 100,
    medianPrice,
    priceStdDev: Math.round(priceStdDev * 100) / 100,
    confidence,
    currency: currency || observations[0].currency,
    topSuppliers,
    bottomSuppliers,
    comparedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAlertInput {
  sku: string;
  type: AlertType;
  currency: string;
  notify: string;
  targetPrice?: number;
  pctThreshold?: number;
}

export function createAlert(input: CreateAlertInput): PriceAlert | { error: string } {
  if (!PRODUCTS.has(input.sku)) return { error: 'product_not_found' };
  const id = `al-${uuidv4()}`;
  const alert: PriceAlert = {
    id,
    sku: input.sku,
    type: input.type,
    currency: input.currency,
    notify: input.notify,
    targetPrice: input.targetPrice,
    pctThreshold: input.pctThreshold,
    active: true,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: null,
  };
  ALERTS.set(id, alert);
  return alert;
}

export function listAlerts(activeOnly: boolean = false): PriceAlert[] {
  let all = Array.from(ALERTS.values());
  if (activeOnly) all = all.filter(a => a.active);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deactivateAlert(id: string): PriceAlert | { error: string } {
  const a = ALERTS.get(id);
  if (!a) return { error: 'not_found' };
  a.active = false;
  return a;
}

/**
 * Evaluate alerts for a given SKU against a current observed price.
 * Returns the alerts that fired.
 */
export function evaluateAlerts(sku: string, currentPrice: number): PriceAlert[] {
  const fired: PriceAlert[] = [];
  for (const alert of ALERTS.values()) {
    if (!alert.active || alert.sku !== sku) continue;

    let triggered = false;
    if (alert.type === 'below_target') {
      if (alert.targetPrice !== undefined && currentPrice <= alert.targetPrice) triggered = true;
    } else if (alert.type === 'pct_drop') {
      // Compare current to most recent competitor baseline (if available)
      const all = PRICES.get(sku) || [];
      const latest = [...all]
        .filter(p => p.inStock)
        .sort((a, b) => new Date(b.recordedAt ?? 0).getTime() - new Date(a.recordedAt ?? 0).getTime())[0];
      if (latest && alert.pctThreshold !== undefined && latest.price > 0) {
        const drop = (latest.price - currentPrice) / latest.price;
        if (drop >= alert.pctThreshold) triggered = true;
      }
    } else if (alert.type === 'pct_above_market') {
      const cmp = comparePrices(sku, alert.currency);
      if (cmp && alert.pctThreshold !== undefined && cmp.avgPrice > 0) {
        const premium = (currentPrice - cmp.avgPrice) / cmp.avgPrice;
        if (premium >= alert.pctThreshold) triggered = true;
      }
    } else if (alert.type === 'back_in_stock') {
      const all = PRICES.get(sku) || [];
      // Sort by recordedAt ascending so [0] is oldest, [last] is newest.
      const sorted = [...all].sort((a, b) => new Date(a.recordedAt ?? 0).getTime() - new Date(b.recordedAt ?? 0).getTime());
      // Find the most recent in-stock observation (price > 0 and inStock=true)
      let recentIdx = -1;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].inStock && sorted[i].price > 0) { recentIdx = i; break; }
      }
      if (recentIdx > 0) {
        const previous = sorted[recentIdx - 1];
        if (previous && (!previous.inStock || previous.price === 0)) {
          triggered = true;
        }
      }
    }

    if (triggered) {
      alert.lastTriggeredAt = new Date().toISOString();
      ALERT_FIRES.push({
        alertId: alert.id, sku, at: alert.lastTriggeredAt, price: currentPrice, currentPrice,
      });
      fired.push(alert);
    }
  }
  return fired;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic pricing
// ─────────────────────────────────────────────────────────────────────────────

export function recommendPrice(req: DynamicPriceRequest): DynamicPriceRecommendation | { error: string } {
  const product = PRODUCTS.get(req.sku);
  if (!product) return { error: 'product_not_found' };

  const cmp = comparePrices(req.sku, product.currency);
  if (!cmp) return { error: 'no_market_data' };

  let basePrice: number;
  let rationale: string;
  const marketAvg = cmp.avgPrice;
  const marketBest = cmp.bestPrice;

  if (req.strategy === 'match' && marketAvg > 0) {
    basePrice = marketAvg;
    rationale = `Matching market average of ${marketAvg}`;
  } else if (req.strategy === 'undercut' && marketBest > 0) {
    basePrice = marketBest * 0.98;
    rationale = `Undercutting best market price ${marketBest} by 2%`;
  } else if (req.strategy === 'premium' && marketAvg > 0) {
    basePrice = marketAvg * 1.10;
    rationale = `10% premium over market average ${marketAvg}`;
  } else {
    basePrice = req.ourCost * 1.30;
    rationale = `No market data; default 30% markup over cost ${req.ourCost}`;
  }

  let floorApplied = false;
  let ceilingApplied = false;
  let currencyMismatch = false;

  // Currency mismatch: if request wants a different currency than market, warn
  if (req.currency && req.currency !== cmp.currency) {
    currencyMismatch = true;
  }

  // Floor: never below (ourCost × (1 + marginFloor))
  const floor = req.ourCost * (1 + req.marginFloor);
  if (basePrice < floor) {
    basePrice = floor;
    floorApplied = true;
    rationale += `; raised to margin floor ${floor.toFixed(2)}`;
  }

  // Ceiling: never above (currentPrice × 1.20) if currentPrice given
  if (req.currentPrice !== undefined && req.currentPrice > 0) {
    const ceiling = req.currentPrice * 1.20;
    if (basePrice > ceiling) {
      basePrice = ceiling;
      ceilingApplied = true;
      rationale += `; capped at 20% over current price ${req.currentPrice}`;
    }
  }

  const recommendedPrice = Math.round(basePrice * 100) / 100;
  const expectedMarginPct = recommendedPrice > 0 ? (recommendedPrice - req.ourCost) / recommendedPrice : 0;

  return {
    sku: req.sku,
    strategy: req.strategy,
    recommendedPrice,
    currency: product.currency,
    expectedMarginPct: Math.round(expectedMarginPct * 10000) / 10000,
    confidence: cmp.confidence,
    rationale,
    floorApplied,
    ceilingApplied,
    currencyMismatch,
    comparison: cmp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Network stats
// ─────────────────────────────────────────────────────────────────────────────

export function pricingStats(): {
  products: number;
  pricePoints: number;
  suppliersTracked: number;
  activeAlerts: number;
  totalAlerts: number;
  alertFires: number;
} {
  const allPrices = Array.from(PRICES.values()).flat();
  const supplierIds = new Set<string>();
  for (const p of allPrices) supplierIds.add(p.supplierId);
  const alerts = Array.from(ALERTS.values());
  return {
    products: PRODUCTS.size,
    pricePoints: allPrices.length,
    suppliersTracked: supplierIds.size,
    activeAlerts: alerts.filter(a => a.active).length,
    totalAlerts: alerts.length,
    alertFires: ALERT_FIRES.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test reset
// ─────────────────────────────────────────────────────────────────────────────

export function _resetForTests(): void {
  PRODUCTS.clear();
  PRICES.clear();
  ALERTS.clear();
  ALERT_FIRES.length = 0;
}
