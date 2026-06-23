import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import { setupTestDb, clearTestDb, teardownTestDb, syncIndexes } from '../helpers/db.js';

let router;
const JWT_SECRET = 'test-jwt-secret';
const INTERNAL_TOKEN = 'test-internal-token';

function makeToken(tenantId, roles = ['hooks:admin'], subject = 'test-user') {
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
  process.env.HOOKS_SDK_JWT_SECRET = JWT_SECRET;
  process.env.HOOKS_SDK_INTERNAL_TOKEN = INTERNAL_TOKEN;
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
  it('rejects no credentials', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(401);
  });

  it('rejects bad internal token', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/subscriptions').set('x-internal-token', 'bad');
    expect(res.status).toBe(401);
  });

  it('rejects internal token without tenant', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/subscriptions').set('x-internal-token', INTERNAL_TOKEN);
    expect(res.status).toBe(400);
  });

  it('rejects JWT without hooks:admin role', async () => {
    const app = makeApp();
    const token = makeToken('t1', ['other:role']);
    const res = await request(app).get('/api/subscriptions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('accepts valid JWT', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).get('/api/subscriptions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/subscriptions', () => {
  it('creates a subscription', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({
      url: 'https://example.com/hook',
      eventTypes: ['order.placed'],
    });
    expect(res.status).toBe(201);
    expect(res.body.subscriptionId).toMatch(/^sub_/);
    expect(res.body.secret).toMatch(/^whsec_/);
  });

  it('rejects bad url', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({
      url: 'not-a-url',
      eventTypes: ['*'],
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty eventTypes', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({
      url: 'https://example.com',
      eventTypes: [],
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/subscriptions', () => {
  it('lists subscriptions for the JWT tenant', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${t1}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${t1}`).send({ url: 'https://b.com', eventTypes: ['*'] });
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${t2}`).send({ url: 'https://c.com', eventTypes: ['*'] });
    const res = await request(app).get('/api/subscriptions').set('Authorization', `Bearer ${t1}`);
    expect(res.body.items).toHaveLength(2);
  });
});

describe('GET /api/subscriptions/:id', () => {
  it('returns the sub for the owner', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).get(`/api/subscriptions/${create.body.subscriptionId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for other tenant', async () => {
    const app = makeApp();
    const t1 = makeToken('t1');
    const t2 = makeToken('t2');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${t1}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).get(`/api/subscriptions/${create.body.subscriptionId}`).set('Authorization', `Bearer ${t2}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/subscriptions/:id', () => {
  it('updates url', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).patch(`/api/subscriptions/${create.body.subscriptionId}`).set('Authorization', `Bearer ${token}`).send({ url: 'https://b.com' });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://b.com');
  });
});

describe('POST /api/subscriptions/:id/{disable,enable,rotate-secret}', () => {
  it('disable', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).post(`/api/subscriptions/${create.body.subscriptionId}/disable`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.body.status).toBe('DISABLED');
  });

  it('enable', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    await request(app).post(`/api/subscriptions/${create.body.subscriptionId}/disable`).set('Authorization', `Bearer ${token}`).send({});
    const res = await request(app).post(`/api/subscriptions/${create.body.subscriptionId}/enable`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.body.status).toBe('ACTIVE');
  });

  it('rotate-secret returns new plaintext', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const oldSecret = create.body.secret;
    const res = await request(app).post(`/api/subscriptions/${create.body.subscriptionId}/rotate-secret`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.body.secret).not.toBe(oldSecret);
  });
});

describe('DELETE /api/subscriptions/:id', () => {
  it('soft-deletes the sub', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const create = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).delete(`/api/subscriptions/${create.body.subscriptionId}`).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DELETED');
  });
});

describe('POST /api/events', () => {
  it('emits an event and creates deliveries', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ eventType: 'order.placed', payload: { id: 1 } });
    expect(res.status).toBe(201);
    expect(res.body.deliveries).toHaveLength(1);
  });

  it('rejects unknown eventType', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ eventType: 'bogus', payload: {} });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/deliveries/process', () => {
  it('rejects JWT callers (internal only)', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/deliveries/process').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(403);
  });

  it('processes deliveries with internal token', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ eventType: 'order.placed', payload: {} });
    const res = await request(app).post('/api/deliveries/process').set('x-internal-token', INTERNAL_TOKEN).set('x-tenant-id', 'any').send({});
    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(1);
    expect(res.body.succeeded).toBe(1);
  });
});

describe('GET /api/deliveries', () => {
  it('lists deliveries for the tenant', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ eventType: 'order.placed', payload: {} });
    const res = await request(app).get('/api/deliveries').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('POST /api/{sign,verify}', () => {
  it('sign produces sha256= prefix', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/sign').set('Authorization', `Bearer ${token}`).send({ body: 'hello', secret: 's' });
    expect(res.status).toBe(200);
    expect(res.body.signature).toMatch(/^sha256=/);
  });

  it('verify accepts a correct signature', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const sign = await request(app).post('/api/sign').set('Authorization', `Bearer ${token}`).send({ body: 'hello', secret: 's' });
    const res = await request(app).post('/api/verify').set('Authorization', `Bearer ${token}`).set('x-hook-secret', 's').send({ body: 'hello', signature: sign.body.signature });
    expect(res.body.valid).toBe(true);
  });

  it('verify rejects a tampered signature', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).post('/api/verify').set('Authorization', `Bearer ${token}`).set('x-hook-secret', 's').send({ body: 'hello', signature: 'sha256=00' });
    expect(res.body.valid).toBe(false);
  });
});

describe('GET /api/event-types', () => {
  it('returns the list', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    const res = await request(app).get('/api/event-types').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.eventTypes)).toBe(true);
    expect(res.body.eventTypes).toContain('order.placed');
    expect(res.body.eventTypes).toContain('*');
  });
});

describe('GET /api/stats', () => {
  it('returns stats', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://a.com', eventTypes: ['*'] });
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.subscriptions.total).toBe(1);
    expect(res.body.subscriptions.active).toBe(1);
  });
});

describe('end-to-end webhook flow', () => {
  it('create → emit → process → delivery SUCCESS', async () => {
    const app = makeApp();
    const token = makeToken('t1');
    // 1. Create subscription
    const sub = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`).send({ url: 'https://example.com/hook', eventTypes: ['order.placed'] });
    expect(sub.status).toBe(201);
    // 2. Emit event
    const evt = await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ eventType: 'order.placed', payload: { orderId: 42 } });
    expect(evt.body.deliveries).toHaveLength(1);
    // 3. Process deliveries
    const proc = await request(app).post('/api/deliveries/process').set('x-internal-token', INTERNAL_TOKEN).set('x-tenant-id', 'any').send({});
    expect(proc.body.succeeded).toBe(1);
    // 4. Verify the delivery succeeded
    const list = await request(app).get('/api/deliveries').set('Authorization', `Bearer ${token}`);
    expect(list.body.items[0].status).toBe('SUCCESS');
  });
});
