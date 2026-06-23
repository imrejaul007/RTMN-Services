/**
 * Tests for @rtmn/capgraph v0.1.0
 *
 * Pure node:test. Uses an injectable fetchImpl to avoid real network calls.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createClient, CapgraphError } from '../src/index.js';

// ---------- mock fetch helpers ----------

function makeFetchMock(responder) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  fn.calls = calls;
  fn.reset = () => { calls.length = 0; };
  return fn;
}

function okJson(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function failJson(status, data = { error: 'bad' }) {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify(data),
  };
}

// ---------- client construction ----------

test('createClient throws without baseUrl', () => {
  assert.throws(() => createClient({}), /baseUrl/);
  assert.throws(() => createClient({ baseUrl: '' }), /baseUrl/);
});

test('createClient accepts baseUrl', () => {
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: makeFetchMock(() => okJson({})) });
  assert.equal(c.baseUrl, 'https://g.example.com');
});

test('createClient strips trailing slash from baseUrl', () => {
  const c = createClient({ baseUrl: 'https://g.example.com/', fetchImpl: makeFetchMock(() => okJson({})) });
  assert.equal(c.baseUrl, 'https://g.example.com');
});

test('createClient throws when no fetch available', () => {
  const savedFetch = globalThis.fetch;
  delete globalThis.fetch;
  try {
    assert.throws(() => createClient({ baseUrl: 'https://g.example.com' }), /no fetch/);
  } finally {
    globalThis.fetch = savedFetch;
  }
});

// ---------- fetchAgent ----------

test('fetchAgent sends GET to /v1/agents/:id', async () => {
  const mock = makeFetchMock((url) => {
    assert.equal(url, 'https://g.example.com/v1/agents/agent_42');
    return okJson({ id: 'agent_42', name: 'PriceBot', capabilities: ['pricing'] });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const agent = await c.fetchAgent('agent_42');
  assert.equal(agent.id, 'agent_42');
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].init.method, 'GET');
});

test('fetchAgent URL-encodes the id', async () => {
  const mock = makeFetchMock((url) => {
    assert.ok(url.includes('agent%2Fwith%2Fslashes'), `expected URL-encoded path, got: ${url}`);
    return okJson({ id: 'agent/with/slashes' });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await c.fetchAgent('agent/with/slashes');
});

test('fetchAgent throws on empty id', async () => {
  const mock = makeFetchMock(() => okJson({}));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.fetchAgent(''), /agentId/);
  await assert.rejects(() => c.fetchAgent(), /agentId/);
  assert.equal(mock.calls.length, 0, 'should not hit network for invalid input');
});

test('fetchAgent throws CapgraphError on 404', async () => {
  const mock = makeFetchMock(() => failJson(404, { error: 'not found' }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.fetchAgent('missing'), (err) => {
    assert.ok(err instanceof CapgraphError);
    assert.equal(err.status, 404);
    assert.deepEqual(err.body, { error: 'not found' });
    return true;
  });
});

// ---------- searchCapabilities ----------

test('searchCapabilities sends GET with query string', async () => {
  const mock = makeFetchMock((url) => {
    assert.ok(url.startsWith('https://g.example.com/v1/capabilities/search?'));
    assert.ok(url.includes('q=price'));
    assert.ok(url.includes('tags=pricing%2Crisk'));
    assert.ok(url.includes('minTrust=80'));
    assert.ok(url.includes('industry=retail'));
    assert.ok(url.includes('limit=5'));
    return okJson({ results: [{ id: 'a1', name: 'PriceBot', capabilities: ['pricing'], trustScore: 92 }], nextCursor: 'c2' });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const result = await c.searchCapabilities({ q: 'price', tags: ['pricing', 'risk'], minTrust: 80, industry: 'retail', limit: 5 });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, 'a1');
  assert.equal(result.nextCursor, 'c2');
  assert.equal(mock.calls[0].init.method, 'GET');
});

test('searchCapabilities works with no params (empty query)', async () => {
  const mock = makeFetchMock((url) => {
    assert.equal(url, 'https://g.example.com/v1/capabilities/search');
    return okJson({ results: [] });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const result = await c.searchCapabilities();
  assert.deepEqual(result.results, []);
});

test('searchCapabilities supports cursor pagination', async () => {
  const mock = makeFetchMock((url) => {
    assert.ok(url.includes('cursor=abc123'));
    return okJson({ results: [] });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await c.searchCapabilities({ cursor: 'abc123' });
});

// ---------- registerAgent ----------

test('registerAgent sends POST with JSON body', async () => {
  const mock = makeFetchMock((url, init) => {
    assert.equal(url, 'https://g.example.com/v1/agents');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    const body = JSON.parse(init.body);
    assert.equal(body.id, 'agent_new');
    assert.equal(body.name, 'NewBot');
    assert.deepEqual(body.capabilities, ['forecasting']);
    return okJson({ id: 'agent_new', name: 'NewBot', capabilities: ['forecasting'], trustScore: 50 });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const result = await c.registerAgent({ id: 'agent_new', name: 'NewBot', capabilities: ['forecasting'] });
  assert.equal(result.id, 'agent_new');
});

test('registerAgent validates required fields', async () => {
  const mock = makeFetchMock(() => okJson({}));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.registerAgent({ name: 'X', capabilities: [] }), /agent\.id/);
  await assert.rejects(() => c.registerAgent({ id: 'a', capabilities: [] }), /agent\.name/);
  await assert.rejects(() => c.registerAgent({ id: 'a', name: 'X' }), /agent\.capabilities/);
  assert.equal(mock.calls.length, 0, 'should not hit network on validation error');
});

// ---------- reportTrustSignal ----------

test('reportTrustSignal sends POST with JSON body', async () => {
  const mock = makeFetchMock((url, init) => {
    assert.equal(url, 'https://g.example.com/v1/trust-signals');
    assert.equal(init.method, 'POST');
    const body = JSON.parse(init.body);
    assert.equal(body.agentId, 'agent_1');
    assert.equal(body.kind, 'quality');
    assert.equal(body.score, 88);
    return okJson({ ok: true, signalId: 'sig_xyz' });
  });
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const result = await c.reportTrustSignal({ agentId: 'agent_1', kind: 'quality', score: 88 });
  assert.equal(result.signalId, 'sig_xyz');
});

test('reportTrustSignal validates score range', async () => {
  const mock = makeFetchMock(() => okJson({}));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.reportTrustSignal({ agentId: 'a', kind: 'quality', score: 150 }), /score/);
  await assert.rejects(() => c.reportTrustSignal({ agentId: 'a', kind: 'quality', score: -1 }), /score/);
  await assert.rejects(() => c.reportTrustSignal({ agentId: 'a', kind: 'quality' }), /score/);
});

test('reportTrustSignal validates required fields', async () => {
  const mock = makeFetchMock(() => okJson({}));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.reportTrustSignal({ kind: 'quality', score: 50 }), /agentId/);
  await assert.rejects(() => c.reportTrustSignal({ agentId: 'a', score: 50 }), /kind/);
});

// ---------- auth + headers ----------

test('bearer token sent when provided', async () => {
  const mock = makeFetchMock(() => okJson({ id: 'a' }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock, token: 'tok_abc' });
  await c.fetchAgent('a');
  assert.equal(mock.calls[0].init.headers.Authorization, 'Bearer tok_abc');
});

test('no Authorization header when token omitted', async () => {
  const mock = makeFetchMock(() => okJson({ id: 'a' }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await c.fetchAgent('a');
  assert.equal(mock.calls[0].init.headers.Authorization, undefined);
});

test('Content-Type only set when body present', async () => {
  const mock = makeFetchMock(() => okJson({ id: 'a' }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await c.fetchAgent('a');
  assert.equal(mock.calls[0].init.headers['Content-Type'], undefined);
  assert.equal(mock.calls[0].init.body, undefined);
});

// ---------- error handling ----------

test('non-JSON 200 response is returned as text', async () => {
  const mock = makeFetchMock(() => ({
    ok: true,
    status: 200,
    text: async () => 'plain text response',
  }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  const result = await c.fetchAgent('a');
  assert.equal(result, 'plain text response');
});

test('non-JSON error response wraps in CapgraphError with text body', async () => {
  const mock = makeFetchMock(() => ({
    ok: false,
    status: 500,
    text: async () => 'upstream down',
  }));
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: mock });
  await assert.rejects(() => c.fetchAgent('a'), (err) => {
    assert.equal(err.status, 500);
    assert.equal(err.body, 'upstream down');
    return true;
  });
});

// ---------- timeout ----------

test('timeout rejected with CapgraphError', async () => {
  const slowFetch = () => new Promise(() => {}); // never resolves
  const c = createClient({ baseUrl: 'https://g.example.com', fetchImpl: slowFetch, timeoutMs: 50 });
  await assert.rejects(() => c.fetchAgent('a'), /timed out/);
});
