/**
 * behavior-intelligence - Node.js test suite
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

process.env.BEHAVIOR_INTELLIGENCE_NO_LISTEN = '1';
process.env.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const { app, getUserProfile, detectAnomalies, computeFunnel } = require('../../src/index');

let server, baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => { server.close(); });

function httpReq(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

test('computeFunnel returns structure even with no events', () => {
  const f = computeFunnel(['a', 'b'], new Map());
  assert.strictEqual(f.length, 2);
  assert.strictEqual(f[0].conversionFromFirst, 0);
});

test('computeFunnel handles empty steps', () => {
  const f = computeFunnel([], new Map());
  assert.strictEqual(f.length, 0);
});

test('detectAnomalies returns structure', () => {
  const r = detectAnomalies(60000, new Map());
  assert.strictEqual(r.windowMs, 60000);
  assert.ok(Array.isArray(r.anomalies));
});

test('getUserProfile returns 0 events for unknown user', () => {
  const p = getUserProfile('unknown-user', new Map());
  assert.strictEqual(p.userId, 'unknown-user');
  assert.strictEqual(p.totalEvents, 0);
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

test('GET /health returns healthy', async () => {
  const r = await httpReq('GET', '/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'healthy');
});

test('GET /api/health returns service info', async () => {
  const r = await httpReq('GET', '/api/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.service, 'behavior-intelligence');
});

test('GET /ready returns ready', async () => {
  const r = await httpReq('GET', '/ready');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ready, true);
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

test('POST /api/behavior/event rejects missing userId (400)', async () => {
  const r = await httpReq('POST', '/api/behavior/event', { event: 'click' });
  assert.strictEqual(r.status, 400);
});

test('POST /api/behavior/event rejects missing event (400)', async () => {
  const r = await httpReq('POST', '/api/behavior/event', { userId: 'u1' });
  assert.strictEqual(r.status, 400);
});

test('POST /api/behavior/event creates event (201)', async () => {
  const r = await httpReq('POST', '/api/behavior/event', { userId: 'u1', event: 'click' });
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.userId, 'u1');
  assert.strictEqual(r.body.event, 'click');
});

test('GET /api/behavior/events lists events', async () => {
  const r = await httpReq('GET', '/api/behavior/events');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.events));
  assert.ok(r.body.count >= 1);
});

test('GET /api/behavior/events filters by userId', async () => {
  const r = await httpReq('GET', '/api/behavior/events?userId=u1');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.events.every(e => e.userId === 'u1'));
});

test('GET /api/behavior/user/:userId returns profile', async () => {
  const r = await httpReq('GET', '/api/behavior/user/u1');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.userId, 'u1');
  assert.ok(r.body.totalEvents >= 1);
});

test('GET /api/behavior/user/:userId 404 for unknown', async () => {
  const r = await httpReq('GET', '/api/behavior/user/zzz-no-such-user');
  assert.strictEqual(r.status, 404);
});

test('GET /api/behavior/anomalies returns anomalies', async () => {
  const r = await httpReq('GET', '/api/behavior/anomalies');
  assert.strictEqual(r.status, 200);
  assert.ok('anomalies' in r.body);
});

test('POST /api/behavior/funnel rejects empty steps (400)', async () => {
  const r = await httpReq('POST', '/api/behavior/funnel', {});
  assert.strictEqual(r.status, 400);
});

test('POST /api/behavior/funnel returns funnel', async () => {
  const r = await httpReq('POST', '/api/behavior/funnel', { steps: ['click', 'purchase', 'signup'] });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.funnel.length, 3);
  assert.strictEqual(r.body.count, 3);
});

test('GET /api/behavior/audit returns audit entries', async () => {
  const r = await httpReq('GET', '/api/behavior/audit');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.entries));
});
