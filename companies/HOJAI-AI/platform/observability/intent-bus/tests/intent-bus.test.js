/**
 * intent-bus tests
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let baseUrl;
const INTERNAL_TOKEN = 'intent-bus-internal-token';
const headers = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };

function startServer(theApp, port) {
  return new Promise(resolve => {
    const server = theApp.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

let server, port;
let app;

before(async () => {
  process.env.DATA_DIR = '/tmp/intent-bus-test-' + Date.now();
  process.env.INTERNAL_TOKEN = INTERNAL_TOKEN;
  process.env.PORT = '0';
  const mod = await import(`../src/index.js?t=${Date.now()}`);
  app = mod.app;
  const result = await startServer(app, 0);
  server = result.server;
  port = result.port;
  baseUrl = `http://127.0.0.1:${port}`;
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

// ── Health ────────────────────────────────────────────────────────────────────
test('GET /health returns ok', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.ok(r.body.service);
});

// ── Intents ───────────────────────────────────────────────────────────────────
test('POST /api/intents/publish requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/intents/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'book_hotel', capability: 'hotel-booking', publisher: 'agent-1' }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/intents/publish creates intent', async () => {
  const r = await post('/api/intents/publish', { type: 'book_hotel', capability: 'hotel-booking', publisher: 'agent-1', payload: { city: 'Bangalore' } });
  assert.equal(r.status, 201);
  assert.ok(r.body.intent.id);
  assert.equal(r.body.intent.type, 'book_hotel');
  assert.equal(r.body.intent.status, 'open');
});

test('POST /api/intents/publish rejects invalid type', async () => {
  const r = await post('/api/intents/publish', { type: 'invalid_type', capability: 'x', publisher: 'a' });
  assert.equal(r.status, 400);
});

test('POST /api/intents/publish requires publisher', async () => {
  const r = await post('/api/intents/publish', { type: 'book_hotel', capability: 'x' });
  assert.equal(r.status, 400);
});

test('GET /api/intents lists intents', async () => {
  const r = await get('/api/intents');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.intents));
});

test('GET /api/intents/:id returns intent', async () => {
  const pub = await post('/api/intents/publish', { type: 'book_table', capability: 'restaurant', publisher: 'a' });
  const r = await get(`/api/intents/${pub.body.intent.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.intent.id, pub.body.intent.id);
});

test('GET /api/intents/:id 404 for unknown', async () => {
  const r = await get('/api/intents/no-such-id');
  assert.equal(r.status, 404);
});

test('POST /api/intents/:id/claim marks claimed', async () => {
  const pub = await post('/api/intents/publish', { type: 'negotiate_price', capability: 'pricing', publisher: 'a' });
  const r = await post(`/api/intents/${pub.body.intent.id}/claim`, { claimer: 'agent-2' });
  assert.equal(r.status, 200);
  assert.equal(r.body.intent.status, 'claimed');
  assert.equal(r.body.intent.claimedBy, 'agent-2');
});

test('POST /api/intents/:id/resolve marks resolved', async () => {
  const pub = await post('/api/intents/publish', { type: 'request_quote', capability: 'quotes', publisher: 'a' });
  const r = await post(`/api/intents/${pub.body.intent.id}/resolve`, { result: { price: 500 }, resolver: 'agent-3' });
  assert.equal(r.status, 200);
  assert.equal(r.body.intent.status, 'resolved');
  assert.deepEqual(r.body.intent.result, { price: 500 });
});

test('POST /api/intents/:id/cancel marks cancelled', async () => {
  const pub = await post('/api/intents/publish', { type: 'escalate', capability: 'support', publisher: 'a' });
  const r = await post(`/api/intents/${pub.body.intent.id}/cancel`, { reason: 'no longer needed' });
  assert.equal(r.status, 200);
  assert.equal(r.body.intent.status, 'cancelled');
});

// ── Subscriptions ──────────────────────────────────────────────────────────────
test('POST /api/subscriptions creates subscription', async () => {
  const r = await post('/api/subscriptions', { subscriber: 'agent-b', capability: 'hotel-booking' });
  assert.equal(r.status, 201);
  assert.ok(r.body.subscription.id);
});

test('POST /api/subscriptions requires subscriber', async () => {
  const r = await post('/api/subscriptions', { capability: 'x' });
  assert.equal(r.status, 400);
});

test('GET /api/subscriptions lists subscriptions', async () => {
  const r = await get('/api/subscriptions');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.subscriptions));
});

test('DELETE /api/subscriptions/:id deletes subscription', async () => {
  const sub = await post('/api/subscriptions', { subscriber: 'agent-c', type: 'book_table' });
  const r = await fetch(`${baseUrl}/api/subscriptions/${sub.body.subscription.id}`, { method: 'DELETE', headers });
  assert.equal(r.status, 200);
});

test('GET /api/subscriptions/:id/poll returns matching intents', async () => {
  const sub = await post('/api/subscriptions', { subscriber: 'agent-d', capability: 'hotel-booking' });
  await post('/api/intents/publish', { type: 'book_hotel', capability: 'hotel-booking', publisher: 'a' });
  const r = await get(`/api/subscriptions/${sub.body.subscription.id}/poll`);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.intents));
});

// ── Topics ─────────────────────────────────────────────────────────────────────
test('GET /api/topics returns topic list', async () => {
  const r = await get('/api/topics');
  assert.equal(r.status, 200);
  assert.ok('topics' in r.body);
});

// ── Stats ──────────────────────────────────────────────────────────────────────
test('GET /api/stats returns stats', async () => {
  const r = await get('/api/stats');
  assert.equal(r.status, 200);
  assert.ok('totals' in r.body);
  assert.ok('byStatus' in r.body);
  assert.ok('byType' in r.body);
});

// ── Ready ──────────────────────────────────────────────────────────────────────
test('GET /ready returns ready', async () => {
  const r = await get('/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
});
