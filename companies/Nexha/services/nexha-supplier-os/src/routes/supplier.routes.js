/**
 * Supplier Routes — HTTP endpoints for Nexha SupplierOS.
 *
 * ADR-??? Phase 4 (2026-06-25).
 */

import express from 'express';
import {
  createSupplier, updateSupplier, getSupplierDetails, listAllSuppliers,
  removeSupplier, onboardSupplier, suspendSupplier, reactivateSupplier,
  addContract, createRFQ, quoteRFQ, awardRFQ, recordPerformance,
  getSupplierStats, SupplierError,
} from '../services/supplier.service.js';

const router = express.Router();

function getTenantId(req) {
  return req.headers['x-tenant-id'] || req.user?.tenantId || req.query?.tenantId || null;
}

function requireTenant(req, res, next) {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ success: false, error: 'x-tenant-id header required' });
  req.tenantId = tenantId;
  next();
}

function ok(res, data) { res.json({ success: true, data }); }
function err(res, e) { res.status(e instanceof SupplierError ? e.statusCode : 500).json({ success: false, error: e.message }); }

router.use(requireTenant);

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-supplier-os', version: '1.0.0' });
});

// Suppliers
router.get('/suppliers', (req, res) => {
  try {
    const { status, tier, category, page, limit } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (tier) filters.tier = tier;
    if (category) filters.category = category;
    const suppliers = listAllSuppliers(req.tenantId, filters);
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const start = (pageNum - 1) * limitNum;
    ok(res, { suppliers: suppliers.slice(start, start + limitNum).map(s => s.toJSON()), total: suppliers.length, page: pageNum });
  } catch (e) { err(res, e); }
});

router.post('/suppliers', (req, res) => {
  try { ok(res, createSupplier(req.tenantId, req.body).toJSON()); }
  catch (e) { err(res, e); }
});

router.get('/suppliers/stats', (req, res) => {
  try { ok(res, getSupplierStats(req.tenantId)); }
  catch (e) { err(res, e); }
});

router.get('/suppliers/:id', (req, res) => {
  try { ok(res, getSupplierDetails(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.put('/suppliers/:id', (req, res) => {
  try { ok(res, updateSupplier(req.tenantId, req.params.id, req.body).toJSON()); }
  catch (e) { err(res, e); }
});

router.delete('/suppliers/:id', (req, res) => {
  try { ok(res, removeSupplier(req.tenantId, req.params.id)); }
  catch (e) { err(res, e); }
});

// State transitions
router.post('/suppliers/:id/onboard', (req, res) => {
  try { ok(res, onboardSupplier(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/suppliers/:id/suspend', (req, res) => {
  try { ok(res, suspendSupplier(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/suppliers/:id/reactivate', (req, res) => {
  try { ok(res, reactivateSupplier(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

// Contracts
router.post('/suppliers/:id/contracts', (req, res) => {
  try { ok(res, addContract(req.tenantId, req.params.id, req.body)); }
  catch (e) { err(res, e); }
});

// RFQs
router.post('/suppliers/:id/rfqs', (req, res) => {
  try { ok(res, createRFQ(req.tenantId, req.params.id, req.body)); }
  catch (e) { err(res, e); }
});

router.post('/suppliers/:id/rfqs/:rfqId/quote', (req, res) => {
  try { ok(res, quoteRFQ(req.tenantId, req.params.id, req.params.rfqId, req.body.quotedValue)); }
  catch (e) { err(res, e); }
});

router.post('/suppliers/:id/rfqs/:rfqId/award', (req, res) => {
  try { ok(res, awardRFQ(req.tenantId, req.params.id, req.params.rfqId)); }
  catch (e) { err(res, e); }
});

// Performance
router.post('/suppliers/:id/performance', (req, res) => {
  try { ok(res, recordPerformance(req.tenantId, req.params.id, req.body).toJSON()); }
  catch (e) { err(res, e); }
});

export default router;
