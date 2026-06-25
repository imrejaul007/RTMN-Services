/**
 * Catalog Routes — HTTP endpoints for CatalogOS.
 *
 * ADR-??? Phase 1 (2026-06-25).
 */

import express from 'express';
import {
  createProduct,
  updateProduct,
  getProductDetails,
  listAllProducts,
  archiveProduct,
  removeProduct,
  addVariant,
  updateVariant,
  removeVariant,
  setPricing,
  setInventory,
  reserveInventory,
  releaseInventory,
  publishToChannel,
  unpublishFromChannel,
  getProductsOnChannel,
  getCatalogStats,
  AVAILABLE_CHANNELS,
  CatalogError,
} from '../services/catalog.service.js';

const router = express.Router();

// ── Tenant extraction ───────────────────────────────────────────────────────

function getTenantId(req) {
  return req.headers['x-tenant-id']
    || req.user?.tenantId
    || req.query?.tenantId
    || null;
}

function requireTenant(req, res, next) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'x-tenant-id header required' });
  }
  req.tenantId = tenantId;
  next();
}

router.use(requireTenant);

// ── JSON helpers ─────────────────────────────────────────────────────────────

function ok(res, data) {
  res.json({ success: true, data });
}

function error(res, err) {
  const status = err instanceof CatalogError ? err.statusCode : 500;
  res.status(status).json({ success: false, error: err.message });
}

// ── Health ──────────────────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-catalog-os', version: '1.0.0' });
});

// ── Products ────────────────────────────────────────────────────────────────

router.get('/products', (req, res) => {
  try {
    const { category, status, channel, search, page, limit } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (channel) filters.channel = channel;
    if (search) filters.search = search;
    const products = listAllProducts(req.tenantId, filters);
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const start = (pageNum - 1) * limitNum;
    const paginated = products.slice(start, start + limitNum);
    ok(res, {
      products: paginated.map(p => p.toJSON()),
      total: products.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (e) { error(res, e); }
});

router.post('/products', (req, res) => {
  try {
    const product = createProduct(req.tenantId, req.body);
    ok(res, product.toJSON());
  } catch (e) { error(res, e); }
});

router.get('/products/stats', (req, res) => {
  try { ok(res, getCatalogStats(req.tenantId)); }
  catch (e) { error(res, e); }
});

router.get('/products/:id', (req, res) => {
  try {
    const product = getProductDetails(req.tenantId, req.params.id);
    ok(res, product.toJSON());
  } catch (e) { error(res, e); }
});

router.put('/products/:id', (req, res) => {
  try {
    const product = updateProduct(req.tenantId, req.params.id, req.body);
    ok(res, product.toJSON());
  } catch (e) { error(res, e); }
});

router.delete('/products/:id', (req, res) => {
  try {
    const { hard } = req.query;
    if (hard === 'true') {
      removeProduct(req.tenantId, req.params.id);
      ok(res, { deleted: true });
    } else {
      archiveProduct(req.tenantId, req.params.id);
      ok(res, { archived: true });
    }
  } catch (e) { error(res, e); }
});

// ── Variants ────────────────────────────────────────────────────────────────

router.get('/products/:id/variants', (req, res) => {
  try {
    const product = getProductDetails(req.tenantId, req.params.id);
    ok(res, { variants: product.variants });
  } catch (e) { error(res, e); }
});

router.post('/products/:id/variants', (req, res) => {
  try {
    const { variant } = addVariant(req.tenantId, req.params.id, req.body);
    ok(res, variant);
  } catch (e) { error(res, e); }
});

router.put('/products/:id/variants/:vid', (req, res) => {
  try {
    const { variant } = updateVariant(req.tenantId, req.params.id, req.params.vid, req.body);
    ok(res, variant);
  } catch (e) { error(res, e); }
});

router.delete('/products/:id/variants/:vid', (req, res) => {
  try {
    const { deleted } = removeVariant(req.tenantId, req.params.id, req.params.vid);
    ok(res, { deleted });
  } catch (e) { error(res, e); }
});

// ── Pricing ────────────────────────────────────────────────────────────────

router.get('/products/:id/pricing', (req, res) => {
  try {
    const product = getProductDetails(req.tenantId, req.params.id);
    const { getProductPricing } = require('../services/catalog.service.js');
    ok(res, getProductPricing(product));
  } catch (e) { error(res, e); }
});

router.put('/products/:id/pricing', (req, res) => {
  try {
    const { pricing } = setPricing(req.tenantId, req.params.id, req.body);
    ok(res, pricing);
  } catch (e) { error(res, e); }
});

// ── Inventory ───────────────────────────────────────────────────────────────

router.get('/products/:id/inventory', (req, res) => {
  try {
    const product = getProductDetails(req.tenantId, req.params.id);
    ok(res, {
      totalInventory: product.totalInventory,
      totalReserved: product.totalReserved,
      availableInventory: product.availableInventory,
      warehouses: product.inventory,
    });
  } catch (e) { error(res, e); }
});

router.put('/products/:id/inventory', (req, res) => {
  try {
    const { inventory } = setInventory(req.tenantId, req.params.id, req.body);
    ok(res, { inventory });
  } catch (e) { error(res, e); }
});

router.post('/products/:id/inventory/reserve', (req, res) => {
  try {
    const { warehouseRef, qty } = req.body;
    const result = reserveInventory(req.tenantId, req.params.id, warehouseRef, qty);
    ok(res, result);
  } catch (e) { error(res, e); }
});

router.post('/products/:id/inventory/release', (req, res) => {
  try {
    const { warehouseRef, qty } = req.body;
    const result = releaseInventory(req.tenantId, req.params.id, warehouseRef, qty);
    ok(res, result);
  } catch (e) { error(res, e); }
});

// ── Channels ───────────────────────────────────────────────────────────────

router.get('/channels', (_req, res) => {
  ok(res, { channels: AVAILABLE_CHANNELS });
});

router.get('/channels/:name/products', (req, res) => {
  try {
    const products = getProductsOnChannel(req.tenantId, req.params.name);
    ok(res, { products: products.map(p => p.toJSON()) });
  } catch (e) { error(res, e); }
});

router.post('/products/:id/publish', (req, res) => {
  try {
    const { channel } = publishToChannel(req.tenantId, req.params.id, req.body.channel);
    ok(res, { channel });
  } catch (e) { error(res, e); }
});

router.post('/products/:id/unpublish', (req, res) => {
  try {
    const { channel } = unpublishFromChannel(req.tenantId, req.params.id, req.body.channel);
    ok(res, { channel });
  } catch (e) { error(res, e); }
});

export default router;
