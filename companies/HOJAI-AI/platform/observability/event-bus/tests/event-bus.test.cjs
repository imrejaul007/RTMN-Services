'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const INTERNAL_TOKEN = 'event-bus-internal-token';
const headers = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };

function startServer(theApp, port) {
  return new Promise(resolve => {
    const s = theApp.listen(port, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}

let baseUrl, server;

before(async () => {
  process.env.DATA_DIR = '/tmp/event-bus-test-' + Date.now();
  process.env.INTERNAL_TOKEN = INTERNAL_TOKEN;
  process.env.PORT = '0';
  // Clear require cache for fresh state each run
  const cacheKey = require.resolve('../src/index.js');
  delete require.cache[cacheKey];
  const mod = require('../src/index.js');
  const createApp = mod.createApp;
  const app = createApp();
  const result = await startServer(app, 0);
  server = result.server;
  baseUrl = `http://127.0.0.1:${result.port}`;
});

after(() => { if (server) server.close(); });

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, body: data };
}
async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, body: data };
}
async function patch(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, body: data };
}
async function del(path) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
  return { status: res.status };
}

// ── Health ────────────────────────────────────────────────────────────────────
test('GET /health returns ok', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.service, 'event-bus');
});

// ── Events (seeded) ────────────────────────────────────────────────────────────
test('GET /api/events returns seeded events', async () => {
  const r = await get('/api/events');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.events));
  assert.ok(r.body.events.length >= 5);
  const types = r.body.events.map(e => e.type);
  assert.ok(types.includes('order.created'));
  assert.ok(types.includes('payment.completed'));
});

// ── Publish ───────────────────────────────────────────────────────────────────
test('POST /api/events requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'order.created', payload: { orderId: 'O-1' } }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/events creates event', async () => {
  const r = await post('/api/events', { type: 'order.created', payload: { orderId: 'O-100' }, source: 'test' });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.equal(r.body.type, 'order.created');
  assert.equal(r.body.source, 'test');
  assert.equal(r.body.payload.orderId, 'O-100');
});

test('POST /api/events rejects missing type', async () => {
  const r = await post('/api/events', { payload: {} });
  assert.equal(r.status, 400);
  assert.ok(r.body.error.includes('type'));
});

test('POST /api/events/batch creates many', async () => {
  const r = await post('/api/events/batch', { events: [
    { type: 'order.created', payload: { id: 'B-1' } },
    { type: 'order.created', payload: { id: 'B-2' } },
  ]});
  assert.equal(r.status, 201);
  assert.equal(r.body.count, 2);
  assert.equal(r.body.events.length, 2);
});

// ── Read events ────────────────────────────────────────────────────────────────
test('GET /api/events lists events', async () => {
  const r = await get('/api/events');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.events));
  assert.ok('count' in r.body);
});

test('GET /api/events/:id returns event', async () => {
  const pub = await post('/api/events', { type: 'order.created', payload: { id: 'E-1' } });
  const r = await get(`/api/events/${pub.body.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, pub.body.id);
});

test('GET /api/events/:id 404 for unknown', async () => {
  const r = await get('/api/events/no-such-id');
  assert.equal(r.status, 404);
});

test('GET /api/events filtered by type', async () => {
  await post('/api/events', { type: 'payment.completed', payload: {} });
  const r = await get('/api/events?type=payment.completed');
  assert.equal(r.status, 200);
  r.body.events.forEach(e => assert.equal(e.type, 'payment.completed'));
});

test('POST /api/events/replay/:id replays to subscriptions', async () => {
  await post('/api/events', { type: 'order.created', payload: { id: 'REPLAY-1' } });
  const evs = await get('/api/events');
  const ev = evs.body.events.find(e => e.payload.id === 'REPLAY-1');
  const r = await post(`/api/events/replay/${ev.id}`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.replayed, ev.id);
});

// ── Subscriptions ──────────────────────────────────────────────────────────────
test('POST /api/subscriptions requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typePattern: 'order.*', webhookUrl: 'https://example.com/hook' }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/subscriptions creates subscription', async () => {
  const r = await post('/api/subscriptions', { typePattern: 'order.created', webhookUrl: 'https://example.com/hook' });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.equal(r.body.typePattern, 'order.created');
  assert.equal(r.body.webhookUrl, 'https://example.com/hook');
  assert.ok(r.body.retryPolicy);
});

test('POST /api/subscriptions requires typePattern', async () => {
  const r = await post('/api/subscriptions', { webhookUrl: 'https://x.com/hook' });
  assert.equal(r.status, 400);
  assert.ok(r.body.error.includes('typePattern'));
});

test('POST /api/subscriptions requires webhookUrl', async () => {
  const r = await post('/api/subscriptions', { typePattern: 'order.*' });
  assert.equal(r.status, 400);
  assert.ok(r.body.error.includes('webhookUrl'));
});

test('POST /api/subscriptions with filter', async () => {
  const r = await post('/api/subscriptions', { typePattern: 'payment.*', webhookUrl: 'https://pay.hook.com', filter: 'payload.amount > 100' });
  assert.equal(r.status, 201);
  assert.equal(r.body.filter, 'payload.amount > 100');
});

test('GET /api/subscriptions lists subscriptions', async () => {
  const r = await get('/api/subscriptions');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.subscriptions));
  assert.ok(r.body.subscriptions.length >= 1);
});

test('GET /api/subscriptions/:id returns subscription', async () => {
  const subs = await get('/api/subscriptions');
  const subId = subs.body.subscriptions[0].id;
  const r = await get(`/api/subscriptions/${subId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, subId);
});

test('PATCH /api/subscriptions/:id updates subscription', async () => {
  const r = await post('/api/subscriptions', { typePattern: 'test.*', webhookUrl: 'https://old.url/hook' });
  const u = await patch(`/api/subscriptions/${r.body.id}`, { typePattern: 'updated.*', active: false });
  assert.equal(u.status, 200);
  assert.equal(u.body.typePattern, 'updated.*');
  assert.equal(u.body.active, false);
});

test('DELETE /api/subscriptions/:id deletes subscription', async () => {
  const r = await post('/api/subscriptions', { typePattern: 'delete.me', webhookUrl: 'https://del.url/hook' });
  const d = await del(`/api/subscriptions/${r.body.id}`);
  assert.ok(d.status === 204 || d.status === 200);
});

test('POST /api/subscriptions/:id/replay-from/:cursor replays from cursor', async () => {
  await post('/api/events', { type: 'order.created', payload: {} });
  const subs = await get('/api/subscriptions');
  const subId = subs.body.subscriptions[0].id;
  const evs = await get('/api/events');
  const cursor = evs.body.events[0].id;
  const r = await post(`/api/subscriptions/${subId}/replay-from/${cursor}`, {});
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
});

// ── DLQ ───────────────────────────────────────────────────────────────────────
test('GET /api/dead-letter returns DLQ', async () => {
  const r = await get('/api/dead-letter');
  assert.equal(r.status, 200);
  assert.ok('entries' in r.body);
});

// ── Stats ─────────────────────────────────────────────────────────────────────
test('GET /api/stats returns stats', async () => {
  const r = await get('/api/stats');
  assert.equal(r.status, 200);
  assert.ok('events' in r.body);
  assert.ok('subscriptions' in r.body);
  assert.ok('deadLetter' in r.body);
  assert.ok(r.body.events.published >= 0);
});

// ── Signature endpoint ─────────────────────────────────────────────────────────
test('POST /api/sign generates signature', async () => {
  const r = await post('/api/sign', { body: '{"test":true}' });
  assert.equal(r.status, 200);
  assert.ok(r.body.signature);
});

// ── Ready ──────────────────────────────────────────────────────────────────────
test('GET /ready returns ready', async () => {
  const r = await get('/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
});
