/**
 * HTTP route tests for nexha-partner-graph — exercises every endpoint
 * via supertest, including auth gates, validation, and lifecycle flows.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import * as crypto from 'node:crypto';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { app } from '../../src/index.js';
import { Interaction } from '../../src/models/Interaction.js';

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
    expect(r.body.service).toBe('nexha-partner-graph');
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
  test('POST /api/interactions requires auth', async () => {
    const r = await request(app).post('/api/interactions').send({});
    expect(r.status).toBe(401);
  });

  test('POST /api/interactions with bad JWT → 401', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', 'Bearer garbage')
      .send({});
    expect(r.status).toBe(401);
  });

  test('POST /api/interactions with expired JWT → 401', async () => {
    const expired = makeJwt({ sub: 'u', tenantId: 't', exp: 1 });
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', `Bearer ${expired}`)
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing' });
    expect(r.status).toBe(401);
  });

  test('POST /api/interactions with x-internal-token is accepted', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('x-internal-token', INTERNAL_TOKEN)
      .set('x-tenant-id', 'tenant-x')
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing' });
    expect(r.status).toBe(201);
    expect(r.body.tenantId).toBe('tenant-x');
  });
});

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

describe('validation', () => {
  test('POST /api/interactions rejects missing fields', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('PARTNER_VALIDATION_ERROR');
  });

  test('POST /api/interactions rejects invalid type', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'BAD', direction: 'outgoing' });
    expect(r.status).toBe(400);
  });

  test('POST /api/interactions rejects invalid direction', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'sideways' });
    expect(r.status).toBe(400);
  });

  test('POST /api/interactions rejects negative value', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: -100 });
    expect(r.status).toBe(400);
  });

  test('POST /api/interactions rejects rating out of 0-5', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'review', direction: 'outgoing', rating: 9 });
    expect(r.status).toBe(400);
  });

  test('GET /api/partners rejects invalid relationshipType', async () => {
    const r = await request(app)
      .get('/api/partners?relationshipType=BAD')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(400);
  });

  test('GET /api/partners/by-type/:type rejects invalid type', async () => {
    const r = await request(app)
      .get('/api/partners/by-type/BAD')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(400);
  });

  test('POST /api/recommend rejects oversized candidates list', async () => {
    const candidates = Array.from({ length: 501 }, (_, i) => ({ partnerRef: `p${i}` }));
    const r = await request(app)
      .post('/api/recommend')
      .set('Authorization', authFor('tenant-a'))
      .send({ candidates });
    expect(r.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// Interactions CRUD
// -----------------------------------------------------------------------------

describe('interaction CRUD', () => {
  test('POST /api/interactions records an interaction', async () => {
    const r = await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        partnerRef: 'tenant-b',
        partnerType: 'tenant',
        type: 'transaction',
        direction: 'outgoing',
        value: 1000,
      });
    expect(r.status).toBe(201);
    expect(r.body.tenantId).toBe('tenant-a');
    expect(r.body.partnerRef).toBe('tenant-b');
    expect(r.body.value).toBe(1000);
  });

  test('POST /api/interactions updates both sides of the partnership', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({
        partnerRef: 'tenant-b',
        partnerType: 'tenant',
        type: 'transaction',
        direction: 'outgoing',
        value: 500,
      });
    // tenant-a's view
    const a = await request(app)
      .get('/api/partners/tenant-b')
      .set('Authorization', authFor('tenant-a'));
    expect(a.status).toBe(200);
    expect(a.body.transactionCount).toBe(1);
    expect(a.body.totalGmv).toBe(500);
    // tenant-b's view
    const b = await request(app)
      .get('/api/partners/tenant-a')
      .set('Authorization', authFor('tenant-b'));
    expect(b.status).toBe(200);
    expect(b.body.transactionCount).toBe(1);
    expect(b.body.totalGmv).toBe(500);
  });

  test('GET /api/interactions lists per-tenant', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-b'))
      .send({ partnerRef: 'q', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const r = await request(app)
      .get('/api/interactions')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].partnerRef).toBe('p');
  });

  test('GET /api/interactions filters by type', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'b', partnerType: 'tenant', type: 'negotiation', direction: 'outgoing' });
    const r = await request(app)
      .get('/api/interactions?type=negotiation')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].partnerRef).toBe('b');
  });

  test('GET /api/interactions filters by partnerRef', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const r = await request(app)
      .get('/api/interactions?partnerRef=a')
      .set('Authorization', authFor('tenant-a'));
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].partnerRef).toBe('a');
  });
});

// -----------------------------------------------------------------------------
// Partners
// -----------------------------------------------------------------------------

describe('partner endpoints', () => {
  test('GET /api/partners returns sorted by strength', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/interactions')
        .set('Authorization', authFor('tenant-a'))
        .send({ partnerRef: 'strong', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    }
    const r = await request(app)
      .get('/api/partners')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.items[0].partnerRef).toBe('strong');
  });

  test('GET /api/partners?relationshipType=supplier filters', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'sup-1', partnerType: 'company', type: 'transaction', direction: 'outgoing', value: 100, relationshipType: 'supplier' });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'cust-1', partnerType: 'company', type: 'transaction', direction: 'incoming', value: 100, relationshipType: 'customer' });
    const r = await request(app)
      .get('/api/partners?relationshipType=supplier')
      .set('Authorization', authFor('tenant-a'));
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].partnerRef).toBe('sup-1');
  });

  test('GET /api/partners?minStrength=0.3 filters', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/interactions')
        .set('Authorization', authFor('tenant-a'))
        .send({ partnerRef: 'strong', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    }
    const r = await request(app)
      .get('/api/partners?minStrength=0.3')
      .set('Authorization', authFor('tenant-a'));
    expect(r.body.items.every((i) => i.strength >= 0.3)).toBe(true);
  });

  test('GET /api/partners?sort=gmv sorts by totalGmv', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'big', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 10000 });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'small', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const r = await request(app)
      .get('/api/partners?sort=gmv')
      .set('Authorization', authFor('tenant-a'));
    expect(r.body.items[0].partnerRef).toBe('big');
  });

  test('GET /api/partners/:partnerRef returns one', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const r = await request(app)
      .get('/api/partners/p')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.partnerRef).toBe('p');
  });

  test('GET /api/partners/:partnerRef 404 for missing', async () => {
    const r = await request(app)
      .get('/api/partners/nope')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(404);
  });

  test('GET /api/partners/by-type/supplier returns suppliers', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'sup-1', partnerType: 'company', type: 'transaction', direction: 'outgoing', value: 100, relationshipType: 'supplier' });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'cust-1', partnerType: 'company', type: 'transaction', direction: 'incoming', value: 100, relationshipType: 'customer' });
    const r = await request(app)
      .get('/api/partners/by-type/supplier')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].partnerRef).toBe('sup-1');
  });
});

// -----------------------------------------------------------------------------
// Recommendations
// -----------------------------------------------------------------------------

describe('recommend endpoints', () => {
  test('POST /api/recommend returns top existing partnerships', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/interactions')
        .set('Authorization', authFor('tenant-a'))
        .send({ partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    }
    const r = await request(app)
      .post('/api/recommend')
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThan(0);
    expect(r.body.items[0].partnerRef).toBe('p');
  });

  test('POST /api/recommend scores candidate list', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'known', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    const r = await request(app)
      .post('/api/recommend')
      .set('Authorization', authFor('tenant-a'))
      .send({
        candidates: [
          { partnerRef: 'known', trustScore: 90 },
          { partnerRef: 'unknown', trustScore: 50 },
        ],
      });
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBe(2);
    expect(r.body.items[0].partnerRef).toBe('known');
    expect(r.body.items[1].existing).toBe(false);
  });

  test('POST /api/recommend respects minStrength', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    const r = await request(app)
      .post('/api/recommend')
      .set('Authorization', authFor('tenant-a'))
      .send({ minStrength: 0.5 });
    expect(r.body.items.every((i) => i.score >= 0.5)).toBe(true);
  });

  test('POST /api/recommend returns empty when no partnerships', async () => {
    const r = await request(app)
      .post('/api/recommend')
      .set('Authorization', authFor('tenant-a'))
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.items).toEqual([]);
    expect(r.body.total).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

describe('stats', () => {
  test('GET /api/stats returns per-tenant counts', async () => {
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await request(app)
      .post('/api/interactions')
      .set('Authorization', authFor('tenant-a'))
      .send({ partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 200, relationshipType: 'supplier' });
    const r = await request(app)
      .get('/api/stats')
      .set('Authorization', authFor('tenant-a'));
    expect(r.status).toBe(200);
    expect(r.body.totalPartners).toBe(2);
    expect(r.body.totalInteractions).toBe(2);
    expect(r.body.totalGmv).toBe(300);
    expect(r.body.byRelationshipType.supplier).toBe(1);
  });
});