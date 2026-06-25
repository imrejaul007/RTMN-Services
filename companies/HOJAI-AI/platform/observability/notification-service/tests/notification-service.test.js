/**
 * notification-service tests
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let baseUrl, server;
const INTERNAL_TOKEN = 'notification-internal-token';
const headers = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };

function startServer(theApp, port) {
  return new Promise(resolve => {
    const s = theApp.listen(port, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}

let app;

before(async () => {
  process.env.DATA_DIR = '/tmp/notification-test-' + Date.now();
  process.env.INTERNAL_TOKEN = INTERNAL_TOKEN;
  process.env.PORT = '0';
  const mod = await import(`../src/index.js?t=${Date.now()}`);
  app = mod.app;
  if (mod.resetState) mod.resetState(); // clear any leftover state
  const result = await startServer(app, 0);
  server = result.server;
  baseUrl = `http://127.0.0.1:${result.port}`;
});

after(() => { if (server) server.close(); });

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function put(path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}
async function del(path) {
  const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
  return { status: res.status, body: await res.json() };
}

// ── Health ────────────────────────────────────────────────────────────────────
test('GET /health returns healthy', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.ok(r.body.counts);
});

// ── Notifications ───────────────────────────────────────────────────────────────
test('POST /api/notifications/send requires auth', async () => {
  const r = await fetch(`${baseUrl}/api/notifications/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', body: 'hello' }),
  });
  assert.equal(r.status, 401);
});

test('POST /api/notifications/send creates notification', async () => {
  const r = await post('/api/notifications/send', { channel: 'email', subject: 'Test', body: 'Hello {{name}}', data: { name: 'Alice' }, recipientId: 'user-x' });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.equal(r.body.channel, 'email');
});

test('POST /api/notifications/send with template merges variables', async () => {
  const r = await post('/api/notifications/send', { channel: 'email', templateId: 'tmpl-1', data: { name: 'Bob', email: 'bob@test.com' }, recipientId: 'user-y' });
  assert.equal(r.status, 201);
  assert.ok(r.body.body.includes('Bob'));
});

test('POST /api/notifications/send requires channel', async () => {
  const r = await post('/api/notifications/send', { body: 'hello' });
  assert.equal(r.status, 400);
});

test('GET /api/notifications lists notifications', async () => {
  const r = await get('/api/notifications');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.notifications));
});

test('GET /api/notifications/:id returns notification', async () => {
  const send = await post('/api/notifications/send', { channel: 'inapp', body: 'test', recipientId: 'user-z' });
  const r = await get(`/api/notifications/${send.body.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, send.body.id);
});

test('GET /api/notifications/:id 404 for unknown', async () => {
  const r = await get('/api/notifications/no-such-id');
  assert.equal(r.status, 404);
});

test('POST /api/notifications/:id/read marks read', async () => {
  const send = await post('/api/notifications/send', { channel: 'inapp', body: 'test', recipientId: 'user-a' });
  const r = await post(`/api/notifications/${send.body.id}/read`, {});
  assert.equal(r.status, 200);
  assert.ok(r.body.readAt);
});

test('POST /api/notifications/read-all marks all read', async () => {
  const r = await post('/api/notifications/read-all', { recipientId: 'user-b' });
  assert.equal(r.status, 200);
  assert.ok(r.body.message);
});

test('DELETE /api/notifications/:id deletes', async () => {
  const send = await post('/api/notifications/send', { channel: 'sms', body: 'to-delete', recipientId: 'user-c' });
  const r = await del(`/api/notifications/${send.body.id}`);
  assert.equal(r.status, 200);
});

test('POST /api/notifications/bulk creates many', async () => {
  const r = await post('/api/notifications/bulk', { notifications: [
    { channel: 'email', body: 'bulk 1', recipientId: 'u1' },
    { channel: 'email', body: 'bulk 2', recipientId: 'u2' },
  ]});
  assert.equal(r.status, 201);
  assert.equal(r.body.notifications.length, 2);
});

// ── Templates ──────────────────────────────────────────────────────────────────
test('GET /api/templates lists templates', async () => {
  const r = await get('/api/templates');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.templates));
  assert.ok(r.body.templates.length >= 5); // seeded
});

test('GET /api/templates/:id returns template', async () => {
  const r = await get('/api/templates/tmpl-1');
  assert.equal(r.status, 200);
  assert.equal(r.body.id, 'tmpl-1');
});

test('POST /api/templates creates template', async () => {
  const r = await post('/api/templates', { name: 'Test Tpl', type: 'email', subject: 'Hi', body: 'Hello {{name}}' });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.deepEqual(r.body.variables, ['name']);
});

test('PUT /api/templates/:id updates template (seeded)', async () => {
  // Use seeded tmpl-1 — always exists
  const r = await put('/api/templates/tmpl-1', { name: 'Updated Welcome' });
  assert.equal(r.status, 200);
  assert.equal(r.body.name, 'Updated Welcome');
});

test('DELETE /api/templates/:id deletes template', async () => {
  const r = await post('/api/templates', { name: 'To Delete', type: 'email', body: 'Hi' });
  const d = await del(`/api/templates/${r.body.id}`);
  assert.equal(d.status, 200);
});

test('POST /api/templates/:id/preview interpolates', async () => {
  const r = await post('/api/templates/tmpl-1/preview', { data: { name: 'Test', email: 'x@y.com' } });
  assert.equal(r.status, 200);
  assert.ok(r.body.preview.body);
});

// ── Subscriptions ──────────────────────────────────────────────────────────────
test('GET /api/subscriptions lists subscriptions', async () => {
  const r = await get('/api/subscriptions');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.subscriptions));
});

test('POST /api/subscriptions creates subscription', async () => {
  const r = await post('/api/subscriptions', { userId: 'new-user', email: 'new@example.com', channels: ['email'] });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
});

test('PUT /api/subscriptions/:id updates subscription (seeded)', async () => {
  // Use seeded sub-1 — always exists
  const r = await put('/api/subscriptions/sub-1', { channels: ['sms', 'email'] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.channels, ['sms', 'email']);
});

// ── Channels ───────────────────────────────────────────────────────────────────
test('GET /api/channels lists channels', async () => {
  const r = await get('/api/channels');
  assert.equal(r.status, 200);
  assert.ok(r.body.channels.email);
  assert.ok(r.body.channels.sms);
  assert.ok(r.body.channels.push);
});

test('PUT /api/channels/:channel updates status', async () => {
  const r = await put('/api/channels/email', { status: 'maintenance' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'maintenance');
});

test('POST /api/channels/:channel/test returns test result', async () => {
  const r = await post('/api/channels/sms/test', { recipient: '+1234567890', testMessage: 'ping' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'sent');
});

// ── Statistics ─────────────────────────────────────────────────────────────────
test('GET /api/statistics returns stats', async () => {
  const r = await get('/api/statistics');
  assert.equal(r.status, 200);
  assert.ok('total' in r.body);
  assert.ok('byChannel' in r.body);
  assert.ok('deliveryRate' in r.body);
});

// ── Ready ──────────────────────────────────────────────────────────────────────
test('GET /ready returns ready', async () => {
  const r = await get('/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
});
