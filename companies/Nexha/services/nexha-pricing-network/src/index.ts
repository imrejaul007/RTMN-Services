/**
 * nexha-pricing-network — Express server (port 4286).
 *
 * Phase C.6 — Pricing Intelligence
 *
 * REST surface:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/v1/info
 *   GET  /api/v1/stats
 *
 *   ── Products (registry) ──
 *   POST /api/v1/products                 { sku, name, category, ourCost, currency, ... }
 *   GET  /api/v1/products?category=&q=
 *   GET  /api/v1/products/:sku
 *
 *   ── Price Points (market data) ──
 *   POST /api/v1/prices                   { sku, supplierId, supplierName, price, currency, inStock, source }
 *   GET  /api/v1/prices?sku=&supplierId=
 *
 *   ── Comparison (aggregated) ──
 *   POST /api/v1/compare                  { sku, currency? }
 *   POST /api/v1/compare/batch            { skus: string[], currency? }
 *
 *   ── Price Alerts ──
 *   POST /api/v1/alerts                   { sku, type, targetPrice?, pctThreshold?, currency?, notify }
 *   GET  /api/v1/alerts?activeOnly=
 *   POST /api/v1/alerts/:id/deactivate
 *   POST /api/v1/alerts/evaluate          { sku, currentPrice }
 *
 *   ── Dynamic Pricing ──
 *   POST /api/v1/dynamic-price            { sku, strategy, ourCost, marginFloor?, currentPrice? }
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import {
  ProductSchema,
  PricePointSchema,
  CreateAlertSchema,
  DynamicPriceRequestSchema,
} from './types/index.js';
import * as svc from './services/pricing.service.js';

const PORT = parseInt(process.env.PORT || '4286', 10);
const REQUIRE_AUTH = process.env.PRICING_REQUIRE_AUTH !== 'false';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

if (REQUIRE_AUTH) {
  // Soft auth — Hub enforces real auth upstream.
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-pricing-network', port: PORT });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, stats: svc.pricingStats() });
});

app.get('/api/v1/info', (_req, res) => {
  res.json({
    service: 'nexha-pricing-network',
    version: '1.0.0',
    description:
      'Pricing Intelligence — Phase C.6 (price aggregation, competitor analysis, alerts, dynamic pricing)',
    endpoints: [
      'POST /api/v1/products',
      'GET  /api/v1/products',
      'GET  /api/v1/products/:sku',
      'POST /api/v1/prices',
      'GET  /api/v1/prices',
      'POST /api/v1/compare',
      'POST /api/v1/compare/batch',
      'POST /api/v1/alerts',
      'GET  /api/v1/alerts',
      'POST /api/v1/alerts/:id/deactivate',
      'POST /api/v1/alerts/evaluate',
      'POST /api/v1/dynamic-price',
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/stats', (_req, res) => {
  res.json({ success: true, data: svc.pricingStats() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/products', (req, res) => {
  const parsed = ProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = svc.registerProduct(parsed.data);
  res.status(201).json({ success: true, product: p });
});

app.get('/api/v1/products', (req, res) => {
  const category = req.query.category as any;
  const q = req.query.q as string | undefined;
  const list = svc.listProducts(category, q);
  res.json({ success: true, count: list.length, products: list });
});

app.get('/api/v1/products/:sku', (req, res) => {
  const p = svc.getProduct(req.params.sku);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, product: p });
});

// ─────────────────────────────────────────────────────────────────────────────
// Price points
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/prices', (req, res) => {
  const parsed = PricePointSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = svc.recordPrice(parsed.data);
  res.status(201).json({ success: true, pricePoint: p });
});

app.get('/api/v1/prices', (req, res) => {
  const sku = req.query.sku as string | undefined;
  const supplierId = req.query.supplierId as string | undefined;
  const list = svc.listPrices(sku, supplierId);
  res.json({ success: true, count: list.length, prices: list });
});

// ─────────────────────────────────────────────────────────────────────────────
// Comparison
// ─────────────────────────────────────────────────────────────────────────────

const CompareSchema = z.object({
  sku: z.string(),
  currency: z.string().optional(),
});

app.post('/api/v1/compare', (req, res) => {
  const parsed = CompareSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cmp = svc.comparePrices(parsed.data.sku, parsed.data.currency);
  if (!cmp) return res.status(404).json({ error: 'product_not_found' });
  res.json({ success: true, comparison: cmp });
});

const BatchCompareSchema = z.object({
  skus: z.array(z.string()).min(1).max(50),
  currency: z.string().optional(),
});

app.post('/api/v1/compare/batch', (req, res) => {
  const parsed = BatchCompareSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cmps = parsed.data.skus
    .map((sku) => svc.comparePrices(sku, parsed.data.currency))
    .filter((c): c is NonNullable<typeof c> => c !== null);
  res.json({ success: true, count: cmps.length, comparisons: cmps });
});

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/alerts', (req, res) => {
  const parsed = CreateAlertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const a = svc.createAlert(parsed.data);
  res.status(201).json({ success: true, alert: a });
});

app.get('/api/v1/alerts', (req, res) => {
  const activeOnly = req.query.activeOnly === 'true';
  const list = svc.listAlerts(activeOnly);
  res.json({ success: true, count: list.length, alerts: list });
});

app.post('/api/v1/alerts/:id/deactivate', (req, res) => {
  const result = svc.deactivateAlert(req.params.id);
  if ('error' in result) return res.status(404).json(result);
  res.json({ success: true, alert: result });
});

const EvaluateSchema = z.object({
  sku: z.string(),
  currentPrice: z.number().nonnegative(),
});

app.post('/api/v1/alerts/evaluate', (req, res) => {
  const parsed = EvaluateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const triggered = svc.evaluateAlerts(parsed.data.sku, parsed.data.currentPrice);
  res.json({ success: true, count: triggered.length, triggered });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic pricing
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/dynamic-price', (req, res) => {
  const parsed = DynamicPriceRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = svc.recommendPrice(parsed.data);
  if ('error' in result) {
    const status = result.error === 'product_not_found' ? 404 : 409;
    return res.status(status).json(result);
  }
  res.json({ success: true, recommendation: result });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`nexha-pricing-network running on port ${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/info`);
  console.log(`  POST http://localhost:${PORT}/api/v1/products`);
  console.log(`  POST http://localhost:${PORT}/api/v1/compare`);
});

export default app;
