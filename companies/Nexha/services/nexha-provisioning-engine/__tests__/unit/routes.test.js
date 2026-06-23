/**
 * Tests for HTTP routes — end-to-end via supertest.
 * Covers: create, list, get, transition, apply, fail-resource, outputs,
 * cancel, destroy, mark-destroyed, plan.json/yaml download, events, stats.
 * Auth: JWT and internal token paths.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import { setupTestDb, clearTestDb, teardownTestDb, syncIndexes } from '../helpers/db.js';

let router;

const JWT_SECRET = 'test-jwt-secret';
const INTERNAL_TOKEN = 'test-internal-token';

function makeToken(tenantId, roles = ['provisioning:admin'], subject = 'test-user') {
  return jwt.sign({ tenantId, roles, sub: subject }, JWT_SECRET);
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.use((err, req, res, next) => {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: 'internal' });
  });
  return app;
}

beforeAll(async () => {
  process.env.PROVISIONING_ENGINE_JWT_SECRET = JWT_SECRET;
  process.env.PROVISIONING_ENGINE_INTERNAL_TOKEN = INTERNAL_TOKEN;
  await setupTestDb();
  await syncIndexes();
  const mod = await import('../../src/routes/index.js');
  router = mod.default;
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('auth', () => {
  it('rejects requests with no credentials', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(401);
  });

  it('rejects requests with bad internal token', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/plans').set('x-internal-token', 'wrong');
    expect(res.status).toBe(401);
  });

  it('rejects internal token without x-tenant-id', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/plans').set('x-internal-token', INTERNAL_TOKEN);
    expect(res.status).toBe(400);
  });

  it('accepts internal token with x-tenant-id', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/plans').set('x-internal-token', INTERNAL_TOKEN).set('x-tenant-id', 't1');
    expect(res.status).toBe(200);
  });

  it('rejects JWT without provisioning:admin role', async () => {
    const app = makeApp();
    const token = makeToken('t1', ['other:role']);
    const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects JWT without tenantId claim', async () => {
    const app = makeApp();
    const token = jwt.sign({ roles: ['provisioning:admin'] }, JWT_SECRET);
    const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('accepts valid JWT', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/plans', () => {
  it('creates a plan', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetInstanceKind: 'industry-tenant-instance',
        targetInstanceId: 'iti_abc123',
        isolationLevel: 'DEDICATED',
        region: 'us-east-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.planId).toMatch(/^pln_/);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.tenantId).toBe('t1');
  });

  it('rejects bad payload (missing region)', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetInstanceKind: 'industry-tenant-instance',
        targetInstanceId: 'iti_abc',
        isolationLevel: 'SHARED',
      });
    expect(res.status).toBe(400);
  });

  it('rejects bad isolationLevel', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetInstanceKind: 'industry-tenant-instance',
        targetInstanceId: 'iti_abc',
        isolationLevel: 'BOGUS',
        region: 'us-east-1',
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/plans', () => {
  it('lists plans for the JWT tenant only', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_a',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_b',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t2}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_c',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${t1}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it('internal token sees all plans', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_a',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get('/api/plans').set('x-internal-token', INTERNAL_TOKEN).set('x-tenant-id', 'any');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/plans/:planId', () => {
  it('returns the plan for its tenant', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get(`/api/plans/${create.body.planId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.planId).toBe(create.body.planId);
  });

  it('returns 404 for other tenant (no info leak)', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get(`/api/plans/${create.body.planId}`).set('Authorization', `Bearer ${t2}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/plans/:planId/plan.{json,yaml}', () => {
  it('serves plan.json with content-type', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).get(`/api/plans/${create.body.planId}/plan.json`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    expect(body.apiVersion).toBe('rtmn.io/v1');
  });

  it('serves plan.yaml with content-type', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).get(`/api/plans/${create.body.planId}/plan.yaml`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toContain('apiVersion: rtmn.io/v1');
  });
});

describe('POST /api/plans/:planId/transition', () => {
  it('transitions PENDING → APPLYING', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'APPLYING' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPLYING');
  });

  it('rejects invalid transition with 422', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'READY' });
    expect(res.status).toBe(422);
    expect(res.body.from).toBe('PENDING');
    expect(res.body.to).toBe('READY');
  });

  it('rejects bad toStatus value', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'BOGUS' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/plans/:planId/{apply,fail-resource,outputs}', () => {
  let planId;
  beforeEach(async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    planId = create.body.planId;
    await request(app).post(`/api/plans/${planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'APPLYING' });
  });

  it('apply records outputs', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post(`/api/plans/${planId}/apply`).set('Authorization', `Bearer ${token}`).send({ resourceName: 'r1', outputs: { host: 'x.local' } });
    expect(res.status).toBe(200);
    expect(res.body.outputs.r1.host).toBe('x.local');
  });

  it('fail-resource records failure reason', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post(`/api/plans/${planId}/fail-resource`).set('Authorization', `Bearer ${token}`).send({ resourceName: 'r1', reason: 'timeout' });
    expect(res.status).toBe(200);
    expect(res.body.failureReason).toContain('timeout');
  });

  it('outputs records outputs (merge)', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post(`/api/plans/${planId}/outputs`).set('Authorization', `Bearer ${token}`).send({ a: 1, b: 2 });
    expect(res.status).toBe(200);
    expect(res.body.outputs).toEqual({ a: 1, b: 2 });
  });
});

describe('POST /api/plans/:planId/{cancel,destroy,mark-destroyed}', () => {
  it('cancel transitions to CANCELLED', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).post(`/api/plans/${create.body.planId}/cancel`).set('Authorization', `Bearer ${token}`).send({ reason: 'no need' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('destroy transitions to DESTROYING', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'APPLYING' });
    await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'READY' });
    const res = await request(app).post(`/api/plans/${create.body.planId}/destroy`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DESTROYING');
  });

  it('mark-destroyed transitions DESTROYING → DESTROYED', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'APPLYING' });
    await request(app).post(`/api/plans/${create.body.planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus: 'READY' });
    await request(app).post(`/api/plans/${create.body.planId}/destroy`).set('Authorization', `Bearer ${token}`).send({});
    const res = await request(app).post(`/api/plans/${create.body.planId}/mark-destroyed`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DESTROYED');
  });
});

describe('GET /api/plans/:planId/events', () => {
  it('returns the event log', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_x',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).get(`/api/plans/${create.body.planId}/events`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].type).toBe('plan.created');
  });
});

describe('GET /api/stats', () => {
  it('returns aggregate stats for the tenant', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_a',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_b',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byStatus.PENDING).toBe(2);
    expect(res.body.byIsolation.SHARED).toBe(1);
  });

  it('JWT does not leak other tenants in stats', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_a',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t2}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_b',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${t1}`);
    expect(res.body.total).toBe(1);
  });

  it('internal token can scope by ?tenantId=', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t1}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_a',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    await request(app).post('/api/plans').set('Authorization', `Bearer ${t2}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_b',
      isolationLevel: 'SHARED', region: 'us-east-1',
    });
    const res = await request(app).get('/api/stats?tenantId=t2').set('x-internal-token', INTERNAL_TOKEN).set('x-tenant-id', 'any');
    expect(res.body.total).toBe(1);
  });
});

describe('end-to-end lifecycle', () => {
  it('full happy path: PENDING → APPLYING → READY → DESTROYING → DESTROYED', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/plans').set('Authorization', `Bearer ${token}`).send({
      targetInstanceKind: 'industry-tenant-instance', targetInstanceId: 'iti_e2e',
      isolationLevel: 'DEDICATED', region: 'us-east-1',
    });
    const planId = create.body.planId;
    for (const toStatus of ['APPLYING', 'READY', 'DESTROYING', 'DESTROYED']) {
      const res = await request(app).post(`/api/plans/${planId}/transition`).set('Authorization', `Bearer ${token}`).send({ toStatus });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(toStatus);
    }
    const final = await request(app).get(`/api/plans/${planId}`).set('Authorization', `Bearer ${token}`);
    expect(final.body.destroyedAt).toBeDefined();
  });
});
