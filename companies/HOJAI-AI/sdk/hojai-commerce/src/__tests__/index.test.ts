/**
 * Tests for the @hojai/commerce SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Commerce } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Commerce client instantiates with all 9 sub-clients', () => {
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(commerce.wallet);
  assert.ok(commerce.payment);
  assert.ok(commerce.catalog);
  assert.ok(commerce.booking);
  assert.ok(commerce.cashback);
  assert.ok(commerce.giftCard);
  assert.ok(commerce.invoice);
  assert.ok(commerce.billPayments);
  assert.ok(commerce.loyalty);
});

test('WalletClient.get posts to /wallet/:userId', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ userId: 'u-1', balance: 1000, coins: 100, currency: 'INR', status: 'active', tier: 'gold' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const w = await commerce.wallet.get('u-1');
  assert.equal(captured.url, 'http://localhost:9999/wallet/u-1');
  assert.equal(w.balance, 1000);
  restore();
});

test('WalletClient.credit posts to /wallet/:userId/credit', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'tx-1', walletId: 'w-1', type: 'credit', amount: 500, balanceAfter: 1500, reason: 'topup', reference: 'r-1', status: 'completed', createdAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.wallet.credit('u-1', { amount: 500, reason: 'topup' });
  assert.equal(captured.url, 'http://localhost:9999/wallet/u-1/credit');
  assert.equal(captured.body.amount, 500);
  restore();
});

test('PaymentClient.create posts Razorpay order', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'rzp-1', amount: 50000, currency: 'INR', receipt: 'r-1', status: 'created' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const order = await commerce.payment.create({ orderId: 'ord-1', userId: 'u-1', amount: 50000, method: 'upi' });
  assert.equal(captured.url, 'http://localhost:9999/pay/create');
  assert.equal(order.id, 'rzp-1');
  restore();
});

test('PaymentClient.verify verifies payment signature', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ verified: true, paymentId: 'pay-1' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.payment.verify({
    razorpayOrderId: 'rzp-1',
    razorpayPaymentId: 'pay-1',
    razorpaySignature: 'sig'
  });
  assert.equal(captured.url, 'http://localhost:9999/pay/verify');
  restore();
});

test('CatalogClient.createProduct posts product', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'p-1', sku: 'SKU-1', name: 'X', categoryId: 'c-1', price: { amount: 100, currency: 'INR' }, status: 'active', createdAt: 't', updatedAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.catalog.createProduct({ sku: 'SKU-1', name: 'X', categoryId: 'c-1', price: { amount: 100, currency: 'INR' } });
  assert.equal(captured.url, 'http://localhost:9999/api/products');
  restore();
});

test('BookingClient.createBooking posts booking', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'bk-1', userId: 'u-1', itemId: 'i-1', itemType: 'hotel', startsAt: 't', endsAt: 't', status: 'pending', totalPrice: { amount: 1000, currency: 'INR' }, createdAt: 't', updatedAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.booking.createBooking({ userId: 'u-1', itemId: 'i-1', itemType: 'hotel', startsAt: 't', endsAt: 't' });
  assert.equal(captured.url, 'http://localhost:9999/api/bookings');
  restore();
});

test('CashbackClient.accrue posts cashback', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'cb-1', userId: 'u-1', amount: 50, currency: 'INR', source: 'order:ord-1', rate: 5, status: 'available', accruedAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.cashback.accrue({ userId: 'u-1', amount: 50, source: 'order:ord-1' });
  assert.equal(captured.url, 'http://localhost:9999/api/cashback/accrue');
  restore();
});

test('GiftCardClient.create posts gift card', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ code: 'GC-XXXX', cardId: 'gc-1', initialBalance: 1000, currentBalance: 1000, currency: 'INR', status: 'active', createdAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.giftCard.create({ initialBalance: 1000, currency: 'INR' });
  assert.equal(captured.url, 'http://localhost:9999/api/gift-cards');
  restore();
});

test('InvoiceClient.create posts invoice', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'inv-1', invoiceNumber: 'INV-001', customerId: 'c-1', customerName: 'C', issueDate: 't', dueDate: 't', status: 'draft', currency: 'INR', subtotal: 1000, taxAmount: 180, total: 1180, amountPaid: 0, amountDue: 1180, lineItems: [], createdAt: 't', updatedAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.invoice.create({
    customerId: 'c-1', customerName: 'C', issueDate: 't', dueDate: 't', currency: 'INR',
    lineItems: [{ description: 'X', quantity: 1, unitPrice: 1000 }]
  });
  assert.equal(captured.url, 'http://localhost:9999/api/invoices');
  restore();
});

test('BillPaymentsClient.payBill posts payment', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'bp-1', billerId: 'b-1', customerId: 'c-1', amount: 500, status: 'success', paymentMethod: 'upi', paidAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.billPayments.payBill({
    billerId: 'b-1', parameters: { accountNumber: '123' }, amount: 500, customerId: 'c-1', paymentMethod: 'upi'
  });
  assert.equal(captured.url, 'http://localhost:9999/api/bills/pay');
  restore();
});

test('LoyaltyClient.earn posts earn', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'lt-1', userId: 'u-1', coinType: 'rez-coin', type: 'earn', amount: 100, reason: 'order', balanceAfter: 1100, createdAt: 't' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.loyalty.earn({ userId: 'u-1', coinType: 'rez-coin', amount: 100, reason: 'order' });
  assert.equal(captured.url, 'http://localhost:9999/api/loyalty/earn');
  restore();
});

test('Commerce retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ userId: 'u-1', balance: 0, coins: 0, currency: 'INR', status: 'active', tier: 'bronze' })
    };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await commerce.wallet.get('u-1');
  assert.equal(calls, 3);
  restore();
});

test('Commerce throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const commerce = new Commerce({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => commerce.wallet.get('missing'), /HTTP 404/);
  restore();
});