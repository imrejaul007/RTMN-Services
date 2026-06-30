/**
 * Rate limiting middleware tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '../src/middleware/rateLimit.js';

function makeReq(overrides: any = {}) {
  return {
    path: '/api/test',
    headers: {},
    ...overrides,
  };
}

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    headers: {} as Record<string, string>,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  res.setHeader = (k: string, v: string) => {
    res.headers[k] = v;
    return res;
  };
  return res;
}

describe('rateLimit middleware', () => {
  let res: any;
  let nextCalled: boolean;

  beforeEach(() => {
    res = makeRes();
    nextCalled = false;
  });

  it('allows /health without checking limits', () => {
    const mw = rateLimit;
    const req = makeReq({ path: '/health' });
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('allows /ready without checking limits', () => {
    const mw = rateLimit;
    const req = makeReq({ path: '/ready' });
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('allows requests within IP limit', () => {
    const mw = rateLimit;
    const req = makeReq({
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    mw(req as any, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res.headers['X-RateLimit-Limit-IP']).toBeTruthy();
    expect(res.headers['X-RateLimit-Remaining-IP']).toBeTruthy();
  });

  it('sets rate limit headers on every response', () => {
    const mw = rateLimit;
    const req = makeReq();
    mw(req as any, res, () => {});
    expect(res.headers['X-RateLimit-Limit-IP']).toBeTruthy();
    expect(res.headers['X-RateLimit-Remaining-IP']).toBeTruthy();
    expect(res.headers['X-RateLimit-Reset-IP']).toBeTruthy();
  });
});
