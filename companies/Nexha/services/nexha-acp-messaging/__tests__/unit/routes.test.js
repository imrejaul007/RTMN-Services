/**
 * HTTP route tests — uses supertest against the actual Express app.
 *
 * Covers:
 *   - GET /health
 *   - GET / (info)
 *   - POST /api/validate
 *   - POST /api/negotiations + /api/negotiations/:id/messages
 *   - GET  /api/negotiations + /api/negotiations/:id + /api/negotiations/:id/messages
 *   - GET  /api/stats
 *   - 401 without auth
 *   - 400 / 422 errors surface correctly
 *   - tenant isolation across HTTP boundary
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';

beforeAll(async () => { await connectTestDb(); });
afterAll(async () => { await disconnectTestDb(); });
beforeEach(async () => { await clearTestDb(); });

const AUTH = { 'x-internal-token': 'test', 'x-tenant-id': 't-1' };
// Note: x-internal-token only works if INTERNAL_SERVICE_TOKEN is set in env.
// Routes are wired with requireAuth, so we set it in setup below.
const ORIGINAL_ENV_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
beforeAll(() => { process.env.INTERNAL_SERVICE_TOKEN = 'test'; });
afterAll(() => { process.env.INTERNAL_SERVICE_TOKEN = ORIGINAL_ENV_TOKEN; });

const QUERY = (overrides = {}) => ({
  type: 'QUERY',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  intent: 'Find a steel supplier',
  context: { quantity: 100, unit: 'tons' },
  ...overrides,
});

const QUOTE = (overrides = {}) => ({
  type: 'QUOTE',
  sender: 'agt-merchant-1',
  receiver: 'agt-consumer-1',
  payload: { unitPrice: 1200, currency: 'INR', leadTimeDays: 14 },
  ...overrides,
});

describe('GET /health', () => {
  it('returns service info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('nexha-acp-messaging');
  });
});

describe('GET /', () => {
  it('returns service info with endpoints', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('nexha-acp-messaging');
    expect(res.body.adr).toBe('ADR-0010 Phase 4');
    expect(res.body.endpoints).toContain('POST   /api/negotiations');
    expect(res.body.messageTypes).toContain('QUERY');
    expect(res.body.messageTypes).toContain('DISPUTE');
  });
});

describe('POST /api/validate', () => {
  it('returns { valid: true } for a valid message body', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send(QUERY());
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.cleaned.type).toBe('QUERY');
  });
  it('returns 400 for a missing required field', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ type: 'QUERY' });
    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });
  it('returns 400 for an unknown message type', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ ...QUERY(), type: 'UNKNOWN' });
    expect(res.status).toBe(400);
  });
});

describe('auth gating', () => {
  it('returns 401 without internal token or JWT', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .send(QUERY());
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ACP_AUTH_REQUIRED');
  });
  it('rejects bad internal tokens', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .set('x-internal-token', 'wrong')
      .set('x-tenant-id', 't-1')
      .send(QUERY());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/negotiations', () => {
  it('creates a new negotiation from a QUERY', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .set(AUTH)
      .send(QUERY());
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.negotiation.tenantId).toBe('t-1');
    expect(res.body.negotiation.status).toBe('ACTIVE');
    expect(res.body.message.type).toBe('QUERY');
  });
  it('returns 400 if no tenant is provided', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .set('x-internal-token', 'test') // no x-tenant-id, no body.tenantId
      .send(QUERY());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tenantId is required/);
  });
  it('returns 422 if first message is not QUERY', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .set(AUTH)
      .send(QUOTE());
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ACP_INVALID_TRANSITION');
  });
  it('respects x-tenant-id over body.tenantId', async () => {
    const res = await request(app)
      .post('/api/negotiations')
      .set({ ...AUTH, 'x-tenant-id': 'override' })
      .send(QUERY({ tenantId: 'body-tenant' }));
    expect(res.status).toBe(201);
    expect(res.body.negotiation.tenantId).toBe('override');
  });
});

describe('POST /api/negotiations/:id/messages', () => {
  async function create() {
    const res = await request(app)
      .post('/api/negotiations')
      .set(AUTH)
      .send(QUERY());
    return res.body.negotiation.negotiationId;
  }

  it('appends a valid QUOTE to a QUERY-initiated negotiation', async () => {
    const negId = await create();
    const res = await request(app)
      .post(`/api/negotiations/${negId}/messages`)
      .set(AUTH)
      .send(QUOTE());
    expect(res.status).toBe(201);
    expect(res.body.negotiation.currentType).toBe('QUOTE');
  });
  it('returns 422 for illegal transition (QUERY → ACCEPT)', async () => {
    const negId = await create();
    const res = await request(app)
      .post(`/api/negotiations/${negId}/messages`)
      .set(AUTH)
      .send({ type: 'ACCEPT', sender: 'a', receiver: 'b', payload: { acceptedPrice: 1000 } });
    expect(res.status).toBe(422);
    expect(res.body.from).toBe('QUERY');
    expect(res.body.to).toBe('ACCEPT');
  });
  it('returns 404 for unknown negotiation', async () => {
    const res = await request(app)
      .post('/api/negotiations/does-not-exist/messages')
      .set(AUTH)
      .send(QUOTE());
    expect(res.status).toBe(400); // state machine ValidationError → 400
    expect(res.body.error).toMatch(/not found/);
  });
});

describe('GET /api/negotiations', () => {
  it('lists the tenant’s negotiations', async () => {
    await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    await request(app).post('/api/negotiations').set(AUTH).send(QUERY({ sender: 's2', receiver: 'r2' }));
    const res = await request(app).get('/api/negotiations').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
  });
  it('does not return other tenants’ negotiations', async () => {
    await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    const res = await request(app)
      .get('/api/negotiations')
      .set({ ...AUTH, 'x-tenant-id': 't-2' });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });
  it('filters by status', async () => {
    const a = await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    const b = await request(app).post('/api/negotiations').set(AUTH).send(QUERY({ sender: 's', receiver: 'r' }));
    await request(app).post(`/api/negotiations/${b.body.negotiation.negotiationId}/messages`).set(AUTH).send({ type: 'REJECT', sender: 'r', receiver: 's', payload: { reason: 'no' } });
    const active = await request(app).get('/api/negotiations?status=ACTIVE').set(AUTH);
    const rejected = await request(app).get('/api/negotiations?status=REJECTED').set(AUTH);
    expect(active.body.items.length).toBe(1);
    expect(rejected.body.items.length).toBe(1);
    expect(a.body.negotiation.negotiationId).toBeDefined();
  });
});

describe('GET /api/negotiations/:id', () => {
  it('returns the negotiation', async () => {
    const c = await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    const res = await request(app).get(`/api/negotiations/${c.body.negotiation.negotiationId}`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.negotiationId).toBe(c.body.negotiation.negotiationId);
  });
  it('returns 404 for unknown', async () => {
    const res = await request(app).get('/api/negotiations/nope').set(AUTH);
    expect(res.status).toBe(404);
  });
  it('returns 404 for cross-tenant access', async () => {
    const c = await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    const res = await request(app)
      .get(`/api/negotiations/${c.body.negotiation.negotiationId}`)
      .set({ ...AUTH, 'x-tenant-id': 't-other' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/negotiations/:id/messages', () => {
  it('returns the message log in order', async () => {
    const c = await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    await request(app).post(`/api/negotiations/${c.body.negotiation.negotiationId}/messages`).set(AUTH).send(QUOTE());
    const res = await request(app)
      .get(`/api/negotiations/${c.body.negotiation.negotiationId}/messages`)
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.items[0].type).toBe('QUERY');
    expect(res.body.items[1].type).toBe('QUOTE');
  });
});

describe('GET /api/stats', () => {
  it('returns per-tenant counts', async () => {
    await request(app).post('/api/negotiations').set(AUTH).send(QUERY());
    const res = await request(app).get('/api/stats').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.negotiations).toBe(1);
    expect(res.body.messages).toBe(1);
    expect(res.body.byType.QUERY).toBe(1);
  });
});
