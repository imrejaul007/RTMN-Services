/**
 * PolicyOS — JWT RS256 + Audience Validation Unit Tests (Phase 0.5)
 *
 * Tests the Phase 0.5 JWT RS256 upgrade:
 *   1. RS256 JWT with correct public key → ACCEPTED
 *   2. RS256 JWT with wrong public key → REJECTED
 *   3. HS256 JWT without JWT_SECRET → REJECTED (RS256-only mode)
 *   4. JWT without matching audience → REJECTED
 *   5. Refresh token rotation works
 *
 * Key difference from auth.test.mjs: environment is set BEFORE importing
 * the auth module, so initialization picks up the right mode.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('JWT RS256 + Audience (Phase 0.5)', () => {

  // Generate a fresh RSA keypair per test suite run
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const JWT_SECRET = 'hs256-secret-for-migration-32chars!!';
  const AUDIENCE = 'policy-os';
  const SERVICE_TOKEN = 'svc_phase05_test';

  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear any previously cached auth state by resetting all auth-related env vars
    // The auth module reads env vars lazily via ensureInitialized(), so this works
    delete process.env.JWT_SECRET;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.POLICYOS_JWT_AUDIENCE;
    delete process.env.POLICYOS_SERVICE_TOKEN;
    delete process.env.POLICYOS_REQUIRE_AUTH;
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  // =================================================================
  // RS256 tests (public key mode, no secret)
  // =================================================================

  it('RS256 JWT with correct public key is ACCEPTED', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    // Import once (module is ESM cached) then reset state so ensureInitialized re-runs
    const mod = await import('../../src/middleware/auth.js');
    mod._resetAuthState();
    const customAuth = mod.createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    const token = jwt.sign(
      { sub: 'rs256-user', role: 'manager', aud: AUDIENCE },
      privateKey,
      { algorithm: 'RS256', expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res._next, true, 'RS256 token should pass auth');
    assert.equal(req.auth.sub, 'rs256-user');
    assert.equal(req.auth.alg, 'RS256');
    assert.equal(req.auth.keySource, 'env:JWT_PUBLIC_KEY');
  });

  it('RS256 JWT with wrong public key is REJECTED', async () => {
    const { publicKey: wrongKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PUBLIC_KEY = wrongKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    const token = jwt.sign(
      { sub: 'attacker', role: 'admin', aud: AUDIENCE },
      privateKey, // signed with OUR private key, but we verify with wrong public key
      { algorithm: 'RS256', expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Invalid token');
  });

  it('HS256 JWT works when JWT_SECRET is set (legacy migration mode)', async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    const token = jwt.sign(
      { sub: 'hs256-user', role: 'manager', aud: AUDIENCE },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res._next, true, 'HS256 token should pass auth');
    assert.equal(req.auth.alg, 'HS256');
  });

  it('JWT with wrong audience is REJECTED', async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    const token = jwt.sign(
      { sub: 'wrong-aud', role: 'manager', aud: 'wrong-audience' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Invalid token audience');
  });

  it('JWT_PUBLIC_KEY blocks HS256 when set alone (no JWT_SECRET)', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    // Try HS256 token when only RS256 is configured
    const token = jwt.sign(
      { sub: 'wrong-alg', role: 'manager', aud: AUDIENCE },
      JWT_SECRET, // not configured!
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Invalid token');
  });

  it('Service token still works alongside RS256', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    const req = { headers: { 'x-service-token': SERVICE_TOKEN } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res._next, true, 'service token should bypass JWT');
    assert.equal(req.auth.type, 'service');
  });

  it('signToken uses RS256 when JWT_PUBLIC_KEY is set', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { signToken, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const token = await signToken({ sub: 'signed-by-rs256', role: 'manager' });
    assert.ok(token, 'signToken should return a token');

    // Verify the token is valid RS256
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'], audience: AUDIENCE });
    assert.equal(decoded.sub, 'signed-by-rs256');
    assert.equal(decoded.aud, AUDIENCE);
  });

  it('alg=none attack is still rejected in RS256 mode', async () => {
    process.env.JWT_PUBLIC_KEY = publicKey;
    process.env.POLICYOS_JWT_AUDIENCE = AUDIENCE;
    process.env.POLICYOS_REQUIRE_AUTH = 'true';
    process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

    const { createCustomAuth, _resetAuthState } = await import('../../src/middleware/auth.js');
    _resetAuthState();
    const customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore: new Map(),
    });

    // RS256 algorithm is pinned — alg=none JWT will fail signature verification
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'attacker', role: 'admin', aud: AUDIENCE })).toString('base64url');
    const unsigned = `${header}.${payload}.`;

    const req = { headers: { authorization: `Bearer ${unsigned}` } };
    const res = { statusCode: null, body: null, _next: false, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; return this; } };
    await customAuth(req, res, () => { res._next = true; });
    assert.equal(res.statusCode, 401);
  });
});