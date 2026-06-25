/**
 * Order Routes — HTTP endpoints for Nexha OrderOS.
 *
 * ADR-??? Phase 2 (2026-06-25).
 */

import express from 'express';
import {
  createOrder,
  updateOrder,
  getOrderDetails,
  listAllOrders,
  removeOrder,
  submitOrder,
  acknowledgeOrder,
  startFulfillment,
  markShipped,
  markDelivered,
  completeOrder,
  cancelOrder,
  linkExternalOrder,
  initiateReturn,
  approveReturn,
  rejectReturn,
  getOrderStats,
  OrderError,
} from '../services/order.service.js';

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

router.use(requireTenant);

function ok(res, data) { res.json({ success: true, data }); }
function err(res, e) { res.status(e instanceof OrderError ? e.statusCode : 500).json({ success: false, error: e.message }); }

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-order-os', version: '1.0.0' });
});

router.get('/orders', (req, res) => {
  try {
    const { status, supplierRef, since, page, limit } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (supplierRef) filters.supplierRef = supplierRef;
    if (since) filters.since = since;
    const orders = listAllOrders(req.tenantId, filters);
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const start = (pageNum - 1) * limitNum;
    ok(res, { orders: orders.slice(start, start + limitNum).map(o => o.toJSON()), total: orders.length, page: pageNum });
  } catch (e) { err(res, e); }
});

router.post('/orders', (req, res) => {
  try {
    const po = createOrder(req.tenantId, req.body);
    ok(res, po.toJSON());
  } catch (e) { err(res, e); }
});

router.get('/orders/stats', (req, res) => {
  try { ok(res, getOrderStats(req.tenantId)); }
  catch (e) { err(res, e); }
});

router.get('/orders/:id', (req, res) => {
  try { ok(res, getOrderDetails(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.put('/orders/:id', (req, res) => {
  try { ok(res, updateOrder(req.tenantId, req.params.id, req.body).toJSON()); }
  catch (e) { err(res, e); }
});

router.delete('/orders/:id', (req, res) => {
  try { ok(res, removeOrder(req.tenantId, req.params.id)); }
  catch (e) { err(res, e); }
});

// State transitions
router.post('/orders/:id/submit', (req, res) => {
  try { ok(res, submitOrder(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/acknowledge', (req, res) => {
  try { ok(res, acknowledgeOrder(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/fulfill', (req, res) => {
  try { ok(res, startFulfillment(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/ship', (req, res) => {
  try { ok(res, markShipped(req.tenantId, req.params.id, req.body.tracking).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/deliver', (req, res) => {
  try { ok(res, markDelivered(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/complete', (req, res) => {
  try { ok(res, completeOrder(req.tenantId, req.params.id).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/cancel', (req, res) => {
  try { ok(res, cancelOrder(req.tenantId, req.params.id, req.body.reason).toJSON()); }
  catch (e) { err(res, e); }
});

router.post('/orders/:id/external', (req, res) => {
  try { ok(res, linkExternalOrder(req.tenantId, req.params.id, req.body.externalOrderId).toJSON()); }
  catch (e) { err(res, e); }
});

// Returns
router.post('/orders/:id/returns', (req, res) => {
  try { ok(res, initiateReturn(req.tenantId, req.params.id, req.body)); }
  catch (e) { err(res, e); }
});

router.post('/returns/:returnId/approve', (req, res) => {
  try {
    const { orderId } = req.body;
    ok(res, approveReturn(req.tenantId, orderId, req.params.returnId));
  } catch (e) { err(res, e); }
});

router.post('/returns/:returnId/reject', (req, res) => {
  try {
    const { orderId } = req.body;
    ok(res, rejectReturn(req.tenantId, orderId, req.params.returnId));
  } catch (e) { err(res, e); }
});

export default router;
