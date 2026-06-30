/**
 * Hub auth middleware tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequireHubAuth, HubAuthOptions } from '../src/middleware/auth.js';

interface MockReq {
  path: string;
  headers: Record<string, string>;
}

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

describe('createRequireHubAuth', () => {
  let req: MockReq;
  let res: any;
  let nextCalled: boolean;

  beforeEach(() => {
    req = { path: '/api/something', headers: {} };
    res = makeRes();
    nextCalled = false;
  });

  it('allows /health without any credentials (auth disabled)', () => {
    const mw = createRequireHubAuth({ silent: true });
    req.path = '/health';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('allows /ready without any credentials (auth disabled)', () => {
    const mw = createRequireHubAuth({ silent: true });
    req.path = '/ready';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('allows /api/* when no API key is set (dev mode)', () => {
    const mw = createRequireHubAuth({ silent: true });
    req.path = '/api/services';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects /api/* without Authorization header when API key is set', () => {
    const mw = createRequireHubAuth({ apiKey: 'secret-123', silent: true });
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects request with wrong bearer token', () => {
    const mw = createRequireHubAuth({ apiKey: 'secret-123', silent: true });
    req.headers.authorization = 'Bearer wrong-key';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('accepts request with correct bearer token', () => {
    const mw = createRequireHubAuth({ apiKey: 'secret-123', silent: true });
    req.headers.authorization = 'Bearer secret-123';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('accepts request with matching internal service token', () => {
    const mw = createRequireHubAuth({
      apiKey: 'secret-123',
      internalServiceToken: 'internal-456',
      silent: true,
    });
    req.headers['x-internal-token'] = 'internal-456';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects request with wrong internal service token', () => {
    const mw = createRequireHubAuth({
      apiKey: 'secret-123',
      internalServiceToken: 'internal-456',
      silent: true,
    });
    req.headers['x-internal-token'] = 'wrong-token';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('still allows /health and /ready even with API key set', () => {
    const mw = createRequireHubAuth({ apiKey: 'secret-123', silent: true });
    req.path = '/health';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    nextCalled = false;
    req.path = '/ready';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects malformed Authorization header (not Bearer scheme)', () => {
    const mw = createRequireHubAuth({ apiKey: 'secret-123', silent: true });
    req.headers.authorization = 'Basic dXNlcjpwYXNz';
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});
