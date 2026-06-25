/**
 * Tests for agent-twin's rez-intel-client.js (dual-client, ESM)
 *
 * agent-twin is an ESM service ("type": "module"). We use dynamic `import()`
 * with a cache-buster query string so each test gets a fresh module instance
 * (since ESM modules cache aggressively and we need to flip INTEL_MODE etc.).
 *
 * Run with:  node --test src/__tests__/rez-intel-client.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REZ_INTEL_URL = 'http://localhost:5370';
const HOJAI_INTEL_URL = 'http://localhost:4881';
const clientPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'rez-intel-client.js');
const clientUrl = pathToFileURL(clientPath).href;

function withFetchMock(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => handler(url, options);
  return () => { globalThis.fetch = original; };
}

async function freshClient(envOverrides = {}) {
  const originalEnv = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    originalEnv[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  // ESM cache buster: append query string so the URL is unique each load
  const url = clientUrl + '?bust=' + Date.now() + '-' + Math.random();
  const mod = await import(url);
  return {
    client: mod.default || mod,
    restoreEnv: () => {
      for (const [k, v] of Object.entries(originalEnv)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
}

test('exports expected dual-client constants and functions', async () => {
  const { client, restoreEnv } = await freshClient();
  assert.equal(typeof client.HOJAI_INTEL_URL, 'string');
  assert.equal(typeof client.REZ_INTEL_URL, 'string');
  assert.equal(typeof client.enrichAgentContext, 'function');
  assert.equal(typeof client.classifyIntent, 'function');
  assert.equal(typeof client.getCustomerInsights, 'function');
  assert.equal(typeof client.getMerchantInsights, 'function');
  assert.equal(typeof client.predictRevenue, 'function');
  assert.equal(typeof client.checkRezIntelHealth, 'function');
  restoreEnv();
});

test('default INTEL_MODE is dual', async () => {
  const { client, restoreEnv } = await freshClient();
  assert.equal(client.INTEL_MODE, 'dual');
  restoreEnv();
});

test('dual mode: classifyIntent tries HOJAI first', async () => {
  const calls = [];
  const restore = withFetchMock(async (url) => {
    calls.push(url);
    if (url.startsWith(HOJAI_INTEL_URL)) {
      return { ok: true, json: async () => ({ intent: { primaryIntent: 'test' } }) };
    }
    return { ok: false, status: 500 };
  });
  const { client, restoreEnv } = await freshClient();
  const result = await client.classifyIntent({ message: 'test' });
  assert.ok(result);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith(HOJAI_INTEL_URL));
  restore();
  restoreEnv();
});

test('dual mode: REZ-only helpers skip HOJAI', async () => {
  const calls = [];
  const restore = withFetchMock(async (url) => {
    calls.push(url);
    if (url.startsWith(REZ_INTEL_URL)) {
      return { ok: true, json: async () => ({ success: true, data: { ok: true } }) };
    }
    return { ok: false, status: 500 };
  });
  const { client, restoreEnv } = await freshClient();
  await client.getMerchantInsights({ merchantId: 'm1' });
  await client.predictRevenue({ merchantId: 'm1' });
  await client.getNextBestAction({ dealId: 'd1' });
  assert.ok(calls.every(u => u.startsWith(REZ_INTEL_URL)));
  assert.equal(calls.length, 3);
  restore();
  restoreEnv();
});

test('hojai mode: REZ-only helpers return null without making calls', async () => {
  const calls = [];
  const restore = withFetchMock(async (url) => { calls.push(url); return { ok: false, status: 500 }; });
  const { client, restoreEnv } = await freshClient({ INTEL_MODE: 'hojai' });
  assert.equal(await client.getMerchantInsights({ merchantId: 'm1' }), null);
  assert.equal(await client.predictRevenue({ merchantId: 'm1' }), null);
  assert.equal(await client.predictChurn({ customerId: 'c1' }), null);
  assert.equal(await client.getNextBestAction({ dealId: 'd1' }), null);
  assert.equal(calls.length, 0);
  restore();
  restoreEnv();
});

test('all helpers return null on network error', async () => {
  const restore = withFetchMock(async () => { throw new Error('ECONNREFUSED'); });
  const { client, restoreEnv } = await freshClient();
  assert.equal(await client.enrichAgentContext({ agentRole: 'test' }), null);
  assert.equal(await client.classifyIntent({ message: 'hi' }), null);
  assert.equal(await client.getCustomerInsights('c1'), null);
  assert.equal(await client.getMerchantInsights({ merchantId: 'm1' }), null);
  assert.equal(await client.predictRevenue({ merchantId: 'm1' }), null);
  assert.equal(await client.getNextBestAction({ dealId: 'd1' }), null);
  restore();
  restoreEnv();
});

test('checkHealth reports per-backend status', async () => {
  const restore = withFetchMock(async (url) => {
    if (url === `${HOJAI_INTEL_URL}/api/health`) return { ok: true, json: async () => ({ status: 'ok' }) };
    return { ok: false, status: 500 };
  });
  const { client, restoreEnv } = await freshClient();
  const result = await client.checkHealth();
  assert.equal(result.hojai, true);
  assert.equal(result.mode, 'dual');
  restore();
  restoreEnv();
});

test('checkRezIntelHealth returns false when both backends down', async () => {
  const restore = withFetchMock(async () => { throw new Error('down'); });
  const { client, restoreEnv } = await freshClient();
  const result = await client.checkRezIntelHealth();
  assert.equal(result, false);
  restore();
  restoreEnv();
});

test('timeout is enforced', async () => {
  const restore = withFetchMock(async (url, options) => new Promise((resolve, reject) => {
    const signal = options && options.signal;
    if (signal) signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const { client, restoreEnv } = await freshClient({ INTEL_TIMEOUT_MS: '500' });
  const start = Date.now();
  const result = await client.classifyIntent({ message: 'hi' });
  const elapsed = Date.now() - start;
  assert.equal(result, null);
  assert.ok(elapsed < 2000, `should timeout within 2s, took ${elapsed}ms`);
  restore();
  restoreEnv();
});