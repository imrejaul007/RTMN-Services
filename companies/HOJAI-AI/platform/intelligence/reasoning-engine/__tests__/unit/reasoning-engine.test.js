/**
 * reasoning-engine - Node.js test suite
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

process.env.REASONING_ENGINE_NO_LISTEN = '1';
process.env.REASONING_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const { app, decompose, STRATEGIES } = require('../../src/index');

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
// Exports
// ---------------------------------------------------------------------------

test('exports authOrBypass + flags', () => {
  assert.strictEqual(typeof app.authOrBypass, 'function');
  assert.strictEqual(app.SERVICE_NAME, 'reasoning-engine');
  assert.strictEqual(app.REASONING_ENGINE_NO_LISTEN, true);
});

test('exports STRATEGIES with 3 strategies', () => {
  assert.strictEqual(Object.keys(STRATEGIES).length, 3);
  assert.ok(STRATEGIES.deductive);
  assert.ok(STRATEGIES.inductive);
  assert.ok(STRATEGIES.abductive);
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

test('decompose splits on punctuation', () => {
  const steps = decompose('Apples are red. Bananas are yellow. So fruits have colors.', 'deductive');
  assert.ok(steps.length >= 2);
  steps.forEach(s => assert.ok(s.confidence > 0));
});

test('decompose handles single sentence', () => {
  const steps = decompose('just one statement', 'inductive');
  assert.strictEqual(steps.length, 1);
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
  assert.strictEqual(r.body.service, 'reasoning-engine');
});

test('GET /ready returns ready', async () => {
  const r = await httpReq('GET', '/ready');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ready, true);
});

// ---------------------------------------------------------------------------
// Reason validation
// ---------------------------------------------------------------------------

test('POST /api/reason rejects missing query (400)', async () => {
  const r = await httpReq('POST', '/api/reason', { strategy: 'deductive' });
  assert.strictEqual(r.status, 400);
});

test('POST /api/reason rejects unknown strategy (400)', async () => {
  const r = await httpReq('POST', '/api/reason', { query: 'test', strategy: 'galactic' });
  assert.strictEqual(r.status, 400);
});

// ---------------------------------------------------------------------------
// Reason happy path
// ---------------------------------------------------------------------------

test('POST /api/reason creates run (201)', async () => {
  const r = await httpReq('POST', '/api/reason', {
    query: 'All men are mortal. Socrates is a man. Therefore?', strategy: 'deductive'
  });
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.ok(r.body.steps.length > 0);
  assert.ok(r.body.confidence > 0);
});

test('GET /api/reason lists runs', async () => {
  const r = await httpReq('GET', '/api/reason');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.runs));
  assert.ok(r.body.count >= 1);
});

test('GET /api/reason/:id 404 for missing', async () => {
  const r = await httpReq('GET', '/api/reason/missing-id');
  assert.strictEqual(r.status, 404);
});

test('GET /api/reason/templates returns 3 strategies', async () => {
  const r = await httpReq('GET', '/api/reason/templates');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.strategies.length, 3);
});

test('GET /api/reason/audit returns audit entries', async () => {
  const r = await httpReq('GET', '/api/reason/audit');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.entries));
});

test('DELETE /api/reason/:id 404 for missing', async () => {
  const r = await httpReq('DELETE', '/api/reason/missing-id');
  assert.strictEqual(r.status, 404);
});

test('POST /api/reason all 3 strategies work', async () => {
  for (const s of ['deductive', 'inductive', 'abductive']) {
    const r = await httpReq('POST', '/api/reason', { query: 'Test query.', strategy: s });
    assert.strictEqual(r.status, 201, `${s} should succeed`);
    assert.strictEqual(r.body.strategy, s);
  }
});
