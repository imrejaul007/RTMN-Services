/**
 * Shared test helpers for the rez-intel-client (now dual-client).
 *
 * The dual-client is `@rtmn/shared/intel/dual-client` (HOJAI Intelligence
 * 4881 + REZ Intelligence 5370 with INTEL_MODE=hojai|rez|dual).
 *
 * Tests live alongside each service as `__tests__/rez-intel-client.test.js`
 * (the filename is kept for backward compatibility — every service has one).
 *
 * Usage:
 *
 *   const helpers = require('@rtmn/shared/test/rez-intel-helpers');
 *   const clientPath = require.resolve('../rez-intel-client');
 *   helpers.runDualClientTests(helpers.test, clientPath);
 *
 * The default suite covers:
 *   • exports check (all 11 helpers + 5 config getters)
 *   • default mode is "dual"
 *   • dual mode: HOJAI first, REZ fallback (classifyIntent + getCustomerInsights)
 *   • hojai mode: REZ-only helpers return null without making calls
 *   • rez mode: only REZ endpoints called
 *   • graceful degradation on network error
 *   • disabled backends (no fetch)
 *   • timeout enforcement
 *   • checkHealth per-backend status
 *   • checkRezIntelHealth backward-compat alias
 *
 * Run with:  node --test src/__tests__/rez-intel-client.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const HOJAI_INTEL_URL = 'http://localhost:4881';
const REZ_INTEL_URL = 'http://localhost:5370';

function withFetchMock(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => handler(url, options);
  return () => { globalThis.fetch = original; };
}

function freshClient(clientPath, envOverrides = {}) {
  const originalEnv = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    originalEnv[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  delete require.cache[require.resolve(clientPath)];
  const client = require(clientPath);
  return {
    client,
    restoreEnv: () => {
      for (const [k, v] of Object.entries(originalEnv)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
}

function runDualClientTests(test, clientPath) {
  test('exports expected dual-client constants and functions', async () => {
    const { client, restoreEnv } = freshClient(clientPath);
    assert.equal(typeof client.HOJAI_INTEL_URL, 'string');
    assert.equal(typeof client.REZ_INTEL_URL, 'string');
    assert.equal(typeof client.INTEL_MODE, 'string');
    assert.equal(typeof client.enrichAgentContext, 'function');
    assert.equal(typeof client.classifyIntent, 'function');
    assert.equal(typeof client.getCustomerInsights, 'function');
    assert.equal(typeof client.getMerchantInsights, 'function');
    assert.equal(typeof client.predictRevenue, 'function');
    assert.equal(typeof client.predictChurn, 'function');
    assert.equal(typeof client.predictLtv, 'function');
    assert.equal(typeof client.predictDemand, 'function');
    assert.equal(typeof client.getNextBestAction, 'function');
    assert.equal(typeof client.getPricingRecommendations, 'function');
    assert.equal(typeof client.getProductRecommendations, 'function');
    assert.equal(typeof client.checkHealth, 'function');
    assert.equal(typeof client.checkRezIntelHealth, 'function');
    restoreEnv();
  });

  test('default INTEL_MODE is dual', async () => {
    const { client, restoreEnv } = freshClient(clientPath);
    assert.equal(client.INTEL_MODE, 'dual');
    restoreEnv();
  });

  test('dual mode: classifyIntent tries HOJAI /api/analyze first', async () => {
    const calls = [];
    const restore = withFetchMock(async (url) => {
      calls.push(url);
      if (url.startsWith(HOJAI_INTEL_URL)) {
        return { ok: true, json: async () => ({ intent: { primaryIntent: 'buy' } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath);
    const result = await client.classifyIntent({ message: 'I want to buy' });
    assert.ok(result);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith(HOJAI_INTEL_URL));
    restore();
    restoreEnv();
  });

  test('dual mode: classifyIntent falls back to REZ when HOJAI fails', async () => {
    const calls = [];
    const restore = withFetchMock(async (url) => {
      calls.push(url);
      if (url.startsWith(HOJAI_INTEL_URL)) return { ok: false, status: 500 };
      if (url === `${REZ_INTEL_URL}/api/v1/intent/classify`) {
        return { ok: true, json: async () => ({ success: true, data: { intent: 'buy' } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath);
    const result = await client.classifyIntent({ message: 'buy' });
    assert.ok(result);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].startsWith(HOJAI_INTEL_URL));
    assert.ok(calls[1].startsWith(REZ_INTEL_URL));
    restore();
    restoreEnv();
  });

  test('dual mode: getCustomerInsights tries HOJAI GET first', async () => {
    const calls = [];
    const restore = withFetchMock(async (url, options) => {
      calls.push({ url, method: options && options.method });
      if (url.startsWith(HOJAI_INTEL_URL)) {
        return { ok: true, json: async () => ({ insights: { ltv: 1000 } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath);
    const result = await client.getCustomerInsights('cust-1');
    assert.ok(result);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[0].url, `${HOJAI_INTEL_URL}/api/customer/cust-1/insights`);
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
    const { client, restoreEnv } = freshClient(clientPath);
    await client.getMerchantInsights({ merchantId: 'm1' });
    await client.predictRevenue({ merchantId: 'm1' });
    await client.getNextBestAction({ dealId: 'd1' });
    await client.getPricingRecommendations({ productId: 'p1' });
    assert.ok(calls.every(u => u.startsWith(REZ_INTEL_URL)));
    assert.equal(calls.length, 4);
    restore();
    restoreEnv();
  });

  test('hojai mode: classifyIntent hits HOJAI only', async () => {
    const calls = [];
    const restore = withFetchMock(async (url) => {
      calls.push(url);
      if (url.startsWith(HOJAI_INTEL_URL)) {
        return { ok: true, json: async () => ({ intent: { primaryIntent: 'support' } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath, { INTEL_MODE: 'hojai' });
    const result = await client.classifyIntent({ message: 'help' });
    assert.ok(result);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith(HOJAI_INTEL_URL));
    restore();
    restoreEnv();
  });

  test('hojai mode: REZ-only helpers return null without making calls', async () => {
    const calls = [];
    const restore = withFetchMock(async (url) => { calls.push(url); return { ok: false, status: 500 }; });
    const { client, restoreEnv } = freshClient(clientPath, { INTEL_MODE: 'hojai' });
    assert.equal(await client.getMerchantInsights({ merchantId: 'm1' }), null);
    assert.equal(await client.predictRevenue({ merchantId: 'm1' }), null);
    assert.equal(await client.predictChurn({ customerId: 'c1' }), null);
    assert.equal(await client.predictLtv({ customerId: 'c1' }), null);
    assert.equal(await client.predictDemand({ campaignId: 'cmp1' }), null);
    assert.equal(await client.getProductRecommendations({ audienceId: 'a1' }), null);
    assert.equal(await client.getNextBestAction({ dealId: 'd1' }), null);
    assert.equal(await client.getPricingRecommendations({ productId: 'p1' }), null);
    assert.equal(await client.enrichAgentContext({ agentRole: 'test' }), null);
    assert.equal(calls.length, 0);
    restore();
    restoreEnv();
  });

  test('rez mode: classifyIntent hits REZ only', async () => {
    const calls = [];
    const restore = withFetchMock(async (url) => {
      calls.push(url);
      if (url.startsWith(REZ_INTEL_URL)) {
        return { ok: true, json: async () => ({ success: true, data: { intent: 'support' } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath, { INTEL_MODE: 'rez' });
    const result = await client.classifyIntent({ message: 'help' });
    assert.ok(result);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith(REZ_INTEL_URL));
    restore();
    restoreEnv();
  });

  test('rez mode: getCustomerInsights hits REZ POST (not HOJAI GET)', async () => {
    const calls = [];
    const restore = withFetchMock(async (url, options) => {
      calls.push({ url, method: options && options.method });
      if (url.startsWith(REZ_INTEL_URL)) {
        return { ok: true, json: async () => ({ success: true, data: { ltv: 500 } }) };
      }
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath, { INTEL_MODE: 'rez' });
    const result = await client.getCustomerInsights('cust-1');
    assert.ok(result);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].url, `${REZ_INTEL_URL}/api/v1/insights/customer`);
    restore();
    restoreEnv();
  });

  test('all helpers return null on network error', async () => {
    const restore = withFetchMock(async () => { throw new Error('ECONNREFUSED'); });
    const { client, restoreEnv } = freshClient(clientPath);
    assert.equal(await client.enrichAgentContext({ agentRole: 'test' }), null);
    assert.equal(await client.classifyIntent({ message: 'hi' }), null);
    assert.equal(await client.getCustomerInsights('c1'), null);
    assert.equal(await client.getMerchantInsights({ merchantId: 'm1' }), null);
    assert.equal(await client.predictRevenue({ merchantId: 'm1' }), null);
    assert.equal(await client.predictChurn({ customerId: 'c1' }), null);
    assert.equal(await client.predictLtv({ customerId: 'c1' }), null);
    assert.equal(await client.predictDemand({ campaignId: 'cmp1' }), null);
    assert.equal(await client.getProductRecommendations({ audienceId: 'a1' }), null);
    assert.equal(await client.getNextBestAction({ dealId: 'd1' }), null);
    assert.equal(await client.getPricingRecommendations({ productId: 'p1' }), null);
    restore();
    restoreEnv();
  });

  test('all helpers return null when both backends disabled', async () => {
    let called = false;
    const restore = withFetchMock(async () => { called = true; return { ok: true }; });
    const { client, restoreEnv } = freshClient(clientPath, { HOJAI_INTEL_ENABLED: 'false', REZ_INTEL_ENABLED: 'false' });
    assert.equal(await client.enrichAgentContext({ agentRole: 'test' }), null);
    assert.equal(await client.classifyIntent({ message: 'hi' }), null);
    assert.equal(await client.getCustomerInsights('c1'), null);
    assert.equal(await client.getMerchantInsights({ merchantId: 'm1' }), null);
    assert.equal(await client.predictRevenue({ merchantId: 'm1' }), null);
    assert.equal(called, false, 'no fetch should occur when both backends disabled');
    restore();
    restoreEnv();
  });

  test('checkHealth reports per-backend status', async () => {
    const restore = withFetchMock(async (url) => {
      if (url === `${HOJAI_INTEL_URL}/api/health`) return { ok: true, json: async () => ({ status: 'ok' }) };
      if (url === `${REZ_INTEL_URL}/api/v1/health`) return { ok: false, status: 500 };
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath);
    const result = await client.checkHealth();
    assert.equal(result.hojai, true);
    assert.equal(result.rez, false);
    assert.equal(result.mode, 'dual');
    restore();
    restoreEnv();
  });

  test('checkRezIntelHealth returns true if either backend is up', async () => {
    const restore = withFetchMock(async (url) => {
      if (url === `${HOJAI_INTEL_URL}/api/health`) return { ok: true, json: async () => ({ status: 'ok' }) };
      return { ok: false, status: 500 };
    });
    const { client, restoreEnv } = freshClient(clientPath);
    const result = await client.checkRezIntelHealth();
    assert.equal(result, true);
    restore();
    restoreEnv();
  });

  test('checkRezIntelHealth returns false when both backends down', async () => {
    const restore = withFetchMock(async () => { throw new Error('down'); });
    const { client, restoreEnv } = freshClient(clientPath);
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
    const { client, restoreEnv } = freshClient(clientPath, { INTEL_TIMEOUT_MS: '500' });
    const start = Date.now();
    const result = await client.classifyIntent({ message: 'hi' });
    const elapsed = Date.now() - start;
    assert.equal(result, null);
    assert.ok(elapsed < 2000, `should timeout within 2s, took ${elapsed}ms`);
    restore();
    restoreEnv();
  });
}

module.exports = {
  test,
  runDualClientTests,
  withFetchMock,
  freshClient,
  HOJAI_INTEL_URL,
  REZ_INTEL_URL
};