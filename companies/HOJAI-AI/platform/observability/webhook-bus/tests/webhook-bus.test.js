/**
 * webhook-bus tests (ESM)
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let baseUrl, server;
const INTERNAL_TOKEN = 'webhook-bus-internal-token';
const headers = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };

function startServer(theApp, port) {
  return new Promise(resolve => {
    const s = theApp.listen(port, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}

let app;

before(async () => {
  process.env.DATA_DIR = '/tmp/webhook-bus-test-' + Date.now();
  process.env.INTERNAL_TOKEN = INTERNAL_TOKEN;
  process.env.PORT = '0';
  const mod = await import(`../src/index.js?t=${Date.now()}`);
  app = mod.app;
  const result = await startServer(app, 0);
  server = result.server;
  baseUrl = `http://127.0.0.1:${result.port}`;
});

after(() => { if (server) server.close(); });

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}
async function del(path) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
  return { status: res.status };
}

// ── Health ────────────────────────────────────────────────────────────────────
test('GET /health returns healthy', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'webhook-bus');
});

// ── Event types ───────────────────────────────────────────────────────────────
test('GET /api/event-types returns seeded list', async () => {
  const r = await get('/api/event-types');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.eventTypes));
  assert.ok(r.body.eventTypes.includes('twin.created'));
  assert.ok(r.body.eventTypes.includes('memory.record-added'));
});

test('POST /api/event-types requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/event-types`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: 'custom.event' }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/event-types creates event type', async () => {
  const r = await post('/api/event-types', { eventType: 'custom.my-event' });
  assert.equal(r.status, 201);
  assert.equal(r.body.eventType, 'custom.my-event');
});

// ── Subscribers ────────────────────────────────────────────────────────────────
test('POST /api/subscribers requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/subscribers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/hook', events: ['twin.created'] }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/subscribers creates subscriber', async () => {
  const r = await post('/api/subscribers', { url: 'https://example.com/hook', events: ['twin.created', 'twin.updated'], label: 'Test Sub', maxAttempts: 3 });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.equal(r.body.url, 'https://example.com/hook');
  assert.ok(Array.isArray(r.body.events));
  assert.ok(r.body.secret.startsWith('whsec_'));
});

test('POST /api/subscribers requires url', async () => {
  const r = await post('/api/subscribers', { events: ['twin.created'] });
  assert.equal(r.status, 400);
});

test('POST /api/subscribers requires events[]', async () => {
  const r = await post('/api/subscribers', { url: 'https://example.com/hook' });
  assert.equal(r.status, 400);
});

test('GET /api/subscribers lists subscribers', async () => {
  const r = await get('/api/subscribers');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.subscribers));
  assert.ok(r.body.subscribers.length >= 1);
});

test('GET /api/subscribers/:id returns subscriber', async () => {
  const sub = await post('/api/subscribers', { url: 'https://get.me/sub', events: ['skill.executed'] });
  const r = await get(`/api/subscribers/${sub.body.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, sub.body.id);
});

test('DELETE /api/subscribers/:id marks deleted', async () => {
  const sub = await post('/api/subscribers', { url: 'https://del.me/sub', events: ['execution.completed'] });
  const r = await del(`/api/subscribers/${sub.body.id}`);
  assert.equal(r.status, 204);
});

// ── Dispatch ───────────────────────────────────────────────────────────────────
test('POST /api/dispatch requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/dispatch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: 'twin.created', payload: { id: '123' } }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/dispatch records deliveries', async () => {
  await post('/api/subscribers', { url: 'https://dispatch.me/sub', events: ['twin.created'] });
  const r = await post('/api/dispatch', { eventType: 'twin.created', payload: { id: 'Twin-001' } });
  assert.equal(r.status, 202);
  assert.equal(r.body.eventType, 'twin.created');
  assert.ok(r.body.dispatched >= 1);
  assert.ok(r.body.deliveries.length >= 1);
  assert.ok(r.body.deliveries[0].deliveryId);
});

test('POST /api/dispatch rejects unknown eventType', async () => {
  const r = await post('/api/dispatch', { eventType: 'nonexistent.event' });
  assert.equal(r.status, 400);
});

// ── Delivery status ────────────────────────────────────────────────────────────
test('POST /api/deliveries/:id/delivered marks delivered', async () => {
  await post('/api/subscribers', { url: 'https://delivered.me/sub', events: ['marketplace.listing-created'] });
  const dispatch = await post('/api/dispatch', { eventType: 'marketplace.listing-created', payload: { listingId: 'L-99' } });
  const dlvId = dispatch.body.deliveries[0].deliveryId;
  const r = await post(`/api/deliveries/${dlvId}/delivered`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'delivered');
  assert.ok(r.body.deliveredAt);
});

test('POST /api/deliveries/:id/failed marks failed', async () => {
  await post('/api/subscribers', { url: 'https://failed.me/sub', events: ['execution.failed'], maxAttempts: 1 });
  const dispatch = await post('/api/dispatch', { eventType: 'execution.failed', payload: { error: 'timeout' } });
  const dlvId = dispatch.body.deliveries[0].deliveryId;
  const r = await post(`/api/deliveries/${dlvId}/failed`, { reason: 'connection refused' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'failed');
  assert.equal(r.body.failureReason, 'connection refused');
});

test('POST /api/deliveries/:id/retry increments attempt', async () => {
  await post('/api/subscribers', { url: 'https://retry.me/sub', events: ['flow.plan-completed'], maxAttempts: 5 });
  const dispatch = await post('/api/dispatch', { eventType: 'flow.plan-completed', payload: {} });
  const dlvId = dispatch.body.deliveries[0].deliveryId;
  const r = await post(`/api/deliveries/${dlvId}/retry`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.attempt, 2);
  assert.ok(r.body.nextRetryAt);
});

// ── Read deliveries ────────────────────────────────────────────────────────────
test('GET /api/deliveries lists deliveries', async () => {
  const r = await get('/api/deliveries');
  assert.equal(r.status, 200);
  assert.ok('deliveries' in r.body);
});

test('GET /api/deliveries/:id returns delivery', async () => {
  await post('/api/subscribers', { url: 'https://get-dlv.me/sub', events: ['skill.failed'] });
  const dispatch = await post('/api/dispatch', { eventType: 'skill.failed', payload: {} });
  const dlvId = dispatch.body.deliveries[0].deliveryId;
  const r = await get(`/api/deliveries/${dlvId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, dlvId);
});

test('GET /api/deliveries/:id 404 for unknown', async () => {
  const r = await get('/api/deliveries/no-such-id');
  assert.equal(r.status, 404);
});

// ── Audit ──────────────────────────────────────────────────────────────────────
test('GET /api/audit returns audit entries', async () => {
  const r = await get('/api/audit');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.entries));
});

// ── Ready ──────────────────────────────────────────────────────────────────────
test('GET /ready returns ready', async () => {
  const r = await get('/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
});
