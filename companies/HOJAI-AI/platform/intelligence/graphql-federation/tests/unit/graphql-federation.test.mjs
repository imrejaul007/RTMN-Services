/**
 * GraphQL Federation Unit Tests (ESM)
 *
 * Tests all endpoints of the GraphQL Federation Gateway.
 * Run: node --test tests/unit/graphql-federation.test.mjs
 */

// Set env vars BEFORE importing the service
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token-gf';
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = (await import(resolve(__dirname, '../../src/index.js'))).default;

const TOKEN = 'dev-token-gf';
const PORT = 4001;
let server;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, 'http://localhost:' + PORT);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: PORT,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', 'x-internal-token': TOKEN, ...(extraHeaders || {}) },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, function(res) {
      let chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() {
        let parsed;
        try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  await new Promise(function(resolve) { server = app.listen(PORT, '127.0.0.1', resolve); });
});

after(async () => {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'GraphQL');
    assert.strictEqual(res.body.port, 4000);
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
    assert.ok(res.body.timestamp);
  });
});

// ============================================================
// GRAPHQL GET
// ============================================================
describe('GraphQL GET', () => {
  it('GET /graphql?q={hello} -> 200', async () => {
    const res = await req('GET', '/graphql?q=%7Bhello%7D');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data);
    assert.strictEqual(res.body.data.hello, 'RTMN GraphQL Federation Gateway');
  });

  it('GET /graphql?q={status} -> 200', async () => {
    const res = await req('GET', '/graphql?q=%7Bstatus%7D');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'operational');
  });

  it('GET /graphql?q={services{id name status port}} -> 200', async () => {
    const q = encodeURIComponent('{services{id name status port}}');
    const res = await req('GET', '/graphql?q=' + q);
    assert.strictEqual(res.status, 200);
    const services = res.body.data.services;
    assert.ok(Array.isArray(services));
    assert.strictEqual(services.length, 3);
    services.forEach(s => {
      assert.ok(s.id);
      assert.ok(s.name);
      assert.ok(s.status);
      assert.strictEqual(typeof s.port, 'number');
    });
  });

  it('GET /graphql (no query) uses default {hello}', async () => {
    const res = await req('GET', '/graphql');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hello, 'RTMN GraphQL Federation Gateway');
  });
});

// ============================================================
// GRAPHQL POST
// ============================================================
describe('GraphQL POST', () => {
  it('POST /graphql with query -> 200', async () => {
    const res = await req('POST', '/graphql', { query: '{ hello }' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hello, 'RTMN GraphQL Federation Gateway');
  });

  it('POST /graphql with variables -> 200', async () => {
    const res = await req('POST', '/graphql', {
      query: 'query { status }',
      variables: {}
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'operational');
  });

  it('POST /graphql with fragment -> 200', async () => {
    const q = 'query { services { ...Svc } } fragment Svc on Service { id name }';
    const res = await req('POST', '/graphql', { query: q });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data.services));
  });

  it('POST /graphql with syntax error -> 200 (GraphQL errors)', async () => {
    const res = await req('POST', '/graphql', { query: '{ invalid syntax  }' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.errors);
    assert.ok(res.body.errors.length > 0);
  });
});

// ============================================================
// AUTH GUARD
// ============================================================
describe('Auth Guard', () => {
  it('POST /graphql rejects requests without token', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'POST',
        hostname: 'localhost',
        port: PORT,
        path: '/graphql',
        headers: { 'Content-Type': 'application/json' },
      };
      const r = http.request(opts, function(res) {
        let chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      r.write(JSON.stringify({ query: '{ hello }' }));
      r.end();
    });
    assert.strictEqual(res.status, 401);
  });

  it('GET /graphql is accessible without token (no auth on GET)', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'GET',
        hostname: 'localhost',
        port: PORT,
        path: '/graphql?q=%7Bhello%7D',
        headers: { 'Content-Type': 'application/json' },
      };
      const r = http.request(opts, function(res) {
        let chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      r.end();
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.hello, 'RTMN GraphQL Federation Gateway');
  });
});
