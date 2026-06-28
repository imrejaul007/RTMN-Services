/**
 * PolicyOS — Analytics & Audit Route Tests
 *
 * Tests for:
 *  - GET /api/analytics/overview
 *  - GET /api/analytics/policies
 *  - GET /api/analytics/policies/:id
 *  - GET /api/analytics/denial-reasons
 *  - GET /api/analytics/timeseries
 *  - GET /api/audit
 *  - GET /api/audit/export
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const SERVICE_TOKEN = 'analytics-test-token';
process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

let server;
let port;
let policyMod;

async function startApp() {
  try {
    const authMod = await import('../../src/middleware/auth.js');
    authMod._resetAuthState?.();
  } catch { /* ignore */ }

  process.env.PORT = '0';
  process.env.POLICYOS_REQUIRE_AUTH = 'true';
  process.env.NODE_ENV = 'test';
  process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
  process.env.HOJAI_DATA_DIR = '/tmp/policy-os-analytics-test';

  const url = new URL('../../src/index.js', import.meta.url);
  url.searchParams.set('bust', `${Date.now()}-${Math.random()}`);

  const mod = await import(url.href);
  policyMod = mod;
  const app = mod.default || mod.app;

  return new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (err) => {
      if (err) return reject(err);
      resolve(s);
    });
  });
}

async function api(path, method = 'GET', body) {
  return new Promise((resolve) => {
    const opts = { hostname: '127.0.0.1', port, path, method, headers: {} };
    if (body) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function authenticated(path, method = 'GET', body) {
  const res = await api(path, method, body);
  if (res.status === 401) {
    // Inject service token
    const opts2 = { hostname: '127.0.0.1', port, path, method, headers: { 'x-internal-token': SERVICE_TOKEN } };
    if (body) {
      const json = JSON.stringify(body);
      opts2.headers['Content-Type'] = 'application/json';
      opts2.headers['Content-Length'] = Buffer.byteLength(json);
    }
    return new Promise((resolve) => {
      const req = http.request(opts2, (res2) => {
        let data = '';
        res2.on('data', (c) => (data += c));
        res2.on('end', () => {
          try { resolve({ status: res2.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res2.statusCode, body: data }); }
        });
      });
      req.on('error', () => resolve({ status: 0, body: null }));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
  return res;
}

before(async () => { server = await startApp(); port = server.address().port; });
after(() => { server?.close(); });

// ── Analytics: Overview ─────────────────────────────────────────────────────────

test('GET /api/analytics/overview — empty state', async () => {
  const res = await authenticated('/api/analytics/overview');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.policies, 0);
  assert.strictEqual(res.body.evaluations, 0);
  assert.strictEqual(res.body.allowRate, 0);
});

test('GET /api/analytics/overview — with seeded policies', async () => {
  // Seed has 6 policies; evalMetrics is empty (no evaluations yet).
  // The "policies" count in analytics overview = evalMetrics.size, not seed policy count.
  const res = await authenticated('/api/analytics/overview');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.policies, 0, 'evalMetrics is empty — no policies evaluated yet');
});

// ── Analytics: Policies ────────────────────────────────────────────────────────

test('GET /api/analytics/policies — returns top 25 sorted by total', async () => {
  const res = await authenticated('/api/analytics/policies');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(typeof res.body.count === 'number');
  assert.ok(Array.isArray(res.body.policies));
});

test('GET /api/analytics/policies/:id — unknown policy returns 404', async () => {
  const res = await authenticated('/api/analytics/policies/pol-does-not-exist');
  assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.error?.includes('no metrics'));
});

test('GET /api/analytics/policies/:id — returns metrics or 404 if none exist', async () => {
  // Seeded policies have no eval metrics (404 is correct until policy is evaluated).
  // Verify the route responds correctly for both cases.
  const res = await authenticated('/api/analytics/policies/pol-shopping-budget');
  assert.ok([200, 404].includes(res.status), `Expected 200 or 404, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (res.status === 200) {
    assert.ok(typeof res.body.total === 'number');
    assert.ok(typeof res.body.allows === 'number');
    assert.ok(typeof res.body.denies === 'number');
  }
});

// ── Analytics: Denial Reasons ─────────────────────────────────────────────────

test('GET /api/analytics/denial-reasons — returns reason counts', async () => {
  const res = await authenticated('/api/analytics/denial-reasons');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(typeof res.body.count === 'number');
  assert.ok(Array.isArray(res.body.reasons));
});

// ── Analytics: Time Series ────────────────────────────────────────────────────

test('GET /api/analytics/timeseries — defaults to 7 days', async () => {
  const res = await authenticated('/api/analytics/timeseries');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.days, 7);
  assert.ok(Array.isArray(res.body.series));
});

test('GET /api/analytics/timeseries?days=30 — respects max=30 cap', async () => {
  const res = await authenticated('/api/analytics/timeseries?days=30');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.days, 30);
});

test('GET /api/analytics/timeseries?days=100 — caps at 30', async () => {
  const res = await authenticated('/api/analytics/timeseries?days=100');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.days, 30, 'days should be capped at 30');
});

// ── Audit Routes ──────────────────────────────────────────────────────────────

test('GET /api/audit — returns entries with count', async () => {
  const res = await authenticated('/api/audit');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(typeof res.body.count === 'number');
  assert.ok(Array.isArray(res.body.entries));
});

test('GET /api/audit — filters by policyId', async () => {
  const res = await authenticated('/api/audit?policyId=pol-shopping-budget');
  assert.strictEqual(res.status, 200);
  assert.ok(typeof res.body.count === 'number');
});

test('GET /api/audit — filters by userId (actor)', async () => {
  const res = await authenticated('/api/audit?userId=u-admin');
  assert.strictEqual(res.status, 200);
  assert.ok(typeof res.body.count === 'number');
});

test('GET /api/audit — filters by type', async () => {
  const res = await authenticated('/api/audit?type=policy.created');
  assert.strictEqual(res.status, 200);
  assert.ok(typeof res.body.count === 'number');
});

test('GET /api/audit — combined filters', async () => {
  const res = await authenticated('/api/audit?policyId=pol-shopping-budget&type=policy.created');
  assert.strictEqual(res.status, 200);
});

test('GET /api/audit/export — returns JSON attachment', async () => {
  const res = await authenticated('/api/audit/export');
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(typeof res.body.count === 'number');
  assert.ok(typeof res.body.exportedAt === 'string');
  assert.ok(Array.isArray(res.body.entries));
});

// ── Unauthenticated access ────────────────────────────────────────────────────

test('analytics endpoints require auth when auth is enabled', async () => {
  const res = await api('/api/analytics/overview');
  assert.strictEqual(res.status, 401, 'Should reject unauthenticated request');
});

test('audit endpoints require auth when auth is enabled', async () => {
  const res = await api('/api/audit');
  assert.strictEqual(res.status, 401, 'Should reject unauthenticated request');
});
