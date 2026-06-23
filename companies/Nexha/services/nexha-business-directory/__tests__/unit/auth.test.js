/**
 * Auth middleware tests (pure — no DB).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

describe('requireAuth / optionalAuth', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset to known auth-on state.
    process.env.DIRECTORY_REQUIRE_AUTH = 'true';
    process.env.DIRECTORY_ALLOW_PUBLIC = 'true';
    process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token-32-bytes-long-xxxxx';
    process.env.JWT_SECRET = 'test-jwt-secret-very-long-1234567890';
    process.env.JWT_ISSUER = 'rtmn-corpid';
    process.env.JWT_AUDIENCE = 'rtmn-api';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  // Re-import after env is set so the module reads the new values.
  async function loadModule() {
    // Bust the module cache so requireAuth reads fresh env.
    const mod = await import('../../src/middleware/auth.js?bust=' + Date.now());
    return mod;
  }

  it('requireAuth: dev bypass when DIRECTORY_REQUIRE_AUTH=false', async () => {
    process.env.DIRECTORY_REQUIRE_AUTH = 'false';
    const { requireAuth } = await loadModule();
    const req = { headers: {} };
    let nextCalled = false;
    requireAuth(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.user.role).toBe('service');
  });

  it('requireAuth: accepts a valid internal token', async () => {
    const { requireAuth } = await loadModule();
    const req = { headers: { 'x-internal-token': 'test-internal-token-32-bytes-long-xxxxx' } };
    let nextCalled = false;
    requireAuth(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.isInternalCall).toBe(true);
    // Internal callers don't get an implicit tenant — they must supply one.
    expect(req.user.tenantId).toBeNull();
  });

  it('requireAuth: rejects a bad internal token', async () => {
    const { requireAuth } = await loadModule();
    const req = { headers: { 'x-internal-token': 'wrong-token-1234567890' } };
    const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('requireAuth: accepts a valid JWT', async () => {
    const { requireAuth } = await loadModule();
    const token = jwt.sign(
      { sub: 'user-1', role: 'user', organizationId: 'org-1', tenantId: 'tenant-1' },
      'test-jwt-secret-very-long-1234567890',
      { issuer: 'rtmn-corpid', audience: 'rtmn-api', expiresIn: '5m' },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    requireAuth(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.user.id).toBe('user-1');
    expect(req.user.tenantId).toBe('tenant-1');
  });

  it('requireAuth: rejects an expired JWT', async () => {
    const { requireAuth } = await loadModule();
    const token = jwt.sign(
      { sub: 'user-1' },
      'test-jwt-secret-very-long-1234567890',
      { issuer: 'rtmn-corpid', audience: 'rtmn-api', expiresIn: '-10s' },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    requireAuth(req, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('requireAuth: rejects a wrong-audience JWT', async () => {
    const { requireAuth } = await loadModule();
    const token = jwt.sign(
      { sub: 'user-1' },
      'test-jwt-secret-very-long-1234567890',
      { issuer: 'rtmn-corpid', audience: 'someone-else', expiresIn: '5m' },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    requireAuth(req, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('requireAuth: 401 when no headers present', async () => {
    const { requireAuth } = await loadModule();
    const req = { headers: {} };
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    requireAuth(req, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('optionalAuth: passes through anonymous when public allowed', async () => {
    const { optionalAuth } = await loadModule();
    const req = { headers: {} };
    let nextCalled = false;
    optionalAuth(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.user).toBeNull();
  });

  it('optionalAuth: 401 when public disabled and no auth', async () => {
    process.env.DIRECTORY_ALLOW_PUBLIC = 'false';
    const { optionalAuth } = await loadModule();
    const req = { headers: {} };
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    optionalAuth(req, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  it('tenantFrom: prefers req.user.tenantId, falls back to organizationId, then X-Tenant-Id', async () => {
    const { tenantFrom } = await loadModule();
    expect(tenantFrom({ user: { tenantId: 'A' } })).toBe('A');
    expect(tenantFrom({ user: { organizationId: 'B' } })).toBe('B');
    expect(tenantFrom({ user: {}, headers: { 'x-tenant-id': 'C' } })).toBe('C');
    expect(tenantFrom({ user: {}, headers: {} })).toBeNull();
  });

  it('timingSafeEqual: false for different lengths', async () => {
    const { _testing } = await loadModule();
    expect(_testing.timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(_testing.timingSafeEqual(123, 'abc')).toBe(false);
    expect(_testing.timingSafeEqual('abc', 'abc')).toBe(true);
    expect(_testing.timingSafeEqual('abc', 'abd')).toBe(false);
  });
});
