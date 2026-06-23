/**
 * HTTP route tests — supertest against the Express app with an
 * in-memory MongoDB.
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

// Set env BEFORE importing the app.
process.env.DIRECTORY_REQUIRE_AUTH = 'true';
process.env.DIRECTORY_ALLOW_PUBLIC = 'true';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token-32-bytes-long-xxxxx';
process.env.JWT_SECRET = 'test-jwt-secret-very-long-1234567890';
process.env.JWT_ISSUER = 'rtmn-corpid';
process.env.JWT_AUDIENCE = 'rtmn-api';

const { connectTestDb, disconnectTestDb, clearTestDb } = await import('../helpers/db.js');
const { default: app } = await import('../../src/index.js');

const INTERNAL = { 'x-internal-token': 'test-internal-token-32-bytes-long-xxxxx' };

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

// ─────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns healthy + service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('nexha-business-directory');
  });
});

describe('GET /', () => {
  it('returns service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('nexha-business-directory');
    expect(res.body.endpoints.companies).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// Companies
// ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/companies', () => {
  it('registers a company with internal token', async () => {
    const res = await request(app)
      .post('/api/v1/companies')
      .set(INTERNAL)
      .send({ tenantId: 't-1', name: 'Acme', capabilities: ['logistics'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toMatch(/^co-/);
    expect(res.body.data.capabilities).toEqual(['logistics']);
  });

  it('rejects without auth', async () => {
    const res = await request(app)
      .post('/api/v1/companies')
      .send({ tenantId: 't-1', name: 'Acme' });
    expect(res.status).toBe(401);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/companies')
      .set(INTERNAL)
      .send({ tenantId: 't-1' });
    expect(res.status).toBe(400);
  });

  it('is idempotent on (tenantId, name)', async () => {
    const a = await request(app)
      .post('/api/v1/companies')
      .set(INTERNAL)
      .send({ tenantId: 't-1', name: 'Acme', capabilities: ['x'] });
    const b = await request(app)
      .post('/api/v1/companies')
      .set(INTERNAL)
      .send({ tenantId: 't-1', name: 'Acme', capabilities: ['x', 'y'] });
    expect(b.body.data.companyId).toBe(a.body.data.companyId);
    expect(b.body.data.capabilities).toEqual(['x', 'y']);
  });
});

describe('GET /api/v1/companies', () => {
  it('lists companies for the calling tenant', async () => {
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Globex' });
    const res = await request(app).get('/api/v1/companies').set(INTERNAL);
    expect(res.body.data.items.length).toBe(2);
  });

  it('respects limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: `co-${i}` });
    }
    const res = await request(app).get('/api/v1/companies?limit=2&offset=1').set(INTERNAL);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.offset).toBe(1);
    expect(res.body.data.total).toBe(5);
  });
});

describe('GET /api/v1/companies/:id', () => {
  it('returns the company', async () => {
    const created = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    const res = await request(app).get(`/api/v1/companies/${created.body.data.companyId}`).set(INTERNAL);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Acme');
  });

  it('404 for missing company', async () => {
    const res = await request(app).get('/api/v1/companies/co-missing').set(INTERNAL);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/companies/:id', () => {
  it('updates allowed fields', async () => {
    const created = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    const res = await request(app)
      .patch(`/api/v1/companies/${created.body.data.companyId}`)
      .set(INTERNAL)
      .set('x-tenant-id', 't-1')
      .send({ description: 'updated', verificationLevel: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('updated');
    expect(res.body.data.verificationLevel).toBe(2);
  });

  it('404 when tenant mismatch', async () => {
    const created = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    const res = await request(app)
      .patch(`/api/v1/companies/${created.body.data.companyId}`)
      .set('x-internal-token', 'test-internal-token-32-bytes-long-xxxxx')
      .set('x-tenant-id', 't-other')
      .send({ description: 'hijack' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/companies/:id', () => {
  it('cascades to agents', async () => {
    const co = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    await request(app).post(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL).send({ tenantId: 't-1', agentId: 'a-1' });
    const del = await request(app)
      .delete(`/api/v1/companies/${co.body.data.companyId}`)
      .set(INTERNAL)
      .set('x-tenant-id', 't-1');
    expect(del.status).toBe(200);
    const after = await request(app).get(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL);
    expect(after.body.data.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/companies/:id/agents', () => {
  it('registers an agent', async () => {
    const co = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    const res = await request(app)
      .post(`/api/v1/companies/${co.body.data.companyId}/agents`)
      .set(INTERNAL)
      .send({ tenantId: 't-1', agentId: 'a-1', capabilities: ['negotiate'] });
    expect(res.status).toBe(201);
    expect(res.body.data.agentId).toBe('a-1');
  });

  it('404 when company does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/companies/co-missing/agents')
      .set(INTERNAL)
      .send({ tenantId: 't-1', agentId: 'a-1' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/companies/:id/agents', () => {
  it('lists agents', async () => {
    const co = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    await request(app).post(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL).send({ tenantId: 't-1', agentId: 'a-1' });
    await request(app).post(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL).send({ tenantId: 't-1', agentId: 'a-2' });
    const res = await request(app).get(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL);
    expect(res.body.data.total).toBe(2);
  });
});

describe('GET /api/v1/agents/:agentId', () => {
  it('returns the agent', async () => {
    const co = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme' });
    await request(app).post(`/api/v1/companies/${co.body.data.companyId}/agents`).set(INTERNAL).send({ tenantId: 't-1', agentId: 'a-1' });
    const res = await request(app).get('/api/v1/agents/a-1').set(INTERNAL);
    expect(res.status).toBe(200);
    expect(res.body.data.agentId).toBe('a-1');
  });

  it('404 for missing', async () => {
    const res = await request(app).get('/api/v1/agents/a-missing').set(INTERNAL);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────

describe('GET /api/v1/capabilities', () => {
  it('finds companies by capability', async () => {
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme', capabilities: ['logistics'] });
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Globex', capabilities: ['wholesale'] });
    const res = await request(app).get('/api/v1/capabilities?capability=logistics');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].name).toBe('Acme');
  });

  it('accepts multiple capabilities (comma-separated)', async () => {
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme', capabilities: ['logistics'] });
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Globex', capabilities: ['wholesale'] });
    const res = await request(app).get('/api/v1/capabilities?capability=logistics,wholesale');
    expect(res.body.data.items.length).toBe(2);
  });

  it('combines capability + free-text query', async () => {
    await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme Logistics', capabilities: ['logistics'], description: 'fast' });
    const res = await request(app).get('/api/v1/capabilities?capability=logistics&q=fast');
    expect(res.body.data.items.length).toBe(1);
  });

  it('works without auth (public endpoint)', async () => {
    const res = await request(app).get('/api/v1/capabilities');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/trust', () => {
  it('returns trust linkage for the requested ids', async () => {
    const co = await request(app).post('/api/v1/companies').set(INTERNAL).send({ tenantId: 't-1', name: 'Acme', trustEntityId: 'tr-1' });
    const res = await request(app)
      .get(`/api/v1/trust?companyIds=${co.body.data.companyId},co-missing`)
      .set(INTERNAL);
    expect(res.status).toBe(200);
    expect(res.body.data[co.body.data.companyId].trustEntityId).toBe('tr-1');
    expect(res.body.data['co-missing']).toBeUndefined();
  });

  it('rejects without auth', async () => {
    const res = await request(app).get('/api/v1/trust?companyIds=co-1');
    expect(res.status).toBe(401);
  });

  it('caps companyIds at 200', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `co-${i}`).join(',');
    const res = await request(app).get(`/api/v1/trust?companyIds=${ids}`).set(INTERNAL);
    expect(res.status).toBe(200);
  });
});
