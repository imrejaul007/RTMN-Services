/**
 * Tests for the HOJAI Foundation SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: node --test dist/__tests__/*.test.js (after build)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hojai } from '../index.js';

/**
 * Mock fetch helper
 */
function withFetchMock(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => handler(url, options);
  return () => { globalThis.fetch = original; };
}

test('Hojai client instantiates with all sub-clients', () => {
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(hojai.corpId);
  assert.ok(hojai.memory);
  assert.ok(hojai.twin);
  assert.ok(hojai.trust);
  assert.ok(hojai.flow);
  assert.ok(hojai.policy);
});

test('CorpIDClient.create sends POST to /api/v1/corp-id', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'corp-1', type: 'company', status: 'pending', metadata: {}, createdAt: '2026-06-23', updatedAt: '2026-06-23' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await hojai.corpId.create({ type: 'company', metadata: { name: 'Test' } });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/corp-id');
  assert.equal(captured.body.type, 'company');
  assert.equal(result.id, 'corp-1');
  restore();
});

test('MemoryClient.write sends POST to /api/v1/memory', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'mem-1', type: 'preferences', scope: { ownerId: 'c1', ownerType: 'company' }, content: {}, confidence: 1, createdAt: 't', updatedAt: 't' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await hojai.memory.write({ type: 'preferences', scope: { ownerId: 'c1', ownerType: 'company' }, content: { x: 1 } });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/memory');
  assert.equal(captured.body.type, 'preferences');
  restore();
});

test('TwinClient.create sends POST to /api/v1/twins', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'twin-1', type: 'customer', ownerCorpId: 'c1', state: {}, attributes: {}, relationships: [], history: [], createdAt: 't', updatedAt: 't', version: 1 }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await hojai.twin.create({ type: 'customer', ownerCorpId: 'c1' });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/twins');
  restore();
});

test('TrustClient.getScore sends GET with corp-id', async () => {
  let captured;
  const restore = withFetchMock(async (url) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ entityId: 'c1', overall: 0.9, dimensions: { trust: 0.9, quality: 0.9, delivery: 0.9, financial: 0.9, compliance: 0.9, sustainability: 0.9 }, lastUpdated: 't' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await hojai.trust.getScore('c1');
  assert.equal(captured.url, 'http://localhost:9999/api/v1/trust/score/c1');
  assert.equal(result.overall, 0.9);
  restore();
});

test('FlowClient.run sends POST to /api/v1/flows/:id/run', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ runId: 'run-1', status: 'completed', outputs: {}, startedAt: 't', completedAt: 't' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await hojai.flow.run('flow-1', { inputs: { x: 1 } });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/flows/flow-1/run');
  restore();
});

test('PolicyClient.evaluate sends POST to /api/v1/policies/evaluate', async () => {
  let captured;
  const restore = withFetchMock(async (url, options) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ decision: 'allow', matchedRule: 'rule-1' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await hojai.policy.evaluate({ action: 'send_data', context: {}, corpId: 'c1' });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/policies/evaluate');
  assert.equal(result.decision, 'allow');
  restore();
});

test('retries on 5xx then succeeds', async () => {
  let attempts = 0;
  const restore = withFetchMock(async (url) => {
    attempts++;
    if (attempts === 1) return { ok: false, status: 500, headers: { get: () => 'application/json' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'corp-1', type: 'company', status: 'pending', metadata: {}, createdAt: 't', updatedAt: 't' }) };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999', maxRetries: 2 });
  const result = await hojai.corpId.create({ type: 'company', metadata: {} });
  assert.equal(attempts, 2);
  assert.equal(result.id, 'corp-1');
  restore();
});

test('does NOT retry on 4xx', async () => {
  let attempts = 0;
  const restore = withFetchMock(async () => {
    attempts++;
    return { ok: false, status: 400, headers: { get: () => 'application/json' }, text: async () => 'bad' };
  });
  const hojai = new Hojai({ apiKey: 'test', baseUrl: 'http://localhost:9999', maxRetries: 3 });
  await assert.rejects(
    () => hojai.corpId.create({ type: 'company', metadata: {} }),
    /HTTP 400/
  );
  assert.equal(attempts, 1);
  restore();
});
