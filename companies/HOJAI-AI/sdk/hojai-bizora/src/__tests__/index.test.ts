import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bizora } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Bizora client instantiates with all 3 sub-clients', () => {
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(b.dashboards); assert.ok(b.widgets); assert.ok(b.reports);
});

test('DashboardsClient.create POSTs to :4874/api/dashboards', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'd-1', name: 'Q3', widgetIds: [], public: false, createdAt: 't', updatedAt: 't' }) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await b.dashboards.create({ name: 'Q3 Overview' });
  assert.equal(captured.url, 'http://localhost:4874/api/dashboards');
  assert.equal(captured.body.name, 'Q3 Overview');
  restore();
});

test('WidgetsClient.create POSTs to :4874/api/widgets', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'w-1', dashboardId: 'd-1', kind: 'kpi', title: 'MRR', position: { x: 0, y: 0, w: 3, h: 2 }, config: {}, createdAt: 't' }) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await b.widgets.create({ dashboardId: 'd-1', kind: 'kpi', title: 'MRR', position: { x: 0, y: 0, w: 3, h: 2 } });
  assert.equal(captured.url, 'http://localhost:4874/api/widgets');
  assert.equal(captured.body.kind, 'kpi');
  restore();
});

test('WidgetsClient.getData GETs to /widgets/:id/data', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ widgetId: 'w-1', rows: [{ mrr: 42000 }], totals: { mrr: 42000 }, generatedAt: 't' }) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const data = await b.widgets.getData('w-1', { granularity: 'month' });
  assert.equal(captured.url, 'http://localhost:4874/api/widgets/w-1/data?granularity=month');
  assert.equal(data.totals.mrr, 42000);
  restore();
});

test('ReportsClient.generate POSTs to :4874/api/reports/generate', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 202, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'r-1', name: 'Q3', format: 'pdf', status: 'pending', createdAt: 't' }) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await b.reports.generate({ name: 'Q3 Report', format: 'pdf', dashboardId: 'd-1' });
  assert.equal(captured.url, 'http://localhost:4874/api/reports/generate');
  assert.equal(captured.body.format, 'pdf');
  restore();
});

test('ReportsClient.generateAndWait polls until ready', async () => {
  let calls = 0;
  const restore = withFetchMock(async (url: any, _options: any) => {
    calls++;
    if (url.endsWith('/generate')) {
      return { ok: true, status: 202, headers: { get: () => 'application/json' },
        json: async () => ({ id: 'r-1', name: 'Q3', format: 'pdf', status: 'generating', createdAt: 't' }) };
    }
    // poll calls (GET /api/reports/r-1)
    if (calls === 2) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ id: 'r-1', name: 'Q3', format: 'pdf', status: 'ready', downloadUrl: 'https://cdn/r-1.pdf', createdAt: 't' }) };
    }
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'r-1', name: 'Q3', format: 'pdf', status: 'generating', createdAt: 't' }) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const report = await b.reports.generateAndWait({ name: 'Q3', format: 'pdf' }, { pollMs: 5, timeoutMs: 5000 });
  assert.equal(report.status, 'ready');
  assert.equal(report.downloadUrl, 'https://cdn/r-1.pdf');
  restore();
});

test('Bizora client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([]) };
  });
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const items = await b.dashboards.list();
  assert.equal(calls, 3);
  assert.deepEqual(items, []);
  restore();
});

test('Bizora client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const b = new Bizora({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => b.dashboards.get('missing'), /HTTP 404/);
  restore();
});
