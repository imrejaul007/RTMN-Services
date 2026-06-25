import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACSClient } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('ACSClient registers an agent (local port 4260)', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ agent: { id: 'agent-1', name: 'Test', domains: ['electronics'] }, score: { score: 100, band: 'novice', breakdown: {}, computedAt: 't' }, status: 'registered' }) };
  });
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await acs.register({ agentId: 'agent-1', name: 'Test', domains: ['electronics'] });
  assert.equal(captured.url, 'http://localhost:4260/api/v1/agents');
  assert.equal(result.status, 'registered');
  restore();
});

test('ACSClient emits a signal', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ signal: { id: 's-1' }, agentScore: { score: 250, band: 'novice', breakdown: {}, computedAt: 't' } }) };
  });
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await acs.emit({ agentId: 'agent-1', kind: 'task_completed', domain: 'electronics' });
  assert.equal(captured.url, 'http://localhost:4260/api/v1/signals');
  assert.equal(captured.body.kind, 'task_completed');
  assert.equal(result.agentScore.score, 250);
  restore();
});

test('ACSClient.getScore with domain filter', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ score: 470, band: 'novice', breakdown: { taskSuccess: { pts: 240 } }, computedAt: 't' }) };
  });
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const score = await acs.getScore('agent-1', 'electronics');
  assert.equal(captured.url, 'http://localhost:4260/api/v1/scores/agent-1?domain=electronics');
  assert.equal(score.score, 470);
  assert.equal(score.band, 'novice');
  restore();
});

test('ACSClient.rankings returns leaderboard', async () => {
  const restore = withFetchMock(async () => ({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    json: async () => ({ domain: 'electronics', items: [
      { agentId: 'a-1', name: 'Top Agent', domains: ['electronics'], score: 890, band: 'elite' },
      { agentId: 'a-2', name: 'Good Agent', domains: ['electronics'], score: 720, band: 'proficient' }
    ], total: 2 })
  }));
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const ranks = await acs.rankings({ domain: 'electronics', limit: 10 });
  assert.equal(ranks.items.length, 2);
  assert.equal(ranks.items[0].band, 'elite');
  assert.equal(ranks.items[1].score, 720);
  restore();
});

test('ACSClient.stats returns federation stats', async () => {
  const restore = withFetchMock(async () => ({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    json: async () => ({ agents: 42, signals: 1000, avgScore: 650, topDomain: 'electronics', domainCounts: { electronics: 15 }, bandDistribution: { elite: 3, expert: 5, proficient: 10, developing: 12, novice: 10, unverified: 2 }, uptime: 86400000 })
  }));
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const stats = await acs.stats();
  assert.equal(stats.agents, 42);
  assert.equal(stats.avgScore, 650);
  assert.equal(stats.topDomain, 'electronics');
  restore();
});

test('ACSClient.retry on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ agents: 0, signals: 0, avgScore: null, topDomain: null, domainCounts: {}, bandDistribution: { elite: 0, expert: 0, proficient: 0, developing: 0, novice: 0, unverified: 0 }, uptime: 0 }) };
  });
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await acs.stats();
  assert.equal(calls, 3);
  restore();
});

test('ACSClient throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const acs = new ACSClient({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => acs.getAgent('missing'), /HTTP 404/);
  restore();
});
