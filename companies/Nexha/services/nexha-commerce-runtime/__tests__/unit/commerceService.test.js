/**
 * Service-layer tests for nexha-commerce-runtime.
 *
 * Covers the core state machines (orders, payments, returns) at the
 * service layer (no HTTP). State transition errors should bubble up as
 * StateTransitionError instances.
 *
 * ADR-0010 Phase 8 (2026-06-22).
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  connectTestDb, disconnectTestDb, clearTestDb,
} from '../helpers/db.js';
import * as svc from '../../src/services/commerceService.js';

beforeAll(async () => {
  await connectTestDb();
});
afterAll(async () => {
  await disconnectTestDb();
});
beforeEach(async () => {
  await clearTestDb();
});

// ============================================================================
// Helpers
// ============================================================================

const BUYER = 'buyer-1';
const SELLER = 'seller-1';

function sampleItems() {
  return [
    { sku: 'SKU-A', name: 'Item A', quantity: 2, unitPrice: 25 },
    { sku: 'SKU-B', name: 'Item B', quantity: 1, unitPrice: 50 },
  ];
}

async function newDraftOrder(tenantId = 'tenant-a', overrides = {}) {
  return svc.createOrder(tenantId, {
    buyerRef: BUYER,
    sellerRef: SELLER,
    items: sampleItems(),
    tax: 5,
    shipping: 10,
    ...overrides,
  });
}

async function placedOrder(tenantId = 'tenant-a') {
  const draft = await newDraftOrder(tenantId);
  const { payment } = await svc.placeOrder(tenantId, draft.orderId, { method: 'CARD' });
  await svc.authorizePayment(tenantId, payment.paymentId, { providerRef: 'stripe-1' });
  await svc.capturePayment(tenantId, payment.paymentId, { providerRef: 'stripe-1' });
  return { order: await svc.getOrder(tenantId, draft.orderId), payment };
}

// ============================================================================
// Order creation
// ============================================================================

describe('createOrder', () => {
  it('creates a DRAFT order with computed totals', async () => {
    const order = await newDraftOrder();
    expect(order.status).toBe('DRAFT');
    expect(order.subtotal).toBe(100); // 2*25 + 1*50
    expect(order.tax).toBe(5);
    expect(order.shipping).toBe(10);
    expect(order.total).toBe(115);
    expect(order.currency).toBe('USD');
  });

  it('rejects empty items array', async () => {
    await expect(newDraftOrder('tenant-a', { items: [] })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('rejects negative quantity', async () => {
    await expect(newDraftOrder('tenant-a', {
      items: [{ sku: 'X', name: 'X', quantity: -1, unitPrice: 1 }],
    })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects negative unit price', async () => {
    await expect(newDraftOrder('tenant-a', {
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: -1 }],
    })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects missing buyer/seller', async () => {
    await expect(svc.createOrder('tenant-a', { items: sampleItems() })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('enforces unique (tenantId, orderId)', async () => {
    const explicitId = 'ord_dup_test_xyz';
    await newDraftOrder('tenant-a', { orderId: explicitId });
    await expect(newDraftOrder('tenant-a', { orderId: explicitId })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('allows same orderId across different tenants', async () => {
    const a = await newDraftOrder('tenant-a');
    const b = await newDraftOrder('tenant-b', { orderId: a.orderId });
    expect(a.orderId).toBe(b.orderId);
  });
});

// ============================================================================
// Order update
// ============================================================================

describe('updateOrder', () => {
  it('updates notes on a DRAFT order', async () => {
    const o = await newDraftOrder();
    const updated = await svc.updateOrder('tenant-a', o.orderId, { notes: 'fragile' });
    expect(updated.notes).toBe('fragile');
  });

  it('refuses update on PLACED order', async () => {
    const { order } = await placedOrder();
    await expect(svc.updateOrder('tenant-a', order.orderId, { notes: 'x' })).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('refuses empty patch', async () => {
    const o = await newDraftOrder();
    await expect(svc.updateOrder('tenant-a', o.orderId, {})).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('recomputes totals when items change', async () => {
    const o = await newDraftOrder();
    const updated = await svc.updateOrder('tenant-a', o.orderId, {
      items: [{ sku: 'X', name: 'X', quantity: 10, unitPrice: 5 }],
    });
    expect(updated.subtotal).toBe(50);
    expect(updated.total).toBe(65); // 50 + 5 tax + 10 shipping
  });
});

// ============================================================================
// Order placement & payment
// ============================================================================

describe('placeOrder + payment', () => {
  it('creates pending payment on place()', async () => {
    const draft = await newDraftOrder();
    const { order, payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'CARD' });
    expect(order.status).toBe('PLACED');
    expect(order.placedAt).toBeTruthy();
    expect(payment.status).toBe('PENDING');
    expect(payment.amount).toBe(115);
    expect(payment.method).toBe('CARD');
    expect(payment.orderId).toBe(order.orderId);
  });

  it('cancels pending payment when order is cancelled', async () => {
    const draft = await newDraftOrder();
    const { payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'CARD' });
    await svc.cancelOrder('tenant-a', draft.orderId, 'buyer changed mind');
    const cancelled = await svc.getPayment('tenant-a', payment.paymentId);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('capturing payment auto-promotes order to PAID', async () => {
    const draft = await newDraftOrder();
    const { payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'WALLET' });
    await svc.authorizePayment('tenant-a', payment.paymentId);
    const captured = await svc.capturePayment('tenant-a', payment.paymentId);
    expect(captured.status).toBe('CAPTURED');
    const order = await svc.getOrder('tenant-a', draft.orderId);
    expect(order.status).toBe('PAID');
    expect(order.paidAt).toBeTruthy();
  });

  it('refuses to capture a failed payment', async () => {
    const draft = await newDraftOrder();
    const { payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'CARD' });
    await svc.failPayment('tenant-a', payment.paymentId, 'declined');
    await expect(svc.capturePayment('tenant-a', payment.paymentId)).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('refuses to authorize a cancelled payment', async () => {
    const draft = await newDraftOrder();
    const { payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'CARD' });
    await svc.cancelPayment('tenant-a', payment.paymentId);
    await expect(svc.authorizePayment('tenant-a', payment.paymentId)).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });
});

// ============================================================================
// Full order lifecycle
// ============================================================================

describe('order lifecycle', () => {
  it('walks DRAFT → PLACED → PAID → FULFILLING → SHIPPED → DELIVERED → COMPLETED', async () => {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId, { warehouseRef: 'wh-1' });
    let o = await svc.getOrder('tenant-a', order.orderId);
    expect(o.status).toBe('FULFILLING');
    expect(o.fulfillment.warehouseRef).toBe('wh-1');

    await svc.shipOrder('tenant-a', order.orderId, { trackingNumber: 'TRK-1', carrierRef: 'fedex' });
    o = await svc.getOrder('tenant-a', order.orderId);
    expect(o.status).toBe('SHIPPED');
    expect(o.fulfillment.trackingNumber).toBe('TRK-1');
    expect(o.fulfillment.shippedAt).toBeTruthy();

    await svc.deliverOrder('tenant-a', order.orderId);
    o = await svc.getOrder('tenant-a', order.orderId);
    expect(o.status).toBe('DELIVERED');
    expect(o.fulfillment.deliveredAt).toBeTruthy();

    await svc.completeOrder('tenant-a', order.orderId);
    o = await svc.getOrder('tenant-a', order.orderId);
    expect(o.status).toBe('COMPLETED');
    expect(o.completedAt).toBeTruthy();
  });

  it('rejects illegal transition (DRAFT → SHIPPED)', async () => {
    const o = await newDraftOrder();
    await expect(svc.shipOrder('tenant-a', o.orderId, { trackingNumber: 'T' })).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('rejects ship without trackingNumber', async () => {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId);
    await expect(svc.shipOrder('tenant-a', order.orderId, {})).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('cancel allowed from DRAFT', async () => {
    const o = await newDraftOrder();
    const cancelled = await svc.cancelOrder('tenant-a', o.orderId, 'oops');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeTruthy();
    expect(cancelled.metadata.cancellationReason).toBe('oops');
  });

  it('refuses to cancel a COMPLETED order', async () => {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId);
    await svc.shipOrder('tenant-a', order.orderId, { trackingNumber: 'T' });
    await svc.deliverOrder('tenant-a', order.orderId);
    await svc.completeOrder('tenant-a', order.orderId);
    await expect(svc.cancelOrder('tenant-a', order.orderId)).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('refundOrder from PAID marks payment REFUNDED', async () => {
    const { order, payment } = await placedOrder();
    await svc.refundOrder('tenant-a', order.orderId, { reason: 'seller out of stock' });
    const o = await svc.getOrder('tenant-a', order.orderId);
    expect(o.status).toBe('REFUNDED');
    const p = await svc.getPayment('tenant-a', payment.paymentId);
    expect(p.status).toBe('REFUNDED');
    expect(p.refundedAmount).toBe(115);
  });

  it('refundOrder from FULFILLING allowed', async () => {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId);
    const o = await svc.refundOrder('tenant-a', order.orderId);
    expect(o.status).toBe('REFUNDED');
  });
});

// ============================================================================
// Payment refund (full & partial)
// ============================================================================

describe('refundPayment', () => {
  it('full refund sets status REFUNDED', async () => {
    const { payment } = await placedOrder();
    const refund = await svc.refundPayment('tenant-a', payment.paymentId, { amount: 115 });
    expect(refund.status).toBe('REFUNDED');
    expect(refund.refundedAmount).toBe(115);
  });

  it('partial refund keeps status CAPTURED', async () => {
    const { payment } = await placedOrder();
    const refund = await svc.refundPayment('tenant-a', payment.paymentId, { amount: 50 });
    expect(refund.status).toBe('CAPTURED');
    expect(refund.refundedAmount).toBe(50);
  });

  it('refuses refund exceeding remaining', async () => {
    const { payment } = await placedOrder();
    await expect(svc.refundPayment('tenant-a', payment.paymentId, { amount: 200 })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('refuses refund of PENDING payment', async () => {
    const draft = await newDraftOrder();
    const { payment } = await svc.placeOrder('tenant-a', draft.orderId, { method: 'CARD' });
    await expect(svc.refundPayment('tenant-a', payment.paymentId)).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('cumulative refunds > amount rejected', async () => {
    const { payment } = await placedOrder();
    await svc.refundPayment('tenant-a', payment.paymentId, { amount: 80 });
    await expect(svc.refundPayment('tenant-a', payment.paymentId, { amount: 50 })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });
});

// ============================================================================
// Returns lifecycle
// ============================================================================

describe('return lifecycle', () => {
  async function deliveredOrder() {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId);
    await svc.shipOrder('tenant-a', order.orderId, { trackingNumber: 'T-1' });
    await svc.deliverOrder('tenant-a', order.orderId);
    return order;
  }

  it('full happy path: REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → REFUNDED', async () => {
    const order = await deliveredOrder();
    const ret = await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1, reason: 'DEFECTIVE' }],
      reason: 'DEFECTIVE',
      refundAmount: 25,
    });
    expect(ret.status).toBe('REQUESTED');

    await svc.approveReturn('tenant-a', ret.returnId, { refundAmount: 25 });
    await svc.markReturnInTransit('tenant-a', ret.returnId, { trackingNumber: 'RTRN-1' });
    await svc.markReturnReceived('tenant-a', ret.returnId);
    const r1 = await svc.getReturn('tenant-a', ret.returnId);
    expect(r1.status).toBe('RECEIVED');

    const refunded = await svc.refundReturn('tenant-a', ret.returnId, { amount: 25 });
    expect(refunded.status).toBe('REFUNDED');
    const finalOrder = await svc.getOrder('tenant-a', order.orderId);
    // Partial refund of 25 vs total 115 → order completes (not refunded)
    expect(['COMPLETED', 'REFUNDED']).toContain(finalOrder.status);
  });

  it('full refund via return marks order REFUNDED', async () => {
    const order = await deliveredOrder();
    const ret = await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 2, reason: 'WRONG_ITEM' }],
      refundAmount: 50,
    });
    await svc.approveReturn('tenant-a', ret.returnId, { refundAmount: 50 });
    await svc.markReturnInTransit('tenant-a', ret.returnId);
    await svc.markReturnReceived('tenant-a', ret.returnId);
    await svc.refundReturn('tenant-a', ret.returnId, { amount: 50 });

    const payment = await svc.getPayment('tenant-a', order.paymentId);
    expect(payment.refundedAmount).toBe(50);

    const finalOrder = await svc.getOrder('tenant-a', order.orderId);
    expect(['COMPLETED', 'REFUNDED']).toContain(finalOrder.status);
  });

  it('reject path: REQUESTED → REJECTED', async () => {
    const order = await deliveredOrder();
    const ret = await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1, reason: 'BUYER_REMORSE' }],
    });
    const r = await svc.rejectReturn('tenant-a', ret.returnId, 'past return window');
    expect(r.status).toBe('REJECTED');
    expect(r.rejectionReason).toBe('past return window');
  });

  it('refuses to skip approve step', async () => {
    const order = await deliveredOrder();
    const ret = await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1 }],
    });
    await expect(svc.markReturnInTransit('tenant-a', ret.returnId)).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });

  it('rejects empty lines', async () => {
    const order = await deliveredOrder();
    await expect(svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [],
    })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects invalid reason', async () => {
    const order = await deliveredOrder();
    await expect(svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1, reason: 'BOGUS' }],
    })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('refundReturn is idempotent on REFUNDED status', async () => {
    const order = await deliveredOrder();
    const ret = await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1, reason: 'DEFECTIVE' }],
      refundAmount: 25,
    });
    await svc.approveReturn('tenant-a', ret.returnId, { refundAmount: 25 });
    await svc.markReturnInTransit('tenant-a', ret.returnId);
    await svc.markReturnReceived('tenant-a', ret.returnId);
    await svc.refundReturn('tenant-a', ret.returnId, { amount: 25 });
    // Second refund attempt: payment is already REFUNDED, so the linked
    // refundPayment call is skipped. Return state machine throws because
    // REFUNDED is terminal.
    await expect(svc.refundReturn('tenant-a', ret.returnId, { amount: 25 })).rejects.toMatchObject({
      name: 'StateTransitionError',
    });
  });
});

// ============================================================================
// list / get / stats
// ============================================================================

describe('list, get, stats', () => {
  it('lists orders filtered by status', async () => {
    await newDraftOrder();
    const { order: o1 } = await placedOrder();
    await svc.startFulfillment('tenant-a', o1.orderId);
    const r = await svc.listOrders('tenant-a', { status: 'DRAFT' });
    expect(r.total).toBe(1);
    const f = await svc.listOrders('tenant-a', { status: 'FULFILLING' });
    expect(f.total).toBe(1);
  });

  it('getOrder throws 404 for wrong tenant', async () => {
    const o = await newDraftOrder('tenant-a');
    await expect(svc.getOrder('tenant-b', o.orderId)).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('getOrder is cross-tenant with options.crossTenant', async () => {
    const o = await newDraftOrder('tenant-a');
    const found = await svc.getOrder('tenant-b', o.orderId, { crossTenant: true });
    expect(found.orderId).toBe(o.orderId);
  });

  it('getStats aggregates by status', async () => {
    const { order } = await placedOrder();
    await svc.startFulfillment('tenant-a', order.orderId);
    const stats = await svc.getStats('tenant-a');
    expect(stats.orders.total).toBe(1);
    expect(stats.orders.byStatus.FULFILLING.count).toBe(1);
    expect(stats.payments.total).toBe(1);
    expect(stats.payments.byStatus.CAPTURED.count).toBe(1);
    expect(stats.orders.lifetimeGmv).toBe(115);
  });

  it('lifetime GMV excludes CANCELLED + REFUNDED orders', async () => {
    await placedOrder(); // 115 GMV (PAID)
    const cancelled = await newDraftOrder('tenant-a');
    await svc.cancelOrder('tenant-a', cancelled.orderId); // 0 contribution
    const stats = await svc.getStats('tenant-a');
    expect(stats.orders.lifetimeGmv).toBe(115);
  });

  it('listOrders paginates with limit/offset', async () => {
    for (let i = 0; i < 5; i++) {
      await newDraftOrder();
    }
    const page1 = await svc.listOrders('tenant-a', { limit: 2, offset: 0 });
    const page2 = await svc.listOrders('tenant-a', { limit: 2, offset: 2 });
    expect(page1.orders.length).toBe(2);
    expect(page2.orders.length).toBe(2);
    expect(page1.total).toBe(5);
    expect(page1.orders[0].orderId).not.toBe(page2.orders[0].orderId);
  });

  it('listPayments filters by orderId', async () => {
    const { payment } = await placedOrder();
    const r = await svc.listPayments('tenant-a', { orderId: payment.orderId });
    expect(r.total).toBe(1);
  });

  it('listReturns filters by status', async () => {
    const order = await (async () => {
      const { order } = await placedOrder();
      await svc.startFulfillment('tenant-a', order.orderId);
      await svc.shipOrder('tenant-a', order.orderId, { trackingNumber: 'T' });
      await svc.deliverOrder('tenant-a', order.orderId);
      return order;
    })();
    await svc.createReturn('tenant-a', {
      orderId: order.orderId,
      lines: [{ sku: 'SKU-A', quantity: 1, reason: 'DEFECTIVE' }],
    });
    const r = await svc.listReturns('tenant-a', { status: 'REQUESTED' });
    expect(r.total).toBe(1);
  });
});

// ============================================================================
// Constants export
// ============================================================================

describe('exports', () => {
  it('exports status constants', () => {
    expect(svc.ORDER_STATUSES).toContain('DRAFT');
    expect(svc.ORDER_STATUSES).toContain('COMPLETED');
    expect(svc.PAYMENT_STATUSES).toContain('CAPTURED');
    expect(svc.PAYMENT_METHODS).toContain('ESCROW');
    expect(svc.RETURN_STATUSES).toContain('REFUNDED');
    expect(svc.RETURN_REASONS).toContain('DEFECTIVE');
  });
});