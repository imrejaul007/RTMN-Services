/**
 * Tests for the @hojai/department SDK
 *
 * 1 instantiation test (all 9 sub-clients) +
 * 1 happy-path test per sub-client (9 tests) +
 * 1 retry + 1 throw = 12 tests total.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Department } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Department client instantiates with all 9 sub-clients', () => {
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(dept.sales, 'sales');
  assert.ok(dept.marketing, 'marketing');
  assert.ok(dept.customerSuccess, 'customerSuccess');
  assert.ok(dept.procurement, 'procurement');
  assert.ok(dept.workforce, 'workforce');
  assert.ok(dept.finance, 'finance');
  assert.ok(dept.operations, 'operations');
  assert.ok(dept.cxo, 'cxo');
  assert.ok(dept.revenueIntelligence, 'revenueIntelligence');
});

test('SalesClient.createLead POSTs to :5055/api/leads', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body), method: options.method };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'l-1', name: 'Maya Collective', source: 'web', status: 'new',
        createdAt: 't', updatedAt: 't',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const lead = await dept.sales.createLead({ name: 'Maya Collective', source: 'web' });
  assert.equal(captured.url, 'http://localhost:5055/api/leads');
  assert.equal(captured.body.source, 'web');
  assert.equal(lead.id, 'l-1');
  restore();
});

test('MarketingClient.createCampaign POSTs to :5500/api/campaigns', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'c-1', name: 'Summer Sale', channel: 'email', status: 'draft',
        budget: { amount: 100000, currency: 'INR' },
        createdAt: 't',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const campaign = await dept.marketing.createCampaign({
    name: 'Summer Sale', channel: 'email', budget: { amount: 100000, currency: 'INR' },
  });
  assert.equal(captured.url, 'http://localhost:5500/api/campaigns');
  assert.equal(campaign.channel, 'email');
  restore();
});

test('CustomerSuccessClient.getAtRisk GETs customers above threshold', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { id: 'c-1', name: 'Acme', healthScore: 30, healthStatus: 'at-risk', churnRisk: 75, lifetimeValue: { amount: 10000, currency: 'USD' }, tenureDays: 180, createdAt: 't' },
      ]),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const atRisk = await dept.customerSuccess.getAtRisk(60);
  assert.equal(captured.url, 'http://localhost:4050/api/customers?minChurnRisk=60');
  assert.equal(atRisk[0].churnRisk, 75);
  restore();
});

test('ProcurementClient.createSupplier POSTs to :5096/api/suppliers', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 's-1', name: 'ABC Cotton', country: 'IN', categories: ['textiles'],
        status: 'active', createdAt: 't',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const supplier = await dept.procurement.createSupplier({ name: 'ABC Cotton', country: 'IN', categories: ['textiles'] });
  assert.equal(captured.url, 'http://localhost:5096/api/suppliers');
  assert.equal(supplier.status, 'active');
  restore();
});

test('WorkforceClient.createEmployee POSTs to :5077/api/employees', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'e-1', name: 'Alice', email: 'alice@example.com', role: 'Engineer',
        hireDate: '2026-07-01', status: 'active', createdAt: 't',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const emp = await dept.workforce.createEmployee({
    name: 'Alice', email: 'alice@example.com', role: 'Engineer', hireDate: '2026-07-01',
  });
  assert.equal(captured.url, 'http://localhost:5077/api/employees');
  assert.equal(emp.email, 'alice@example.com');
  restore();
});

test('FinanceClient.getTrialBalance GETs to :4801/api/trial-balance', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        asOf: '2026-06-24',
        accounts: [],
        totals: {
          totalDebit: { amount: 0, currency: 'USD' },
          totalCredit: { amount: 0, currency: 'USD' },
          balanced: true,
        },
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const tb = await dept.finance.getTrialBalance({ asOf: '2026-06-24' });
  assert.equal(captured.url, 'http://localhost:4801/api/trial-balance?asOf=2026-06-24');
  assert.equal(tb.totals.balanced, true);
  restore();
});

test('OperationsClient.reportIncident POSTs to :5250/api/incidents', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'i-1', title: 'API down', description: 'Payments API returning 500',
        severity: 'high', status: 'open', createdAt: 't',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const inc = await dept.operations.reportIncident({
    title: 'API down', description: 'Payments API returning 500', severity: 'high',
  });
  assert.equal(captured.url, 'http://localhost:5250/api/incidents');
  assert.equal(inc.severity, 'high');
  restore();
});

test('CxoClient.getKpis GETs to :5100/api/kpis', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { id: 'k-1', name: 'MRR', category: 'financial', value: 50000, unit: 'USD', health: 80, trend: 'up', changePercent: 12, capturedAt: 't' },
        { id: 'k-2', name: 'Active Users', category: 'operational', value: 1200, unit: 'count', health: 90, trend: 'up', changePercent: 8, capturedAt: 't' },
      ]),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const kpis = await dept.cxo.getKpis();
  assert.equal(captured.url, 'http://localhost:5100/api/kpis');
  assert.equal(kpis.length, 2);
  assert.equal(kpis[0].name, 'MRR');
  restore();
});

test('RevenueIntelligenceClient.getRevenueHub GETs to :5400/api/revenue/hub', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        totalMrr: { amount: 50000, currency: 'USD' },
        totalArr: { amount: 600000, currency: 'USD' },
        streams: [
          { id: 's-1', name: 'Subscription', kind: 'subscription', pricingModel: 'tiered',
            mrr: { amount: 30000, currency: 'USD' }, arr: { amount: 360000, currency: 'USD' },
            activeCustomers: 100, nrr: 110, trend: 'up' },
        ],
        period: '2026-06',
      }),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const hub = await dept.revenueIntelligence.getRevenueHub();
  assert.equal(captured.url, 'http://localhost:5400/api/revenue/hub');
  assert.equal(hub.totalMrr.amount, 50000);
  assert.equal(hub.streams[0].kind, 'subscription');
  restore();
});

test('Department client retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([]),
    };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const items = await dept.sales.listLeads();
  assert.equal(calls, 3);
  assert.deepEqual(items, []);
  restore();
});

test('Department client throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const dept = new Department({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(
    () => dept.sales.getLead('missing'),
    /HTTP 404/
  );
  restore();
});
