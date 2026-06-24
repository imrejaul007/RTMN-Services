/**
 * @hojai/discovery — Comprehensive test suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Discovery, DiscoveryClient, HttpError } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

interface FetchCall { url: string; method: string; body?: string; headers: Record<string, string>; }
function withFetchMock(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
      headers: (init?.headers ?? {}) as Record<string, string>
    });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const baseConfig: HojaiConfig = { apiKey: 'test-key', baseUrl: 'http://localhost:4399' };

test('Discovery client instantiates', () => {
  const d = new Discovery(baseConfig);
  assert.ok(d.discovery instanceof DiscoveryClient);
  assert.equal(d.config.apiKey, 'test-key');
});

test('discover POSTs to /api/v1/discover with body', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: {
      results: [{ capability: { id: 'cap-1' } as any, matchScore: 0.8, aci: 990, band: 'platinum', finalScore: 1.0, reasons: [] }],
      total: 1, query: {}, tookMs: 5, searchedNexhas: ['nexha-1'], cached: false
    }
  }));
  const d = new Discovery(baseConfig);
  const result = await d.discovery.discover({ q: 'fashion', trustBoost: 0.3 });
  assert.equal(result.results.length, 1);
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/v1/discover');
  assert.equal(JSON.parse(m.calls[0].body!).q, 'fashion');
  m.restore();
});

test('index upserts a capability', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { indexed: true, capabilityId: 'cap-1' } }));
  const d = new Discovery(baseConfig);
  const result = await d.discovery.index({ id: 'cap-1' } as any, { subjectId: 'nexha-1', aci: 990, band: 'platinum' });
  assert.equal(result.indexed, true);
  assert.equal(result.capabilityId, 'cap-1');
  m.restore();
});

test('stats GETs /api/v1/stats', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { capabilities: 7, nexhas: 6, scored: 7 } }));
  const d = new Discovery(baseConfig);
  const stats = await d.discovery.stats();
  assert.equal(stats.capabilities, 7);
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/v1/stats');
  m.restore();
});

test('retry on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { success: true, data: { capabilities: 1, nexhas: 1, scored: 1 } });
  });
  const result = await request<{ data: { capabilities: number } }>({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/stats');
  assert.equal(result.data.capabilities, 1);
  assert.equal(attempts, 3);
  m.restore();
});

test('throws HttpError on 4xx', async () => {
  const m = withFetchMock(async () => jsonResponse(404, { error: 'not found' }));
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/missing'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  m.restore();
});

test('default timeout and maxRetries applied when omitted', () => {
  const d = new Discovery({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(d.config.timeout, 10000);
  assert.equal(d.config.maxRetries, 3);
});

test('sends Authorization header when apiKey present', async () => {
  const m = withFetchMock(async (url, init) => {
    assert.equal(init.headers?.['Authorization'], 'Bearer test-key');
    return jsonResponse(200, { success: true, data: { capabilities: 0, nexhas: 0, scored: 0 } });
  });
  await new Discovery(baseConfig).discovery.stats();
  m.restore();
});

test('total public method count is at least 6', () => {
  const d = new Discovery(baseConfig);
  const count = Object.getOwnPropertyNames(Object.getPrototypeOf(d.discovery)).filter(n => n !== 'constructor').length;
  assert.ok(count >= 6, `expected >= 6 methods, got ${count}`);
});