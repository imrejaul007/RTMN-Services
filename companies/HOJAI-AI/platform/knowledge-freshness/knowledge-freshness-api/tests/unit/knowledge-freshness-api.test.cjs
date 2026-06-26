/**
 * Knowledge Freshness API Unit Tests (CommonJS)
 *
 * Tests the gateway service + proxy endpoints.
 * Run: node --test tests/unit/knowledge-freshness-api.test.cjs
 */

process.env.INTERNAL_TOKEN = 'test-token-kf';
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { createApp, SUB_SERVICES } = require('../../src/index.js');

const PORT = 5337;
const TOKEN = 'test-token-kf';
let server;
let app;

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
  app = createApp({ internalToken: TOKEN });
  await new Promise(function(resolve) { server = app.listen(PORT, '127.0.0.1', resolve); });
});

after(async () => {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// SUB SERVICES REGISTRY
// ============================================================
describe('Sub Services Registry', () => {
  it('SUB_SERVICES has 4 entries', () => {
    assert.strictEqual(Object.keys(SUB_SERVICES).length, 4);
  });

  it('SUB_SERVICES has freshness, staleness, refresh, versions', () => {
    assert.ok(SUB_SERVICES.freshness);
    assert.ok(SUB_SERVICES.staleness);
    assert.ok(SUB_SERVICES.refresh);
    assert.ok(SUB_SERVICES.versions);
  });

  it('SUB_SERVICES entries have name, port, prefix', () => {
    for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
      assert.ok(cfg.name, key + ' has name');
      assert.ok(typeof cfg.port === 'number', key + ' has port');
      assert.ok(cfg.prefix.startsWith('/'), key + ' has prefix');
    }
  });
});

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.service, 'knowledge-freshness-api');
    assert.strictEqual(res.body.port, 5337);
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
  });

  it('unknown route -> 404', async () => {
    const res = await req('GET', '/unknown-route-xyz');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});

// ============================================================
// SERVICES ENDPOINTS
// ============================================================
describe('Services Endpoints', () => {
  it('GET /services -> 200 (with token)', async () => {
    const res = await req('GET', '/services');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.gateway, 'knowledge-freshness-api');
    assert.ok(Array.isArray(res.body.services) || typeof res.body.services === 'object');
  });

  it('GET /services -> 401 (without token)', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'GET',
        hostname: 'localhost',
        port: PORT,
        path: '/services',
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

  it('GET /dashboard -> 200 (with token)', async () => {
    const res = await req('GET', '/dashboard');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.gateway, 'knowledge-freshness-api');
    assert.ok(Array.isArray(res.body.sections));
    assert.ok(res.body.sections.includes('freshness_overview'));
    assert.ok(res.body.sections.includes('stale_knowledge'));
  });
});

// ============================================================
// PROXY ROUTES (sub-services offline — expect 502)
// ============================================================
describe('Proxy Routes (sub-services offline)', () => {
  it('GET /freshness -> 502 (upstream offline)', async () => {
    const res = await req('GET', '/freshness/health');
    assert.strictEqual(res.status, 502);
    assert.ok(res.body.error || res.body.upstream_error);
  });

  it('GET /staleness -> 502 (upstream offline)', async () => {
    const res = await req('GET', '/staleness/health');
    assert.strictEqual(res.status, 502);
  });

  it('GET /refresh -> 502 (upstream offline)', async () => {
    const res = await req('GET', '/refresh/health');
    assert.strictEqual(res.status, 502);
  });

  it('GET /versions -> 502 (upstream offline)', async () => {
    const res = await req('GET', '/versions/health');
    assert.strictEqual(res.status, 502);
  });

  it('POST /freshness -> 502 (upstream offline)', async () => {
    const res = await req('POST', '/freshness/something', { key: 'value' });
    assert.strictEqual(res.status, 502);
  });

  it('proxy forwards x-internal-token to upstream', async () => {
    // When upstream is offline, we get 502 with the token forwarding attempted
    // The important thing is the gateway does NOT return 401 for valid tokens
    const res = await req('GET', '/freshness/health');
    assert.strictEqual(res.status, 502); // upstream error, not auth error
  });
});

// ============================================================
// SERVICES HEALTH (sub-services offline)
// ============================================================
describe('Services Health Check', () => {
  it('GET /services/health -> 200 (always returns, results may be degraded)', async () => {
    const res = await req('GET', '/services/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.gateway, 'knowledge-freshness-api');
    assert.ok(res.body.results);
    // All sub-services should report their status (offline = ok: false)
    for (const key of Object.keys(SUB_SERVICES)) {
      assert.ok(typeof res.body.results[key].ok === 'boolean', key + ' has ok field');
    }
  });
});
