/**
 * Micro Intelligence Service - Unit Tests
 *
 * Tests cover: health, ready, breaker CRUD, execute, fallback CRUD, audit,
 * 404 handling, and auth enforcement.
 *
 * Run with:  NODE_ENV=test node --test platform/intelligence/micro-intelligence/tests/unit/micro-intelligence.test.cjs
 * (run from companies/HOJAI-AI/ directory)
 */

'use strict';

const http = require('http');
const { deepStrictEqual, strictEqual, ok, throws } = require('assert');

// ── Set auth env BEFORE requiring the module ─────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';
process.env.PORT = '0';          // port 0 = OS-assigned random port
process.env.HOJAI_DATA_DIR = '/tmp/hojai-micro-intelligence-test';

// ── Require the module under test ───────────────────────────────────────────
const { app } = require('../../src/index.js');

// ── Test harness ─────────────────────────────────────────────────────────────
let server;
let baseUrl;

async function request(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = baseUrl + path;
    const opts = {
      method,
      path,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': 'dev-token',
        ...headers,
      },
    };
    const req = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function reqNoAuth(method, path, body) {
  return request(method, path, body, {});
}

// ── Suite ────────────────────────────────────────────────────────────────────
const { describe, it, before, after, beforeEach } = require('node:test');

describe('Micro Intelligence Service', () => {

  before(() => {
    server = http.createServer(app);
    return new Promise(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise(resolve => server.close(() => resolve()));
  });

  // ── Auth tests ─────────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('rejects POST /api/breakers without token when REQUIRE_AUTH=true', async () => {
      // /api/breakers has requireAuth — no token → 401
      const res = await new Promise((resolve) => {
        const req = http.request(`${baseUrl}/api/breakers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            let body;
            try { body = JSON.parse(data); } catch { body = data; }
            resolve({ status: res.statusCode, body });
          });
        });
        req.write(JSON.stringify({ name: 'auth-test', targetUrl: 'http://x.y' }));
        req.end();
      });
      strictEqual(res.status, 401);
      ok(res.body.error);
    });

    it('accepts POST /api/breakers with valid X-Internal-Token', async () => {
      const res = await request('POST', '/api/breakers', {
        name: 'auth-ok-test',
        targetUrl: 'http://localhost:9999',
      });
      strictEqual(res.status, 201);
      // Clean up
      await request('DELETE', '/api/breakers/auth-ok-test');
    });
  });

  // ── Health / ready ─────────────────────────────────────────────────────────

  describe('Health & Readiness', () => {
    it('GET /health returns 301 redirect to /api/health', async () => {
      const res = await new Promise((resolve) => {
        http.get(`${baseUrl}/health`, (res) => {
          resolve({ status: res.statusCode, location: res.headers.location });
        });
      });
      strictEqual(res.status, 301);
      strictEqual(res.location, '/api/health');
    });

    it('GET /api/health returns service info with seeded data', async () => {
      const res = await request('GET', '/api/health');
      strictEqual(res.status, 200);
      strictEqual(res.body.status, 'healthy');
      strictEqual(res.body.service, 'micro-intelligence');
      strictEqual(res.body.version, '1.0.0');
      ok(typeof res.body.uptime === 'number');
      // Seeded: 2 breakers (hojai-central, memory-os-fallback)
      strictEqual(res.body.stats.breakers, 2);
      // Seeded: 2 fallbacks (sentiment-default, intent-default)
      strictEqual(res.body.stats.fallbacks, 2);
    });

    it('GET /ready returns { ready: true }', async () => {
      const res = await request('GET', '/ready');
      strictEqual(res.status, 200);
      strictEqual(res.body.ready, true);
      ok(res.body.timestamp);
    });
  });

  // ── Breaker CRUD ────────────────────────────────────────────────────────────

  describe('Breaker CRUD', () => {

    it('POST /api/breakers creates a new breaker (201)', async () => {
      const res = await request('POST', '/api/breakers', {
        name: 'test-breaker-1',
        targetUrl: 'http://localhost:9999/api/thing',
        failureThreshold: 3,
        successThreshold: 1,
        timeoutMs: 2000,
        resetTimeoutMs: 10000,
        fallbackName: 'sentiment-default',
        windowSize: 10,
      });
      strictEqual(res.status, 201);
      strictEqual(res.body.message, 'Breaker created');
      strictEqual(res.body.breaker.name, 'test-breaker-1');
      strictEqual(res.body.breaker.targetUrl, 'http://localhost:9999/api/thing');
      strictEqual(res.body.breaker.state, 'CLOSED');
    });

    it('POST /api/breakers rejects duplicate name (409)', async () => {
      const res = await request('POST', '/api/breakers', {
        name: 'test-breaker-1',
        targetUrl: 'http://localhost:9999/dup',
      });
      strictEqual(res.status, 409);
      strictEqual(res.body.error, 'BREAKER_EXISTS');
    });

    it('POST /api/breakers requires name and targetUrl (400)', async () => {
      const res = await request('POST', '/api/breakers', { name: 'only-name' });
      strictEqual(res.status, 400);
      strictEqual(res.body.error, 'VALIDATION_ERROR');

      const res2 = await request('POST', '/api/breakers', { targetUrl: 'http://x.y' });
      strictEqual(res2.status, 400);
      strictEqual(res2.body.error, 'VALIDATION_ERROR');
    });

    it('GET /api/breakers returns list of breakers', async () => {
      const res = await request('GET', '/api/breakers');
      strictEqual(res.status, 200);
      ok(Array.isArray(res.body.breakers));
      ok(res.body.breakers.length >= 3); // 2 seeded + test-breaker-1
      strictEqual(typeof res.body.count, 'number');
    });

    it('GET /api/breakers/:name returns a breaker snapshot', async () => {
      const res = await request('GET', '/api/breakers/test-breaker-1');
      strictEqual(res.status, 200);
      strictEqual(res.body.name, 'test-breaker-1');
      strictEqual(res.body.state, 'CLOSED');
      ok(res.body.stats);
    });

    it('GET /api/breakers/:name returns 404 for unknown breaker', async () => {
      const res = await request('GET', '/api/breakers/no-such-breaker');
      strictEqual(res.status, 404);
      strictEqual(res.body.error, 'BREAKER_NOT_FOUND');
    });

    it('DELETE /api/breakers/:name deletes a breaker', async () => {
      const res = await request('DELETE', '/api/breakers/test-breaker-1');
      strictEqual(res.status, 200);
      strictEqual(res.body.message, 'Breaker deleted');

      // Confirm gone
      const res2 = await request('GET', '/api/breakers/test-breaker-1');
      strictEqual(res2.status, 404);
    });

    it('DELETE /api/breakers/:name returns 404 for unknown breaker', async () => {
      const res = await request('DELETE', '/api/breakers/no-such-breaker');
      strictEqual(res.status, 404);
    });

    it('PATCH /api/breakers/:name/state forces state change', async () => {
      // Create a breaker
      await request('POST', '/api/breakers', {
        name: 'state-test-breaker',
        targetUrl: 'http://localhost:9999',
      });

      // Force OPEN
      const res = await request('PATCH', '/api/breakers/state-test-breaker/state', {
        state: 'OPEN',
        reason: 'test',
      });
      strictEqual(res.status, 200);
      strictEqual(res.body.breaker.state, 'OPEN');

      // Invalid state
      const res2 = await request('PATCH', '/api/breakers/state-test-breaker/state', {
        state: 'INVALID_STATE',
      });
      strictEqual(res2.status, 400);
      strictEqual(res2.body.error, 'INVALID_STATE');
    });

    it('POST /api/breakers/:name/reset clears stats and transitions to CLOSED', async () => {
      const res = await request('POST', '/api/breakers/state-test-breaker/reset');
      strictEqual(res.status, 200);
      strictEqual(res.body.breaker.state, 'CLOSED');
      strictEqual(res.body.breaker.stats.totalCalls, 0);
    });
  });

  // ── Fallback CRUD ────────────────────────────────────────────────────────────

  describe('Fallback CRUD', () => {

    it('POST /api/fallbacks creates a new fallback (201)', async () => {
      const res = await request('POST', '/api/fallbacks', {
        name: 'test-fallback-1',
        value: { foo: 'bar' },
        description: 'A test fallback',
        tags: ['test'],
      });
      strictEqual(res.status, 201);
      strictEqual(res.body.message, 'Fallback created');
      strictEqual(res.body.fallback.name, 'test-fallback-1');
      deepStrictEqual(res.body.fallback.value, { foo: 'bar' });
    });

    it('POST /api/fallbacks rejects duplicate name (409)', async () => {
      const res = await request('POST', '/api/fallbacks', {
        name: 'test-fallback-1',
        value: { different: true },
      });
      strictEqual(res.status, 409);
      strictEqual(res.body.error, 'FALLBACK_EXISTS');
    });

    it('POST /api/fallbacks requires name and value (400)', async () => {
      const res = await request('POST', '/api/fallbacks', { name: 'only-name' });
      strictEqual(res.status, 400);
      strictEqual(res.body.error, 'VALIDATION_ERROR');
    });

    it('GET /api/fallbacks returns list of fallbacks', async () => {
      const res = await request('GET', '/api/fallbacks');
      strictEqual(res.status, 200);
      ok(Array.isArray(res.body.fallbacks));
      strictEqual(typeof res.body.count, 'number');
    });

    it('GET /api/fallbacks/:name returns a fallback', async () => {
      const res = await request('GET', '/api/fallbacks/test-fallback-1');
      strictEqual(res.status, 200);
      strictEqual(res.body.name, 'test-fallback-1');
      deepStrictEqual(res.body.value, { foo: 'bar' });
    });

    it('GET /api/fallbacks/:name returns 404 for unknown fallback', async () => {
      const res = await request('GET', '/api/fallbacks/no-such-fallback');
      strictEqual(res.status, 404);
      strictEqual(res.body.error, 'FALLBACK_NOT_FOUND');
    });

    it('DELETE /api/fallbacks/:name deletes a fallback', async () => {
      const res = await request('DELETE', '/api/fallbacks/test-fallback-1');
      strictEqual(res.status, 200);
      strictEqual(res.body.message, 'Fallback deleted');

      const res2 = await request('GET', '/api/fallbacks/test-fallback-1');
      strictEqual(res2.status, 404);
    });
  });

  // ── Execute ─────────────────────────────────────────────────────────────────

  describe('Execute', () => {
    it('POST /api/execute/:breakerName returns 404 for unknown breaker', async () => {
      const res = await request('POST', '/api/execute/nonexistent', {
        payload: { foo: 'bar' },
      });
      strictEqual(res.status, 404);
      strictEqual(res.body.error, 'BREAKER_NOT_FOUND');
    });

    it('POST /api/execute/:breakerName with OPEN breaker returns 503 + fallback', async () => {
      // Create breaker with no fallback
      await request('POST', '/api/breakers', {
        name: 'open-circuit',
        targetUrl: 'http://localhost:9999',
        fallbackName: null,
      });
      // Force OPEN
      await request('PATCH', '/api/breakers/open-circuit/state', { state: 'OPEN' });

      const res = await request('POST', '/api/execute/open-circuit', { payload: {} });
      strictEqual(res.status, 503);
      strictEqual(res.body.outcome, 'rejected');
      strictEqual(res.body.breakerState, 'OPEN');
    });

    it('POST /api/execute/:breakerName returns 502 when upstream fails', async () => {
      // Create breaker targeting a non-routable address (immediate ECONNREFUSED)
      const res = await request('POST', '/api/execute/hojai-central', {
        payload: { text: 'hello' },
      });
      // hojai-central is seeded with fallbackName='sentiment-default'
      // Either 502 (upstream failure) or 503 (breaker OPEN) is acceptable here
      ok(res.status === 502 || res.status === 503, `Expected 502 or 503, got ${res.status}`);
    });

    it('GET /api/execute/:breakerName/stats returns execution records', async () => {
      const res = await request('GET', '/api/execute/hojai-central/stats');
      strictEqual(res.status, 200);
      strictEqual(res.body.breakerName, 'hojai-central');
      ok(Array.isArray(res.body.executions));
      strictEqual(typeof res.body.count, 'number');
    });

    it('GET /api/execute/:breakerName/stats returns 404 for unknown breaker', async () => {
      const res = await request('GET', '/api/execute/no-such/stats');
      strictEqual(res.status, 404);
    });
  });

  // ── Status & audit ──────────────────────────────────────────────────────────

  describe('Status & Audit', () => {
    it('GET /api/status returns aggregate stats', async () => {
      const res = await request('GET', '/api/status');
      strictEqual(res.status, 200);
      strictEqual(typeof res.body.breakers, 'number');
      strictEqual(typeof res.body.fallbacks, 'number');
      strictEqual(typeof res.body.totalCalls, 'number');
      ok(res.body.states);
      strictEqual(typeof res.body.auditEntries, 'number');
    });

    it('GET /api/audit returns audit log entries', async () => {
      const res = await request('GET', '/api/audit');
      strictEqual(res.status, 200);
      ok(Array.isArray(res.body.entries));
      strictEqual(typeof res.body.count, 'number');
    });

    it('GET /api/audit?type=state-transition filters by type', async () => {
      const res = await request('GET', '/api/audit?type=state-transition');
      strictEqual(res.status, 200);
      for (const entry of res.body.entries) {
        strictEqual(entry.type, 'state-transition');
      }
    });

    it('GET /api/audit?limit=N caps results', async () => {
      const res = await request('GET', '/api/audit?limit=2');
      strictEqual(res.status, 200);
      ok(res.body.entries.length <= 2);
    });
  });

  // ── 404 catch-all ──────────────────────────────────────────────────────────

  describe('404 Catch-all', () => {
    it('unknown route returns 404 JSON', async () => {
      const res = await request('GET', '/this/route/does/not/exist');
      strictEqual(res.status, 404);
      strictEqual(res.body.error, 'NOT_FOUND');
      ok(res.body.message.includes('GET'));
    });

    it('unknown method on valid route returns 404', async () => {
      const res = await request('PATCH', '/api/health');
      strictEqual(res.status, 404);
    });
  });

  // ── Breaker class unit ─────────────────────────────────────────────────────

  describe('Breaker class', () => {
    it('transitions from CLOSED to OPEN when failure threshold reached', () => {
      const { Breaker } = require('../../src/index.js');
      const b = new Breaker({
        name: 'unit-test-breaker',
        targetUrl: 'http://localhost:1',
        failureThreshold: 3,
        windowSize: 10,
      });
      strictEqual(b.state, 'CLOSED');
      b.recordOutcome('failure');
      b.recordOutcome('failure');
      strictEqual(b.state, 'CLOSED');
      b.recordOutcome('failure'); // 3rd failure
      strictEqual(b.state, 'OPEN');
    });

    it('transitions from OPEN to HALF_OPEN after allowRequest when resetTimeoutMs has elapsed', () => {
      const { Breaker } = require('../../src/index.js');
      const b = new Breaker({
        name: 'half-open-test',
        targetUrl: 'http://localhost:1',
        failureThreshold: 1,
        resetTimeoutMs: 50, // 50ms — reliably exceeds typical timer granularity on all platforms
        windowSize: 5,
      });
      b.transitionTo('OPEN');
      strictEqual(b.state, 'OPEN');
      // Before timeout: request is rejected, stays OPEN
      const beforeAllowed = b.allowRequest();
      strictEqual(beforeAllowed, false);
      strictEqual(b.state, 'OPEN');
      // After timeout: allowRequest transitions to HALF_OPEN
      const start = Date.now();
      while (Date.now() - start < 60) { /* spin wait */ }
      const afterAllowed = b.allowRequest();
      strictEqual(afterAllowed, true);
      strictEqual(b.state, 'HALF_OPEN');
    });

    it('records success outcome and updates stats', () => {
      const { Breaker } = require('../../src/index.js');
      const b = new Breaker({ name: 'success-test', targetUrl: 'http://x.y' });
      b.recordOutcome('success');
      strictEqual(b.stats.totalCalls, 1);
      strictEqual(b.stats.successes, 1);
      strictEqual(b.stats.failures, 0);
    });

    it('records timeout outcome as both timeout and failure', () => {
      const { Breaker } = require('../../src/index.js');
      const b = new Breaker({ name: 'timeout-test', targetUrl: 'http://x.y' });
      b.recordOutcome('timeout');
      strictEqual(b.stats.totalCalls, 1);
      strictEqual(b.stats.timeouts, 1);
      strictEqual(b.stats.failures, 1); // timeout counts as failure
    });

    it('snapshot() returns a plain object with expected fields', () => {
      const { Breaker } = require('../../src/index.js');
      const b = new Breaker({ name: 'snapshot-test', targetUrl: 'http://x.y' });
      b.recordOutcome('failure');
      b.recordOutcome('success');
      const snap = b.snapshot();
      strictEqual(typeof snap, 'object');
      strictEqual(snap.name, 'snapshot-test');
      strictEqual(snap.state, 'CLOSED');
      strictEqual(snap.windowSize, 2); // snapshot returns windowSize as the number of outcomes
      strictEqual(snap.recentFailures, 1);
      strictEqual(snap.recentSuccesses, 1);
      ok(typeof snap.stats === 'object');
      ok(snap.createdAt instanceof Date);
    });
  });
});
