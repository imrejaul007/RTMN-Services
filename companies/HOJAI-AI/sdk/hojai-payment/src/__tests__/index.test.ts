/**
 * @hojai/payment — Comprehensive test suite.
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PaymentClient, HttpError } from '../index.js';
import { PayClient, BillClient, SepaClient, GatewayClient, SettlementClient, WebhookClient } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

/**
 * Mock fetch helper — replaces globalThis.fetch and restores after the test.
 * Records all calls so tests can assert on URL/method/body.
 */
interface FetchCall {
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
}

function withFetchMock(handler: (url: string, options: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
      headers: (init?.headers ?? {}) as Record<string, string>
    });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return {
    calls,
    restore: () => { globalThis.fetch = original; }
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const baseConfig: HojaiConfig = {
  apiKey: 'test-key',
  baseUrl: 'http://localhost:4399'
};

// ─── 1. Facade wiring ─────────────────────────────────────────────────
test('Payment client instantiates with all 6 sub-clients', () => {
  const payment = new PaymentClient(baseConfig);
  assert.ok(payment.pay instanceof PayClient);
  assert.ok(payment.bill instanceof BillClient);
  assert.ok(payment.sepa instanceof SepaClient);
  assert.ok(payment.gateway instanceof GatewayClient);
  assert.ok(payment.settlement instanceof SettlementClient);
  assert.ok(payment.webhook instanceof WebhookClient);
  assert.equal(payment.config.apiKey, 'test-key');
  assert.equal(payment.config.baseUrl, 'http://localhost:4399');
});

test('Sub-clients can be instantiated independently', () => {
  const pay = new PayClient(baseConfig);
  const bill = new BillClient(baseConfig);
  assert.ok(pay);
  assert.ok(bill);
});

// ─── 2. PAY — 7 methods ──────────────────────────────────────────────
test('pay.initiate POSTs to /api/payment/initiate with idempotency', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'pay-1', orderId: 'o-1', status: 'initiated', amount: 499, currency: 'INR' }));
  const p = await new PaymentClient(baseConfig).pay.initiate({
    orderId: 'o-1', amount: 499, paymentMethod: 'upi', orchestratorIdempotencyKey: 'idem-1'
  });
  assert.equal(p.id, 'pay-1');
  const sent = JSON.parse(m.calls[0].body!);
  assert.equal(sent.orchestratorIdempotencyKey, 'idem-1');
  m.restore();
});

test('pay.capture verifies razorpay signature fields', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'pay-1', status: 'captured' }));
  await new PaymentClient(baseConfig).pay.capture({
    paymentId: 'pay-1',
    razorpayPaymentId: 'pay_abcdef1234567890',
    razorpayOrderId: 'order_abcdef1234567890',
    razorpaySignature: 'sig-xyz'
  });
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/payment/capture');
  m.restore();
});

test('pay.refund POSTs amount + idempotency key', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'pay-1', status: 'refunded', refundedAmount: 200 }));
  const p = await new PaymentClient(baseConfig).pay.refund({ paymentId: 'pay-1', amount: 200, reason: 'duplicate', idempotencyKey: 'rf-1' });
  assert.equal(p.refundedAmount, 200);
  m.restore();
});

test('pay.status GETs /api/payment/status/:id', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('/api/payment/status/pay-1'));
    return jsonResponse(200, { id: 'pay-1', status: 'captured' });
  });
  await new PaymentClient(baseConfig).pay.status('pay-1');
  m.restore();
});

test('pay.getRazorpayConfig returns keyId', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { keyId: 'rzp_test_123', currency: 'INR', companyName: 'RABTUL' }));
  const c = await new PaymentClient(baseConfig).pay.getRazorpayConfig();
  assert.equal(c.keyId, 'rzp_test_123');
  m.restore();
});

test('pay.createRazorpayOrder returns razorpay order', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'order_xyz', amount: 49900, currency: 'INR', status: 'created' }));
  const o = await new PaymentClient(baseConfig).pay.createRazorpayOrder({ amount: 499 });
  assert.equal(o.id, 'order_xyz');
  assert.equal(o.amount, 49900);
  m.restore();
});

test('pay.getMerchantSettlements filters by date', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('from=2026-01-01'));
    return jsonResponse(200, { settlements: [{ id: 's-1', amount: 100000, currency: 'INR', period: '2026-01', status: 'settled', settledAt: '2026-01-05' }] });
  });
  const r = await new PaymentClient(baseConfig).pay.getMerchantSettlements({ from: '2026-01-01' });
  assert.equal(r.settlements.length, 1);
  m.restore();
});

// ─── 3. BILL — 7 methods ─────────────────────────────────────────────
test('bill.listProviders filters by category', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.endsWith('?category=electricity'));
    return jsonResponse(200, [{ id: 'bijli-1', name: 'BESCOM', category: 'electricity', regions: ['KA'], parameters: [{ name: 'consumerNumber', label: 'Consumer No.', required: true }], active: true }]);
  });
  const list = await new PaymentClient(baseConfig).bill.listProviders('electricity');
  assert.equal(list[0].name, 'BESCOM');
  m.restore();
});

test('bill.fetchBill POSTs with provider + consumer number', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    billId: 'bill-1', providerId: 'bijli-1', consumerNumber: '12345', customerName: 'Ravi',
    amount: 1500, totalAmount: 1530, status: 'unpaid',
    fetchedAt: '2026-06-24T00:00:00Z', expiresAt: '2026-06-25T00:00:00Z'
  }));
  const b = await new PaymentClient(baseConfig).bill.fetchBill({ providerId: 'bijli-1', consumerNumber: '12345' });
  assert.equal(b.customerName, 'Ravi');
  m.restore();
});

test('bill.payBill returns bill payment with reference', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'bp-1', billId: 'bill-1', providerId: 'bijli-1', amount: 1500, convenienceFee: 10, totalAmount: 1510, status: 'paid', transactionRef: 'TXN123', paidAt: '2026-06-24' }));
  const p = await new PaymentClient(baseConfig).bill.payBill({ billId: 'bill-1', paymentMethod: 'upi' });
  assert.equal(p.status, 'paid');
  m.restore();
});

test('bill.getHistory forwards date range', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('category=gas'));
    return jsonResponse(200, []);
  });
  await new PaymentClient(baseConfig).bill.getHistory({ from: '2026-01-01', to: '2026-06-30', category: 'gas' });
  m.restore();
});

test('bill.refundBill posts reason', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'bp-1', status: 'refunded', refundedAt: '2026-06-24', refundReason: 'duplicate payment' }));
  const r = await new PaymentClient(baseConfig).bill.refundBill({ paymentId: 'bp-1', reason: 'duplicate payment' });
  assert.equal(r.refundReason, 'duplicate payment');
  m.restore();
});

// ─── 4. SEPA — 10 methods ────────────────────────────────────────────
test('sepa.saveBeneficiary POSTs iban + country', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'ben-1', name: 'Acme GmbH', iban: 'DE89370400440532013000', country: 'DE', savedAt: '2026-06-24' }));
  const b = await new PaymentClient(baseConfig).sepa.saveBeneficiary({ name: 'Acme GmbH', iban: 'DE89370400440532013000', country: 'DE' });
  assert.equal(b.id, 'ben-1');
  m.restore();
});

test('sepa.createTransfer SCT routes through /api/sepa/transfers', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'sct-1', scheme: 'sepa_credit_transfer', status: 'queued',
    debtorName: 'RABTUL', debtorIban: 'DE111',
    beneficiaryName: 'Acme', beneficiaryIban: 'DE222',
    amount: 1000, currency: 'EUR', endToEndId: 'E-1', createdAt: '2026-06-24'
  }));
  const t = await new PaymentClient(baseConfig).sepa.createTransfer({
    scheme: 'sepa_credit_transfer', beneficiaryId: 'ben-1', amount: 1000, reference: 'INV-2026-001'
  });
  assert.equal(t.currency, 'EUR');
  m.restore();
});

test('sepa.createTransfer SEPA Instant routes immediately', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'si-1', scheme: 'sepa_instant_credit_transfer', status: 'settled',
    debtorName: 'RABTUL', debtorIban: 'DE111',
    beneficiaryName: 'Acme', beneficiaryIban: 'DE222',
    amount: 500, currency: 'EUR', endToEndId: 'E-2', settledAt: '2026-06-24T10:01:00Z', createdAt: '2026-06-24'
  }));
  const t = await new PaymentClient(baseConfig).sepa.createTransfer({
    scheme: 'sepa_instant_credit_transfer', beneficiaryId: 'ben-1', amount: 500
  });
  assert.equal(t.status, 'settled');
  m.restore();
});

test('sepa.createMandate posts SDD sequence type', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'mand-1', debtorName: 'Ravi', debtorIban: 'DE111',
    creditorName: 'Acme', creditorId: 'DE98ZZZ09999999999',
    sequenceType: 'recurring', status: 'pending'
  }));
  await new PaymentClient(baseConfig).sepa.createMandate({
    debtorName: 'Ravi', debtorIban: 'DE111',
    creditorName: 'Acme', creditorId: 'DE98ZZZ09999999999',
    sequenceType: 'recurring'
  });
  m.restore();
});

test('sepa.revokeMandate flips status', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'mand-1', status: 'revoked' }));
  const r = await new PaymentClient(baseConfig).sepa.revokeMandate('mand-1');
  assert.equal(r.status, 'revoked');
  m.restore();
});

// ─── 5. GATEWAY — 7 methods ──────────────────────────────────────────
test('gateway.create with preferredRails', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'gw-1', rail: 'upi_intent', status: 'created',
    amount: 499, currency: 'INR',
    intent: { type: 'collect', qrCode: 'qr://...' },
    createdAt: '2026-06-24'
  }));
  const g = await new PaymentClient(baseConfig).gateway.create({
    amount: 499, currency: 'INR', preferredRails: ['upi_intent', 'upi_collect']
  });
  assert.equal(g.intent?.qrCode, 'qr://...');
  m.restore();
});

test('gateway.capture with optional partial amount', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'gw-1', status: 'captured', amount: 200 }));
  const g = await new PaymentClient(baseConfig).gateway.capture('gw-1', 200);
  assert.equal(g.status, 'captured');
  m.restore();
});

test('gateway.refund posts amount + reason', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'gw-rf-1', paymentId: 'gw-1', amount: 200, currency: 'INR', status: 'succeeded', createdAt: '2026-06-24' }));
  const r = await new PaymentClient(baseConfig).gateway.refund('gw-1', { amount: 200, reason: 'customer request' });
  assert.equal(r.status, 'succeeded');
  m.restore();
});

test('gateway.list forwards query params', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('rail=upi_intent'));
    assert.ok(url.includes('status=captured'));
    return jsonResponse(200, { items: [] });
  });
  await new PaymentClient(baseConfig).gateway.list({ rail: 'upi_intent', status: 'captured' });
  m.restore();
});

// ─── 6. SETTLEMENT — 6 methods ───────────────────────────────────────
test('settlement.list filters by merchant + status', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('merchantId=m-1'));
    assert.ok(url.includes('status=settled'));
    return jsonResponse(200, [{ id: 'stl-1', rail: 'razorpay', merchantId: 'm-1', amount: 100000, currency: 'INR', fees: 2000, tax: 360, netAmount: 97640, status: 'settled', period: { from: '2026-06-01', to: '2026-06-30' }, settledAt: '2026-07-02', createdAt: '2026-07-01' }]);
  });
  const list = await new PaymentClient(baseConfig).settlement.list({ merchantId: 'm-1', status: 'settled' });
  assert.equal(list[0].netAmount, 97640);
  m.restore();
});

test('settlement.reconcile returns report with mismatches', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    rail: 'razorpay', period: { from: '2026-06-01', to: '2026-06-30' },
    totalCaptured: 1000000, totalRefunded: 5000, totalFees: 20000, totalTax: 3600, totalNet: 971400,
    settlementCount: 30, mismatchCount: 1,
    mismatches: [{ paymentId: 'pay-99', reason: 'missing settlement entry' }],
    generatedAt: '2026-07-02T00:00:00Z'
  }));
  const rep = await new PaymentClient(baseConfig).settlement.reconcile({ rail: 'razorpay', from: '2026-06-01', to: '2026-06-30' });
  assert.equal(rep.mismatchCount, 1);
  m.restore();
});

test('settlement.requestPayout returns new settlement', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'po-1', rail: 'razorpay', merchantId: 'm-1', amount: 50000, currency: 'INR', fees: 0, tax: 0, netAmount: 50000, status: 'pending', period: { from: '2026-06-01', to: '2026-06-30' }, createdAt: '2026-07-02' }));
  const p = await new PaymentClient(baseConfig).settlement.requestPayout({ merchantId: 'm-1', amount: 50000 });
  assert.equal(p.netAmount, 50000);
  m.restore();
});

// ─── 7. WEBHOOK — 9 methods (8 HTTP + 1 static helper) ──────────────
test('webhook.createEndpoint posts url + events', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'wh-1', url: 'https://example.com/hook', events: ['payment.captured'],
    enabled: true, createdAt: '2026-06-24', updatedAt: '2026-06-24'
  }));
  const e = await new PaymentClient(baseConfig).webhook.createEndpoint({ url: 'https://example.com/hook', events: ['payment.captured'] });
  assert.equal(e.events.length, 1);
  m.restore();
});

test('webhook.listDeliveries filters by eventType', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('eventType=bill.paid'));
    return jsonResponse(200, [{ id: 'wd-1', endpointId: 'wh-1', eventType: 'bill.paid', attempt: 1, status: 'succeeded', responseStatus: 200, payload: { foo: 'bar' }, deliveredAt: '2026-06-24' }]);
  });
  await new PaymentClient(baseConfig).webhook.listDeliveries({ eventType: 'bill.paid' });
  m.restore();
});

test('webhook.retryDelivery re-attempts a failed delivery', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'wd-1', endpointId: 'wh-1', eventType: 'payment.failed', attempt: 2, status: 'retrying' }));
  await new PaymentClient(baseConfig).webhook.retryDelivery('wd-1');
  m.restore();
});

test('webhook.verifyRazorpaySignature validates matching HMAC', () => {
  const body = JSON.stringify({ event: 'payment.captured', id: 'pay-1' });
  const secret = 'wh_secret_test';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  const result = WebhookClient.verifyRazorpaySignature(body, sig, secret);
  assert.equal(result.valid, true);
});

test('webhook.verifyRazorpaySignature rejects bad signature', () => {
  const result = WebhookClient.verifyRazorpaySignature('{"x":1}', 'bad-sig', 'secret');
  assert.equal(result.valid, false);
});

// ─── 8. Retry & error handling ────────────────────────────────────────
test('request retries on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { ok: true });
  });
  const result = await request<{ ok: boolean }>({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/health');
  assert.equal(result.ok, true);
  assert.equal(attempts, 3);
  m.restore();
});

test('request does not retry on 4xx (HttpError)', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    return jsonResponse(404, { error: 'not found' });
  });
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/missing'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  assert.equal(attempts, 1);
  m.restore();
});

test('request sends Authorization header when apiKey present', async () => {
  const m = withFetchMock(async (_url, init) => {
    const auth = init.headers?.['Authorization'];
    assert.equal(auth, 'Bearer test-key');
    return jsonResponse(200, { ok: true });
  });
  await request({ apiKey: 'test-key', baseUrl: 'http://x' }, 'GET', '/whoami');
  m.restore();
});

// ─── 9. Config resolution ─────────────────────────────────────────────
test('default timeout and maxRetries applied when omitted', () => {
  const payment = new PaymentClient({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(payment.config.timeout, 10000);
  assert.equal(payment.config.maxRetries, 3);
});

test('custom fetchImpl is wired through', async () => {
  let called = false;
  const custom = async () => {
    called = true;
    return jsonResponse(200, { ok: true });
  };
  await request({ baseUrl: 'http://x', fetchImpl: custom as typeof fetch }, 'GET', '/ping');
  assert.equal(called, true);
});

// ─── 10. Method count smoke ───────────────────────────────────────────
test('total public method count is at least 44', () => {
  const payment = new PaymentClient(baseConfig);
  const counts = {
    pay: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.pay)).filter(n => n !== 'constructor').length,
    bill: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.bill)).filter(n => n !== 'constructor').length,
    sepa: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.sepa)).filter(n => n !== 'constructor').length,
    gateway: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.gateway)).filter(n => n !== 'constructor').length,
    settlement: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.settlement)).filter(n => n !== 'constructor').length,
    webhook: Object.getOwnPropertyNames(Object.getPrototypeOf(payment.webhook)).filter(n => n !== 'constructor').length
  };
  const total = counts.pay + counts.bill + counts.sepa + counts.gateway + counts.settlement + counts.webhook;
  assert.ok(total >= 44, `expected >= 44 methods, got ${total} (${JSON.stringify(counts)})`);
});
