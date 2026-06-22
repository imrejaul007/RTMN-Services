/**
 * Pricing Intelligence — Type Definitions
 * Phase C.6
 *
 * Domain model:
 *   - Product: SKU + canonical name + category + cost basis
 *   - PricePoint: (product, supplier, price, currency, ts, stock)
 *   - PriceComparison: best/worst/avg/stddev/confidence for a product across N suppliers
 *   - PriceAlert: rule-based watcher (target price, % drop, % above market, back-in-stock)
 *   - DynamicPrice: our own pricing recommendation given cost + market + strategy
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────────────────

export const ProductCategorySchema = z.enum([
  'groceries',
  'medicine',
  'electronics',
  'apparel',
  'restaurant_supply',
  'hotel_supply',
  'raw_materials',
  'manufactured_goods',
  'services',
  'other',
]);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const ProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: ProductCategorySchema,
  ourCost: z.number().nonnegative(),
  currency: z.string().length(3).default('INR'),
  unit: z.string().default('piece'),
  targetMargin: z.number().min(0).max(1).default(0.25),
});
export type Product = z.infer<typeof ProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Price points
// ─────────────────────────────────────────────────────────────────────────────

export const PriceSourceSchema = z.enum(['feed', 'manual', 'partner', 'scrape']);
export type PriceSource = z.infer<typeof PriceSourceSchema>;

export const PricePointSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
  supplierId: z.string(),
  supplierName: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default('INR'),
  inStock: z.boolean().default(true),
  minOrderQty: z.number().int().positive().optional(),
  source: PriceSourceSchema.default('manual'),
  recordedAt: z.string().optional(),
  isCompetitor: z.boolean().default(false),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

export const RecordPriceRequestSchema = z.object({
  sku: z.string().min(1),
  supplierId: z.string().min(1),
  supplierName: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default('INR'),
  inStock: z.boolean().default(true),
  minOrderQty: z.number().int().positive().optional(),
  source: PriceSourceSchema.default('manual'),
  isCompetitor: z.boolean().default(false),
});
export type RecordPriceRequest = z.infer<typeof RecordPriceRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────────────────────────────────────────

export const SupplierPriceSummarySchema = z.object({
  supplierId: z.string(),
  supplierName: z.string().optional(),
  price: z.number(),
});
export type SupplierPriceSummary = z.infer<typeof SupplierPriceSummarySchema>;

export const PriceComparisonSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  supplierCount: z.number().int().nonnegative(),
  bestPrice: z.number(),
  worstPrice: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  avgPrice: z.number(),
  medianPrice: z.number(),
  priceStdDev: z.number(),
  confidence: z.number().min(0).max(1),
  currency: z.string(),
  topSuppliers: z.array(SupplierPriceSummarySchema),
  bottomSuppliers: z.array(SupplierPriceSummarySchema),
  comparedAt: z.string(),
});
export type PriceComparison = z.infer<typeof PriceComparisonSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

export const AlertTypeSchema = z.enum([
  'below_target',      // any price <= target
  'pct_drop',          // price dropped by >= pct% vs latest observation
  'pct_above_market',  // current price is pct% above market average
  'back_in_stock',     // previously OOS, now back in stock
]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const PriceAlertSchema = z.object({
  id: z.string(),
  sku: z.string(),
  type: AlertTypeSchema,
  currency: z.string(),
  notify: z.string(),
  targetPrice: z.number().optional(),
  pctThreshold: z.number().optional(),
  active: z.boolean().default(true),
  createdAt: z.string(),
  lastTriggeredAt: z.string().nullable().default(null),
});
export type PriceAlert = z.infer<typeof PriceAlertSchema>;

export const CreateAlertSchema = z.object({
  sku: z.string().min(1),
  type: AlertTypeSchema,
  currency: z.string().length(3).default('INR'),
  notify: z.string().default('log'),
  targetPrice: z.number().positive().optional(),
  pctThreshold: z.number().min(0).max(1).optional(),
});
export type CreateAlertRequest = z.infer<typeof CreateAlertSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic pricing
// ─────────────────────────────────────────────────────────────────────────────

export const DynamicPriceRequestSchema = z.object({
  sku: z.string().min(1),
  ourCost: z.number().nonnegative(),
  strategy: z.enum(['match', 'undercut', 'premium']).default('match'),
  marginFloor: z.number().min(0).max(1).default(0.10),
  currentPrice: z.number().nonnegative().optional(),
  /** Optional — if specified, mismatch with market currency triggers a warning. */
  currency: z.string().length(3).optional(),
});
export type DynamicPriceRequest = z.infer<typeof DynamicPriceRequestSchema>;

export const DynamicPriceRecommendationSchema = z.object({
  sku: z.string(),
  strategy: z.enum(['match', 'undercut', 'premium']),
  recommendedPrice: z.number(),
  currency: z.string(),
  expectedMarginPct: z.number(),
  confidence: z.number(),
  rationale: z.string(),
  floorApplied: z.boolean(),
  ceilingApplied: z.boolean(),
  currencyMismatch: z.boolean(),
  comparison: PriceComparisonSchema,
});
export type DynamicPriceRecommendation = z.infer<typeof DynamicPriceRecommendationSchema>;
