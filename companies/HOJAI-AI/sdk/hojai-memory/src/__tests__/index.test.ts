import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Memory } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Memory client instantiates with all 5 sub-clients', () => {
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(m.os); assert.ok(m.network); assert.ok(m.confidence); assert.ok(m.bridge); assert.ok(m.context);
});

test('MemoryOsClient.create POSTs to :4703/api/memory', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'm-1', ownerId: 'u-1', type: 'episodic', content: 'test', createdAt: 't', updatedAt: 't' }) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.os.create({ ownerId: 'u-1', type: 'episodic', content: 'test' });
  assert.equal(captured.url, 'http://localhost:4703/api/memory');
  assert.equal(captured.body.type, 'episodic');
  restore();
});

test('MemoryNetworkClient.aggregate POSTs to :4794/api/memory/aggregate', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ([]) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.network.aggregate({ ownerId: 'u-1', tiers: ['personal', 'business'] });
  assert.equal(captured.url, 'http://localhost:4794/api/memory/aggregate');
  assert.deepEqual(captured.body.tiers, ['personal', 'business']);
  restore();
});

test('MemoryConfidenceClient.reinforce POSTs to :4152/api/facts/:id/reinforce', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, method: options.method };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'f-1', subject: 's', content: 'c', baseConfidence: 0.9, effectiveConfidence: 0.95, source: 'user', contradictions: 0, reinforcements: 1, createdAt: 't', updatedAt: 't' }) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.confidence.reinforce('f-1', { amount: 0.1 });
  assert.equal(captured.url, 'http://localhost:4152/api/facts/f-1/reinforce');
  restore();
});

test('TwinMemoryBridgeClient.bind POSTs to :4704/api/twins/:id/bind', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ twinId: 't-1', kind: 'episodic', partitionId: 'p-1', active: true, createdAt: 't', updatedAt: 't' }) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.bridge.bind('t-1', { kind: 'episodic', partitionId: 'p-1' });
  assert.equal(captured.url, 'http://localhost:4704/api/twins/t-1/bind');
  assert.equal(captured.body.partitionId, 'p-1');
  restore();
});

test('MemoryContextEngineClient.compose POSTs to :4790/api/context', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ ownerId: 'u-1', query: 'q', items: [], totalTokens: 0, generatedAt: 't' }) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await m.context.compose({ ownerId: 'u-1', query: 'q', maxTokens: 2000 });
  assert.equal(captured.url, 'http://localhost:4790/api/context');
  assert.equal(captured.body.maxTokens, 2000);
  restore();
});

test('Memory client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'm-1', ownerId: 'u-1', type: 'episodic', content: 'x', createdAt: 't', updatedAt: 't' }) };
  });
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await m.os.get('m-1');
  assert.equal(calls, 3);
  assert.equal(result.id, 'm-1');
  restore();
});

test('Memory client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const m = new Memory({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => m.os.get('missing'), /HTTP 404/);
  restore();
});
