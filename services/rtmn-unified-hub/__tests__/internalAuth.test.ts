/**
 * Hub internal-auth middleware tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequireInternalAuth } from '../src/middleware/internalAuth.js';

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

describe('createRequireInternalAuth', () => {
  let req: any;
  let res: any;
  let nextCalled: boolean;

  beforeEach(() => {
    req = { path: '/api/templates', headers: {} };
    res = makeRes();
    nextCalled = false;
  });

  it('allows all routes when no token is set (dev mode)', () => {
    const mw = createRequireInternalAuth({ silent: true });
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects /api/* without x-internal-token when token is set', () => {
    const mw = createRequireInternalAuth({ token: 'hub-secret', silent: true });
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INTERNAL_AUTH_REQUIRED');
  });

  it('accepts request with correct x-internal-token', () => {
    const mw = createRequireInternalAuth({ token: 'hub-secret', silent: true });
    req.headers['x-internal-token'] = 'hub-secret';
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects request with wrong x-internal-token', () => {
    const mw = createRequireInternalAuth({ token: 'hub-secret', silent: true });
    req.headers['x-internal-token'] = 'wrong';
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('allows /health even with token set', () => {
    const mw = createRequireInternalAuth({ token: 'hub-secret', silent: true });
    req.path = '/health';
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('allows /ready even with token set', () => {
    const mw = createRequireInternalAuth({ token: 'hub-secret', silent: true });
    req.path = '/ready';
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
