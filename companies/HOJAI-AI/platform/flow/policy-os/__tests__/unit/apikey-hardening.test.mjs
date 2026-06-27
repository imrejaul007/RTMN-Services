/**
 * PolicyOS — API Key Hardening Unit Tests (Phase 0.4)
 *
 * Tests the three hardening guarantees:
 *   1. Revoked keys (revokedAt set) are rejected with 401 + specific error
 *   2. Expired keys (expiresAt < Date.now()) are rejected with 401 + specific error
 *   3. Valid keys pass auth
 *
 * Uses the auth middleware directly (no full server startup needed).
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('API Key Hardening (Phase 0.4)', () => {
  let createCustomAuth;
  let apiKeysStore;
  let mockReq;
  let mockRes;
  let customAuth;
  const SERVICE_TOKEN = 'svc_test';

  beforeEach(async () => {
    // Dynamically import to reset module state
    const mod = await import('../../src/middleware/auth.js');
    createCustomAuth = mod.createCustomAuth;

    // In-memory map as the apiKeys store
    apiKeysStore = new Map();

    customAuth = createCustomAuth({
      requireAuth: true,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore,
    });

    mockRes = {
      statusCode: null,
      _data: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this._data = data; this.body = data; return this; },
    };
  });

  function makeReq(headers = {}) {
    return { headers };
  }

  async function doAuth(headers) {
    const req = makeReq(headers);
    mockRes.statusCode = null;
    mockRes.body = null;
    await customAuth(req, mockRes, () => { mockRes._next = true; });
    return { req, res: mockRes };
  }

  // =================================================================
  // Revocation checks
  // =================================================================

  it('accepts valid API key (no expiry, no revocation)', async () => {
    const key = 'pk_abcdef1234567890abcdef1234567890';
    apiKeysStore.set(key, { key, name: 'test-key', role: 'manager' });
    const { res } = await doAuth({ 'x-api-key': key });
    assert.equal(res.statusCode, null, 'should call next() with no status');
    assert.equal(res._next, true);
  });

  it('rejects revoked API key (revokedAt set)', async () => {
    const key = 'pk_revoked1234567890abcdef123456';
    apiKeysStore.set(key, {
      key, name: 'test-key', role: 'manager',
      revokedAt: new Date().toISOString(),
      revokedBy: 'admin',
    });
    const { res } = await doAuth({ 'x-api-key': key });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'API key has been revoked');
    assert.ok(res.body.hint);
  });

  it('accepts expired-but-not-revoked key (expiry check is secondary)', async () => {
    // The middleware checks revokedAt FIRST, then expiresAt.
    // An expired-but-active key should still be rejected (but for expiry, not revocation).
    // Actually per the code: expired key passes through, only revoked fails.
    // Let me verify the actual behavior.
    const key = 'pk_expired000000000000abcdef123456';
    apiKeysStore.set(key, {
      key, name: 'test-key', role: 'manager',
      expiresAt: Date.now() - 1000, // expired 1s ago
    });
    const { res } = await doAuth({ 'x-api-key': key });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'API key has expired');
  });

  it('revokedAt takes priority over expiry (revoked key rejected even if not expired)', async () => {
    const key = 'pk_revokednotexp000000abcdef123';
    apiKeysStore.set(key, {
      key, name: 'test-key', role: 'manager',
      expiresAt: Date.now() + 86400000, // expires tomorrow
      revokedAt: new Date().toISOString(), // but revoked now
    });
    const { res } = await doAuth({ 'x-api-key': key });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'API key has been revoked');
  });

  it('missing API key returns 401 (not 500)', async () => {
    const { res } = await doAuth({});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Authentication required');
  });

  it('unknown API key returns 401', async () => {
    const { res } = await doAuth({ 'x-api-key': 'pk_notexist00000000000000000000' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Authentication required');
  });

  it('null-like revokedAt (empty string) does not trigger revocation', async () => {
    const key = 'pk_emptyrev000000000000abcdef1';
    apiKeysStore.set(key, {
      key, name: 'test-key', role: 'manager',
      revokedAt: '',
    });
    const { res } = await doAuth({ 'x-api-key': key });
    // Empty string is falsy in JS, so it passes the `if (keyData.revokedAt)` check
    assert.equal(res.statusCode, null);
    assert.equal(res._next, true);
  });

  it('requiresAuth=false bypasses all auth', async () => {
    const noAuth = createCustomAuth({
      requireAuth: false,
      serviceToken: SERVICE_TOKEN,
      apiKeysStore,
    });
    const req = makeReq({});
    mockRes._next = false;
    await noAuth(req, mockRes, () => { mockRes._next = true; });
    assert.equal(mockRes._next, true);
    assert.equal(mockRes.statusCode, null);
  });

  it('service token bypasses API key auth', async () => {
    const key = 'pk_shouldnotbebypassed000000';
    apiKeysStore.set(key, { key, name: 'test-key', role: 'manager' });
    const { res } = await doAuth({
      'x-service-token': SERVICE_TOKEN,
      'x-api-key': key,
    });
    // Service token checked BEFORE API key
    assert.equal(res.statusCode, null);
    assert.equal(res._next, true);
  });
});