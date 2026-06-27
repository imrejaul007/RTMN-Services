/**
 * PolicyOS Per-Tenant Rate Limiting (Phase 0.6)
 *
 * Verifies that:
 *  1. Authenticated tenants get isolated rate-limit budgets (key = tenantId:endpoint).
 *  2. Unauthenticated requests fall back to IP-based limits.
 *  3. A tenant exceeding its limit does NOT affect another tenant's budget.
 *  4. The keyGenerator extracts tenantId / owner from req.auth correctly.
 *
 * CRITICAL: auth middleware must run BEFORE rateLimiter so that req.auth
 * is populated before the keyGenerator is called.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import express from 'express';

const JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
const TEST_MAX = 3; // requests allowed before 429

// ── Key generator (mirrors index.js) ────────────────────────────────────────

function tenantKeyGenerator(req) {
  const tenant = req.auth?.tenantId || req.auth?.owner || null;
  return `${tenant || req.ip}:${req.path}`;
}

// ── Auth middleware: parses Bearer JWT and sets req.auth ──────────────────────
// This must be registered BEFORE the rate limiter so req.auth is available
// when keyGenerator runs. (Identical pattern to how PolicyOS wires auth middleware.)

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
      req.auth = payload;
    } catch {
      // Invalid token — let the route handler decide (rate limit still applies).
    }
  }
  next();
}

// ── Per-test isolated limiter factory ─────────────────────────────────────────

function makeLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: TEST_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: tenantKeyGenerator,
    // Each test gets its own in-memory store so state doesn't bleed across tests.
    store: new (class {
      constructor() { this._hits = new Map(); }
      increment(key) {
        const prev = this._hits.get(key) ?? 0;
        this._hits.set(key, prev + 1);
        return {
          totalHits: prev + 1,
          resetTime: new Date(Date.now() + 60_000),
        };
      }
      decrement(key) {
        const v = this._hits.get(key) ?? 0;
        if (v > 0) this._hits.set(key, v - 1);
        return v;
      }
      resetKey(key) { this._hits.delete(key); }
      resetAll() { this._hits.clear(); }
    })(),
  });
}

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeApp(limiter) {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware); // ← auth BEFORE rate limit
  app.use(limiter);
  app.post('/api/test', (req, res) => {
    res.json({
      ok: true,
      tenant: req.auth?.tenantId || req.auth?.owner || null,
      ip: req.ip,
    });
  });
  return app;
}

function startServer(app) {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function call(port, method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request({
      method, hostname: '127.0.0.1', port, path,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': data.length } : {}),
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch { json = raw; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function makeToken(sub, tenantId, owner) {
  const payload = { sub, aud: 'policy-os' };
  if (tenantId) payload.tenantId = tenantId;
  if (owner) payload.owner = owner;
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Per-Tenant Rate Limit Isolation', () => {

  test('tenant A and tenant B have independent rate-limit budgets', async () => {
    const app = makeApp(makeLimiter());
    const s = await startServer(app);
    const port = s.address().port;

    const tokenA = makeToken('user-a', 'tenant-a', null);
    const tokenB = makeToken('user-b', 'tenant-b', null);
    const hA = { Authorization: `Bearer ${tokenA}` };
    const hB = { Authorization: `Bearer ${tokenB}` };

    // Exhaust tenant-A's budget (3 requests allowed).
    for (let i = 0; i < TEST_MAX; i++) {
      const r = await call(port, 'POST', '/api/test', {}, hA);
      assert.equal(r.status, 200, `A-${i} should succeed, got ${r.status}`);
    }

    // Tenant-A's 4th request is rate-limited.
    const blocked = await call(port, 'POST', '/api/test', {}, hA);
    assert.equal(blocked.status, 429, `A should be rate-limited, got ${blocked.status}`);

    // Tenant-B has its own bucket — unaffected.
    const ok = await call(port, 'POST', '/api/test', {}, hB);
    assert.equal(ok.status, 200, `B should NOT be affected by A's limit, got ${ok.status}`);
    assert.equal(ok.body?.tenant, 'tenant-b');

    s.close();
  });

  test('req.auth.owner is also used as the tenant key', async () => {
    const app = makeApp(makeLimiter());
    const s = await startServer(app);
    const port = s.address().port;

    const tokenOwner = makeToken('svc-1', null, 'owner-xyz');
    const h = { Authorization: `Bearer ${tokenOwner}` };

    for (let i = 0; i < TEST_MAX; i++) {
      const r = await call(port, 'POST', '/api/test', {}, h);
      assert.equal(r.status, 200, `owner-${i} should succeed`);
    }
    const blocked = await call(port, 'POST', '/api/test', {}, h);
    assert.equal(blocked.status, 429, 'owner-based tenant should be rate-limited');

    s.close();
  });

  test('unauthenticated IP-based budget does not bleed into authenticated tenants', async () => {
    const app = makeApp(makeLimiter());
    const s = await startServer(app);
    const port = s.address().port;

    // Exhaust unauthenticated IP budget (no Authorization header).
    for (let i = 0; i < TEST_MAX; i++) {
      const r = await call(port, 'POST', '/api/test', {});
      assert.equal(r.status, 200, `anon-${i} should succeed`);
    }
    const anonBlocked = await call(port, 'POST', '/api/test', {});
    assert.equal(anonBlocked.status, 429, 'anonymous IP should be rate-limited');

    // Authenticated tenant has its own bucket — unaffected by IP exhaustion.
    const token = makeToken('user-x', 'tenant-x', null);
    const ok = await call(port, 'POST', '/api/test', {}, { Authorization: `Bearer ${token}` });
    assert.equal(ok.status, 200, `authenticated tenant should be unaffected by IP limit, got ${ok.status}`);
    assert.equal(ok.body?.tenant, 'tenant-x');

    s.close();
  });

  test('authenticated tenant gets isolated bucket even when IP is the same', async () => {
    const app = makeApp(makeLimiter());
    const s = await startServer(app);
    const port = s.address().port;

    const token = makeToken('user-1', 'tenant-iso', null);
    const h = { Authorization: `Bearer ${token}` };

    // Exhaust tenant bucket.
    for (let i = 0; i < TEST_MAX; i++) {
      const r = await call(port, 'POST', '/api/test', {}, h);
      assert.equal(r.status, 200, `t-${i} should succeed`);
    }
    // 4th request is rate-limited.
    const blocked = await call(port, 'POST', '/api/test', {}, h);
    assert.equal(blocked.status, 429, `tenant should be rate-limited, got ${blocked.status}`);
    // express-rate-limit 429 bodies are plain strings (no JSON).
    assert.ok(
      typeof blocked.body === 'string' && blocked.body.length > 0,
      `should have error body, got ${JSON.stringify(blocked.body)}`,
    );

    s.close();
  });

  test('keyGenerator: tenantId takes priority over owner when both are present', async () => {
    const app = makeApp(makeLimiter());
    const s = await startServer(app);
    const port = s.address().port;

    // Token has both tenantId AND owner set.
    const tokenBoth = makeToken('svc-2', 'tenant-priority', 'owner-ignored');
    const h = { Authorization: `Bearer ${tokenBoth}` };

    const r = await call(port, 'POST', '/api/test', {}, h);
    assert.equal(r.status, 200);
    assert.equal(r.body?.tenant, 'tenant-priority', `expected tenant-priority, got ${r.body?.tenant}`);

    s.close();
  });

});