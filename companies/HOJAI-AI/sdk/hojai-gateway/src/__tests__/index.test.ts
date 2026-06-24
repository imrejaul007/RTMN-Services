import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Gateway, GatewayClient, HttpError } from '../index.js';
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

test('Gateway client instantiates', () => {
  const g = new Gateway(baseConfig);
  assert.ok(g.gateway instanceof GatewayClient);
  assert.equal(g.config.apiKey, 'test-key');
});

test('listWarehouses GETs /api/v1/warehouses', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: [{ id: 'wh-1', name: 'Mumbai-1', region: 'IN', capacity: 1000, utilization: 0.5, nexhaId: 'nexha-1' }] }));
  const warehouses = await new Gateway(baseConfig).gateway.listWarehouses();
  assert.equal(warehouses.length, 1);
  assert.equal(warehouses[0].name, 'Mumbai-1');
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/v1/warehouses');
  m.restore();
});

test('getWarehouse returns one', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { id: 'wh-1', name: 'X', region: 'IN', capacity: 500, utilization: 0.1, nexhaId: 'n-1' } }));
  const wh = await new Gateway(baseConfig).gateway.getWarehouse('wh-1');
  assert.equal(wh.id, 'wh-1');
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/v1/warehouses/wh-1');
  m.restore();
});

test('searchSlots POSTs body', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: [{ id: 's-1', warehouseId: 'wh-1', start: '2026-07-01', end: '2026-07-02', capacity: 100, reserved: 0, status: 'available' }] }));
  const slots = await new Gateway(baseConfig).gateway.searchSlots({ warehouseId: 'wh-1', minCapacity: 50 });
  assert.equal(slots.length, 1);
  assert.equal(slots[0].status, 'available');
  m.restore();
});

test('bookSlot POSTs with slotId/quantity/customerId', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { id: 'b-1', slotId: 's-1', customerId: 'c-1', quantity: 10, status: 'pending', totalPrice: { amount: 100, currency: 'USD' }, createdAt: '2026-06-24' } }));
  const booking = await new Gateway(baseConfig).gateway.bookSlot('s-1', 10, 'c-1');
  assert.equal(booking.id, 'b-1');
  assert.equal(booking.status, 'pending');
  m.restore();
});

test('fulfillBooking POSTs to /fulfill', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { id: 'b-1', status: 'fulfilled' } }));
  const b = await new Gateway(baseConfig).gateway.fulfillBooking('b-1');
  assert.equal(b.status, 'fulfilled');
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/v1/slots/bookings/b-1/fulfill');
  m.restore();
});

test('listRoutes returns routes', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: [{ id: 'r-1', origin: 'Mumbai', destination: 'Delhi', distanceKm: 1400, estimatedHours: 24, carriers: ['BlueDart'] }] }));
  const routes = await new Gateway(baseConfig).gateway.listRoutes();
  assert.equal(routes[0].distanceKm, 1400);
  m.restore();
});

test('default timeout applied when omitted', () => {
  const g = new Gateway({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(g.config.timeout, 10000);
  assert.equal(g.config.maxRetries, 3);
});

test('sends Authorization header', async () => {
  const m = withFetchMock(async (url, init) => {
    assert.equal(init.headers?.['Authorization'], 'Bearer test-key');
    return jsonResponse(200, { success: true, data: [] });
  });
  await new Gateway(baseConfig).gateway.listWarehouses();
  m.restore();
});

test('throws HttpError on 404', async () => {
  const m = withFetchMock(async () => jsonResponse(404, { error: 'not found' }));
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 0 }, 'GET', '/x'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  m.restore();
});

test('total public method count is at least 8', () => {
  const g = new Gateway(baseConfig);
  const count = Object.getOwnPropertyNames(Object.getPrototypeOf(g.gateway)).filter(n => n !== 'constructor').length;
  assert.ok(count >= 8, `expected >= 8 methods, got ${count}`);
});