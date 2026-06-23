/**
 * HTTP route tests for nexha-mission-planner — exercises every endpoint
 * via supertest, including auth gates, validation, and lifecycle flows.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { app } from '../../src/index.js';
import { Mission } from '../../src/models/Mission.js';
import { MissionTemplate } from '../../src/models/MissionTemplate.js';
import * as crypto from 'node:crypto';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-1234567890';
  process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  for (const name of (await import('mongoose')).default.modelNames()) {
    try {
      await (await import('mongoose')).default.model(name).syncIndexes();
    } catch {
      // ignore
    }
  }
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'test-secret').update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${sig}`;
}

function authFor(tenantId, roles = ['user']) {
  return `Bearer ${makeJwt({ sub: `${tenantId}-user`, tenantId, roles, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
}

const INTERNAL_TOKEN = 'test-internal-token';

// -----------------------------------------------------------------------------
// Health + meta
// -----------------------------------------------------------------------------

describe('health endpoints', () => {
  test('GET /health returns healthy', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('healthy');
    expect(r.body.service).toBe('nexha-mission-planner');
  });

  test('GET / redirects to /health', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(302);
  });

  test('GET /ready returns ready', async () => {
    const r = await request(app).get('/ready');
    expect(r.status).toBe(200);
    expect(r.body.ready).toBe(true);
  });

  test('GET /internal/sanity requires token', async () => {
    const r = await request(app).get('/internal/sanity');
    expect(r.status).toBe(401);
  });

  test('GET /internal/sanity with valid token returns ok', async () => {
    const r = await request(app).get('/internal/sanity').set('x-internal-token', INTERNAL_TOKEN);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Auth gates
// -----------------------------------------------------------------------------

describe('auth gates', () => {
  test('POST /api/missions requires auth', async () => {
    const r = await request(app).post('/api/missions').send({ name: 'X' });
    expect(r.status).toBe(401);
  });

  test('POST /api/missions with bad JWT → 401', async () => {
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', 'Bearer garbage')
      .send({ name: 'X' });
    expect(r.status).toBe(401);
  });

  test('POST /api/missions with expired JWT → 401', async () => {
    const expired = makeJwt({ sub: 'u', tenantId: 't', exp: 1 });
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', `Bearer ${expired}`)
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    expect(r.status).toBe(401);
  });

  test('POST /api/missions with x-internal-token is accepted', async () => {
    const r = await request(app)
      .post('/api/missions')
      .set('x-internal-token', INTERNAL_TOKEN)
      .set('x-tenant-id', 'tenant-x')
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    expect(r.status).toBe(201);
    expect(r.body.tenantId).toBe('tenant-x');
  });
});

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

describe('validation', () => {
  test('POST /api/validate returns valid:true for valid payload', async () => {
    const r = await request(app).post('/api/validate').send({
      name: 'X',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    expect(r.status).toBe(200);
    expect(r.body.valid).toBe(true);
  });

  test('POST /api/validate returns 400 for invalid payload', async () => {
    const r = await request(app).post('/api/validate').send({ name: '' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('MISSION_VALIDATION_ERROR');
    expect(r.body.issues).toBeTruthy();
  });

  test('POST /api/missions rejects empty body (no templateId, no subtasks)', async () => {
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X' });
    expect(r.status).toBe(400);
  });

  test('POST /api/missions rejects invalid subtask type', async () => {
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        subtasks: [{ name: 's', type: 'BAD', capability: 'c' }],
      });
    expect(r.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// Mission CRUD
// -----------------------------------------------------------------------------

describe('mission CRUD', () => {
  test('POST /api/missions creates a mission', async () => {
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'Build HQ',
        subtasks: [
          { name: 'Find architect', type: 'find-supplier', capability: 'supplier-registry' },
          { name: 'Sign contract', type: 'execute-acp-message', capability: 'acp-messaging' },
        ],
      });
    expect(r.status).toBe(201);
    expect(r.body.missionId).toBeTruthy();
    expect(r.body.status).toBe('DRAFT');
    expect(r.body.subtasks).toHaveLength(2);
  });

  test('GET /api/missions lists per-tenant', async () => {
    await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'A', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-b'))
      .send({ name: 'B', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app).get('/api/missions').set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].name).toBe('A');
  });

  test('GET /api/missions?status=PLANNED filters', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const r = await request(app).get('/api/missions?status=PLANNED').set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(1);
  });

  test('GET /api/missions/:missionId returns the mission', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .get(`/api/missions/${create.body.missionId}`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.name).toBe('X');
  });

  test('GET /api/missions/:missionId 404 for missing', async () => {
    const r = await request(app)
      .get('/api/missions/nope')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(404);
  });

  test('PATCH /api/missions/:missionId updates', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .patch(`/api/missions/${create.body.missionId}`)
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'Y', priority: 9 });
    expect(r.status).toBe(200);
    expect(r.body.name).toBe('Y');
    expect(r.body.priority).toBe(9);
  });

  test('PATCH rejects invalid priority', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .patch(`/api/missions/${create.body.missionId}`)
      .set('Authorization', authFor('tenant-a'))
      .send({ priority: 99 });
    expect(r.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// plan / start / pause / cancel / retry
// -----------------------------------------------------------------------------

describe('mission state actions', () => {
  test('POST /plan with assignments resolves agents', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        subtasks: [
          { name: 'A', type: 'find-supplier', capability: 'supplier-registry' },
          { name: 'B', type: 'negotiate-price', capability: 'pricing-network' },
        ],
      });
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({
        assignments: {
          'supplier-registry': { agentId: 'sup-1', tenantId: 'tenant-x' },
          'pricing-network': { agentId: 'pri-1', tenantId: 'tenant-y' },
        },
      });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('PLANNED');
    expect(r.body.subtasks[0].assignedAgent).toBe('sup-1');
    expect(r.body.subtasks[1].assignedAgent).toBe('pri-1');
  });

  test('POST /plan with no assignments still promotes to PLANNED', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('PLANNED');
  });

  test('POST /plan on non-DRAFT → 422', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(422);
  });

  test('POST /start transitions PLANNED to EXECUTING', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/start`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('EXECUTING');
  });

  test('POST /pause then /start resumes', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    await request(app)
      .post(`/api/missions/${create.body.missionId}/start`)
      .set('Authorization', authFor('tenant-a'));
    const pause = await request(app)
      .post(`/api/missions/${create.body.missionId}/pause`)
      .set('Authorization', authFor('tenant-a'));
    expect(pause.body.status).toBe('PAUSED');
    const start = await request(app)
      .post(`/api/missions/${create.body.missionId}/start`)
      .set('Authorization', authFor('tenant-a'));
    expect(start.body.status).toBe('EXECUTING');
  });

  test('POST /cancel works from DRAFT', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/cancel`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('CANCELLED');
  });

  test('POST /cancel on COMPLETED → 422', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const stId = create.body.subtasks[0].subtaskId;
    await request(app)
      .post(`/api/missions/${create.body.missionId}/subtasks/${stId}/start`)
      .set('Authorization', authFor('tenant-a'));
    await request(app)
      .post(`/api/missions/${create.body.missionId}/subtasks/${stId}/complete`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/cancel`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(422);
  });

  test('POST /retry on FAILED → EXECUTING', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    const stId = create.body.subtasks[0].subtaskId;
    await request(app)
      .post(`/api/missions/${create.body.missionId}/subtasks/${stId}/fail`)
      .set('Authorization', authFor('tenant-a'))
      .send({ error: 'boom' });
    // Manually flip mission to FAILED so retry can be tested
    await Mission.updateOne({ tenantId: 'tenant-a', missionId: create.body.missionId }, { $set: { status: 'FAILED' } });
    const r = await request(app)
      .post(`/api/missions/${create.body.missionId}/retry`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('EXECUTING');
  });
});

// -----------------------------------------------------------------------------
// Subtask routes
// -----------------------------------------------------------------------------

describe('subtask routes', () => {
  async function createPlanned() {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        subtasks: [
          { name: 'A', type: 'find-supplier', capability: 'c' },
          { name: 'B', type: 'custom', capability: 'c' },
        ],
      });
    await request(app)
      .post(`/api/missions/${create.body.missionId}/plan`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    return create.body;
  }

  test('POST /subtasks/:id/start promotes subtask to IN_PROGRESS', async () => {
    const m = await createPlanned();
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[0].subtaskId}/start`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.subtasks[0].status).toBe('IN_PROGRESS');
  });

  test('POST /subtasks/:id/complete with result', async () => {
    const m = await createPlanned();
    const stId = m.subtasks[0].subtaskId;
    await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${stId}/start`)
      .set('Authorization', authFor('tenant-a'));
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${stId}/complete`)
      .set('Authorization', authFor('tenant-a'))
      .send({ result: { found: 5 } });
    expect(r.status).toBe(200);
    expect(r.body.subtasks[0].status).toBe('COMPLETED');
    expect(r.body.subtasks[0].result).toEqual({ found: 5 });
  });

  test('POST /subtasks/:id/complete on last subtask auto-completes mission', async () => {
    const m = await createPlanned();
    const stId = m.subtasks[0].subtaskId;
    await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${stId}/start`)
      .set('Authorization', authFor('tenant-a'));
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${stId}/complete`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    // second subtask still PENDING; mission shouldn't be auto-completed
    expect(r.body.status).not.toBe('COMPLETED');
    // complete the second subtask too
    await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[1].subtaskId}/start`)
      .set('Authorization', authFor('tenant-a'));
    const r2 = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[1].subtaskId}/complete`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r2.body.status).toBe('COMPLETED');
  });

  test('POST /subtasks/:id/fail with error', async () => {
    const m = await createPlanned();
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[0].subtaskId}/fail`)
      .set('Authorization', authFor('tenant-a'))
      .send({ error: 'agent offline' });
    expect(r.status).toBe(200);
    expect(r.body.subtasks[0].status).toBe('FAILED');
    expect(r.body.subtasks[0].error).toBe('agent offline');
  });

  test('POST /subtasks/:id/fail without error → 400', async () => {
    const m = await createPlanned();
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[0].subtaskId}/fail`)
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(400);
  });

  test('POST /subtasks/:id/skip', async () => {
    const m = await createPlanned();
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/${m.subtasks[0].subtaskId}/skip`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.subtasks[0].status).toBe('SKIPPED');
  });

  test('POST /subtasks/:id/start on unknown subtask → 404', async () => {
    const m = await createPlanned();
    const r = await request(app)
      .post(`/api/missions/${m.missionId}/subtasks/nope/start`)
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(404);
  });
});

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

describe('template routes', () => {
  test('GET /api/templates returns PUBLIC system templates', async () => {
    await MissionTemplate.create({
      tenantId: null,
      templateId: 'public-1',
      name: 'Public',
      visibility: 'PUBLIC',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const r = await request(app).get('/api/templates');
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].templateId).toBe('public-1');
  });

  test('GET /api/templates returns tenant PRIVATE templates when authed', async () => {
    await MissionTemplate.create({
      tenantId: 'tenant-a',
      templateId: 'private-1',
      name: 'Private',
      visibility: 'PRIVATE',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    await MissionTemplate.create({
      tenantId: 'tenant-b',
      templateId: 'private-2',
      name: 'Other private',
      visibility: 'PRIVATE',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const r = await request(app)
      .get('/api/templates')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].templateId).toBe('private-1');
  });

  test('GET /api/templates/:templateId returns one', async () => {
    await MissionTemplate.create({
      tenantId: null,
      templateId: 'public-1',
      name: 'Public',
      visibility: 'PUBLIC',
      subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
    });
    const r = await request(app).get('/api/templates/public-1');
    expect(r.status).toBe(200);
    expect(r.body.templateId).toBe('public-1');
  });

  test('GET /api/templates/:templateId 404 for unknown', async () => {
    const r = await request(app).get('/api/templates/nope');
    expect(r.status).toBe(404);
  });

  test('POST /api/templates creates a tenant template', async () => {
    const r = await request(app)
      .post('/api/templates')
      .set('Authorization', authFor('tenant-a'))
      .send({
        templateId: 'my-tpl',
        name: 'My template',
        visibility: 'PRIVATE',
        subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
      });
    expect(r.status).toBe(201);
    expect(r.body.tenantId).toBe('tenant-a');
    expect(r.body.templateId).toBe('my-tpl');
  });

  test('POST /api/templates rejects empty subtasks', async () => {
    const r = await request(app)
      .post('/api/templates')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'X', subtasks: [] });
    expect(r.status).toBe(400);
  });

  test('POST /api/templates duplicate templateId → 409', async () => {
    await request(app)
      .post('/api/templates')
      .set('Authorization', authFor('tenant-a'))
      .send({ templateId: 'my-tpl', name: 'A', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .post('/api/templates')
      .set('Authorization', authFor('tenant-a'))
      .send({ templateId: 'my-tpl', name: 'B', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    expect(r.status).toBe(409);
  });

  test('POST /api/missions from template copies subtasks', async () => {
    await MissionTemplate.create({
      tenantId: null,
      templateId: 'open-restaurant',
      name: 'Open Restaurant',
      subtasks: [
        { name: 'Find supplier', type: 'find-supplier', capability: 'supplier-registry', inputs: { location: '{{city}}' } },
      ],
    });
    const r = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'Open Mumbai',
        templateId: 'open-restaurant',
        context: { city: 'Mumbai' },
      });
    expect(r.status).toBe(201);
    expect(r.body.subtasks[0].inputs.location).toBe('Mumbai');
  });
});

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

describe('stats', () => {
  test('GET /api/stats returns per-tenant counts', async () => {
    await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'A', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({ name: 'B', subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }] });
    const r = await request(app)
      .get('/api/stats')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(2);
    expect(r.body.byStatus.DRAFT).toBe(2);
  });
});

// -----------------------------------------------------------------------------
// Cross-tenant access via participants
// -----------------------------------------------------------------------------

describe('cross-tenant access', () => {
  test('participant can read a mission', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        participants: ['tenant-b'],
        subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
      });
    const r = await request(app)
      .get(`/api/missions/${create.body.missionId}`)
      .set('Authorization', authFor('tenant-b'));
    expect(r.status).toBe(200);
  });

  test('non-participant cannot read a mission', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
      });
    const r = await request(app)
      .get(`/api/missions/${create.body.missionId}`)
      .set('Authorization', authFor('tenant-b'));
    expect(r.status).toBe(404);
  });

  test('internal token can read any mission', async () => {
    const create = await request(app)
      .post('/api/missions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        name: 'X',
        subtasks: [{ name: 's', type: 'find-supplier', capability: 'c' }],
      });
    const r = await request(app)
      .get(`/api/missions/${create.body.missionId}`)
      .set('x-internal-token', INTERNAL_TOKEN);
    expect(r.status).toBe(200);
  });
});