/**
 * Tests for the @hojai/sutar SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sutar } from '../index.js';

/**
 * Mock fetch helper — replaces globalThis.fetch and restores after the test.
 */
function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Sutar client instantiates with all 6 sub-clients', () => {
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(sutar.agent, 'agent client present');
  assert.ok(sutar.orchestration, 'orchestration client present');
  assert.ok(sutar.marketplace, 'marketplace client present');
  assert.ok(sutar.contracts, 'contracts client present');
  assert.ok(sutar.learning, 'learning client present');
  assert.ok(sutar.acp, 'acp client present');
});

test('AgentClient.create sends POST to /api/v1/agents', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'agent-1', agentId: 'merchant-maya-1', type: 'merchant',
        businessId: 'b-1', businessName: 'Maya Collective', industry: 'fashion',
        status: 'online', capabilities: ['negotiate'], createdAt: '2026-06-23',
        stats: { totalTasks: 0, successRate: 0, avgResponseTime: 0 }
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const agent = await sutar.agent.create({
    type: 'merchant', businessId: 'b-1', businessName: 'Maya Collective', industry: 'fashion'
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/agents');
  assert.equal(captured.body.type, 'merchant');
  assert.equal(agent.id, 'agent-1');
  restore();
});

test('AgentClient.runTask posts task to agent', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        taskId: 'task-1', type: 'negotiate-rfq', status: 'running',
        input: { product: 'shoes' }, startedAt: '2026-06-23'
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const task = await sutar.agent.runTask('agent-1', { type: 'negotiate-rfq', input: { product: 'shoes' } });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/agents/agent-1/tasks');
  assert.equal(task.status, 'running');
  restore();
});

test('OrchestrationClient.run posts to /api/v1/orchestrations', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        orchestrationId: 'orch-1', status: 'completed',
        results: { s1: { output: {}, durationMs: 100 } },
        startedAt: '2026-06-23', completedAt: '2026-06-23', totalDurationMs: 200
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await sutar.orchestration.run({
    pattern: 'sequential',
    steps: [{ id: 's1', agentRole: 'merchant', input: {} }],
    initialInput: {}
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/orchestrations');
  assert.equal(captured.body.pattern, 'sequential');
  restore();
});

test('MarketplaceClient.search posts query to marketplace', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([{
        id: 'l-1', agentId: 'a-1', name: 'Negotiation Bot', description: '',
        category: 'sales', publisher: 'HOJAI', version: '1.0.0',
        rating: 4.5, ratingCount: 100, installs: 500,
        price: { model: 'free' }, capabilities: ['negotiate'], industries: ['fashion'],
        publishedAt: 't', updatedAt: 't'
      }])
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const listings = await sutar.marketplace.search({ query: 'negotiation', industry: 'fashion' });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/marketplace/search');
  assert.equal(listings[0].name, 'Negotiation Bot');
  restore();
});

test('ContractClient.create posts contract to /api/v1/contracts', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'c-1', title: 'Supply Agreement', status: 'pending',
        parties: [], terms: { conditions: [], actions: [] },
        createdAt: 't', history: []
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await sutar.contracts.create({
    title: 'Supply Agreement',
    parties: [{ agentId: 'a', role: 'buyer', corpId: 'c' }],
    terms: { conditions: [], actions: [] }
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/contracts');
  assert.equal(captured.body.title, 'Supply Agreement');
  restore();
});

test('LearningClient.record posts event to learning service', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'e-1', agentId: 'a-1', type: 'success',
        input: {}, output: {}, outcome: 'positive', context: {},
        timestamp: 't', weight: 1.0
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await sutar.learning.record({
    agentId: 'a-1', type: 'success',
    input: {}, output: {}, outcome: 'positive', context: {}, weight: 1.0
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/learning/events');
  restore();
});

test('ACPClient.send posts ACP message', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'm-1', type: 'OFFER', sender: 'a', receiver: 'b',
        payload: {}, timestamp: 't'
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await sutar.acp.send({
    type: 'OFFER', sender: 'a', receiver: 'b', payload: { price: 100 }
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/acp/messages');
  assert.equal(captured.body.type, 'OFFER');
  restore();
});

test('ACPClient.negotiate runs multi-round negotiation', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        negotiationId: 'n-1', status: 'agreed',
        rounds: [{ round: 1, offer: {}, response: 'accept' }],
        finalAgreement: { price: 100 }
      })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await sutar.acp.negotiate({
    myAgentId: 'a', counterpartyId: 'b', topic: 'price',
    initialOffer: { price: 100 }, maxRounds: 3
  });
  assert.equal(captured.url, 'http://localhost:9999/api/v1/acp/negotiate');
  assert.equal(result.status, 'agreed');
  restore();
});

test('Sutar client retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'a-1', agentId: 'a-1', type: 'merchant', businessId: 'b', businessName: 'B', industry: 'fashion', status: 'online', capabilities: [], createdAt: 't' })
    };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await sutar.agent.get('a-1');
  assert.equal(calls, 3);
  assert.equal(result.id, 'a-1');
  restore();
});

test('Sutar client throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const sutar = new Sutar({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(
    () => sutar.agent.get('missing'),
    /HTTP 404/
  );
  restore();
});