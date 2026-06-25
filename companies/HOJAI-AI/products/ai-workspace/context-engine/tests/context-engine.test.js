/**
 * context-engine - Node.js test suite
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

process.env.NODE_ENV = 'test';

const INTERNAL_TOKEN = 'context-engine-internal-token';

const { app, SPAN_KINDS, LOG_LEVELS, generateTraceId, generateSpanId } = require('../src/index');

let server, baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => { server.close(); });

function httpReq(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers } };
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

function auth(h = {}) { return { 'x-internal-token': INTERNAL_TOKEN, ...h }; }

// ---------------------------------------------------------------------------
// Exports & helpers
// ---------------------------------------------------------------------------

test('SPAN_KINDS has 5 kinds', () => {
  assert.strictEqual(SPAN_KINDS.length, 5);
  assert.ok(SPAN_KINDS.includes('server'));
  assert.ok(SPAN_KINDS.includes('client'));
});

test('LOG_LEVELS has 4 levels', () => {
  assert.strictEqual(LOG_LEVELS.length, 4);
  assert.ok(LOG_LEVELS.includes('info'));
  assert.ok(LOG_LEVELS.includes('error'));
});

test('generateTraceId returns 32 hex chars', () => {
  const id = generateTraceId();
  assert.strictEqual(id.length, 32);
  assert.ok(/^[0-9a-f]{32}$/.test(id));
});

test('generateSpanId returns 16 hex chars', () => {
  const id = generateSpanId();
  assert.strictEqual(id.length, 16);
  assert.ok(/^[0-9a-f]{16}$/.test(id));
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
  assert.strictEqual(r.body.service, 'context-engine');
  assert.ok('contexts' in r.body);
  assert.ok('traces' in r.body);
});

test('GET /ready returns ready', async () => {
  const r = await httpReq('GET', '/ready');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ready, true);
});

// ---------------------------------------------------------------------------
// Context CRUD
// ---------------------------------------------------------------------------

test('GET /api/contexts lists contexts (seeded)', async () => {
  const r = await httpReq('GET', '/api/contexts');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.contexts.length >= 1);
});

test('POST /api/contexts requires auth', async () => {
  const r = await httpReq('POST', '/api/contexts', { principal: 'test' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/contexts creates context', async () => {
  const r = await httpReq('POST', '/api/contexts', { principal: 'test-user', tenantId: 'test-tenant', attributes: { 'env': 'test' } }, auth());
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.principal, 'test-user');
  assert.strictEqual(r.body.tenantId, 'test-tenant');
  assert.strictEqual(r.body.status, 'active');
  assert.ok(Array.isArray(r.body.spans));
  assert.ok(Array.isArray(r.body.logs));
});

test('GET /api/contexts/:id returns context', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'lookup-test' }, auth());
  const r = await httpReq('GET', `/api/contexts/${create.body.id}`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.id, create.body.id);
});

test('GET /api/contexts/:id 404 for unknown', async () => {
  const r = await httpReq('GET', '/api/contexts/no-such-context-id');
  assert.strictEqual(r.status, 404);
});

test('PATCH /api/contexts/:id requires auth', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'patch-test' }, auth());
  const r = await httpReq('PATCH', `/api/contexts/${create.body.id}`, { status: 'ended' });
  assert.strictEqual(r.status, 401);
});

test('PATCH /api/contexts/:id updates context', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'patch-test' }, auth());
  const r = await httpReq('PATCH', `/api/contexts/${create.body.id}`, { attributes: { 'patched': 'yes' } }, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.attributes.patched, 'yes');
});

test('PATCH /api/contexts/:id ends context', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'end-test' }, auth());
  const r = await httpReq('PATCH', `/api/contexts/${create.body.id}`, { status: 'ended' }, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'ended');
  assert.ok(r.body.endedAt);
});

test('PATCH /api/contexts/:id invalid status (400)', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'invalid-status' }, auth());
  const r = await httpReq('PATCH', `/api/contexts/${create.body.id}`, { status: 'flibbertigibbet' }, auth());
  assert.strictEqual(r.status, 400);
});

test('DELETE /api/contexts/:id requires auth', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'del-test' }, auth());
  const r = await httpReq('DELETE', `/api/contexts/${create.body.id}`);
  assert.strictEqual(r.status, 401);
});

test('DELETE /api/contexts/:id marks deleted', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'del-test' }, auth());
  const r = await httpReq('DELETE', `/api/contexts/${create.body.id}`, undefined, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.deleted, true);
});

// ---------------------------------------------------------------------------
// Spans
// ---------------------------------------------------------------------------

test('POST /api/contexts/:id/spans requires auth', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'span-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { name: 'test-span' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/contexts/:id/spans creates span', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'span-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { name: 'my-span', kind: 'client' }, auth());
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.name, 'my-span');
  assert.strictEqual(r.body.kind, 'client');
  assert.strictEqual(r.body.status, 'ok');
});

test('POST /api/contexts/:id/spans 409 for ended context', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'ended-span' }, auth());
  await httpReq('PATCH', `/api/contexts/${create.body.id}`, { status: 'ended' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { name: 'late-span' }, auth());
  assert.strictEqual(r.status, 409);
});

test('POST /api/contexts/:id/spans rejects missing name (400)', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'span-name-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { kind: 'server' }, auth());
  assert.strictEqual(r.status, 400);
});

test('POST /api/contexts/:id/spans rejects invalid kind (400)', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'span-kind-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { name: 'span', kind: 'galactic' }, auth());
  assert.strictEqual(r.status, 400);
});

test('GET /api/contexts/:id/spans returns tree + flat', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'tree-test' }, auth());
  await httpReq('POST', `/api/contexts/${create.body.id}/spans`, { name: 'root', kind: 'server' }, auth());
  const r = await httpReq('GET', `/api/contexts/${create.body.id}/spans`);
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.tree));
  assert.ok(Array.isArray(r.body.flat));
  assert.ok('traceId' in r.body);
});

test('GET /api/contexts/:id/timeline returns chronological spans', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'timeline-test' }, auth());
  const r = await httpReq('GET', `/api/contexts/${create.body.id}/timeline`);
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.entries));
});

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

test('POST /api/contexts/:id/logs requires auth', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'log-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/logs`, { message: 'hello' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/contexts/:id/logs creates log', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'log-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/logs`, { message: 'Test log entry', level: 'info' }, auth());
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.message, 'Test log entry');
  assert.strictEqual(r.body.level, 'info');
});

test('POST /api/contexts/:id/logs rejects missing message (400)', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'log-msg-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/logs`, { level: 'info' }, auth());
  assert.strictEqual(r.status, 400);
});

test('POST /api/contexts/:id/logs rejects invalid level (400)', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'log-level-test' }, auth());
  const r = await httpReq('POST', `/api/contexts/${create.body.id}/logs`, { message: 'test', level: 'verbose' }, auth());
  assert.strictEqual(r.status, 400);
});

test('GET /api/contexts/:id/logs returns logs', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'log-get-test' }, auth());
  await httpReq('POST', `/api/contexts/${create.body.id}/logs`, { message: 'log1', level: 'info' }, auth());
  const r = await httpReq('GET', `/api/contexts/${create.body.id}/logs`);
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.logs));
  assert.ok(r.body.count >= 1);
});

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

test('POST /api/contexts/lookup requires auth', async () => {
  const r = await httpReq('POST', '/api/contexts/lookup', { principal: 'test' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/contexts/lookup by principal', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'lookup-principal', tenantId: 'tenant-xyz' }, auth());
  const r = await httpReq('POST', '/api/contexts/lookup', { principal: 'lookup-principal' }, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.count, 1);
});

test('POST /api/contexts/lookup by traceId', async () => {
  const create = await httpReq('POST', '/api/contexts', { principal: 'lookup-trace', tenantId: 'tenant-abc' }, auth());
  const traceId = create.body.traceId;
  const r = await httpReq('POST', '/api/contexts/lookup', { traceId }, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.id, create.body.id);
});

test('POST /api/contexts/lookup 404 for unknown trace', async () => {
  const r = await httpReq('POST', '/api/contexts/lookup', { traceId: '0'.repeat(32) }, auth());
  assert.strictEqual(r.status, 404);
});

test('POST /api/contexts/lookup 400 without params', async () => {
  const r = await httpReq('POST', '/api/contexts/lookup', {}, auth());
  assert.strictEqual(r.status, 400);
});

// ---------------------------------------------------------------------------
// Propagation
// ---------------------------------------------------------------------------

test('POST /api/contexts/propagate requires auth', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: '00-00000000000000000000000000000000-0000000000000000-01' });
  assert.strictEqual(r.status, 401);
});

test('POST /api/contexts/propagate validates traceparent format', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: 'bad' }, auth());
  assert.strictEqual(r.status, 400);
});

test('POST /api/contexts/propagate rejects bad traceId length', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: '00-1234-0000000000000000-01' }, auth());
  assert.strictEqual(r.status, 400);
});

test('POST /api/contexts/propagate rejects bad spanId length', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: '00-' + 'a'.repeat(32) + '-abcd-01' }, auth());
  assert.strictEqual(r.status, 400);
});

test('POST /api/contexts/propagate parses valid traceparent', async () => {
  const traceId = 'a'.repeat(32);
  const spanId = 'b'.repeat(16);
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: `00-${traceId}-${spanId}-01` }, auth());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.traceId, traceId);
  assert.strictEqual(r.body.parentSpanId, spanId);
  assert.strictEqual(r.body.flags, '01');
});

test('POST /api/contexts/propagate marks sampled=true for flag 01', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate', { traceparent: `00-${'c'.repeat(32)}-${'d'.repeat(16)}-01` }, auth());
  assert.strictEqual(r.body.sampled, true);
});

test('POST /api/contexts/propagate parses tracestate', async () => {
  const r = await httpReq('POST', '/api/contexts/propagate',
    { traceparent: `00-${'e'.repeat(32)}-${'f'.repeat(16)}-00`, tracestate: 'tenant=acme,env=prod' }, auth());
  assert.strictEqual(r.body.tracestate.tenant, 'acme');
  assert.strictEqual(r.body.tracestate.env, 'prod');
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

test('GET /api/audit returns audit entries', async () => {
  const r = await httpReq('GET', '/api/audit');
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.body.entries));
  assert.ok(r.body.count >= 1);
});

test('GET /api/audit supports limit', async () => {
  const r = await httpReq('GET', '/api/audit?limit=5');
  assert.strictEqual(r.status, 200);
});
