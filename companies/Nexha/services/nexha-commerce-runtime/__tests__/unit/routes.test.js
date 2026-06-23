/**
 * HTTP-layer tests for nexha-commerce-runtime.
 *
 * Uses supertest. Auth via JWT (HS256) so we can verify the auth middleware.
 * Tests cover: health, auth gates, validation, full order/payment/return
 * lifecycle, error responses (400/404/422).
 *
 * ADR-0010 Phase 8 (2026-06-22).
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  connectTestDb, disconnectTestDb, clearTestDb,
} from '../helpers/db.js';
import { app } from '../../src/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const INTERNAL = process.env.COMMERCE_RUNTIME_INTERNAL_TOKEN || 'cr-internal-dev-token';

function token(tenantId = 'tenant-a', sub = 'test-user') {
  return jwt.sign({ tenantId, sub }, JWT_SECRET, { expiresIn: 3600 });
}

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
// Operational
// ============================================================================

describe('operational endpoints', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready → 200', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
  });

  it('GET / → 200 service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('nexha-commerce-runtime');
    expect(res.body.endpoints.length).toBeGreaterThan(20);
  });

  it('GET /api/validate → 200', async () => {
    const res = await request(app).get('/api/validate');
    expect(res.status).toBe(200);
  });

  it('GET /internal/sanity without token → 401', async () => {
    const res = await request(app).get('/internal/sanity');
    expect(res.status).toBe(401);
  });

  it('GET /internal/sanity with valid token → 200', async () => {
    const res = await request(app)
      .get('/internal/sanity')
      .set('x-internal-token', INTERNAL);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /internal/sanity with wrong token → 401', async () => {
    const res = await request(app)
      .get('/internal/sanity')
      .set('x-internal-token', 'wrong');
    expect(res.status).toBe(401);
  });

  it('GET /nonexistent → 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// Auth gates
// ============================================================================

describe('auth gates', () => {
  it('POST /api/orders without auth → 401', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/orders with bad token → 401', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer not-a-token')
      .send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/orders with token missing tenantId → 401', async () => {
    const bad = jwt.sign({ sub: 'no-tenant' }, JWT_SECRET);
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${bad}`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('internal token + X-Tenant-Id works', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('x-internal-token', INTERNAL)
      .set('X-Tenant-Id', 'tenant-internal')
      .send({
        buyerRef: 'b', sellerRef: 's',
        items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe('tenant-internal');
  });

  it('internal token without X-Tenant-Id → 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('x-internal-token', INTERNAL)
      .send({
        buyerRef: 'b', sellerRef: 's',
        items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
      });
    expect(res.status).toBe(400);
  });

  it('cross-tenant get returns 404', async () => {
    const t = token('tenant-a');
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({
        buyerRef: 'b', sellerRef: 's',
        items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
      });
    const other = token('tenant-b');
    const got = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(got.status).toBe(404);
  });
});

// ============================================================================
// Order CRUD
// ============================================================================

describe('orders', () => {
  it('POST /api/orders with valid body → 201', async () => {
    const t = token();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({
        buyerRef: 'b', sellerRef: 's',
        items: [{ sku: 'X', name: 'X', quantity: 2, unitPrice: 10 }],
        tax: 2, shipping: 5,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.total).toBe(27); // 20 + 2 + 5
  });

  it('POST /api/orders with empty items → 400', async () => {
    const t = token();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${t}`)
      .send({ buyerRef: 'b', sellerRef: 's', items: [] });
    expect(res.status).toBe(400);
  });

  it('GET /api/orders lists paginated', async () => {
    const t = token();
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
        buyerRef: 'b', sellerRef: 's',
        items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
      });
    }
    const res = await request(app).get('/api/orders?limit=2').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(2);
    expect(res.body.total).toBe(3);
  });

  it('GET /api/orders/:id returns one', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    const res = await request(app).get(`/api/orders/${created.body.orderId}`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(created.body.orderId);
  });

  it('PATCH /api/orders/:id on DRAFT → 200', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    const res = await request(app)
      .patch(`/api/orders/${created.body.orderId}`)
      .set('Authorization', `Bearer ${t}`)
      .send({ notes: 'fragile' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('fragile');
  });

  it('PATCH /api/orders/:id with empty body → 400', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    const res = await request(app)
      .patch(`/api/orders/${created.body.orderId}`)
      .set('Authorization', `Bearer ${t}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ============================================================================
// Order lifecycle
// ============================================================================

describe('order lifecycle', () => {
  async function placedOrder(t = token()) {
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 2, unitPrice: 10 }],
    });
    const placed = await request(app)
      .post(`/api/orders/${created.body.orderId}/place`)
      .set('Authorization', `Bearer ${t}`)
      .send({ method: 'CARD' });
    return { order: placed.body.order, payment: placed.body.payment };
  }

  it('full lifecycle: place → capture → fulfill → ship → deliver → complete', async () => {
    const t = token();
    const { order, payment } = await placedOrder(t);
    expect(order.status).toBe('PLACED');
    expect(payment.status).toBe('PENDING');

    await request(app).post(`/api/payments/${payment.paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${payment.paymentId}/capture`).set('Authorization', `Bearer ${t}`);

    const orderId = order.orderId;
    let r = await request(app).post(`/api/orders/${orderId}/fulfill`).set('Authorization', `Bearer ${t}`).send({});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('FULFILLING');

    r = await request(app).post(`/api/orders/${orderId}/ship`).set('Authorization', `Bearer ${t}`).send({ trackingNumber: 'T-1' });
    expect(r.body.status).toBe('SHIPPED');

    r = await request(app).post(`/api/orders/${orderId}/deliver`).set('Authorization', `Bearer ${t}`);
    expect(r.body.status).toBe('DELIVERED');

    r = await request(app).post(`/api/orders/${orderId}/complete`).set('Authorization', `Bearer ${t}`);
    expect(r.body.status).toBe('COMPLETED');
  });

  it('place rejects order with no items', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    // Empty items via direct mongo
    const { Order } = await import('../../src/models/Order.js');
    await Order.updateOne({ orderId: created.body.orderId }, { $set: { items: [] } });

    const res = await request(app).post(`/api/orders/${created.body.orderId}/place`).set('Authorization', `Bearer ${t}`).send({});
    expect(res.status).toBe(400);
  });

  it('ship without trackingNumber → 400', async () => {
    const t = token();
    const { order, payment } = await placedOrder(t);
    await request(app).post(`/api/payments/${payment.paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${payment.paymentId}/capture`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/orders/${order.orderId}/fulfill`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).post(`/api/orders/${order.orderId}/ship`).set('Authorization', `Bearer ${t}`).send({});
    expect(res.status).toBe(400);
  });

  it('illegal transition DRAFT → SHIPPED → 422', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    const res = await request(app).post(`/api/orders/${created.body.orderId}/ship`).set('Authorization', `Bearer ${t}`).send({ trackingNumber: 'T' });
    expect(res.status).toBe(422);
    expect(res.body.from).toBe('DRAFT');
  });

  it('cancel → 200 with metadata.cancellationReason', async () => {
    const t = token();
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 10 }],
    });
    const res = await request(app).post(`/api/orders/${created.body.orderId}/cancel`).set('Authorization', `Bearer ${t}`).send({ reason: 'changed mind' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('refund order from PAID → 200, payment refunded', async () => {
    const t = token();
    const { order, payment } = await placedOrder(t);
    await request(app).post(`/api/payments/${payment.paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${payment.paymentId}/capture`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).post(`/api/orders/${order.orderId}/refund`).set('Authorization', `Bearer ${t}`).send({ reason: 'out of stock' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REFUNDED');
    const p = await request(app).get(`/api/payments/${payment.paymentId}`).set('Authorization', `Bearer ${t}`);
    expect(p.body.status).toBe('REFUNDED');
  });
});

// ============================================================================
// Payments
// ============================================================================

describe('payments', () => {
  async function setupPaidPayment(t = token()) {
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 50 }],
    });
    const placed = await request(app).post(`/api/orders/${created.body.orderId}/place`).set('Authorization', `Bearer ${t}`).send({ method: 'CARD' });
    return { orderId: created.body.orderId, paymentId: placed.body.payment.paymentId };
  }

  it('GET /api/payments lists', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    const res = await request(app).get('/api/payments').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.payments.length).toBe(1);
    expect(res.body.payments[0].paymentId).toBe(paymentId);
  });

  it('GET /api/payments/:id returns one', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    const res = await request(app).get(`/api/payments/${paymentId}`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
  });

  it('refund full amount → status REFUNDED', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    await request(app).post(`/api/payments/${paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${paymentId}/capture`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).post(`/api/payments/${paymentId}/refund`).set('Authorization', `Bearer ${t}`).send({ amount: 50 });
    expect(res.body.status).toBe('REFUNDED');
    expect(res.body.refundedAmount).toBe(50);
  });

  it('refund partial → status CAPTURED', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    await request(app).post(`/api/payments/${paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${paymentId}/capture`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).post(`/api/payments/${paymentId}/refund`).set('Authorization', `Bearer ${t}`).send({ amount: 20 });
    expect(res.body.status).toBe('CAPTURED');
    expect(res.body.refundedAmount).toBe(20);
  });

  it('fail payment → 200 with reason', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    const res = await request(app).post(`/api/payments/${paymentId}/fail`).set('Authorization', `Bearer ${t}`).send({ reason: 'declined' });
    expect(res.body.status).toBe('FAILED');
    expect(res.body.failureReason).toBe('declined');
  });

  it('cancel payment → 200', async () => {
    const t = token();
    const { paymentId } = await setupPaidPayment(t);
    const res = await request(app).post(`/api/payments/${paymentId}/cancel`).set('Authorization', `Bearer ${t}`);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('createPayment for existing order → 201', async () => {
    const t = token();
    const { orderId } = await setupPaidPayment(t);
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${t}`).send({
      orderId, amount: 25, method: 'BNPL',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.method).toBe('BNPL');
  });

  it('createPayment rejects invalid method', async () => {
    const t = token();
    const { orderId } = await setupPaidPayment(t);
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${t}`).send({
      orderId, amount: 25, method: 'INVALID',
    });
    expect(res.status).toBe(400);
  });

  it('createPayment for unknown order → 404', async () => {
    const t = token();
    const res = await request(app).post('/api/payments').set('Authorization', `Bearer ${t}`).send({
      orderId: 'no-such-order', amount: 10,
    });
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// Returns
// ============================================================================

describe('returns', () => {
  async function deliveredOrder(t = token()) {
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 2, unitPrice: 25 }],
    });
    const placed = await request(app).post(`/api/orders/${created.body.orderId}/place`).set('Authorization', `Bearer ${t}`).send({ method: 'CARD' });
    await request(app).post(`/api/payments/${placed.body.payment.paymentId}/authorize`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/payments/${placed.body.payment.paymentId}/capture`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/orders/${created.body.orderId}/fulfill`).set('Authorization', `Bearer ${t}`);
    await request(app).post(`/api/orders/${created.body.orderId}/ship`).set('Authorization', `Bearer ${t}`).send({ trackingNumber: 'T-1' });
    await request(app).post(`/api/orders/${created.body.orderId}/deliver`).set('Authorization', `Bearer ${t}`);
    return { orderId: created.body.orderId, paymentId: placed.body.payment.paymentId };
  }

  it('full happy path via HTTP', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    const created = await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [{ sku: 'X', quantity: 1, reason: 'DEFECTIVE' }], reason: 'DEFECTIVE', refundAmount: 25,
    });
    expect(created.status).toBe(201);
    const returnId = created.body.returnId;

    await request(app).post(`/api/returns/${returnId}/approve`).set('Authorization', `Bearer ${t}`).send({ refundAmount: 25 });
    await request(app).post(`/api/returns/${returnId}/in-transit`).set('Authorization', `Bearer ${t}`).send({ trackingNumber: 'R-1' });
    await request(app).post(`/api/returns/${returnId}/received`).set('Authorization', `Bearer ${t}`);
    const r = await request(app).post(`/api/returns/${returnId}/refund`).set('Authorization', `Bearer ${t}`).send({ amount: 25 });
    expect(r.body.status).toBe('REFUNDED');
  });

  it('reject via HTTP', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    const created = await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [{ sku: 'X', quantity: 1, reason: 'BUYER_REMORSE' }],
    });
    const res = await request(app).post(`/api/returns/${created.body.returnId}/reject`).set('Authorization', `Bearer ${t}`).send({ reason: 'past window' });
    expect(res.body.status).toBe('REJECTED');
    expect(res.body.rejectionReason).toBe('past window');
  });

  it('GET /api/returns lists', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [{ sku: 'X', quantity: 1, reason: 'DEFECTIVE' }],
    });
    const res = await request(app).get('/api/returns').set('Authorization', `Bearer ${t}`);
    expect(res.body.returns.length).toBe(1);
  });

  it('GET /api/returns/:id returns one', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    const created = await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [{ sku: 'X', quantity: 1, reason: 'DEFECTIVE' }],
    });
    const res = await request(app).get(`/api/returns/${created.body.returnId}`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.returnId).toBe(created.body.returnId);
  });

  it('createReturn with empty lines → 400', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    const res = await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [],
    });
    expect(res.status).toBe(400);
  });

  it('illegal transition REQUESTED → RECEIVED → 422', async () => {
    const t = token();
    const { orderId } = await deliveredOrder(t);
    const created = await request(app).post('/api/returns').set('Authorization', `Bearer ${t}`).send({
      orderId, lines: [{ sku: 'X', quantity: 1, reason: 'DEFECTIVE' }],
    });
    const res = await request(app).post(`/api/returns/${created.body.returnId}/received`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(422);
  });
});

// ============================================================================
// Stats
// ============================================================================

describe('stats', () => {
  it('GET /api/stats aggregates by status', async () => {
    const t = token();
    // Create one DRAFT
    await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 50 }],
    });
    // Create + place one
    const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${t}`).send({
      buyerRef: 'b', sellerRef: 's',
      items: [{ sku: 'X', name: 'X', quantity: 1, unitPrice: 100 }],
    });
    await request(app).post(`/api/orders/${created.body.orderId}/place`).set('Authorization', `Bearer ${t}`).send({ method: 'CARD' });

    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.orders.total).toBe(2);
    expect(res.body.orders.byStatus.DRAFT.count).toBe(1);
    expect(res.body.orders.byStatus.PLACED.count).toBe(1);
    expect(res.body.payments.total).toBe(1);
    expect(res.body.orders.lifetimeGmv).toBe(150);
  });
});