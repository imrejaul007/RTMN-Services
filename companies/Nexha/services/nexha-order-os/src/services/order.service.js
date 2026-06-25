/**
 * OrderOS Service — business logic for Nexha OrderOS.
 *
 * ADR-??? Phase 2 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PurchaseOrder,
  LineItem,
  Return,
  PO_STATUSES,
  RETURN_STATUSES,
  saveOrder,
  getOrder,
  listOrders,
  deleteOrder,
  getStore,
} from '../models/PurchaseOrder.js';

// ── Errors ─────────────────────────────────────────────────────────────────

export class OrderError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'OrderError';
    this.statusCode = statusCode;
  }
}

// ── PO CRUD ─────────────────────────────────────────────────────────────────

export function createOrder(tenantId, data) {
  if (!tenantId) throw new OrderError('tenantId is required', 400);

  const items = (data.items || []).map(i => new LineItem({
    productId: i.productId || '',
    variantId: i.variantId || null,
    sku: i.sku || '',
    name: i.name || '',
    quantity: i.quantity || 0,
    unitPrice: i.unitPrice || 0,
    delivered: i.delivered || 0,
  }));

  const po = new PurchaseOrder({
    tenantId,
    supplierRef: data.supplierRef || '',
    supplierName: data.supplierName || '',
    items,
    currency: data.currency || 'USD',
    tax: data.tax || 0,
    shipping: data.shipping || 0,
    shippingAddress: data.shippingAddress || null,
    notes: data.notes || null,
  });

  po.recalculate();
  return saveOrder(po);
}

export function updateOrder(tenantId, orderId, data) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  if (po.status !== 'DRAFT') throw new OrderError('Only DRAFT orders can be updated', 400);

  if (data.supplierRef !== undefined) po.supplierRef = data.supplierRef;
  if (data.supplierName !== undefined) po.supplierName = data.supplierName;
  if (data.notes !== undefined) po.notes = data.notes;
  if (data.shippingAddress !== undefined) po.shippingAddress = data.shippingAddress;
  if (data.items !== undefined) {
    po.items = data.items.map(i => new LineItem(i));
    po.recalculate();
  }
  if (data.tax !== undefined) { po.tax = data.tax; po.recalculate(); }
  if (data.shipping !== undefined) { po.shipping = data.shipping; po.recalculate(); }

  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function getOrderDetails(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  return po;
}

export function listAllOrders(tenantId, filters = {}) {
  if (!tenantId) throw new OrderError('tenantId is required', 400);
  return listOrders(tenantId, filters);
}

export function removeOrder(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  if (po.status !== 'DRAFT') throw new OrderError('Only DRAFT orders can be deleted', 400);
  deleteOrder(orderId, tenantId);
  return { deleted: true };
}

// ── State Transitions ───────────────────────────────────────────────────────

export function submitOrder(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('SUBMITTED');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function acknowledgeOrder(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('ACKNOWLEDGED');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function startFulfillment(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('FULFILLING');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function markShipped(tenantId, orderId, tracking) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  if (tracking) po.metadata.tracking = tracking;
  po.transitionTo('SHIPPED');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function markDelivered(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('DELIVERED');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function completeOrder(tenantId, orderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('COMPLETED');
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

export function cancelOrder(tenantId, orderId, reason) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.transitionTo('CANCELLED');
  if (reason) po.metadata.cancelReason = reason;
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

// ── External Order Linking ───────────────────────────────────────────────────

export function linkExternalOrder(tenantId, orderId, externalOrderId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  po.externalOrderId = externalOrderId;
  po.updatedAt = new Date().toISOString();
  return saveOrder(po);
}

// ── Returns ──────────────────────────────────────────────────────────────────

export function initiateReturn(tenantId, orderId, data) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);
  if (!['SHIPPED', 'DELIVERED'].includes(po.status)) {
    throw new OrderError('Only SHIPPED or DELIVERED orders can be returned', 400);
  }

  const ret = new Return({
    orderId,
    items: data.items || [],
    reason: data.reason || '',
    notes: data.notes || null,
  });

  po.addReturn(ret);
  po.transitionTo('RETURNED');
  po.updatedAt = new Date().toISOString();
  return { order: saveOrder(po), return: ret };
}

export function approveReturn(tenantId, orderId, returnId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);

  const ret = po._returns.find(r => r.returnId === returnId);
  if (!ret) throw new OrderError(`Return ${returnId} not found`, 404);
  ret.transitionTo('APPROVED');
  po.updatedAt = new Date().toISOString();
  return { order: saveOrder(po), return: ret };
}

export function rejectReturn(tenantId, orderId, returnId) {
  const po = getOrder(orderId);
  if (!po) throw new OrderError(`Order ${orderId} not found`, 404);
  if (po.tenantId !== tenantId) throw new OrderError('Access denied', 403);

  const ret = po._returns.find(r => r.returnId === returnId);
  if (!ret) throw new OrderError(`Return ${returnId} not found`, 404);
  ret.transitionTo('REJECTED');
  po.updatedAt = new Date().toISOString();
  return { order: saveOrder(po), return: ret };
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function getOrderStats(tenantId) {
  if (!tenantId) throw new OrderError('tenantId is required', 400);

  const orders = listOrders(tenantId);
  const byStatus = {};
  for (const s of PO_STATUSES) byStatus[s] = 0;
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
  const completedValue = orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.total, 0);

  return {
    total: orders.length,
    byStatus,
    totalValue,
    completedValue,
    openValue: totalValue - completedValue,
  };
}
