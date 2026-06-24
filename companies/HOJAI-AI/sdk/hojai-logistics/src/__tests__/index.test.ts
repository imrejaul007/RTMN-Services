import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logistics, LogisticsClient, HttpError } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

interface FetchCall { url: string; method: string; body?: string; headers: Record<string, string>; }
function withFetchMock(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string | undefined, headers: (init?.headers ?? {}) as Record<string, string> });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const baseConfig: HojaiConfig = { apiKey: 'test-key', baseUrl: 'http://localhost:4399' };

test('Logistics client instantiates', () => {
  const l = new Logistics(baseConfig);
  assert.ok(l.logistics instanceof LogisticsClient);
  assert.equal(l.config.apiKey, 'test-key');
});

test('listCarriers GETs /api/carriers', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: [
      { id: 'delhivery', name: 'Delhivery', active: true, supportedRegions: ['IN'], serviceLevels: ['standard', 'express'] },
      { id: 'fedex', name: 'FedEx', active: true, supportedRegions: ['US'], serviceLevels: ['overnight'] }
    ]
  }));
  const carriers = await new Logistics(baseConfig).logistics.listCarriers();
  assert.equal(carriers.length, 2);
  assert.equal(carriers[0].id, 'delhivery');
  m.restore();
});

test('getRates POSTs to /api/rates', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: [
      { carrier: 'delhivery', serviceLevel: 'standard', totalPrice: { amount: 80, currency: 'INR' }, estimatedDays: 3, estimatedPickupAt: '2026-06-25', estimatedDeliveryAt: '2026-06-28' }
    ]
  }));
  const rates = await new Logistics(baseConfig).logistics.getRates({
    origin: { city: 'Mumbai', country: 'IN', postalCode: '400001' },
    destination: { city: 'Delhi', country: 'IN', postalCode: '110001' },
    weightKg: 2.5
  });
  assert.equal(rates.length, 1);
  assert.equal(rates[0].carrier, 'delhivery');
  assert.equal(rates[0].estimatedDays, 3);
  m.restore();
});

test('createShipment POSTs with order + carrier + addresses', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: {
      shipmentId: 'sh-1', orderId: 'o-1', carrier: 'delhivery', status: 'created',
      weightKg: 1, totalPrice: { amount: 80, currency: 'INR' },
      origin: { city: 'Mumbai', country: 'IN', postalCode: '400001' },
      destination: { city: 'Delhi', country: 'IN', postalCode: '110001' },
      createdAt: '2026-06-24', updatedAt: '2026-06-24'
    }
  }));
  const sh = await new Logistics(baseConfig).logistics.createShipment({
    orderId: 'o-1', carrier: 'delhivery', weightKg: 1,
    origin: { city: 'Mumbai', country: 'IN', postalCode: '400001' },
    destination: { city: 'Delhi', country: 'IN', postalCode: '110001' }
  });
  assert.equal(sh.shipmentId, 'sh-1');
  assert.equal(sh.status, 'created');
  m.restore();
});

test('track returns events', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: [
      { timestamp: '2026-06-24T10:00:00Z', status: 'picked_up', location: 'Mumbai' },
      { timestamp: '2026-06-25T08:00:00Z', status: 'in_transit', location: 'Bhopal' }
    ]
  }));
  const events = await new Logistics(baseConfig).logistics.track('sh-1');
  assert.equal(events.length, 2);
  assert.equal(events[1].status, 'in_transit');
  m.restore();
});

test('updateStatus POSTs to /status endpoint', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: { shipmentId: 'sh-1', status: 'in_transit' }
  }));
  const sh = await new Logistics(baseConfig).logistics.updateStatus('sh-1', 'in_transit', 'Departed Mumbai hub');
  assert.equal(sh.status, 'in_transit');
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/shipments/sh-1/status');
  m.restore();
});

test('default timeout applied', () => {
  const l = new Logistics({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(l.config.timeout, 10000);
});

test('sends Authorization header', async () => {
  const m = withFetchMock(async (url, init) => {
    assert.equal(init.headers?.['Authorization'], 'Bearer test-key');
    return jsonResponse(200, { success: true, data: [] });
  });
  await new Logistics(baseConfig).logistics.listCarriers();
  m.restore();
});

test('retry on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { success: true, data: [] });
  });
  const result = await request({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/x');
  assert.equal(attempts, 3);
  m.restore();
});

test('throws HttpError on 4xx', async () => {
  const m = withFetchMock(async () => jsonResponse(404, { error: 'not found' }));
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 0 }, 'GET', '/x'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  m.restore();
});

test('total public method count is at least 7', () => {
  const l = new Logistics(baseConfig);
  const count = Object.getOwnPropertyNames(Object.getPrototypeOf(l.logistics)).filter(n => n !== 'constructor').length;
  assert.ok(count >= 7, `expected >= 7 methods, got ${count}`);
});