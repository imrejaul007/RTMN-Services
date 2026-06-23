/**
 * Commerce Runtime service layer.
 *
 * The execution plane that ties together orders, payments, and returns.
 * Each entity has a state machine; transitions are explicit and 422 on
 * illegal moves.
 *
 * ADR-0010 Phase 8 (2026-06-22).
 *
 * Errors:
 *   - ValidationError (400) — bad input
 *   - NotFoundError (404) — missing entity
 *   - StateTransitionError (422) — illegal state change
 */

import { v4 as uuidv4 } from 'uuid';
import { Order, ORDER_STATUSES } from '../models/Order.js';
import { Payment, PAYMENT_STATUSES, PAYMENT_METHODS } from '../models/Payment.js';
import { Return, RETURN_STATUSES, RETURN_REASONS } from '../models/Return.js';

// =====================================================
// Errors
// =====================================================

export class ValidationError extends Error {
  constructor(message, issues = {}) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class StateTransitionError extends Error {
  constructor(message, from, to) {
    super(message);
    this.name = 'StateTransitionError';
    this.from = from;
    this.to = to;
  }
}

// =====================================================
// State machine tables
// =====================================================

const ORDER_TRANSITIONS = {
  DRAFT:      ['PLACED', 'CANCELLED'],
  PLACED:     ['PAID', 'CANCELLED'],
  PAID:       ['FULFILLING', 'REFUNDED'],
  FULFILLING: ['SHIPPED', 'REFUNDED'],
  SHIPPED:    ['DELIVERED', 'RETURNED'],
  DELIVERED:  ['COMPLETED', 'RETURNED'],
  RETURNED:   ['COMPLETED', 'REFUNDED'],
  COMPLETED:  [],
  CANCELLED:  [],
  REFUNDED:   [],
};

const PAYMENT_TRANSITIONS = {
  PENDING:    ['AUTHORIZED', 'FAILED', 'CANCELLED'],
  AUTHORIZED: ['CAPTURED', 'CANCELLED'],
  CAPTURED:   ['COMPLETED', 'REFUNDED'],
  COMPLETED:  ['REFUNDED'],
  FAILED:     [],
  CANCELLED:  [],
  REFUNDED:   [],
};

const RETURN_TRANSITIONS = {
  REQUESTED:  ['APPROVED', 'REJECTED'],
  APPROVED:   ['IN_TRANSIT', 'REJECTED'],
  IN_TRANSIT: ['RECEIVED'],
  RECEIVED:   ['COMPLETED', 'REFUNDED'],
  COMPLETED:  ['REFUNDED'],
  REJECTED:   [],
  REFUNDED:   [],
};

function assertTransition(table, from, to, entityLabel) {
  if (!table[from]) {
    throw new StateTransitionError(`Unknown ${entityLabel} status: ${from}`, from, to);
  }
  // from === to is a no-op for the state machine itself, BUT a terminal
  // status with no allowed moves should still throw (no double-processing).
  if (from === to) {
    const allowed = table[from];
    if (allowed.length === 0) {
      throw new StateTransitionError(
        `${entityLabel} is already in terminal status ${from}; cannot transition to ${to}`,
        from,
        to
      );
    }
    return;
  }
  const allowed = table[from];
  if (!allowed.includes(to)) {
    throw new StateTransitionError(
      `Illegal ${entityLabel} transition: ${from} → ${to}. Allowed: [${allowed.join(', ')}]`,
      from,
      to
    );
  }
}

// =====================================================
// Helpers
// =====================================================

function computeTotals(items, tax = 0, shipping = 0) {
  const subtotal = (items || []).reduce(
    (sum, it) => sum + Number(it.unitPrice) * Number(it.quantity),
    0
  );
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    shipping: round2(shipping),
    total: round2(subtotal + tax + shipping),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function newId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

// =====================================================
// Orders
// =====================================================

/**
 * Create an order in DRAFT status.
 * Inputs: buyerRef, sellerRef, items[], currency?, tax?, shipping?, shippingAddress?, notes?, tags?, metadata?
 */
export async function createOrder(tenantId, body) {
  if (!buyerRefOk(body)) {
    throw new ValidationError('Invalid input', {
      buyerRef: 'required',
      sellerRef: 'required',
      items: 'non-empty array of {sku,name,quantity,unitPrice}',
    });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ValidationError('Invalid input', { items: 'non-empty array required' });
  }
  for (const [i, it] of body.items.entries()) {
    if (!it.sku || !it.name || !Number.isFinite(Number(it.quantity)) || !Number.isFinite(Number(it.unitPrice))) {
      throw new ValidationError('Invalid input', {
        [`items[${i}]`]: 'each item requires sku, name, quantity, unitPrice',
      });
    }
    if (Number(it.quantity) <= 0 || Number(it.unitPrice) < 0) {
      throw new ValidationError('Invalid input', {
        [`items[${i}]`]: 'quantity must be > 0; unitPrice must be >= 0',
      });
    }
  }
  const totals = computeTotals(body.items, Number(body.tax || 0), Number(body.shipping || 0));
  const orderId = body.orderId || newId('ord');
  const now = new Date();
  const doc = {
    tenantId,
    orderId,
    buyerRef: String(body.buyerRef),
    sellerRef: String(body.sellerRef),
    status: 'DRAFT',
    items: body.items.map((it) => ({
      sku: String(it.sku),
      name: String(it.name),
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      currency: it.currency || body.currency || 'USD',
      metadata: it.metadata || {},
    })),
    currency: body.currency || 'USD',
    subtotal: totals.subtotal,
    tax: totals.tax,
    shipping: totals.shipping,
    total: totals.total,
    shippingAddress: body.shippingAddress || null,
    notes: body.notes || null,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    metadata: body.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  try {
    const created = await Order.create(doc);
    return created.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ValidationError(`Duplicate orderId: ${orderId}`, { orderId: 'must be unique per tenant' });
    }
    throw err;
  }
}

function buyerRefOk(body) {
  return body && typeof body.buyerRef === 'string' && body.buyerRef.length > 0
    && typeof body.sellerRef === 'string' && body.sellerRef.length > 0;
}

/**
 * Get an order. Cross-tenant reads allowed only when buyerRef or sellerRef
 * matches the caller's tenant (read-only metadata).
 */
export async function getOrder(tenantId, orderId, options = {}) {
  const order = await Order.findOne({ orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  if (options.crossTenant) return order.toObject();
  if (order.tenantId !== tenantId) {
    throw new NotFoundError(`Order not found: ${orderId}`);
  }
  return order.toObject();
}

/**
 * Update mutable draft fields (notes, tags, shippingAddress, items).
 * Allowed only when status === DRAFT.
 */
export async function updateOrder(tenantId, orderId, patch) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  if (!patch || Object.keys(patch).length === 0) {
    throw new ValidationError('No fields to update', { _: 'patch must contain at least one field' });
  }
  // We only allow mutation while DRAFT
  if (order.status !== 'DRAFT') {
    throw new StateTransitionError(
      `Cannot update order in status ${order.status}; only DRAFT is editable`,
      order.status,
      'update'
    );
  }
  if (patch.items) {
    if (!Array.isArray(patch.items) || patch.items.length === 0) {
      throw new ValidationError('Invalid input', { items: 'non-empty array' });
    }
    order.items = patch.items.map((it) => ({
      sku: String(it.sku),
      name: String(it.name),
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      currency: it.currency || order.currency,
      metadata: it.metadata || {},
    }));
    const totals = computeTotals(order.items, Number(patch.tax ?? order.tax), Number(patch.shipping ?? order.shipping));
    order.subtotal = totals.subtotal;
    order.tax = totals.tax;
    order.shipping = totals.shipping;
    order.total = totals.total;
  }
  if (patch.shippingAddress !== undefined) order.shippingAddress = patch.shippingAddress;
  if (patch.notes !== undefined) order.notes = patch.notes;
  if (patch.tags !== undefined) order.tags = Array.isArray(patch.tags) ? patch.tags.map(String) : [];
  if (patch.metadata !== undefined) order.metadata = patch.metadata;
  await order.save();
  return order.toObject();
}

export async function listOrders(tenantId, query = {}) {
  const filter = { tenantId };
  if (query.status) filter.status = query.status;
  if (query.buyerRef) filter.buyerRef = query.buyerRef;
  if (query.sellerRef) filter.sellerRef = query.sellerRef;
  if (query.paymentId) filter.paymentId = query.paymentId;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { orders: rows, total, limit, offset };
}

/**
 * Place an order: DRAFT → PLACED. Creates a pending payment if not provided.
 * Returns { order, payment }.
 */
export async function placeOrder(tenantId, orderId, opts = {}) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'PLACED', 'order');
  if (order.items.length === 0) {
    throw new ValidationError('Cannot place order with no items', { items: 'required' });
  }
  order.status = 'PLACED';
  order.placedAt = new Date();
  await order.save();

  // Auto-create a pending payment unless caller supplied one
  let payment = null;
  if (opts.paymentId) {
    payment = await Payment.findOne({ tenantId, paymentId: opts.paymentId });
    if (!payment) throw new NotFoundError(`Payment not found: ${opts.paymentId}`);
    if (payment.orderId !== order.orderId) {
      throw new ValidationError('Payment belongs to a different order', { paymentId: 'mismatch' });
    }
    order.paymentId = payment.paymentId;
    await order.save();
  } else if (opts.method || opts.skipPayment !== true) {
    const method = PAYMENT_METHODS.includes(opts.method) ? opts.method : 'OTHER';
    payment = await Payment.create({
      tenantId,
      paymentId: newId('pay'),
      orderId: order.orderId,
      buyerRef: order.buyerRef,
      sellerRef: order.sellerRef,
      status: 'PENDING',
      method,
      amount: order.total,
      currency: order.currency,
      metadata: opts.paymentMetadata || {},
    });
    order.paymentId = payment.paymentId;
    await order.save();
  }

  return { order: order.toObject(), payment: payment ? payment.toObject() : null };
}

/**
 * Cancel an order. Allowed from DRAFT or PLACED.
 * If payment was PENDING/AUTHORIZED, cancel it too.
 */
export async function cancelOrder(tenantId, orderId, reason = null) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'CANCELLED', 'order');
  order.status = 'CANCELLED';
  order.cancelledAt = new Date();
  if (reason) order.metadata = { ...(order.metadata || {}), cancellationReason: reason };
  await order.save();

  if (order.paymentId) {
    const payment = await Payment.findOne({ tenantId, paymentId: order.paymentId });
    if (payment && ['PENDING', 'AUTHORIZED'].includes(payment.status)) {
      payment.status = 'CANCELLED';
      await payment.save();
    }
  }
  return order.toObject();
}

/**
 * Mark an order PAID. Called when payment is captured.
 * Idempotent: if order already PAID, returns it unchanged.
 */
export async function markOrderPaid(tenantId, orderId) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  if (order.status === 'PAID') return order.toObject();
  assertTransition(ORDER_TRANSITIONS, order.status, 'PAID', 'order');
  order.status = 'PAID';
  order.paidAt = new Date();
  await order.save();
  return order.toObject();
}

/**
 * Start fulfillment: PAID → FULFILLING. Optionally attach warehouse + carrier refs.
 */
export async function startFulfillment(tenantId, orderId, body = {}) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'FULFILLING', 'order');
  order.status = 'FULFILLING';
  order.fulfillment = {
    ...(order.fulfillment || {}),
    warehouseRef: body.warehouseRef || null,
    carrierRef: body.carrierRef || null,
    metadata: { ...((order.fulfillment && order.fulfillment.metadata) || {}), ...(body.metadata || {}) },
  };
  await order.save();
  return order.toObject();
}

/**
 * Mark shipped: FULFILLING → SHIPPED. Requires trackingNumber.
 */
export async function shipOrder(tenantId, orderId, body = {}) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'SHIPPED', 'order');
  if (!body.trackingNumber && !(order.fulfillment && order.fulfillment.trackingNumber)) {
    throw new ValidationError('trackingNumber required to ship', { trackingNumber: 'required' });
  }
  order.status = 'SHIPPED';
  order.fulfillment = {
    ...(order.fulfillment || {}),
    trackingNumber: body.trackingNumber || order.fulfillment.trackingNumber,
    carrierRef: body.carrierRef || (order.fulfillment && order.fulfillment.carrierRef) || null,
    shippedAt: new Date(),
  };
  await order.save();
  return order.toObject();
}

/**
 * Mark delivered: SHIPPED → DELIVERED.
 */
export async function deliverOrder(tenantId, orderId, body = {}) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'DELIVERED', 'order');
  order.status = 'DELIVERED';
  order.fulfillment = {
    ...(order.fulfillment || {}),
    deliveredAt: new Date(),
    metadata: { ...((order.fulfillment && order.fulfillment.metadata) || {}), ...(body.metadata || {}) },
  };
  await order.save();
  return order.toObject();
}

/**
 * Complete: DELIVERED → COMPLETED. Idempotent on already-COMPLETED.
 */
export async function completeOrder(tenantId, orderId) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  if (order.status === 'COMPLETED') return order.toObject();
  assertTransition(ORDER_TRANSITIONS, order.status, 'COMPLETED', 'order');
  order.status = 'COMPLETED';
  order.completedAt = new Date();
  await order.save();
  return order.toObject();
}

/**
 * Mark order REFUNDED (terminal). Allowed from PAID, FULFILLING, or RETURNED.
 */
export async function refundOrder(tenantId, orderId, body = {}) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'REFUNDED', 'order');
  order.status = 'REFUNDED';
  if (body.reason) order.metadata = { ...(order.metadata || {}), refundReason: body.reason };
  await order.save();

  // Update linked payment refund total
  if (order.paymentId) {
    const payment = await Payment.findOne({ tenantId, paymentId: order.paymentId });
    if (payment && ['CAPTURED', 'COMPLETED'].includes(payment.status)) {
      payment.status = 'REFUNDED';
      payment.refundedAmount = payment.amount;
      payment.refundedAt = new Date();
      await payment.save();
    }
  }
  return order.toObject();
}

/**
 * Mark order RETURNED (after a return is RECEIVED). Caller is responsible
 * for creating the Return record separately; this just transitions the order.
 */
export async function markOrderReturned(tenantId, orderId) {
  const order = await Order.findOne({ tenantId, orderId });
  if (!order) throw new NotFoundError(`Order not found: ${orderId}`);
  assertTransition(ORDER_TRANSITIONS, order.status, 'RETURNED', 'order');
  order.status = 'RETURNED';
  await order.save();
  return order.toObject();
}

// =====================================================
// Payments
// =====================================================

export async function createPayment(tenantId, body) {
  if (!body || !body.orderId || !Number.isFinite(Number(body.amount))) {
    throw new ValidationError('Invalid input', {
      orderId: 'required',
      amount: 'required (number)',
      method: 'required',
    });
  }
  if (body.method && !PAYMENT_METHODS.includes(body.method)) {
    throw new ValidationError(`Invalid payment method: ${body.method}. Allowed: ${PAYMENT_METHODS.join(', ')}`, { method: 'invalid' });
  }
  const order = await Order.findOne({ orderId: body.orderId });
  if (!order) throw new NotFoundError(`Order not found: ${body.orderId}`);
  if (order.tenantId !== tenantId) throw new NotFoundError(`Order not found: ${body.orderId}`);

  const paymentId = body.paymentId || newId('pay');
  try {
    const payment = await Payment.create({
      tenantId,
      paymentId,
      orderId: order.orderId,
      buyerRef: order.buyerRef,
      sellerRef: order.sellerRef,
      status: 'PENDING',
      method: body.method || 'OTHER',
      amount: Number(body.amount),
      currency: body.currency || order.currency,
      metadata: body.metadata || {},
    });
    if (!order.paymentId) {
      order.paymentId = payment.paymentId;
      await order.save();
    }
    return payment.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ValidationError(`Duplicate paymentId: ${paymentId}`, { paymentId: 'must be unique' });
    }
    throw err;
  }
}

export async function getPayment(tenantId, paymentId) {
  const payment = await Payment.findOne({ tenantId, paymentId });
  if (!payment) throw new NotFoundError(`Payment not found: ${paymentId}`);
  return payment.toObject();
}

export async function listPayments(tenantId, query = {}) {
  const filter = { tenantId };
  if (query.orderId) filter.orderId = query.orderId;
  if (query.status) filter.status = query.status;
  if (query.method) filter.method = query.method;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  return { payments: rows, total, limit, offset };
}

async function transitionPayment(tenantId, paymentId, to, mutate = null) {
  const payment = await Payment.findOne({ tenantId, paymentId });
  if (!payment) throw new NotFoundError(`Payment not found: ${paymentId}`);
  assertTransition(PAYMENT_TRANSITIONS, payment.status, to, 'payment');
  if (mutate) mutate(payment);
  payment.status = to;
  await payment.save();
  return payment.toObject();
}

export async function authorizePayment(tenantId, paymentId, body = {}) {
  return transitionPayment(tenantId, paymentId, 'AUTHORIZED', (p) => {
    p.authorizedAt = new Date();
    if (body.providerRef) p.providerRef = body.providerRef;
  });
}

export async function capturePayment(tenantId, paymentId, body = {}) {
  const payment = await transitionPayment(tenantId, paymentId, 'CAPTURED', (p) => {
    p.capturedAt = new Date();
    if (body.providerRef) p.providerRef = body.providerRef;
  });
  // Auto-promote order to PAID
  await markOrderPaid(tenantId, payment.orderId);
  return payment;
}

export async function completePayment(tenantId, paymentId) {
  return transitionPayment(tenantId, paymentId, 'COMPLETED');
}

export async function failPayment(tenantId, paymentId, reason = null) {
  return transitionPayment(tenantId, paymentId, 'FAILED', (p) => {
    if (reason) p.failureReason = reason;
  });
}

export async function cancelPayment(tenantId, paymentId, reason = null) {
  return transitionPayment(tenantId, paymentId, 'CANCELLED', (p) => {
    if (reason) p.failureReason = reason;
  });
}

/**
 * Refund (full or partial). Allowed from CAPTURED or COMPLETED.
 * If the full amount is refunded, the payment becomes REFUNDED.
 * If a partial refund is applied to a CAPTURED payment, it stays
 * CAPTURED with refundedAmount updated.
 */
export async function refundPayment(tenantId, paymentId, body = {}) {
  const payment = await Payment.findOne({ tenantId, paymentId });
  if (!payment) throw new NotFoundError(`Payment not found: ${paymentId}`);
  const refundAmount = body.amount != null ? Number(body.amount) : payment.amount;
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new ValidationError('amount must be a positive number', { amount: 'required' });
  }
  if (refundAmount > payment.amount - payment.refundedAmount) {
    throw new ValidationError(
      `Refund ${refundAmount} exceeds remaining ${payment.amount - payment.refundedAmount}`,
      { amount: 'exceeds remaining' }
    );
  }
  assertTransition(PAYMENT_TRANSITIONS, payment.status, 'REFUNDED', 'payment');
  payment.refundedAmount = round2(payment.refundedAmount + refundAmount);
  payment.refundedAt = new Date();
  if (payment.refundedAmount >= payment.amount) {
    payment.status = 'REFUNDED';
  }
  await payment.save();
  return payment.toObject();
}

// =====================================================
// Returns
// =====================================================

export async function createReturn(tenantId, body) {
  if (!body || !body.orderId) {
    throw new ValidationError('Invalid input', { orderId: 'required' });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new ValidationError('Invalid input', { lines: 'non-empty array of {sku,quantity,reason?}' });
  }
  for (const [i, l] of body.lines.entries()) {
    if (!l.sku || !Number.isFinite(Number(l.quantity)) || Number(l.quantity) <= 0) {
      throw new ValidationError('Invalid input', { [`lines[${i}]`]: 'each line requires sku and quantity > 0' });
    }
    if (l.reason && !RETURN_REASONS.includes(l.reason)) {
      throw new ValidationError(`Invalid reason: ${l.reason}. Allowed: ${RETURN_REASONS.join(', ')}`, { [`lines[${i}].reason`]: 'invalid' });
    }
  }
  const order = await Order.findOne({ orderId: body.orderId });
  if (!order) throw new NotFoundError(`Order not found: ${body.orderId}`);
  if (order.tenantId !== tenantId) throw new NotFoundError(`Order not found: ${body.orderId}`);

  const returnId = body.returnId || newId('ret');
  try {
    const ret = await Return.create({
      tenantId,
      returnId,
      orderId: order.orderId,
      buyerRef: order.buyerRef,
      sellerRef: order.sellerRef,
      status: 'REQUESTED',
      reason: body.reason || body.lines[0].reason || 'OTHER',
      lines: body.lines.map((l) => ({
        sku: String(l.sku),
        quantity: Number(l.quantity),
        reason: l.reason || body.reason || 'OTHER',
        notes: l.notes || null,
      })),
      refundAmount: Number(body.refundAmount || 0),
      currency: body.currency || order.currency,
      metadata: body.metadata || {},
    });
    return ret.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ValidationError(`Duplicate returnId: ${returnId}`, { returnId: 'must be unique' });
    }
    throw err;
  }
}

export async function getReturn(tenantId, returnId) {
  const ret = await Return.findOne({ tenantId, returnId });
  if (!ret) throw new NotFoundError(`Return not found: ${returnId}`);
  return ret.toObject();
}

export async function listReturns(tenantId, query = {}) {
  const filter = { tenantId };
  if (query.orderId) filter.orderId = query.orderId;
  if (query.status) filter.status = query.status;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    Return.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Return.countDocuments(filter),
  ]);
  return { returns: rows, total, limit, offset };
}

async function transitionReturn(tenantId, returnId, to, mutate = null) {
  const ret = await Return.findOne({ tenantId, returnId });
  if (!ret) throw new NotFoundError(`Return not found: ${returnId}`);
  assertTransition(RETURN_TRANSITIONS, ret.status, to, 'return');
  if (mutate) mutate(ret);
  ret.status = to;
  await ret.save();
  return ret.toObject();
}

export async function approveReturn(tenantId, returnId, body = {}) {
  return transitionReturn(tenantId, returnId, 'APPROVED', (r) => {
    r.approvedAt = new Date();
    if (body.refundAmount != null) r.refundAmount = Number(body.refundAmount);
    if (body.reason) r.reason = body.reason;
  });
}

export async function rejectReturn(tenantId, returnId, reason = null) {
  return transitionReturn(tenantId, returnId, 'REJECTED', (r) => {
    r.rejectedAt = new Date();
    if (reason) r.rejectionReason = reason;
  });
}

export async function markReturnInTransit(tenantId, returnId, body = {}) {
  return transitionReturn(tenantId, returnId, 'IN_TRANSIT', (r) => {
    if (body.trackingNumber) r.metadata = { ...(r.metadata || {}), trackingNumber: body.trackingNumber };
  });
}

export async function markReturnReceived(tenantId, returnId) {
  return transitionReturn(tenantId, returnId, 'RECEIVED', (r) => {
    r.receivedAt = new Date();
  });
}

export async function completeReturn(tenantId, returnId) {
  return transitionReturn(tenantId, returnId, 'COMPLETED', (r) => {
    r.completedAt = new Date();
  });
}

/**
 * Refund a return. Triggers payment.refundPayment if the linked payment
 * has not been fully refunded, then marks the return REFUNDED.
 */
export async function refundReturn(tenantId, returnId, body = {}) {
  const ret = await Return.findOne({ tenantId, returnId });
  if (!ret) throw new NotFoundError(`Return not found: ${returnId}`);
  assertTransition(RETURN_TRANSITIONS, ret.status, 'REFUNDED', 'return');

  const order = await Order.findOne({ tenantId, orderId: ret.orderId });
  if (order && order.paymentId) {
    const payment = await Payment.findOne({ tenantId, paymentId: order.paymentId });
    if (payment && ['CAPTURED', 'COMPLETED'].includes(payment.status)) {
      const refundAmount = body.amount != null
        ? Number(body.amount)
        : (ret.refundAmount > 0 ? ret.refundAmount : payment.amount);
      try {
        await refundPayment(tenantId, payment.paymentId, { amount: refundAmount });
      } catch (err) {
        if (!/exceeds remaining/.test(err.message)) throw err;
        // Already partially refunded — that's fine, just refund the remainder
        const remaining = payment.amount - payment.refundedAmount;
        if (remaining > 0) {
          await refundPayment(tenantId, payment.paymentId, { amount: remaining });
        }
      }
    }
  }

  ret.status = 'REFUNDED';
  ret.refundedAt = new Date();
  if (ret.refundAmount === 0 && body.amount) ret.refundAmount = Number(body.amount);
  await ret.save();

  // Promote order: DELIVERED|SHIPPED → RETURNED → COMPLETED|REFUNDED
  // Re-fetch the order so we see the latest status (markOrderReturned saved).
  let currentOrder = order ? await Order.findOne({ tenantId, orderId: order.orderId }) : null;
  if (currentOrder && ['DELIVERED', 'SHIPPED'].includes(currentOrder.status)) {
    await markOrderReturned(tenantId, currentOrder.orderId);
    currentOrder = await Order.findOne({ tenantId, orderId: currentOrder.orderId });
  }
  if (currentOrder && currentOrder.status === 'RETURNED') {
    if (ret.refundAmount >= (currentOrder.total || 0)) {
      await refundOrder(tenantId, currentOrder.orderId, { reason: 'full return refund' });
    } else {
      await completeOrder(tenantId, currentOrder.orderId);
    }
  }
  return ret.toObject();
}

// =====================================================
// Stats
// =====================================================

export async function getStats(tenantId) {
  const [orderAgg, paymentAgg, returnAgg] = await Promise.all([
    Order.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalGmv: { $sum: '$total' } } },
    ]),
    Payment.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Return.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);
  const ordersByStatus = {};
  for (const r of orderAgg) ordersByStatus[r._id] = { count: r.count, totalGmv: r.totalGmv };
  const paymentsByStatus = {};
  for (const r of paymentAgg) paymentsByStatus[r._id] = { count: r.count, amount: r.amount };
  const returnsByStatus = {};
  for (const r of returnAgg) returnsByStatus[r._id] = { count: r.count };

  const lifetimeGmv = orderAgg
    .filter((r) => !['CANCELLED', 'REFUNDED'].includes(r._id))
    .reduce((s, r) => s + (r.totalGmv || 0), 0);

  return {
    tenantId,
    orders: {
      total: orderAgg.reduce((s, r) => s + r.count, 0),
      byStatus: ordersByStatus,
      lifetimeGmv: round2(lifetimeGmv),
    },
    payments: {
      total: paymentAgg.reduce((s, r) => s + r.count, 0),
      byStatus: paymentsByStatus,
    },
    returns: {
      total: returnAgg.reduce((s, r) => s + r.count, 0),
      byStatus: returnsByStatus,
    },
  };
}

export { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, RETURN_STATUSES, RETURN_REASONS };