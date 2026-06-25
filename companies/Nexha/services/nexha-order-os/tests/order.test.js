/**
 * OrderOS Tests — Nexha Purchase Order Service
 *
 * ADR-??? Phase 2 (2026-06-25).
 */

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
  clearStore,
} from '../src/models/PurchaseOrder.js';

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
} from '../src/services/order.service.js';

const TENANT = 'tenant_nike';
const OTHER_TENANT = 'tenant_adidas';

function makeOrder(overrides = {}) {
  return createOrder(TENANT, {
    supplierRef: 'SUP-001',
    supplierName: 'Acme Corp',
    items: [
      { sku: 'RICE-5KG', name: 'Basmati Rice 5kg', quantity: 100, unitPrice: 48 },
      { sku: 'FLOUR-1KG', name: 'Wheat Flour 1kg', quantity: 200, unitPrice: 22 },
    ],
    tax: 220,
    shipping: 50,
    ...overrides,
  });
}

beforeEach(() => {
  clearStore();
});

// ── PurchaseOrder Model ─────────────────────────────────────────────────────

describe('PurchaseOrder Model', () => {
  test('creates PO with defaults', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    expect(po.status).toBe('DRAFT');
    expect(po.items).toEqual([]);
    expect(po.poNumber).toMatch(/^PO-/);
    expect(po.createdAt).toBeTruthy();
  });

  test('recalculates totals correctly', () => {
    const po = new PurchaseOrder({
      tenantId: TENANT,
      supplierRef: 'SUP-1',
      items: [
        new LineItem({ quantity: 10, unitPrice: 100 }),
        new LineItem({ quantity: 5, unitPrice: 50 }),
      ],
      tax: 10,
      shipping: 5,
    });
    po.recalculate();
    expect(po.subtotal).toBe(1250);  // 10*100 + 5*50
    expect(po.total).toBe(1265);       // 1250 + 10 + 5
  });

  test('state machine: DRAFT → SUBMITTED → ACKNOWLEDGED → FULFILLING → SHIPPED → DELIVERED → COMPLETED', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    expect(po.canTransitionTo('SUBMITTED')).toBe(true);
    po.transitionTo('SUBMITTED');
    expect(po.status).toBe('SUBMITTED');
    expect(po.submittedAt).toBeTruthy();

    expect(po.canTransitionTo('ACKNOWLEDGED')).toBe(true);
    po.transitionTo('ACKNOWLEDGED');
    expect(po.status).toBe('ACKNOWLEDGED');

    expect(po.canTransitionTo('FULFILLING')).toBe(true);
    po.transitionTo('FULFILLING');
    expect(po.status).toBe('FULFILLING');

    expect(po.canTransitionTo('SHIPPED')).toBe(true);
    po.transitionTo('SHIPPED');
    expect(po.status).toBe('SHIPPED');

    expect(po.canTransitionTo('DELIVERED')).toBe(true);
    po.transitionTo('DELIVERED');
    expect(po.status).toBe('DELIVERED');

    expect(po.canTransitionTo('COMPLETED')).toBe(true);
    po.transitionTo('COMPLETED');
    expect(po.status).toBe('COMPLETED');
    expect(po.completedAt).toBeTruthy();
  });

  test('rejects illegal transitions', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    expect(() => po.transitionTo('COMPLETED')).toThrow('Illegal');
    po.transitionTo('SUBMITTED');
    expect(() => po.transitionTo('COMPLETED')).toThrow('Illegal');
    expect(() => po.transitionTo('FULFILLING')).toThrow('Illegal'); // can't skip ACKNOWLEDGED
  });

  test('cancels from most states', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    po.transitionTo('SUBMITTED');
    po.transitionTo('CANCELLED');
    expect(po.status).toBe('CANCELLED');
    expect(po.cancelledAt).toBeTruthy();
    expect(po.canTransitionTo('SUBMITTED')).toBe(false);
  });

  test('can return from SHIPPED or DELIVERED', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    po.transitionTo('SUBMITTED');
    po.transitionTo('ACKNOWLEDGED');
    po.transitionTo('FULFILLING');
    po.transitionTo('SHIPPED');
    expect(po.canTransitionTo('RETURNED')).toBe(true);
    po.transitionTo('RETURNED');
    expect(po.status).toBe('RETURNED');
    expect(po.canTransitionTo('COMPLETED')).toBe(true);
    expect(po.canTransitionTo('REFUNDED')).toBe(true);
  });
});

// ── LineItem ──────────────────────────────────────────────────────────────

describe('LineItem', () => {
  test('creates line item with defaults', () => {
    const li = new LineItem({ sku: 'SKU-1', name: 'Test Item', quantity: 10, unitPrice: 25 });
    expect(li.lineId).toBeTruthy();
    expect(li.quantity).toBe(10);
    expect(li.delivered).toBe(0);
    expect(li.metadata).toEqual({});
  });
});

// ── Return Model ─────────────────────────────────────────────────────────

describe('Return Model', () => {
  test('creates return with defaults', () => {
    const ret = new Return({ orderId: 'order-1', reason: 'Damaged' });
    expect(ret.returnId).toBeTruthy();
    expect(ret.status).toBe('REQUESTED');
    expect(ret.reason).toBe('Damaged');
  });

  test('return state machine', () => {
    const ret = new Return({ orderId: 'order-1' });
    expect(ret.canTransitionTo('APPROVED')).toBe(true);
    ret.transitionTo('APPROVED');
    expect(ret.status).toBe('APPROVED');

    expect(ret.canTransitionTo('IN_TRANSIT')).toBe(true);
    ret.transitionTo('IN_TRANSIT');
    expect(ret.status).toBe('IN_TRANSIT');

    expect(ret.canTransitionTo('RECEIVED')).toBe(true);
    ret.transitionTo('RECEIVED');
    expect(ret.status).toBe('RECEIVED');

    expect(ret.canTransitionTo('COMPLETED')).toBe(true);
    ret.transitionTo('COMPLETED');
    expect(ret.status).toBe('COMPLETED');
    expect(ret.completedAt).toBeTruthy();
  });

  test('rejects invalid return transitions', () => {
    const ret = new Return({ orderId: 'order-1' });
    expect(() => ret.transitionTo('COMPLETED')).toThrow('Illegal');
    ret.transitionTo('APPROVED');
    expect(() => ret.transitionTo('COMPLETED')).toThrow('Illegal');
  });
});

// ── PO CRUD ───────────────────────────────────────────────────────────────

describe('PO CRUD', () => {
  test('createOrder saves and returns PO', () => {
    const po = makeOrder();
    expect(po.orderId).toBeTruthy();
    expect(po.tenantId).toBe(TENANT);
    expect(po.supplierRef).toBe('SUP-001');
    expect(po.status).toBe('DRAFT');
    expect(po.items.length).toBe(2);
    expect(po.subtotal).toBe(9200);   // 100*48 + 200*22 = 4800+4400
    expect(po.total).toBe(9470);      // 9200 + 220 + 50
  });

  test('createOrder generates poNumber if missing', () => {
    const po = new PurchaseOrder({ tenantId: TENANT, supplierRef: 'SUP-1' });
    expect(po.poNumber).toMatch(/^PO-/);
  });

  test('updateOrder updates DRAFT PO', () => {
    const po = makeOrder();
    const updated = updateOrder(TENANT, po.orderId, { supplierName: 'New Supplier', notes: 'Urgent' });
    expect(updated.supplierName).toBe('New Supplier');
    expect(updated.notes).toBe('Urgent');
    expect(updated.sku).toBeUndefined(); // not a valid field
  });

  test('updateOrder rejects non-DRAFT', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    expect(() => updateOrder(TENANT, po.orderId, { supplierName: 'Hack' })).toThrow('Only DRAFT');
  });

  test('updateOrder rejects cross-tenant', () => {
    const po = makeOrder();
    expect(() => updateOrder(OTHER_TENANT, po.orderId, { supplierName: 'Hack' })).toThrow('Access denied');
  });

  test('getOrderDetails returns PO', () => {
    const po = makeOrder();
    const found = getOrderDetails(TENANT, po.orderId);
    expect(found.orderId).toBe(po.orderId);
  });

  test('getOrderDetails rejects cross-tenant', () => {
    const po = makeOrder();
    expect(() => getOrderDetails(OTHER_TENANT, po.orderId)).toThrow('Access denied');
  });

  test('getOrderDetails 404 for missing', () => {
    expect(() => getOrderDetails(TENANT, 'nonexistent')).toThrow('not found');
  });

  test('removeOrder deletes DRAFT PO', () => {
    const po = makeOrder();
    removeOrder(TENANT, po.orderId);
    expect(getOrder(po.orderId)).toBeNull();
  });

  test('removeOrder rejects non-DRAFT', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    expect(() => removeOrder(TENANT, po.orderId)).toThrow('Only DRAFT');
  });
});

// ── List Orders ────────────────────────────────────────────────────────────

describe('listAllOrders', () => {
  beforeEach(() => { clearStore(); });

  test('returns tenant-scoped orders', () => {
    makeOrder({ supplierRef: 'SUP-A' });
    makeOrder({ supplierRef: 'SUP-B' });
    createOrder(OTHER_TENANT, { supplierRef: 'SUP-C', items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 1 }] });

    const mine = listAllOrders(TENANT);
    expect(mine.length).toBe(2);
    expect(mine.every(o => o.tenantId === TENANT)).toBe(true);
  });

  test('filter by status', () => {
    const po1 = makeOrder({ supplierRef: 'SUP-A' });
    const po2 = makeOrder({ supplierRef: 'SUP-B' });
    submitOrder(TENANT, po1.orderId);

    const drafts = listAllOrders(TENANT, { status: 'DRAFT' });
    expect(drafts.length).toBe(1);
    expect(drafts[0].supplierRef).toBe('SUP-B');
  });
});

// ── State Transitions ─────────────────────────────────────────────────────

describe('State Transitions', () => {
  test('submitOrder transitions DRAFT → SUBMITTED', () => {
    const po = makeOrder();
    const submitted = submitOrder(TENANT, po.orderId);
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.submittedAt).toBeTruthy();
  });

  test('acknowledgeOrder transitions SUBMITTED → ACKNOWLEDGED', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    const acknowledged = acknowledgeOrder(TENANT, po.orderId);
    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    expect(acknowledged.acknowledgedAt).toBeTruthy();
  });

  test('startFulfillment transitions ACKNOWLEDGED → FULFILLING', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    const fulfilling = startFulfillment(TENANT, po.orderId);
    expect(fulfilling.status).toBe('FULFILLING');
  });

  test('markShipped transitions FULFILLING → SHIPPED with tracking', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    const shipped = markShipped(TENANT, po.orderId, 'TRACK-123');
    expect(shipped.status).toBe('SHIPPED');
    expect(shipped.metadata.tracking).toBe('TRACK-123');
  });

  test('markDelivered transitions SHIPPED → DELIVERED', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    markShipped(TENANT, po.orderId);
    const delivered = markDelivered(TENANT, po.orderId);
    expect(delivered.status).toBe('DELIVERED');
  });

  test('completeOrder transitions DELIVERED → COMPLETED', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    markShipped(TENANT, po.orderId);
    markDelivered(TENANT, po.orderId);
    const completed = completeOrder(TENANT, po.orderId);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).toBeTruthy();
  });

  test('cancelOrder transitions to CANCELLED with reason', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    const cancelled = cancelOrder(TENANT, po.orderId, 'Budget cut');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.metadata.cancelReason).toBe('Budget cut');
    expect(cancelled.cancelledAt).toBeTruthy();
  });

  test('cross-tenant access rejected for all transitions', () => {
    const po = makeOrder();
    expect(() => submitOrder(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => acknowledgeOrder(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => startFulfillment(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => markShipped(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => markDelivered(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => completeOrder(OTHER_TENANT, po.orderId)).toThrow('Access denied');
    expect(() => cancelOrder(OTHER_TENANT, po.orderId)).toThrow('Access denied');
  });

  test('linkExternalOrder attaches external ID', () => {
    const po = makeOrder();
    const linked = linkExternalOrder(TENANT, po.orderId, 'EXT-ORDER-999');
    expect(linked.externalOrderId).toBe('EXT-ORDER-999');
  });
});

// ── Returns ────────────────────────────────────────────────────────────────

describe('Returns', () => {
  test('initiateReturn creates return on SHIPPED order', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    markShipped(TENANT, po.orderId);

    const { order, return: ret } = initiateReturn(TENANT, po.orderId, {
      reason: 'Damaged goods',
      items: [{ sku: 'RICE-5KG', quantity: 5 }],
    });

    expect(order.status).toBe('RETURNED');
    expect(ret.reason).toBe('Damaged goods');
    expect(ret.status).toBe('REQUESTED');
  });

  test('initiateReturn rejects non-shipped/delivered', () => {
    const po = makeOrder();
    expect(() => initiateReturn(TENANT, po.orderId, { reason: 'Test' })).toThrow('Only SHIPPED or DELIVERED');
    submitOrder(TENANT, po.orderId);
    expect(() => initiateReturn(TENANT, po.orderId, { reason: 'Test' })).toThrow('Only SHIPPED or DELIVERED');
  });

  test('approveReturn transitions return to APPROVED', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    markShipped(TENANT, po.orderId);

    const { return: ret } = initiateReturn(TENANT, po.orderId, { reason: 'Wrong item' });
    const { return: approved } = approveReturn(TENANT, po.orderId, ret.returnId);
    expect(approved.status).toBe('APPROVED');
  });

  test('rejectReturn transitions return to REJECTED', () => {
    const po = makeOrder();
    submitOrder(TENANT, po.orderId);
    acknowledgeOrder(TENANT, po.orderId);
    startFulfillment(TENANT, po.orderId);
    markShipped(TENANT, po.orderId);

    const { return: ret } = initiateReturn(TENANT, po.orderId, { reason: 'Changed mind' });
    const { return: rejected } = rejectReturn(TENANT, po.orderId, ret.returnId);
    expect(rejected.status).toBe('REJECTED');
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────

describe('getOrderStats', () => {
  beforeEach(() => { clearStore(); });

  test('returns correct counts', () => {
    makeOrder({ supplierRef: 'A' });              // DRAFT
    const po2 = makeOrder({ supplierRef: 'B' });
    submitOrder(TENANT, po2.orderId);             // SUBMITTED
    const po3 = makeOrder({ supplierRef: 'C' });
    submitOrder(TENANT, po3.orderId);
    acknowledgeOrder(TENANT, po3.orderId);        // ACKNOWLEDGED

    const stats = getOrderStats(TENANT);
    expect(stats.total).toBe(3);
    expect(stats.byStatus.DRAFT).toBe(1);
    expect(stats.byStatus.SUBMITTED).toBe(1);
    expect(stats.byStatus.ACKNOWLEDGED).toBe(1);
  });

  test('calculates total value', () => {
    makeOrder({ supplierRef: 'A', items: [{ sku: 'X', name: 'X', quantity: 10, unitPrice: 100 }], tax: 0, shipping: 0 });
    makeOrder({ supplierRef: 'B', items: [{ sku: 'Y', name: 'Y', quantity: 5, unitPrice: 200 }], tax: 0, shipping: 0 });

    const stats = getOrderStats(TENANT);
    expect(stats.totalValue).toBe(2000);  // 1000 + 1000
  });
});
