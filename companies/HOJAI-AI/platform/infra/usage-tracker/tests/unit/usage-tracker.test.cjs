'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';

const app = require('../../src/index.js');

let server;
let baseURL;

function req(method, path, body) {
  return new Promise((resolve) => {
    const url = new URL(path, baseURL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'dev-token',
      },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseURL = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => { if (server) server.close(); });

describe('Health & Lifecycle', () => {
  test('GET /health -> 200', async () => {
    const r = await req('GET', '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'ok');
  });
  test('GET /ready -> 200', async () => {
    const r = await req('GET', '/ready');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ready, true);
  });
});

describe('Usage Recording', () => {
  test('POST /api/usage/record -> 201', async () => {
    const r = await req('POST', '/api/usage/record', {
      tenantId: 'test-tenant', providerId: 'test-provider', serviceId: 'test-service',
      metric: 'api_call', quantity: 10, unit: 'calls',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.record.metric, 'api_call');
  });
  test('POST /api/usage/record -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/usage/record', { tenantId: 't' });
    assert.strictEqual(r.status, 400);
  });
  test('GET /api/usage -> 200', async () => {
    const r = await req('GET', '/api/usage');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.records));
    assert.ok(r.body.records.length >= 60);
  });
  test('GET /api/usage?tenantId=tenant-restaurant-001 -> filters', async () => {
    const r = await req('GET', '/api/usage?tenantId=tenant-restaurant-001');
    assert.strictEqual(r.status, 200);
    r.body.records.forEach((rec) => assert.strictEqual(rec.tenantId, 'tenant-restaurant-001'));
  });
  test('GET /api/usage/aggregate/:key -> 200', async () => {
    const r = await req('GET', '/api/usage/aggregate/tenant-restaurant-001');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.groups);
  });
});

describe('Billing', () => {
  test('POST /api/billing/generate -> 201', async () => {
    const r = await req('POST', '/api/billing/generate', {
      tenantId: 'tenant-restaurant-001',
      periodStart: Date.now() - 86400000 * 7,
      periodEnd: Date.now(),
    });
    assert.strictEqual(r.status, 201);
    assert.ok(r.body.invoice);
  });
  test('POST /api/billing/generate -> 400 for missing', async () => {
    const r = await req('POST', '/api/billing/generate', { tenantId: 't' });
    assert.strictEqual(r.status, 400);
  });
  test('GET /api/billing -> 200', async () => {
    const r = await req('GET', '/api/billing');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.invoices));
  });
  test('GET /api/billing/:id -> 200', async () => {
    const r = await req('GET', '/api/billing');
    const inv = r.body.invoices[0];
    const r2 = await req('GET', '/api/billing/' + inv.id);
    assert.strictEqual(r2.status, 200);
  });
});

describe('Plans', () => {
  test('GET /api/plans -> 200', async () => {
    const r = await req('GET', '/api/plans');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.plans));
  });
  test('POST /api/plans -> 201', async () => {
    const r = await req('POST', '/api/plans', {
      name: 'Test Plan',
      pricing: { llm_tokens: 0.00005, api_call: 0.002 },
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.plan.name, 'Test Plan');
  });
  test('POST /api/plans -> 400 for missing', async () => {
    const r = await req('POST', '/api/plans', { name: 'No Pricing' });
    assert.strictEqual(r.status, 400);
  });
});

describe('Quotas', () => {
  test('GET /api/quotas/:tenantId -> 200', async () => {
    const r = await req('GET', '/api/quotas/tenant-restaurant-001');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.quota);
  });
  test('POST /api/quotas/:tenantId -> 201', async () => {
    const r = await req('POST', '/api/quotas/test-tenant', {
      quota: { llm_tokens: 1000000, api_call: 50000 },
    });
    assert.strictEqual(r.status, 201);
  });
});

describe('Revenue Share', () => {
  test('GET /api/revenue/share/:providerId -> 200', async () => {
    const r = await req('GET', '/api/revenue/share/provider-inference-gateway');
    assert.strictEqual(r.status, 200);
    assert.ok('totalEarned' in r.body);
    assert.ok('platformFee' in r.body);
  });
});

describe('Root', () => {
  test('GET / -> 200', async () => {
    const r = await req('GET', '/');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.service, 'sutar-usage-tracker');
  });
});
