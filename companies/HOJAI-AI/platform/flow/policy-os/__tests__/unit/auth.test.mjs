/**
 * PolicyOS auth hardening tests (Phase 5)
 *
 * Verifies that the legacy base64-encoded-JSON token path has been replaced
 * with HS256-signed JWT verification.
 *
 *  1. A legacy base64 token (any unsigned JSON payload) is REJECTED.
 *  2. A forged HS256 token signed with the wrong secret is REJECTED.
 *  3. A valid HS256 token signed with the right secret is ACCEPTED.
 *  4. An expired HS256 token is REJECTED.
 *  5. Without JWT_SECRET set, Bearer auth is disabled (deny-by-default).
 *  6. X-Service-Token still works (service-to-service path unchanged).
 */

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
const SERVICE_TOKEN = 'test-service-token';
process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

let server;
let port;
let policyMod;

async function startApp(env) {
  // Reset auth module state before loading the app — must await so the
  // cached module's _initialized flag is cleared BEFORE index.js imports it.
  try {
    const authMod = await import('../../src/middleware/auth.js');
    authMod._resetAuthState();
  } catch {
    // Module may not exist in some test envs — ignore.
  }

  process.env.PORT = '0';
  process.env.POLICYOS_REQUIRE_AUTH = 'true';
  process.env.NODE_ENV = 'test';
  process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;
  if (env.setJwtSecret) process.env.JWT_SECRET = JWT_SECRET;
  else delete process.env.JWT_SECRET;

  // Bust ESM cache so index.js re-evaluates auth middleware.
  const url = new URL('../../src/index.js', import.meta.url);
  url.searchParams.set('bust', `${Date.now()}-${Math.random()}`);

  const mod = await import(url.href);
  policyMod = mod;
  const app = mod.default || mod.app;
  if (!app) throw new Error('policy-os did not export app');

  return new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', (err) => {
      if (err) return reject(err);
      port = s.address().port;
      resolve(s);
    });
  });
}

function callJson(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request({
      method,
      hostname: '127.0.0.1',
      port,
      path,
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
        let json = null; try { json = raw ? JSON.parse(raw) : null; } catch { json = raw; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  server = await startApp({ setJwtSecret: true });
});

beforeEach(async () => {
  // Reset auth module state between tests to ensure fresh initialization.
  // JWT_SECRET is already set globally by the time tests run.
  const { _resetAuthState } = await import('../../src/middleware/auth.js');
  _resetAuthState();
  // Ensure JWT_SECRET is set for this test run (it was set in before())
  process.env.JWT_SECRET = JWT_SECRET;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

// --- Helpers ---

function legacyBase64Token(payload) {
  // The OLD broken auth path: base64(json({sub, role, exp}))
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function goodJwt(payload = { sub: 'test-user', role: 'user' }, opts = { expiresIn: '1h' }) {
  // auth.js requires 'aud' claim when POLICYOS_JWT_AUDIENCE is set (phase 0.5).
  const fullPayload = payload.aud ? payload : { ...payload, aud: 'policy-os' };
  return jwt.sign(fullPayload, JWT_SECRET, { algorithm: 'HS256', ...opts });
}

// We use /api/policies/evaluate as the test endpoint (POST, auth required).
// It accepts any body and returns 200 if authorized.

test('legacy base64 token is REJECTED (was previously accepted)', async () => {
  const forged = legacyBase64Token({ sub: 'attacker', role: 'admin', exp: Date.now() + 3600_000 });
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${forged}` });
  assert.equal(res.status, 401, `legacy base64 token should be rejected; got ${res.status}`);
});

test('forged HS256 JWT (wrong secret) is REJECTED', async () => {
  const forged = jwt.sign({ sub: 'attacker', role: 'admin' }, 'wrong-secret-32-chars-min-bbbbbbbbb', { algorithm: 'HS256', expiresIn: '1h' });
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${forged}` });
  assert.equal(res.status, 401, `forged JWT should be rejected; got ${res.status}`);
});

test('valid HS256 JWT (correct secret) is ACCEPTED', async () => {
  const token = goodJwt({ sub: 'test-user', role: 'user' });
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${token}` });
  assert.ok([200, 400, 404].includes(res.status), `valid JWT should pass auth; got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.notEqual(res.status, 401);
});

test('expired HS256 JWT is REJECTED', async () => {
  const token = goodJwt({ sub: 'test-user', role: 'user' }, { expiresIn: '-1s' });
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${token}` });
  assert.equal(res.status, 401, `expired JWT should be rejected; got ${res.status}`);
});

test('alg=none attack is REJECTED (algorithm pinning)', async () => {
  // Manually craft an alg=none JWT — this is the canonical JWT attack.
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'attacker', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const unsigned = `${header}.${payload}.`;
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${unsigned}` });
  assert.equal(res.status, 401, `alg=none attack should be rejected; got ${res.status}`);
});

test('X-Internal-Token still works (service-to-service via shared auth)', async () => {
  // policy-os's /api/policies/evaluate uses the shared auth middleware which
  // accepts X-Internal-Token (service-to-service). X-Service-Token is the
  // legacy customAuth path which some other endpoints still use.
  process.env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'X-Internal-Token': SERVICE_TOKEN });
  assert.ok([200, 400].includes(res.status), `internal-token should pass auth; got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('JWT_SECRET missing -> Bearer path is denied (deny-by-default)', async () => {
  // Stop current server
  await new Promise((r) => server.close(r));
  server = await startApp({ setJwtSecret: false });
  // Even a real signed JWT should be denied because JWT_SECRET isn't loaded.
  const token = jwt.sign({ sub: 'test', role: 'admin', aud: 'policy-os' }, 'any-secret-32-chars-min-cccccccccccc', { algorithm: 'HS256', expiresIn: '1h' });
  const res = await callJson('POST', '/api/policies/evaluate', { policyId: 'default-allow', context: {} },
    { 'Authorization': `Bearer ${token}` });
  assert.equal(res.status, 401, `Bearer auth should be denied when JWT_SECRET missing; got ${res.status}`);
});
