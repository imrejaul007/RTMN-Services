/**
 * Tests for the REZ Intelligence client
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: node --test src/__tests__/rez-intel-client.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

function withFetchMock(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => handler(url, options);
  return () => { globalThis.fetch = original; };
}

const REZ_INTEL_URL = 'http://localhost:5370';

test('enrichAgentContext returns data on successful response', async () => {
  const restore = withFetchMock(async (url, options) => {
    assert.equal(url, `${REZ_INTEL_URL}/api/v1/agent/enrich`);
    assert.equal(options.method, 'POST');
    return {
      ok: true,
      json: async () => ({ success: true, data: { merchant_intelligence: { revenue_30d: 100 } } })
    };
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const result = await client.enrichAgentContext({ agentRole: 'test', query: 'hi' });
  assert.ok(result);
  assert.equal(result.merchant_intelligence.revenue_30d, 100);
  restore();
});

test('enrichAgentContext returns null on non-ok response', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 500 }));
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const result = await client.enrichAgentContext({ agentRole: 'test' });
  assert.equal(result, null);
  restore();
});

test('enrichAgentContext returns null on success: false payload', async () => {
  const restore = withFetchMock(async () => ({
    ok: true,
    json: async () => ({ success: false, data: null })
  }));
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const result = await client.enrichAgentContext({});
  assert.equal(result, null);
  restore();
});

test('enrichAgentContext returns null on fetch error (graceful degradation)', async () => {
  const restore = withFetchMock(async () => {
    throw new Error('ECONNREFUSED');
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const result = await client.enrichAgentContext({});
  assert.equal(result, null);
  restore();
});

test('enrichAgentContext handles timeout gracefully', async () => {
  const restore = withFetchMock(async (url, options) => {
    return new Promise((resolve, reject) => {
      const signal = options && options.signal;
      if (signal) {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      }
    });
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const start = Date.now();
  const result = await client.enrichAgentContext({});
  const elapsed = Date.now() - start;
  assert.equal(result, null);
  assert.ok(elapsed < 5000, `should timeout within 5s, took ${elapsed}ms`);
  restore();
});

test('getMerchantInsights passes correct payload', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ success: true, data: { top_products: [] } }) };
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  await client.getMerchantInsights({ merchantId: 'm-1', timeRange: '7d' });
  assert.equal(captured.url, `${REZ_INTEL_URL}/api/v1/insights/merchant`);
  assert.equal(captured.body.merchantId, 'm-1');
  assert.equal(captured.body.timeRange, '7d');
  restore();
});

test('predictRevenue returns prediction data', async () => {
  const restore = withFetchMock(async (url, options) => {
    return {
      ok: true,
      json: async () => ({ success: true, data: { forecast: 50000 } })
    };
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  const result = await client.predictRevenue({ merchantId: 'm-1' });
  assert.equal(result.forecast, 50000);
  restore();
});

test('getProductRecommendations sends customer context', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = JSON.parse(options.body);
    return { ok: true, json: async () => ({ success: true, data: { products: [] } }) };
  });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  await client.getProductRecommendations({
    merchantId: 'm-1',
    customerId: 'c-1',
    context: { source: 'web' }
  });
  assert.equal(captured.customerId, 'c-1');
  assert.equal(captured.context.source, 'web');
  restore();
});

test('checkRezIntelHealth returns true on 200', async () => {
  const restore = withFetchMock(async () => ({ ok: true }));
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  assert.equal(await client.checkRezIntelHealth(), true);
  restore();
});

test('checkRezIntelHealth returns false on error', async () => {
  const restore = withFetchMock(async () => { throw new Error('down'); });
  delete require.cache[require.resolve('../rez-intel-client')];
  const client = require('../rez-intel-client');
  assert.equal(await client.checkRezIntelHealth(), false);
  restore();
});
