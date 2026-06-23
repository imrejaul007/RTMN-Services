/**
 * HTTP route tests for industry-tenant-instances.
 *
 * Mirrors the service-level test surface but exercises the HTTP layer
 * (auth gates, Zod validation, status code mapping, response shapes).
 *
 * ADR-0010 Phase 10 (2026-06-22).
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clear, syncAllIndexes, issueAuthHeaders, issueInternalHeaders, issueNoRoleHeaders, INTERNAL_TOKEN } from '../helpers/db.js';
import routes from '../../src/routes/index.js';

let app;

beforeAll(async () => {
  await connect();
  app = express();
  app.use(express.json());
  app.use(routes);
});

afterEach(async () => {
  await clear();
});

beforeEach(async () => {
  await syncAllIndexes();
});

// =====================================================
// Auth gates
// =====================================================

describe('auth gates', () => {
  it('401 without auth', async () => {
    const res = await request(app).get('/api/instances');
    expect(res.status).toBe(401);
  });

  it('401 with bad internal token', async () => {
    const res = await request(app)
      .get('/api/instances')
      .set('x-internal-token', 'wrong')
      .set('x-tenant-id', 't_admin');
    expect(res.status).toBe(401);
  });

  it('400 with internal token but missing X-Tenant-Id', async () => {
    const res = await request(app).get('/api/instances').set('x-internal-token', INTERNAL_TOKEN);
    expect(res.status).toBe(400);
  });

  it('403 with valid JWT but no industry:admin role', async () => {
    const res = await request(app).get('/api/instances').set(issueNoRoleHeaders());
    expect(res.status).toBe(403);
  });

  it('200 with internal token + X-Tenant-Id', async () => {
    const res = await request(app).get('/api/instances').set(issueInternalHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instances).toBeDefined();
  });

  it('200 with valid admin JWT', async () => {
    const res = await request(app).get('/api/instances').set(issueAuthHeaders());
    expect(res.status).toBe(200);
  });
});

// =====================================================
// Operational
// =====================================================

describe('operational', () => {
  it('GET /health → ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET / → service descriptor', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('industry-tenant-instances');
    expect(res.body.statuses).toContain('ACTIVE');
    expect(res.body.isolationLevels).toContain('SHARED');
    expect(res.body.industries).toContain('healthcare');
  });

  it('GET /api/validate → ok', async () => {
    const res = await request(app).get('/api/validate');
    expect(res.body.ok).toBe(true);
  });
});

// =====================================================
// Provisioning
// =====================================================

describe('provisioning', () => {
  it('POST /api/instances creates an ACTIVE SHARED healthcare instance', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_100', industry: 'healthcare' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.isolationLevel).toBe('SHARED');
    expect(res.body.industry).toBe('healthcare');
    expect(res.body._apiKey).toMatch(/^ik_/);
  });

  it('POST /api/instances → 400 on missing tenantId', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ industry: 'healthcare' });
    expect(res.status).toBe(400);
    expect(res.body.issues.tenantId).toBeDefined();
  });

  it('POST /api/instances → 400 on missing industry', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_101' });
    expect(res.status).toBe(400);
    expect(res.body.issues.industry).toBeDefined();
  });

  it('POST /api/instances → 400 on invalid industry enum', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_101', industry: 'BOGUS' });
    expect(res.status).toBe(400);
  });

  it('POST /api/instances → 400 on invalid isolationLevel', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_101', industry: 'healthcare', isolationLevel: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('POST /api/instances → 409 on duplicate tenant+industry pair', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_102', industry: 'healthcare' });
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_102', industry: 'healthcare' });
    expect(res.status).toBe(409);
  });

  it('POST /api/instances allows different industries for the same tenant', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_103', industry: 'healthcare' });
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_103', industry: 'finance' });
    expect(res.status).toBe(201);
    expect(res.body.industry).toBe('finance');
  });

  it('POST /api/instances with autoActivate + ISOLATED → ACTIVE', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_104', industry: 'healthcare', isolationLevel: 'ISOLATED', autoActivate: true });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.isolationLevel).toBe('ISOLATED');
  });
});

// =====================================================
// Read / List
// =====================================================

describe('read / list', () => {
  it('GET /api/instances/:id → 200', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_200', industry: 'healthcare' });
    const id = created.body.instanceId;
    const res = await request(app).get(`/api/instances/${id}`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('t_200');
    expect(res.body.apiKeyHash).toBeUndefined();
  });

  it('GET /api/instances/:id → 404 on missing', async () => {
    const res = await request(app).get('/api/instances/missing').set(issueAuthHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /api/instances/by-tenant/:tenantId returns active', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_201', industry: 'healthcare' });
    const res = await request(app)
      .get('/api/instances/by-tenant/t_201')
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.industry).toBe('healthcare');
  });

  it('GET /api/instances/by-tenant/:tenantId with industry filter', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_202', industry: 'healthcare' });
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_202', industry: 'finance' });
    const res = await request(app)
      .get('/api/instances/by-tenant/t_202')
      .query({ industry: 'finance' })
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.industry).toBe('finance');
  });

  it('GET /api/instances/by-tenant/:tenantId → 404 on missing', async () => {
    const res = await request(app)
      .get('/api/instances/by-tenant/nope')
      .set(issueAuthHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /api/instances supports industry filter', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_h1', industry: 'healthcare' });
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_f1', industry: 'finance' });
    const res = await request(app)
      .get('/api/instances')
      .query({ industry: 'healthcare' })
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.instances[0].industry).toBe('healthcare');
  });

  it('GET /api/instances supports pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/instances')
        .set(issueAuthHeaders())
        .send({ tenantId: `t_pg_${i}`, industry: 'retail' });
    }
    const res = await request(app)
      .get('/api/instances')
      .query({ limit: 2, offset: 1 })
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.instances.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });
});

// =====================================================
// Update
// =====================================================

describe('update', () => {
  it('PATCH /api/instances/:id updates region and tags', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_300', industry: 'healthcare' });
    const id = created.body.instanceId;
    const res = await request(app)
      .patch(`/api/instances/${id}`)
      .set(issueAuthHeaders())
      .send({ region: 'us-east-1', tags: ['prod'] });
    expect(res.status).toBe(200);
    expect(res.body.region).toBe('us-east-1');
    expect(res.body.tags).toEqual(['prod']);
  });

  it('PATCH /api/instances/:id → 400 on empty patch', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_301', industry: 'healthcare' });
    const res = await request(app)
      .patch(`/api/instances/${created.body.instanceId}`)
      .set(issueAuthHeaders())
      .send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/instances/:id → 422 on DESTROYED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_302', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .patch(`/api/instances/${created.body.instanceId}`)
      .set(issueAuthHeaders())
      .send({ region: 'eu' });
    expect(res.status).toBe(422);
  });

  it('PATCH /api/instances/:id → 400 on invalid isolationLevel', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_303', industry: 'healthcare' });
    const res = await request(app)
      .patch(`/api/instances/${created.body.instanceId}`)
      .set(issueAuthHeaders())
      .send({ isolationLevel: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/instances/:id → 404 on missing', async () => {
    const res = await request(app)
      .patch('/api/instances/missing')
      .set(issueAuthHeaders())
      .send({ region: 'eu' });
    expect(res.status).toBe(404);
  });
});

// =====================================================
// Lifecycle
// =====================================================

describe('lifecycle', () => {
  it('POST /:id/suspend → SUSPENDED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_400', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({ reason: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUSPENDED');
    expect(res.body.metadata.suspensionReason).toBe('maintenance');
  });

  it('POST /:id/suspend → 422 when already SUSPENDED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_401', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({});
    expect(res.status).toBe(422);
  });

  it('POST /:id/resume → ACTIVE', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_402', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/resume`)
      .set(issueAuthHeaders())
      .send();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('POST /:id/destroy → DESTROYED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_403', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({ reason: 'contract ended' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DESTROYED');
  });

  it('POST /:id/destroy → 422 when already DESTROYED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_404', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({});
    expect(res.status).toBe(422);
  });

  it('POST /:id/fail → FAILED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_405', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/fail`)
      .set(issueAuthHeaders())
      .send({ reason: 'infra crash' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FAILED');
  });

  it('POST /:id/fail → 422 on DESTROYED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_406', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/fail`)
      .set(issueAuthHeaders())
      .send({});
    expect(res.status).toBe(422);
  });
});

// =====================================================
// Rotate key
// =====================================================

describe('rotate-key', () => {
  it('POST /:id/rotate-key returns a new key', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_500', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/rotate-key`)
      .set(issueAuthHeaders())
      .send();
    expect(res.status).toBe(200);
    expect(res.body._apiKey).toMatch(/^ik_/);
    expect(res.body._apiKey).not.toBe(created.body._apiKey);
  });

  it('POST /:id/rotate-key → 422 on DESTROYED', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_501', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/rotate-key`)
      .set(issueAuthHeaders())
      .send();
    expect(res.status).toBe(422);
  });
});

// =====================================================
// Health
// =====================================================

describe('health', () => {
  it('POST /:id/health records healthy', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_600', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/health`)
      .set(issueAuthHeaders())
      .send({ status: 'healthy' });
    expect(res.status).toBe(200);
    expect(res.body.healthCheckStatus).toBe('healthy');
    expect(res.body.lastHealthCheckAt).toBeDefined();
  });

  it('POST /:id/health → 400 on invalid status enum', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_601', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/health`)
      .set(issueAuthHeaders())
      .send({ status: 'BOGUS' });
    expect(res.status).toBe(400);
  });
});

// =====================================================
// Usage
// =====================================================

describe('usage', () => {
  it('POST /:id/usage records and GET reads back', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_700', industry: 'healthcare' });
    const post = await request(app)
      .post(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: 100, recordsCreated: 5, workflowsExecuted: 2 });
    expect(post.status).toBe(200);
    expect(post.body.metrics.length).toBeGreaterThan(0);

    const get = await request(app)
      .get(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders());
    expect(get.status).toBe(200);
    expect(get.body.instanceId).toBe(created.body.instanceId);
  });

  it('POST /:id/usage is additive', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_701', industry: 'healthcare' });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: 50 });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: 75 });
    const get = await request(app)
      .get(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders());
    const today = get.body.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.apiCalls).toBe(125);
  });

  it('POST /:id/usage → 400 on negative values', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_702', industry: 'healthcare' });
    const res = await request(app)
      .post(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: -1 });
    expect(res.status).toBe(400);
  });
});

// =====================================================
// Limits + Stats
// =====================================================

describe('limits + stats', () => {
  it('GET /:id/limits returns no violations when within limits', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_800', industry: 'healthcare' });
    const res = await request(app)
      .get(`/api/instances/${created.body.instanceId}/limits`)
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.violations.length).toBe(0);
    expect(res.body.limits.maxApiCallsPerMinute).toBe(600);
  });

  it('GET /:id/limits returns apiCalls violation when exceeded', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_801', industry: 'healthcare', limits: { maxApiCallsPerMinute: 1 } });
    await request(app)
      .post(`/api/instances/${created.body.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: 2000 });
    const res = await request(app)
      .get(`/api/instances/${created.body.instanceId}/limits`)
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.violations.some((v) => v.metric === 'apiCalls')).toBe(true);
  });

  it('GET /api/stats aggregates by status and industry', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_h', industry: 'healthcare' });
    const iso = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_o', industry: 'hotel', isolationLevel: 'ISOLATED' });
    await request(app)
      .post(`/api/instances/${iso.body.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({});
    const res = await request(app).get('/api/stats').set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instances.byStatus.ACTIVE).toBe(1);
    expect(res.body.instances.byStatus.SUSPENDED).toBe(1);
    expect(res.body.instances.byIndustry.healthcare).toBe(1);
    expect(res.body.instances.byIndustry.hotel).toBe(1);
  });

  it('GET /api/stats supports industry filter', async () => {
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_h', industry: 'healthcare' });
    await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_f', industry: 'finance' });
    const res = await request(app)
      .get('/api/stats')
      .query({ industry: 'healthcare' })
      .set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instances.byIndustry.healthcare).toBe(1);
    expect(res.body.instances.byIndustry.finance).toBeUndefined();
  });
});

// =====================================================
// Auth on multiple verbs
// =====================================================

describe('auth on lifecycle verbs', () => {
  it('POST /:id/suspend → 401 without auth', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_900', industry: 'healthcare' });
    const res = await request(app).post(`/api/instances/${created.body.instanceId}/suspend`).send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /:id → 401 without auth', async () => {
    const created = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_901', industry: 'healthcare' });
    const res = await request(app).patch(`/api/instances/${created.body.instanceId}`).send({ region: 'eu' });
    expect(res.status).toBe(401);
  });
});
