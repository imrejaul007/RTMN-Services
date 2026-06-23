/**
 * Commerce Runtime HTTP routes.
 *
 * All routes are tenant-scoped via JWT (or internal token + X-Tenant-Id).
 * ADR-0010 Phase 8 (2026-06-22).
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth, internalTokenAuth, tenantFrom } from '../middleware/auth.js';
import * as svc from '../services/commerceService.js';

const router = Router();

// =====================================================
// Zod schemas
// =====================================================

const lineItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const createOrderSchema = z.object({
  buyerRef: z.string().min(1),
  sellerRef: z.string().min(1),
  items: z.array(lineItemSchema).min(1),
  currency: z.string().optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  shippingAddress: z.any().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  orderId: z.string().optional(),
});

const updateOrderSchema = z.object({
  items: z.array(lineItemSchema).min(1).optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  shippingAddress: z.any().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const placeOrderSchema = z.object({
  method: z.string().optional(),
  skipPayment: z.boolean().optional(),
  paymentId: z.string().optional(),
  paymentMetadata: z.record(z.any()).optional(),
}).optional();

const cancelSchema = z.object({ reason: z.string().optional() }).optional();
const refundSchema = z.object({
  reason: z.string().optional(),
  amount: z.number().positive().optional(),
}).optional();

const shipSchema = z.object({
  trackingNumber: z.string().optional(),
  carrierRef: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).refine((v) => v.trackingNumber || v.carrierRef, { message: 'trackingNumber or carrierRef required' });

const startFulfillmentSchema = z.object({
  warehouseRef: z.string().optional(),
  carrierRef: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).optional();

const deliverSchema = z.object({ metadata: z.record(z.any()).optional() }).optional();

const listOrdersSchema = z.object({
  status: z.string().optional(),
  buyerRef: z.string().optional(),
  sellerRef: z.string().optional(),
  paymentId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().optional(),
  currency: z.string().optional(),
  paymentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const listPaymentsSchema = z.object({
  orderId: z.string().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const authActionSchema = z.object({
  providerRef: z.string().optional(),
}).optional();

const failPaymentSchema = z.object({ reason: z.string().optional() }).optional();
const cancelPaymentSchema = z.object({ reason: z.string().optional() }).optional();
const rejectReturnSchema = z.object({ reason: z.string().optional() }).optional();
const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
}).optional();

const returnLineSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const createReturnSchema = z.object({
  orderId: z.string().min(1),
  lines: z.array(returnLineSchema).min(1),
  reason: z.string().optional(),
  refundAmount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  returnId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const listReturnsSchema = z.object({
  orderId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const approveReturnSchema = z.object({
  refundAmount: z.number().nonnegative().optional(),
  reason: z.string().optional(),
}).optional();

const markInTransitSchema = z.object({ trackingNumber: z.string().optional() }).optional();

const refundReturnSchema = z.object({ amount: z.number().positive().optional() }).optional();

// =====================================================
// Helpers
// =====================================================

function badRequest(res, issues) {
  return res.status(400).json({ error: 'validation_failed', issues });
}

function handleServiceError(res, err) {
  if (err instanceof svc.ValidationError) {
    return res.status(400).json({ error: err.message, issues: err.issues || {} });
  }
  if (err instanceof svc.NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof svc.StateTransitionError) {
    return res.status(422).json({
      error: err.message,
      from: err.from,
      to: err.to,
    });
  }
  // Unknown — log + 500
  // eslint-disable-next-line no-console
  console.error('[commerce-runtime] unhandled error:', err);
  return res.status(500).json({ error: err.message || 'internal error' });
}

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      issues[path || '_'] = issue.message;
    }
    return { ok: false, issues };
  }
  return { ok: true, data: result.data };
}

function reqTenant(req, res) {
  const tenantId = tenantFrom(req);
  if (!tenantId) {
    res.status(401).json({ error: 'tenantId required (set via JWT, X-Tenant-Id header, or internal token)' });
    return null;
  }
  return tenantId;
}

// =====================================================
// Operational
// =====================================================

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nexha-commerce-runtime', uptime: process.uptime() });
});

router.get('/ready', (_req, res) => {
  // shallow ready check (tests use direct mongo connection)
  res.json({ status: 'ready' });
});

router.get('/', (_req, res) => {
  res.json({
    service: 'nexha-commerce-runtime',
    description: 'The execution plane: orders, fulfillment, payments, escrow, returns. ADR-0010 Phase 8.',
    port: parseInt(process.env.COMMERCE_RUNTIME_PORT || '4364', 10),
    endpoints: [
      'POST /api/orders',
      'GET /api/orders',
      'GET /api/orders/:id',
      'PATCH /api/orders/:id',
      'POST /api/orders/:id/place',
      'POST /api/orders/:id/cancel',
      'POST /api/orders/:id/fulfill',
      'POST /api/orders/:id/ship',
      'POST /api/orders/:id/deliver',
      'POST /api/orders/:id/complete',
      'POST /api/orders/:id/refund',
      'POST /api/payments',
      'GET /api/payments',
      'GET /api/payments/:id',
      'POST /api/payments/:id/authorize',
      'POST /api/payments/:id/capture',
      'POST /api/payments/:id/complete',
      'POST /api/payments/:id/fail',
      'POST /api/payments/:id/cancel',
      'POST /api/payments/:id/refund',
      'POST /api/returns',
      'GET /api/returns',
      'GET /api/returns/:id',
      'POST /api/returns/:id/approve',
      'POST /api/returns/:id/reject',
      'POST /api/returns/:id/in-transit',
      'POST /api/returns/:id/received',
      'POST /api/returns/:id/complete',
      'POST /api/returns/:id/refund',
      'GET /api/stats',
    ],
  });
});

router.get('/api/validate', (_req, res) => {
  res.json({ ok: true });
});

// =====================================================
// Orders
// =====================================================

router.post('/api/orders', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(createOrderSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.createOrder(tenantId, parsed.data);
    res.status(201).json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/orders', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(listOrdersSchema, req.query);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const result = await svc.listOrders(tenantId, parsed.data);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/orders/:id', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const order = await svc.getOrder(tenantId, req.params.id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.patch('/api/orders/:id', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(updateOrderSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    return badRequest(res, { _: 'no fields to update' });
  }
  try {
    const order = await svc.updateOrder(tenantId, req.params.id, parsed.data);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/place', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(placeOrderSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const result = await svc.placeOrder(tenantId, req.params.id, parsed.data || {});
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/cancel', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(cancelSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.cancelOrder(tenantId, req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/fulfill', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(startFulfillmentSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.startFulfillment(tenantId, req.params.id, parsed.data || {});
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/ship', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(shipSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.shipOrder(tenantId, req.params.id, parsed.data);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/deliver', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(deliverSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.deliverOrder(tenantId, req.params.id, parsed.data || {});
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/complete', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const order = await svc.completeOrder(tenantId, req.params.id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/orders/:id/refund', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(refundSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const order = await svc.refundOrder(tenantId, req.params.id, parsed.data || {});
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Payments
// =====================================================

router.post('/api/payments', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(createPaymentSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.createPayment(tenantId, parsed.data);
    res.status(201).json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/payments', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(listPaymentsSchema, req.query);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const result = await svc.listPayments(tenantId, parsed.data);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/payments/:id', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const payment = await svc.getPayment(tenantId, req.params.id);
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/authorize', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(authActionSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.authorizePayment(tenantId, req.params.id, parsed.data || {});
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/capture', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(authActionSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.capturePayment(tenantId, req.params.id, parsed.data || {});
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/complete', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const payment = await svc.completePayment(tenantId, req.params.id);
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/fail', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(failPaymentSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.failPayment(tenantId, req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/cancel', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(cancelPaymentSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.cancelPayment(tenantId, req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/payments/:id/refund', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(refundPaymentSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const payment = await svc.refundPayment(tenantId, req.params.id, parsed.data || {});
    res.json(payment);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Returns
// =====================================================

router.post('/api/returns', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(createReturnSchema, req.body);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const ret = await svc.createReturn(tenantId, parsed.data);
    res.status(201).json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/returns', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(listReturnsSchema, req.query);
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const result = await svc.listReturns(tenantId, parsed.data);
    res.json(result);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.get('/api/returns/:id', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const ret = await svc.getReturn(tenantId, req.params.id);
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/approve', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(approveReturnSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const ret = await svc.approveReturn(tenantId, req.params.id, parsed.data || {});
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/reject', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(rejectReturnSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const ret = await svc.rejectReturn(tenantId, req.params.id, (parsed.data && parsed.data.reason) || null);
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/in-transit', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(markInTransitSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const ret = await svc.markReturnInTransit(tenantId, req.params.id, parsed.data || {});
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/received', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const ret = await svc.markReturnReceived(tenantId, req.params.id);
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/complete', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const ret = await svc.completeReturn(tenantId, req.params.id);
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

router.post('/api/returns/:id/refund', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  const parsed = parse(refundReturnSchema, req.body || {});
  if (!parsed.ok) return badRequest(res, parsed.issues);
  try {
    const ret = await svc.refundReturn(tenantId, req.params.id, parsed.data || {});
    res.json(ret);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// =====================================================
// Stats
// =====================================================

router.get('/api/stats', requireAuth, async (req, res) => {
  const tenantId = reqTenant(req, res);
  if (!tenantId) return;
  try {
    const stats = await svc.getStats(tenantId);
    res.json(stats);
  } catch (err) {
    handleServiceError(res, err);
  }
});

export default router;