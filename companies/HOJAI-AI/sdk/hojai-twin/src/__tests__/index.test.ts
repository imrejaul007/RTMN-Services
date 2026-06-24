import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Twin } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Twin client instantiates with all 5 sub-clients', () => {
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(t.hub); assert.ok(t.customer); assert.ok(t.order); assert.ok(t.employee); assert.ok(t.voice);
});

test('TwinHubClient.create POSTs to :4705/api/twins', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 't-1', type: 'product', name: 'Tee', attributes: {}, createdAt: 't', updatedAt: 't' }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await t.hub.create({ type: 'product', name: 'Tee' });
  assert.equal(captured.url, 'http://localhost:4705/api/twins');
  assert.equal(captured.body.type, 'product');
  restore();
});

test('CustomerTwinClient.createCustomer POSTs to :4895/api/twins/customer', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'c-1', corpId: 'corp-1', name: 'Alice', ltv: { amount: 0, currency: 'USD' }, churnRisk: 0, segments: [], behavior: {}, createdAt: 't', updatedAt: 't' }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await t.customer.createCustomer({ corpId: 'corp-1', name: 'Alice' });
  assert.equal(captured.url, 'http://localhost:4895/api/twins/customer');
  restore();
});

test('OrderTwinClient.transitionStatus POSTs to :5310/api/twins/order/:id/status', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, method: options.method, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'o-1', customerId: 'c-1', status: 'shipped', lines: [], total: { amount: 0, currency: 'USD' }, createdAt: 't', updatedAt: 't' }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await t.order.transitionStatus('o-1', 'shipped');
  assert.equal(captured.url, 'http://localhost:5310/api/twins/order/o-1/status');
  assert.equal(captured.body.status, 'shipped');
  restore();
});

test('EmployeeTwinClient.addSkill POSTs to :4730/api/twins/employee/:id/skills', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'e-1', userId: 'u-1', name: 'Alice', email: 'a@b.com', role: 'eng', hireDate: 't', skills: ['typescript'], status: 'active', createdAt: 't', updatedAt: 't' }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await t.employee.addSkill('e-1', 'typescript');
  assert.equal(captured.url, 'http://localhost:4730/api/twins/employee/e-1/skills');
  assert.equal(captured.body.skill, 'typescript');
  restore();
});

test('VoiceTwinClient.synthesize POSTs to :4876/api/synthesize', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'r-1', voiceProfileId: 'v-1', text: 'hi', audioUrl: 'https://x/a.mp3', durationSec: 1, charCount: 2, createdAt: 't' }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await t.voice.synthesize({ voiceProfileId: 'v-1', text: 'hi' });
  assert.equal(captured.url, 'http://localhost:4876/api/synthesize');
  restore();
});

test('Twin client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ totalTwins: 0, byType: {}, totalRelationships: 0, activeSyncs: 0, archivedTwins: 0 }) };
  });
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const stats = await t.hub.stats();
  assert.equal(calls, 3);
  assert.equal(stats.totalTwins, 0);
  restore();
});

test('Twin client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const t = new Twin({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => t.hub.get('missing'), /HTTP 404/);
  restore();
});
