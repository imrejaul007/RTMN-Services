/**
 * tenant-manager - vitest unit tests
 * Tests health, validation 400s, and tenant/project/member/key/usage happy paths.
 *
 * NOTE: In-memory PersistentMaps persist for the test run. We use unique slugs
 * per test (Date.now + random) to avoid collisions across runs.
 */
'use strict';

process.env.TENANT_MANAGER_NO_LISTEN = '1';
process.env.TENANT_MANAGER_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app } = require('../../src/index');

let server;
let baseUrl;
let tenantId;
let projectId;
let memberUserId;
let apiKeyId;
let apiKeyPlaintext;
const slug = `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Health', () => {
  test('GET /health returns healthy', async () => {
    const res = await req('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('TenantManager');
  });
  test('GET /api/health returns counts', async () => {
    const res = await req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.tenants).toBeGreaterThanOrEqual(0);
    expect(res.body.projects).toBeGreaterThanOrEqual(0);
  });
  test('GET /ready returns ready', async () => {
    const res = await req('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });
});

describe('Bypass exports', () => {
  test('exports authOrBypass + flags', () => {
    const m = require('../../src/index');
    expect(typeof m.authOrBypass).toBe('function');
    expect(m.TENANT_MANAGER_REQUIRE_AUTH).toBe(false);
    expect(m.TENANT_MANAGER_NO_LISTEN).toBe(true);
    expect(m.SERVICE_NAME).toBe('tenant-manager');
  });
});

describe('Tenant validation', () => {
  test('POST /api/tenants without name returns 400', async () => {
    const res = await req('POST', '/api/tenants', { slug });
    expect(res.status).toBe(400);
  });
  test('POST /api/tenants without slug returns 400', async () => {
    const res = await req('POST', '/api/tenants', { name: 'X' });
    expect(res.status).toBe(400);
  });
  test('POST /api/tenants with unknown plan returns 400', async () => {
    const res = await req('POST', '/api/tenants', { name: 'X', slug: `bad-${Date.now()}`, plan: 'galactic' });
    expect(res.status).toBe(400);
  });
  test('POST /api/tenants with unknown region returns 400', async () => {
    const res = await req('POST', '/api/tenants', { name: 'X', slug: `bad-${Date.now()}`, region: 'mars' });
    expect(res.status).toBe(400);
  });
});

describe('Tenant happy path', () => {
  test('POST /api/tenants creates tenant', async () => {
    const res = await req('POST', '/api/tenants', { name: 'Test Co', slug });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.slug).toBe(slug);
    expect(res.body.plan).toBe('free');
    tenantId = res.body.id;
  });
  test('POST /api/tenants rejects duplicate slug with 409', async () => {
    const res = await req('POST', '/api/tenants', { name: 'Dup', slug });
    expect(res.status).toBe(409);
  });
  test('GET /api/tenants lists', async () => {
    const res = await req('GET', '/api/tenants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tenants)).toBe(true);
  });
  test('GET /api/tenants/:id returns tenant', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tenantId);
  });
  test('GET /api/tenants/by-slug/:slug returns tenant', async () => {
    const res = await req('GET', `/api/tenants/by-slug/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tenantId);
  });
  test('GET /api/tenants/:id 404 for missing', async () => {
    const res = await req('GET', '/api/tenants/missing-id');
    expect(res.status).toBe(404);
  });
  test('PUT /api/tenants/:id updates plan', async () => {
    const res = await req('PUT', `/api/tenants/${tenantId}`, { plan: 'starter' });
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('starter');
  });
  test('PUT /api/tenants/:id rejects unknown plan', async () => {
    const res = await req('PUT', `/api/tenants/${tenantId}`, { plan: 'galactic' });
    expect(res.status).toBe(400);
  });
  test('POST /api/tenants/:id/suspend works', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/suspend`);
    expect(res.status).toBe(200);
    expect(res.body.tenant.status).toBe('suspended');
  });
  test('POST /api/tenants/:id/activate works', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/activate`);
    expect(res.status).toBe(200);
    expect(res.body.tenant.status).toBe('active');
  });
});

describe('Projects', () => {
  test('POST /api/tenants/:id/projects creates project', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/projects`, {
      name: 'Main App', slug: `proj-${Date.now()}`,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    projectId = res.body.id;
  });
  test('POST project without name returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/projects`, { slug: 'x' });
    expect(res.status).toBe(400);
  });
  test('GET /api/tenants/:id/projects lists', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/projects`);
    expect(res.status).toBe(200);
    expect(res.body.projects.length).toBeGreaterThanOrEqual(1);
  });
  test('GET /api/projects/:projectId returns', async () => {
    const res = await req('GET', `/api/projects/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
  });
  test('PUT /api/projects/:projectId updates name', async () => {
    const res = await req('PUT', `/api/projects/${projectId}`, { name: 'Renamed App' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed App');
  });
});

describe('Members', () => {
  test('POST /api/tenants/:id/members adds member', async () => {
    memberUserId = `user_${Date.now()}`;
    const res = await req('POST', `/api/tenants/${tenantId}/members`, {
      userId: memberUserId,
      email: `u${Date.now()}@test.com`,
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('admin');
  });
  test('POST member without userId returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/members`, { email: 'x@y.com' });
    expect(res.status).toBe(400);
  });
  test('POST member with unknown role returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/members`, {
      userId: `u${Date.now()}`, email: 'a@b.com', role: 'god',
    });
    expect(res.status).toBe(400);
  });
  test('GET /api/tenants/:id/members lists', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/members`);
    expect(res.status).toBe(200);
    expect(res.body.members.length).toBeGreaterThanOrEqual(1);
  });
  test('PUT /api/tenants/:id/members/:userId updates role', async () => {
    const res = await req('PUT', `/api/tenants/${tenantId}/members/${memberUserId}`, { role: 'viewer' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('viewer');
  });
  test('PUT member with unknown role returns 400', async () => {
    const res = await req('PUT', `/api/tenants/${tenantId}/members/${memberUserId}`, { role: 'god' });
    expect(res.status).toBe(400);
  });
  test('DELETE /api/tenants/:id/members/:userId removes', async () => {
    const res = await req('DELETE', `/api/tenants/${tenantId}/members/${memberUserId}`);
    expect(res.status).toBe(200);
  });
});

describe('API keys', () => {
  test('POST /api/tenants/:id/keys creates key', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/keys`, {
      name: 'test key', scopes: ['read', 'write'],
    });
    expect(res.status).toBe(201);
    expect(res.body.key).toBeDefined();
    expect(res.body.keyHash).toBeUndefined(); // hash must NOT be exposed
    apiKeyId = res.body.id;
    apiKeyPlaintext = res.body.key;
  });
  test('POST key without name returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/keys`, {});
    expect(res.status).toBe(400);
  });
  test('GET /api/tenants/:id/keys lists (no plaintext)', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/keys`);
    expect(res.status).toBe(200);
    expect(res.body.keys.length).toBeGreaterThanOrEqual(1);
    expect(res.body.keys[0].key).toBeUndefined();
    expect(res.body.keys[0].keyHash).toBeUndefined();
  });
  test('POST /api/keys/validate returns valid for the key', async () => {
    const res = await req('POST', '/api/keys/validate', { key: apiKeyPlaintext });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.tenantId).toBe(tenantId);
  });
  test('POST /api/keys/validate rejects unknown', async () => {
    const res = await req('POST', '/api/keys/validate', { key: 'wrong-key-here' });
    expect(res.status).toBe(404);
  });
  test('POST /api/keys/validate rejects missing', async () => {
    const res = await req('POST', '/api/keys/validate', {});
    expect(res.status).toBe(400);
  });
  test('DELETE /api/tenants/:id/keys/:keyId revokes', async () => {
    const res = await req('DELETE', `/api/tenants/${tenantId}/keys/${apiKeyId}`);
    expect(res.status).toBe(200);
  });
  test('POST /api/keys/validate rejects revoked', async () => {
    const res = await req('POST', '/api/keys/validate', { key: apiKeyPlaintext });
    expect(res.status).toBe(401);
  });
});

describe('Usage', () => {
  test('POST /api/tenants/:id/usage records', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/usage`, { metric: 'calls', quantity: 5 });
    expect(res.status).toBe(201);
    expect(res.body.metric).toBe('calls');
  });
  test('POST usage without metric returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/usage`, { quantity: 1 });
    expect(res.status).toBe(400);
  });
  test('POST usage without number quantity returns 400', async () => {
    const res = await req('POST', `/api/tenants/${tenantId}/usage`, { metric: 'x', quantity: 'lots' });
    expect(res.status).toBe(400);
  });
  test('GET /api/tenants/:id/usage lists', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/usage`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });
  test('GET /api/tenants/:id/usage/aggregate returns metrics', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/usage/aggregate`);
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe(tenantId);
    expect(Array.isArray(res.body.metrics)).toBe(true);
  });
});

describe('Audit', () => {
  test('GET /api/tenants/:id/audit returns entries', async () => {
    const res = await req('GET', `/api/tenants/${tenantId}/audit`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });
  test('GET /api/audit global lists', async () => {
    const res = await req('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });
});

describe('Soft delete', () => {
  test('DELETE /api/tenants/:id soft-deletes', async () => {
    const res = await req('DELETE', `/api/tenants/${tenantId}`);
    expect(res.status).toBe(200);
    expect(res.body.tenant.status).toBe('deleted');
  });
  test('DELETE /api/projects/:projectId deletes project', async () => {
    const res = await req('DELETE', `/api/projects/${projectId}`);
    expect(res.status).toBe(200);
  });
});