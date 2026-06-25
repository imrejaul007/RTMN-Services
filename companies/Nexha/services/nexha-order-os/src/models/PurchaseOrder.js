/**
 * PurchaseOrder — PO state machine for Nexha OrderOS.
 *
 * State machine:
 *   DRAFT → SUBMITTED → ACKNOWLEDGED → FULFILLING → SHIPPED → DELIVERED → COMPLETED
 *               ↓            ↓              ↓            ↓
 *           CANCELLED    CANCELLED     CANCELLED   CANCELLED
 *                                                      ↓
 *                                                  RETURNED → COMPLETED | REFUNDED
 *
 * ADR-??? Phase 2 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export const PO_STATUSES = [
  'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FULFILLING',
  'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED',
];

export const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'REJECTED', 'REFUNDED'];

const PO_TRANSITIONS = {
  DRAFT:        ['SUBMITTED', 'CANCELLED'],
  SUBMITTED:    ['ACKNOWLEDGED', 'CANCELLED'],
  ACKNOWLEDGED: ['FULFILLING', 'CANCELLED'],
  FULFILLING:   ['SHIPPED', 'CANCELLED'],
  SHIPPED:      ['DELIVERED', 'RETURNED', 'CANCELLED'],
  DELIVERED:    ['COMPLETED', 'RETURNED', 'CANCELLED'],
  COMPLETED:    [],
  CANCELLED:    [],
  RETURNED:     ['COMPLETED', 'REFUNDED'],
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

export class LineItem {
  constructor(data = {}) {
    this.lineId = data.lineId || uuidv4();
    this.productId = data.productId || '';
    this.variantId = data.variantId || null;
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.quantity = data.quantity || 0;
    this.unitPrice = data.unitPrice || 0;
    this.delivered = data.delivered || 0;
    this.metadata = data.metadata || {};
  }
}

export class PurchaseOrder {
  constructor(data = {}) {
    this.tenantId = data.tenantId || '';
    this.orderId = data.orderId || uuidv4();
    this.poNumber = data.poNumber || `PO-${Date.now().toString(36).toUpperCase()}`;
    this.supplierRef = data.supplierRef || '';
    this.supplierName = data.supplierName || '';
    this.status = data.status || 'DRAFT';
    this.items = (data.items || []).map(i => new LineItem(i));
    this.currency = data.currency || 'USD';
    this.subtotal = data.subtotal || 0;
    this.tax = data.tax || 0;
    this.shipping = data.shipping || 0;
    this.total = data.total || 0;
    this.shippingAddress = data.shippingAddress || null;
    this.notes = data.notes || null;
    this.externalOrderId = data.externalOrderId || null;
    this.submittedAt = data.submittedAt || null;
    this.acknowledgedAt = data.acknowledgedAt || null;
    this.fulfilledAt = data.fulfilledAt || null;
    this.shippedAt = data.shippedAt || null;
    this.deliveredAt = data.deliveredAt || null;
    this.completedAt = data.completedAt || null;
    this.cancelledAt = data.cancelledAt || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this._returns = (data._returns || []).map(r => new Return(r));
  }

  recalculate() {
    this.subtotal = this.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    this.total = this.subtotal + this.tax + this.shipping;
    return this;
  }

  canTransitionTo(newStatus) {
    return PO_TRANSITIONS[this.status]?.includes(newStatus) || false;
  }

  transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Illegal PO transition: ${this.status} → ${newStatus}`);
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
    const now = new Date().toISOString();
    switch (newStatus) {
      case 'SUBMITTED':    this.submittedAt = now; break;
      case 'ACKNOWLEDGED': this.acknowledgedAt = now; break;
      case 'FULFILLING':   this.fulfilledAt = now; break;
      case 'SHIPPED':      this.shippedAt = now; break;
      case 'DELIVERED':    this.deliveredAt = now; break;
      case 'COMPLETED':    this.completedAt = now; break;
      case 'CANCELLED':    this.cancelledAt = now; break;
    }
    return this;
  }

  addReturn(ret) { this._returns.push(ret); return this; }

  toJSON() {
    return {
      orderId: this.orderId, poNumber: this.poNumber, tenantId: this.tenantId,
      supplierRef: this.supplierRef, supplierName: this.supplierName,
      status: this.status,
      items: this.items.map(i => ({ ...i })),
      currency: this.currency, subtotal: this.subtotal, tax: this.tax,
      shipping: this.shipping, total: this.total,
      shippingAddress: this.shippingAddress, notes: this.notes,
      externalOrderId: this.externalOrderId,
      submittedAt: this.submittedAt, acknowledgedAt: this.acknowledgedAt,
      fulfilledAt: this.fulfilledAt, shippedAt: this.shippedAt,
      deliveredAt: this.deliveredAt, completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      metadata: this.metadata,
      returns: this._returns.map(r => r.toJSON ? r.toJSON() : r),
      createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}

export class Return {
  constructor(data = {}) {
    this.returnId = data.returnId || uuidv4();
    this.orderId = data.orderId || '';
    this.status = data.status || 'REQUESTED';
    this.items = (data.items || []).map(i => ({ ...i }));
    this.reason = data.reason || '';
    this.notes = data.notes || null;
    this.requestedAt = data.requestedAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.metadata = data.metadata || {};
  }

  canTransitionTo(newStatus) {
    return RETURN_TRANSITIONS[this.status]?.includes(newStatus) || false;
  }

  transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Illegal return transition: ${this.status} → ${newStatus}`);
    }
    this.status = newStatus;
    if (newStatus === 'COMPLETED' || newStatus === 'REFUNDED') {
      this.completedAt = new Date().toISOString();
    }
    return this;
  }

  toJSON() {
    return { ...this, completedAt: this.completedAt };
  }
}

// ── In-memory store ────────────────────────────────────────────────────────

const store = new Map();
const returnStore = new Map();

export function getStore() { return store; }
export function getReturnStore() { return returnStore; }

export function saveOrder(po) { store.set(po.orderId, po); return po; }
export function getOrder(id) { return store.get(id) || null; }

export function listOrders(tenantId, filters = {}) {
  let orders = Array.from(store.values()).filter(o => o.tenantId === tenantId);
  if (filters.status) orders = orders.filter(o => o.status === filters.status);
  if (filters.supplierRef) orders = orders.filter(o => o.supplierRef === filters.supplierRef);
  if (filters.since) orders = orders.filter(o => new Date(o.createdAt) >= new Date(filters.since));
  return orders;
}

export function deleteOrder(id, tenantId) {
  const order = store.get(id);
  if (!order) return false;
  if (order.tenantId !== tenantId) return false;
  store.delete(id);
  return true;
}
