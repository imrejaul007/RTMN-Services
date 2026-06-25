/**
 * DiscoveryOS SDK - tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryOS, DiscoveryOSClient, HttpError } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

interface FetchCall { url: string; method: string; body?: string; headers: Record<string, string>; }
function withFetchMock(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string | undefined, headers: (init?.headers ?? {}) as Record<string, string> });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const baseConfig: HojaiConfig = { apiKey: 'test-key', baseUrl: 'http://localhost:4399' };

test('DiscoveryOS client instantiates', () => {
  const s = new DiscoveryOS(baseConfig);
  assert.ok(s.discoveryOS instanceof DiscoveryOSClient);
  assert.equal(s.config.apiKey, 'test-key');
});

test('info() GETs /api/v1/info', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { name: 'DiscoveryOS' } }));
  const s = new DiscoveryOS(baseConfig);
  const r = await s.discoveryOS.info();
  assert.equal(r.data.name, 'DiscoveryOS');
  m.restore();
});

test('stats() GETs /api/v1/stats', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { success: true, data: { count: 42 } }));
  const s = new DiscoveryOS(baseConfig);
  const r = await s.discoveryOS.stats();
  assert.equal(r.data.count, 42);
  m.restore();
});

test('default timeout applied', () => {
  const s = new DiscoveryOS({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(s.config.timeout, 10000);
  assert.equal(s.config.maxRetries, 3);
});

test('sends Authorization header when apiKey present', async () => {
  const m = withFetchMock(async (url, init) => {
    assert.equal(init.headers?.['Authorization'], 'Bearer test-key');
    return jsonResponse(200, { success: true, data: {} });
  });
  await new DiscoveryOS(baseConfig).discoveryOS.info();
  m.restore();
});

test('throws HttpError on 4xx', async () => {
  const m = withFetchMock(async () => jsonResponse(404, { error: 'not found' }));
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 0 }, 'GET', '/x'),
    (err: unknown) => err instanceof HttpError && (err as HttpError).status === 404
  );
  m.restore();
});

test('retry on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { success: true, data: {} });
  });
  const result = await request<{ data: unknown }>({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/x');
  assert.equal(attempts, 3);
  m.restore();
});

test('DiscoveryOS has at least 2 public methods', () => {
  const s = new DiscoveryOS(baseConfig);
  const count = Object.getOwnPropertyNames(Object.getPrototypeOf(s.discoveryOS)).filter(n => n !== 'constructor').length;
  assert.ok(count >= 2, `expected >= 2 methods, got ${count}`);
});
