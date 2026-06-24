import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Copilots } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Copilots client instantiates with 7 sub-clients', () => {
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(c.agent);
  assert.ok(c.business);
  assert.ok(c.executive);
  assert.ok(c.finance);
  assert.ok(c.marketing);
  assert.ok(c.sales);
  assert.ok(c.support);
});

test('AgentCopilot POSTs to :4920/api/agents', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'a-1', name: 'SalesCoach', role: 'sales', status: 'active', capabilities: ['x'], createdAt: 't' }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await c.agent.createAgent({ name: 'SalesCoach', role: 'sales', status: 'active', capabilities: ['x'] });
  assert.equal(captured.url, 'http://localhost:4920/api/agents');
  restore();
});

test('SalesCopilot.prioritize POSTs to :4928/api/prioritize', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ leadId: 'l-1', score: 87, reasoning: 'High intent', recommendedAction: 'call' }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const score = await c.sales.prioritize({ leadId: 'l-1' });
  assert.equal(captured.url, 'http://localhost:4928/api/prioritize');
  assert.equal(score.score, 87);
  restore();
});

test('MarketingCopilot.draftCampaign POSTs to :4929/api/campaigns/draft', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ name: 'Q3 Launch', channel: 'email', audience: 'enterprise', body: 'Hi!', cta: 'Buy now', estimatedReach: 12000 }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const campaign = await c.marketing.draftCampaign({ name: 'Q3 Launch', channel: 'email', audience: 'enterprise' });
  assert.equal(captured.url, 'http://localhost:4929/api/campaigns/draft');
  assert.equal(campaign.estimatedReach, 12000);
  restore();
});

test('FinanceCopilot.forecastCashflow POSTs to :4930/api/cashflow/forecast', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ period: '6m', inflows: 100000, outflows: 80000, net: 20000, runway: 18, alerts: [] }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const cf = await c.finance.forecastCashflow({ months: 6 });
  assert.equal(captured.url, 'http://localhost:4930/api/cashflow/forecast');
  assert.equal(cf.runway, 18);
  restore();
});

test('SupportCopilot.suggestReply POSTs to :4925/api/tickets/suggest-reply', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'Hi! Have you tried...', confidence: 0.92, citations: ['kb-1'] }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const reply = await c.support.suggestReply({ ticketId: 't-1' });
  assert.equal(captured.url, 'http://localhost:4925/api/tickets/suggest-reply');
  assert.equal(reply.confidence, 0.92);
  restore();
});

test('ExecutiveCopilot.getBoardReport GETs :4933/api/board-report', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'b-1', period: 'Q2-2026', generatedAt: 't', highlights: { wins: [], concerns: [], asks: [] }, financials: { revenue: 100000, netIncome: 20000, cash: 50000, runwayMonths: 12 } }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const report = await c.executive.getBoardReport('Q2-2026');
  assert.equal(captured.url, 'http://localhost:4933/api/board-report?period=Q2-2026');
  assert.equal(report.financials.revenue, 100000);
  restore();
});

test('BusinessCopilot.strategicAnalysis POSTs to :4600/api/strategic-analysis', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'i-1', category: 'strategy', title: 'X', summary: 'Y', recommendations: [], priority: 'high' }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const insight = await c.business.strategicAnalysis({ topic: 'market expansion' });
  assert.equal(captured.url, 'http://localhost:4600/api/strategic-analysis');
  assert.equal(insight.priority, 'high');
  restore();
});

test('Copilots client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'b-1', period: 'Q2-2026', generatedAt: 't', highlights: { wins: [], concerns: [], asks: [] }, financials: { revenue: 0, netIncome: 0, cash: 0, runwayMonths: 0 } }) };
  });
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await c.executive.getBoardReport('Q2-2026');
  assert.equal(calls, 3);
  restore();
});

test('Copilots client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const c = new Copilots({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => c.sales.prioritize({ leadId: 'missing' }), /HTTP 404/);
  restore();
});
