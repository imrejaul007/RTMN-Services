/**
 * HTTP route tests.
 *
 * ADR-0010 Phase 9 (2026-06-22).
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { connect, disconnect, clear, syncAllIndexes } from '../helpers/db.js';
import {
  issueAuthHeaders,
  issueInternalHeaders,
  issueNoRoleHeaders,
  INTERNAL_TOKEN,
} from '../helpers/db.js';
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

  it('403 with valid JWT but no sutar:admin role', async () => {
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
    expect(res.body.service).toBe('sutar-tenant-instances');
    expect(res.body.statuses).toContain('ACTIVE');
    expect(res.body.isolationLevels).toContain('SHARED');
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
  it('POST /api/instances creates an ACTIVE SHARED instance', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_100' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.isolationLevel).toBe('SHARED');
    expect(res.body._apiKey).toMatch(/^sk_/);
  });

  it('POST /api/instances → 400 on missing tenantId', async () => {
    const res = await request(app).post('/api/instances').set(issueAuthHeaders()).send({});
    expect(res.status).toBe(400);
    expect(res.body.issues.tenantId).toBeDefined();
  });

  it('POST /api/instances → 400 on invalid isolationLevel', async () => {
    const res = await request(app)
      .post('/api/instances')
      .set(issueAuthHeaders())
      .send({ tenantId: 't_101', isolationLevel: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('POST /api/instances → 409 on duplicate active tenant', async () => {
    await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_102' });
    const res = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_102' });
    expect(res.status).toBe(409);
  });
});

// =====================================================
// Read endpoints
// =====================================================

describe('read endpoints', () => {
  let inst;

  beforeEach(async () => {
    const res = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_200' });
    inst = res.body;
  });

  it('GET /api/instances lists all', async () => {
    const res = await request(app).get('/api/instances').set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instances.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /api/instances?status=ACTIVE filters', async () => {
    const res = await request(app)
      .get('/api/instances')
      .query({ status: 'ACTIVE' })
      .set(issueAuthHeaders());
    expect(res.body.instances.every((i) => i.status === 'ACTIVE')).toBe(true);
  });

  it('GET /api/instances/:id returns one', async () => {
    const res = await request(app).get(`/api/instances/${inst.instanceId}`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instanceId).toBe(inst.instanceId);
  });

  it('GET /api/instances/:id → 404 on unknown', async () => {
    const res = await request(app).get('/api/instances/missing').set(issueAuthHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /api/instances/by-tenant/:tenantId returns the active one', async () => {
    const res = await request(app).get('/api/instances/by-tenant/t_200').set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instanceId).toBe(inst.instanceId);
  });

  it('GET /api/instances/by-tenant/:tenantId → 404 if none', async () => {
    const res = await request(app).get('/api/instances/by-tenant/nobody').set(issueAuthHeaders());
    expect(res.status).toBe(404);
  });
});

// =====================================================
// Update
// =====================================================

describe('update', () => {
  it('PATCH /api/instances/:id updates region', async () => {
    const created = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_300' });
    const res = await request(app)
      .patch(`/api/instances/${created.body.instanceId}`)
      .set(issueAuthHeaders())
      .send({ region: 'eu-west-1' });
    expect(res.status).toBe(200);
    expect(res.body.region).toBe('eu-west-1');
  });

  it('PATCH /api/instances/:id → 400 on empty patch', async () => {
    const created = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_301' });
    const res = await request(app)
      .patch(`/api/instances/${created.body.instanceId}`)
      .set(issueAuthHeaders())
      .send({});
    expect(res.status).toBe(400);
  });
});

// =====================================================
// Lifecycle actions
// =====================================================

describe('lifecycle via HTTP', () => {
  let inst;

  beforeEach(async () => {
    const res = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_400' });
    inst = res.body;
  });

  it('suspend → status SUSPENDED', async () => {
    const res = await request(app)
      .post(`/api/instances/${inst.instanceId}/suspend`)
      .set(issueAuthHeaders())
      .send({ reason: 'maint' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUSPENDED');
    expect(res.body.metadata.suspensionReason).toBe('maint');
  });

  it('resume → status ACTIVE', async () => {
    await request(app).post(`/api/instances/${inst.instanceId}/suspend`).set(issueAuthHeaders());
    const res = await request(app).post(`/api/instances/${inst.instanceId}/resume`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('destroy → status DESTROYED', async () => {
    const res = await request(app)
      .post(`/api/instances/${inst.instanceId}/destroy`)
      .set(issueAuthHeaders())
      .send({ reason: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DESTROYED');
  });

  it('fail → status FAILED', async () => {
    const res = await request(app)
      .post(`/api/instances/${inst.instanceId}/fail`)
      .set(issueAuthHeaders())
      .send({ reason: 'crash' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('FAILED');
  });

  it('suspend → 422 on already-DESTROYED', async () => {
    await request(app).post(`/api/instances/${inst.instanceId}/destroy`).set(issueAuthHeaders());
    const res = await request(app).post(`/api/instances/${inst.instanceId}/suspend`).set(issueAuthHeaders());
    expect(res.status).toBe(422);
  });

  it('rotate-key → returns a new api key', async () => {
    const res = await request(app).post(`/api/instances/${inst.instanceId}/rotate-key`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body._apiKey).toMatch(/^sk_/);
  });
});

// =====================================================
// Health + usage
// =====================================================

describe('health + usage', () => {
  let inst;

  beforeEach(async () => {
    const res = await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_500' });
    inst = res.body;
  });

  it('POST /health records healthy', async () => {
    const res = await request(app)
      .post(`/api/instances/${inst.instanceId}/health`)
      .set(issueAuthHeaders())
      .send({ status: 'healthy' });
    expect(res.status).toBe(200);
    expect(res.body.healthCheckStatus).toBe('healthy');
  });

  it('POST /health → 400 on bad status', async () => {
    const res = await request(app)
      .post(`/api/instances/${inst.instanceId}/health`)
      .set(issueAuthHeaders())
      .send({ status: 'BOGUS' });
    expect(res.status).toBe(400);
  });

  it('POST /usage records and GET /usage reads', async () => {
    await request(app)
      .post(`/api/instances/${inst.instanceId}/usage`)
      .set(issueAuthHeaders())
      .send({ apiCalls: 200, missionsCreated: 10 });
    const res = await request(app).get(`/api/instances/${inst.instanceId}/usage`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    const today = res.body.metrics.find((m) => m.date === new Date().toISOString().slice(0, 10));
    expect(today.apiCalls).toBe(200);
    expect(today.missionsCreated).toBe(10);
  });

  it('GET /limits → 200', async () => {
    const res = await request(app).get(`/api/instances/${inst.instanceId}/limits`).set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.violations).toBeDefined();
  });
});

// =====================================================
// Stats
// =====================================================

describe('stats', () => {
  it('GET /api/stats returns aggregates', async () => {
    await request(app).post('/api/instances').set(issueAuthHeaders()).send({ tenantId: 't_600' });
    const res = await request(app).get('/api/stats').set(issueAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.instances.byStatus).toBeDefined();
    expect(res.body.instances.byIsolation).toBeDefined();
  });
});