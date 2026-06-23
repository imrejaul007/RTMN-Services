/**
 * HTTP route tests for marketplace-listings.
 *
 * Uses supertest against the Express app exported from src/index.js.
 * Auth uses x-internal-token + x-tenant-id (set in beforeAll). We also
 * forge fake JWTs in tests for the requireAuth path.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../../src/index.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';

const INTERNAL_TOKEN = 'test-internal-token';
const TENANT_A = 'tenant-A';
const TENANT_B = 'tenant-B';

function jwt(claims) {
  // HS256 with secret 'test-secret' (matches JWT_SECRET env in beforeAll)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  // We don't actually verify signature in the middleware (lightweight), so a stub is fine.
  const sig = crypto.createHash('sha256').update(`${header}.${payload}.test-secret`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function asTenant(tenantId, claims = {}) {
  return {
    token: jwt({
      sub: claims.sub || 'user-1',
      tenantId,
      organizationId: claims.organizationId || tenantId,
      name: claims.name || 'Tester',
      email: claims.email || 'tester@example.com',
      roles: claims.roles || ['user'],
      ...claims,
    }),
  };
}

beforeAll(async () => {
  process.env.INTERNAL_SERVICE_TOKEN = INTERNAL_TOKEN;
  process.env.JWT_SECRET = 'test-secret';
  await connectTestDb();
});
afterAll(async () => {
  await disconnectTestDb();
  delete process.env.INTERNAL_SERVICE_TOKEN;
  delete process.env.JWT_SECRET;
});
beforeEach(async () => {
  await clearTestDb();
});

describe('GET /health, /ready, /', () => {
  test('/health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('marketplace-listings');
    expect(Array.isArray(res.body.capabilities)).toBe(true);
  });

  test('/ready returns ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  test('GET / redirects to /health', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/health');
  });
});

describe('Auth gating', () => {
  test('POST /api/listings requires auth (no token)', async () => {
    const res = await request(app).post('/api/listings').send({
      title: 'Test', category: 'agent', pricingModel: 'free', publisherName: 'P',
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/listings accepts internal token + x-tenant-id', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('x-internal-token', INTERNAL_TOKEN)
      .set('x-tenant-id', TENANT_A)
      .send({ title: 'Internal Listing', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe(TENANT_A);
    expect(res.body.listingId).toBeDefined();
  });

  test('POST /api/listings accepts Bearer JWT', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'JWT Listing', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe(TENANT_A);
  });

  test('rejects expired JWT', async () => {
    const exp = Math.floor((Date.now() - 60_000) / 1000);  // expired 1 minute ago
    const { token } = asTenant(TENANT_A, { exp });
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MARKETPLACE_TOKEN_EXPIRED');
  });
});

describe('POST /api/validate (lint without persist)', () => {
  test('returns valid: true for good payload', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ title: 'Good', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  test('returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ title: 'x', category: 'WRONG' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MARKETPLACE_VALIDATION_ERROR');
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  test('rejects paid pricing without price', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ title: 'Subscription', category: 'agent', pricingModel: 'subscription', publisherName: 'P' });
    expect(res.status).toBe(400);
    expect(res.body.issues[0].path).toContain('price');
  });
});

describe('POST /api/listings (create)', () => {
  test('creates a listing as the JWT tenant', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Hotel Bot',
        category: 'agent',
        pricingModel: 'subscription',
        price: 99,
        publisherName: 'Acme',
        tags: ['hotel', 'booking'],
      });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe(TENANT_A);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.tags).toEqual(['hotel', 'booking']);
  });

  test('returns 400 on invalid payload', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'AB', category: 'agent' });  // missing publisherName, pricingModel; also title too short
    expect(res.status).toBe(400);
  });
});

describe('GET /api/listings (search)', () => {
  beforeEach(async () => {
    const { token: aTok } = asTenant(TENANT_A);
    const { token: bTok } = asTenant(TENANT_B);
    await request(app).post('/api/listings').set('Authorization', `Bearer ${aTok}`).send({
      title: 'Hotel Booking Bot', category: 'agent', pricingModel: 'subscription', price: 99, status: 'PUBLISHED', publisherName: 'Acme',
    });
    await request(app).post('/api/listings').set('Authorization', `Bearer ${aTok}`).send({
      title: 'Restaurant Twin', category: 'twin', pricingModel: 'one-time', price: 199, status: 'PUBLISHED', publisherName: 'Acme',
    });
    await request(app).post('/api/listings').set('Authorization', `Bearer ${bTok}`).send({
      title: 'Pricing Optimizer', category: 'service', pricingModel: 'usage-based', price: 5, status: 'PUBLISHED', publisherName: 'Beta',
    });
  });

  test('returns PUBLIC + PUBLISHED listings without auth', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });

  test('filters by category', async () => {
    const res = await request(app).get('/api/listings?category=agent');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toBe('Hotel Booking Bot');
  });

  test('filters by free-text q', async () => {
    const res = await request(app).get('/api/listings?q=pricing');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toBe('Pricing Optimizer');
  });

  test('pagination', async () => {
    const res = await request(app).get('/api/listings?limit=2&offset=1');
    expect(res.body.items.length).toBe(2);
    expect(res.body.total).toBe(3);
  });
});

describe('GET /api/listings/:listingId', () => {
  let listingId;
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Visible', category: 'service', pricingModel: 'free',
        status: 'PUBLISHED', publisherName: 'Acme',
      });
    listingId = res.body.listingId;
  });

  test('public listing visible to anyone (no auth)', async () => {
    const res = await request(app).get(`/api/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.listingId).toBe(listingId);
  });

  test('returns 404 for unknown listing', async () => {
    const res = await request(app).get('/api/listings/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('MARKETPLACE_NOT_FOUND');
  });
});

describe('PATCH /api/listings/:listingId', () => {
  let listingId;
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    listingId = res.body.listingId;
  });

  test('owner can update', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .patch(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', price: 0, tags: ['x'] });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.tags).toEqual(['x']);
  });

  test('non-owner cannot update', async () => {
    const { token } = asTenant(TENANT_B);
    const res = await request(app)
      .patch(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(404);
  });
});

describe('Publish / unpublish lifecycle', () => {
  let listingId;
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Draft', category: 'agent', pricingModel: 'free', publisherName: 'P' });
    listingId = res.body.listingId;
  });

  test('owner can publish (DRAFT → PUBLISHED)', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post(`/api/listings/${listingId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  test('owner can unpublish (PUBLISHED → UNPUBLISHED)', async () => {
    const { token } = asTenant(TENANT_A);
    await request(app).post(`/api/listings/${listingId}/publish`).set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/listings/${listingId}/unpublish`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UNPUBLISHED');
  });
});

describe('POST /api/listings/:listingId/view + /install', () => {
  let listingId;
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Visible', category: 'service', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'P' });
    listingId = res.body.listingId;
  });

  test('view increments count without auth', async () => {
    const r1 = await request(app).post(`/api/listings/${listingId}/view`);
    expect(r1.status).toBe(200);
    const r2 = await request(app).post(`/api/listings/${listingId}/view`);
    expect(r2.status).toBe(200);
    const got = await request(app).get(`/api/listings/${listingId}`);
    expect(got.body.viewCount).toBe(2);
  });

  test('install increments count', async () => {
    const r = await request(app).post(`/api/listings/${listingId}/install`);
    expect(r.status).toBe(201);
    const got = await request(app).get(`/api/listings/${listingId}`);
    expect(got.body.installCount).toBe(1);
  });

  test('install of unknown listing returns 404', async () => {
    const r = await request(app).post('/api/listings/nope/install');
    expect(r.status).toBe(404);
  });
});

describe('Reviews', () => {
  let listingId;
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Reviewable', category: 'service', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'P' });
    listingId = res.body.listingId;
  });

  test('PUT /api/listings/:id/reviews adds a review', async () => {
    const { token } = asTenant(TENANT_B);
    const res = await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, title: 'Great', body: 'Loved it' });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.listing.reviewCount).toBe(1);
  });

  test('PUT replaces existing review from same tenant', async () => {
    const { token } = asTenant(TENANT_B);
    await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 2 });
    const res = await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, body: 'Changed my mind' });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(false);
    const got = await request(app).get(`/api/listings/${listingId}`);
    expect(got.body.reviewCount).toBe(1);
    expect(got.body.averageRating).toBe(5);
  });

  test('GET /api/listings/:id/reviews lists published reviews', async () => {
    const { token: tA } = asTenant(TENANT_A);
    const { token: tB } = asTenant(TENANT_B);
    await request(app).put(`/api/listings/${listingId}/reviews`).set('Authorization', `Bearer ${tA}`).send({ rating: 4 });
    await request(app).put(`/api/listings/${listingId}/reviews`).set('Authorization', `Bearer ${tB}`).send({ rating: 5 });
    const res = await request(app).get(`/api/listings/${listingId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  test('GET /api/my-reviews returns my review', async () => {
    const { token } = asTenant(TENANT_B);
    await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, title: 'Excellent' });
    const res = await request(app)
      .get(`/api/my-reviews?listingId=${listingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.review).not.toBeNull();
    expect(res.body.review.rating).toBe(5);
  });

  test('DELETE /api/reviews/:reviewId hides review', async () => {
    const { token } = asTenant(TENANT_B);
    const created = await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 1 });
    const reviewId = created.body.review.reviewId;
    const del = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.review.status).toBe('hidden');
  });

  test('rejects review with rating out of range', async () => {
    const { token } = asTenant(TENANT_B);
    const res = await request(app)
      .put(`/api/listings/${listingId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 7 });
    expect(res.status).toBe(400);
  });

  test('requires listingId query param for /api/my-reviews', async () => {
    const { token } = asTenant(TENANT_B);
    const res = await request(app)
      .get('/api/my-reviews')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/stats', () => {
  beforeEach(async () => {
    const { token } = asTenant(TENANT_A);
    await request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).send({
      title: 'Agent One', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'P',
    });
    await request(app).post('/api/listings').set('Authorization', `Bearer ${token}`).send({
      title: 'Twin Two', category: 'twin', pricingModel: 'free', publisherName: 'P',
    });
  });

  test('returns per-tenant stats', async () => {
    const { token } = asTenant(TENANT_A);
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byStatus.PUBLISHED).toBe(1);
    expect(res.body.byStatus.DRAFT).toBe(1);
    expect(res.body.byCategory.agent).toBe(1);
    expect(res.body.byCategory.twin).toBe(1);
  });
});

describe('Internal sanity probe', () => {
  test('returns 401 without internal token', async () => {
    const res = await request(app).get('/internal/sanity');
    expect(res.status).toBe(401);
  });

  test('returns ok with internal token', async () => {
    const res = await request(app)
      .get('/internal/sanity')
      .set('x-internal-token', INTERNAL_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});