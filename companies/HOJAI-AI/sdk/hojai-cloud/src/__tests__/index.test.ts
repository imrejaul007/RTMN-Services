import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cloud } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Cloud client instantiates with 3 sub-clients', () => {
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(c.deployments); assert.ok(c.route); assert.ok(c.health);
});

test('DeploymentsClient.deploy POSTs to :4380/api/v1/deploy', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ projectId: 'p-1', deploymentId: 'd-1', subdomain: 'maya', url: 'https://maya.hojai.app', status: 'live', port: 8801, createdAt: 't' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await c.deployments.deploy({ name: 'maya-store', type: 'marketplace', runtime: 'node-express', manifest: {} });
  assert.equal(captured.url, 'http://localhost:4380/api/v1/deploy');
  assert.equal(captured.body.name, 'maya-store');
  restore();
});

test('DeploymentsClient.list GETs to /api/v1/deployments with filters', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([]) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await c.deployments.list({ status: 'live', limit: 5 });
  assert.equal(captured.url, 'http://localhost:4380/api/v1/deployments?status=live&limit=5');
  restore();
});

test('DeploymentsClient.get fetches by id', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'd-1', projectId: 'p-1', projectName: 'maya', subdomain: 'maya', status: 'live', url: 'https://maya.hojai.app', runtime: 'node-express', manifest: {}, createdAt: 't', updatedAt: 't' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const d = await c.deployments.get('d-1');
  assert.equal(captured.url, 'http://localhost:4380/api/v1/deployments/d-1');
  assert.equal(d.status, 'live');
  restore();
});

test('DeploymentsClient.teardown DELETEs by id', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, method: options.method };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ tornDown: true, id: 'd-1' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const r = await c.deployments.teardown('d-1');
  assert.equal(captured.url, 'http://localhost:4380/api/v1/deployments/d-1');
  assert.equal(captured.method, 'DELETE');
  assert.equal(r.tornDown, true);
  restore();
});

test('DeploymentsClient.deployAndWait polls until live', async () => {
  let calls = 0;
  const restore = withFetchMock(async (url: any, _options: any) => {
    calls++;
    if (url.endsWith('/deploy')) {
      return { ok: true, status: 201, headers: { get: () => 'application/json' },
        json: async () => ({ projectId: 'p-1', deploymentId: 'd-1', subdomain: 'maya', url: 'https://maya.hojai.app', status: 'building', port: 8801, createdAt: 't' }) };
    }
    if (calls === 2) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ id: 'd-1', projectId: 'p-1', projectName: 'maya', subdomain: 'maya', status: 'live', url: 'https://maya.hojai.app', runtime: 'node-express', manifest: {}, createdAt: 't', updatedAt: 't' }) };
    }
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'd-1', projectId: 'p-1', projectName: 'maya', subdomain: 'maya', status: 'starting', url: 'https://maya.hojai.app', runtime: 'node-express', manifest: {}, createdAt: 't', updatedAt: 't' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const dep = await c.deployments.deployAndWait({ name: 'maya', type: 'other', runtime: 'node-express', manifest: {} }, { pollMs: 5, timeoutMs: 5000 });
  assert.equal(dep.status, 'live');
  restore();
});

test('RouteClient.proxy builds the wildcard URL', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, method: options.method };
    return { ok: true, status: 200, headers: { get: () => 'text/plain' }, text: async () => 'OK' };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await c.route.proxy('maya-store', '/api/products');
  assert.equal(captured.url, 'http://localhost:4380/api/v1/route/maya-store/api/products');
  assert.equal(captured.method, 'GET');
  restore();
});

test('HealthClient.get hits /api/v1/health', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok', deployments: 5, live: 4, failed: 0, uptimeSec: 12345, version: '1.0.0' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const h = await c.health.get();
  assert.equal(captured.url, 'http://localhost:4380/api/v1/health');
  assert.equal(h.live, 4);
  assert.equal(h.status, 'ok');
  restore();
});

test('Cloud client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ status: 'ok', deployments: 0, live: 0, failed: 0, uptimeSec: 0, version: '1.0.0' }) };
  });
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const h = await c.health.get();
  assert.equal(calls, 3);
  assert.equal(h.status, 'ok');
  restore();
});

test('Cloud client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const c = new Cloud({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => c.deployments.get('missing'), /HTTP 404/);
  restore();
});
