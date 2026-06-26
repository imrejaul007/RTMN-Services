/**
 * Industry Twin Unit Tests (ESM)
 *
 * Tests all endpoints of the Industry Twin service.
 * Run: node --test tests/unit/industry-twin.test.mjs
 */

// Set env vars BEFORE importing the service
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token-it';
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = (await import(resolve(__dirname, '../../src/index.js'))).default;

const TOKEN = 'dev-token-it';
const PORT = 4894;
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
    assert.strictEqual(res.body.service, 'industry-twin');
    assert.strictEqual(res.body.port, 4893);
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
    assert.ok(res.body.timestamp);
  });
});

// ============================================================
// INDUSTRY ENDPOINTS
// ============================================================
describe('Industry Endpoints', () => {
  it('GET /api/industries -> 200 (list all)', async () => {
    const res = await req('GET', '/api/industries');
    assert.strictEqual(res.status, 200);
    const industries = res.body.industries;
    assert.ok(Array.isArray(industries));
    assert.strictEqual(industries.length, 4);
    const ids = industries.map(i => i.id).sort();
    assert.deepStrictEqual(ids, ['healthcare', 'hotel', 'restaurant', 'retail']);
  });

  it('GET /api/industries -> correct structure', async () => {
    const res = await req('GET', '/api/industries');
    const ind = res.body.industries[0];
    assert.ok(ind.id);
    assert.ok(ind.name);
    assert.ok(typeof ind.vertCount === 'number');
    assert.ok(Array.isArray(ind.segments));
    assert.ok(typeof ind.aiAgents === 'number');
  });

  it('GET /api/industries/restaurant -> 200', async () => {
    const res = await req('GET', '/api/industries/restaurant');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'restaurant');
    assert.strictEqual(res.body.name, 'Restaurant');
    assert.ok(res.body.segments.includes('fast food'));
    assert.strictEqual(res.body.aiAgents, 15);
  });

  it('GET /api/industries/hotel -> 200', async () => {
    const res = await req('GET', '/api/industries/hotel');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'hotel');
    assert.ok(res.body.segments.includes('luxury'));
  });

  it('GET /api/industries/healthcare -> 200', async () => {
    const res = await req('GET', '/api/industries/healthcare');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.aiAgents, 18);
  });

  it('GET /api/industries/retail -> 200', async () => {
    const res = await req('GET', '/api/industries/retail');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.segments.includes('ecommerce'));
  });

  it('GET /api/industries/:id -> 404 (not found)', async () => {
    const res = await req('GET', '/api/industries/does-not-exist');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});

// ============================================================
// AUTH GUARD
// ============================================================
describe('Auth Guard', () => {
  it('rejects requests without token', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'GET',
        hostname: 'localhost',
        port: PORT,
        path: '/health',
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
    assert.strictEqual(res.status, 401);
  });
});
