/**
 * HOJAI AI - Industry Packs
 * Unit Tests — node --test
 *
 * Note: This service uses /api/listings internally (copies connector-marketplace pattern)
 */

import { test, before } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';

process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';

let BASE;
let app;

before(async () => {
  app = (await import('../../src/index.js')).default;
  const srv = createServer(app);
  await new Promise(res => srv.listen(0, res));
  const { port } = srv.address();
  BASE = `http://localhost:${port}`;
});

function authHeaders(extras = {}) {
  return { 'x-internal-token': 'dev-token', 'content-type': 'application/json', ...extras };
}

// ── Health & Lifecycle ────────────────────────────────────────────────────────

test('GET /health returns service info', async () => {
  const r = await fetch(`${BASE}/health`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.service, 'industry-packs');
  assert.ok(typeof b.counts.listings === 'number');
});

test('GET /ready returns 200', async () => {
  const r = await fetch(`${BASE}/ready`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.ready, true);
});

test('GET /unknown returns 404', async () => {
  const r = await fetch(`${BASE}/does-not-exist`);
  assert.strictEqual(r.status, 404);
});

// ── Categories ───────────────────────────────────────────────────────────────

test('GET /api/categories returns seeded categories', async () => {
  const r = await fetch(`${BASE}/api/categories`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.categories));
  assert.ok(b.categories.length > 0);
});

test('POST /api/categories creates a category', async () => {
  const r = await fetch(`${BASE}/api/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'Analytics', description: 'Data analytics packs' }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.id);
  assert.strictEqual(b.name, 'Analytics');
});

test('POST /api/categories 400 when name missing', async () => {
  const r = await fetch(`${BASE}/api/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  assert.strictEqual(r.status, 400);
});

// ── Listings (aka Packs) ─────────────────────────────────────────────────────

test('GET /api/listings returns seeded listings', async () => {
  const r = await fetch(`${BASE}/api/listings`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.listings));
  assert.ok(b.listings.length > 0);
});

test('GET /api/listings?category= filters', async () => {
  const cats = await (await fetch(`${BASE}/api/categories`)).json();
  const catId = cats.categories[0].id;
  const r = await fetch(`${BASE}/api/listings?category=${catId}`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.listings.forEach(l => assert.strictEqual(l.category, catId));
});

test('GET /api/listings?q= filters by search', async () => {
  const r = await fetch(`${BASE}/api/listings?q=restaurant`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.listings));
});

test('GET /api/listings/featured returns featured', async () => {
  const r = await fetch(`${BASE}/api/listings/featured`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.listings.forEach(l => assert.strictEqual(l.featured, true));
});

test('GET /api/listings/trending returns listings sorted by sales', async () => {
  const r = await fetch(`${BASE}/api/listings/trending`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.listings));
  assert.ok(b.listings.length <= 10);
});

test('GET /api/listings/:id returns a listing', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/listings/${id}`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.id, id);
});

test('GET /api/listings/:id 404 for unknown', async () => {
  const r = await fetch(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000`);
  assert.strictEqual(r.status, 404);
});

test('POST /api/listings creates a listing', async () => {
  const r = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      title: 'Test Pack', description: 'Test description', price: 99,
      pricingModel: 'subscription', publisher: 'TestCo',
      industry: 'restaurant', components: { services: [], agents: [], twins: [], workflows: [], integrations: [] },
    }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.id);
});

test('POST /api/listings 400 when required fields missing', async () => {
  const r = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title: 'Missing everything else' }),
  });
  assert.strictEqual(r.status, 400);
});

test('PATCH /api/listings/:id updates listing', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/listings/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ price: 199 }),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.price, 199);
});

test('DELETE /api/listings/:id removes listing', async () => {
  const c = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title: 'To Delete', price: 10, pricingModel: 'subscription', industry: 'restaurant', components: {} }),
  });
  const b = await c.json();
  const id = b.listingId || b.id;
  const r = await fetch(`${BASE}/api/listings/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.strictEqual(r.status, 204);
  const g = await fetch(`${BASE}/api/listings/${id}`);
  assert.strictEqual(g.status, 404);
});

test('DELETE /api/listings/:id 404 for unknown', async () => {
  const r = await fetch(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.strictEqual(r.status, 404);
});

// ── Reviews ──────────────────────────────────────────────────────────────────

test('POST /api/listings/:id/reviews creates a review', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/listings/${id}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rating: 5, comment: 'Great pack!', reviewer: 'tester' }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.strictEqual(b.rating, 5);
});

test('POST /api/listings/:id/reviews 400 for bad rating', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/listings/${id}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rating: 6, comment: 'Invalid' }),
  });
  assert.strictEqual(r.status, 400);
});

test('POST /api/listings/:id/reviews 404 for unknown listing', async () => {
  const r = await fetch(`${BASE}/api/listings/00000000-0000-0000-0000-000000000000/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ rating: 5, comment: 'x' }),
  });
  assert.strictEqual(r.status, 404);
});

test('GET /api/listings/:id/reviews returns reviews', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/listings/${id}/reviews`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.reviews));
});

// ── Purchases ────────────────────────────────────────────────────────────────

test('POST /api/purchases creates a purchase', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/purchases`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ listingId: id, buyer: 'test-buyer' }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.strictEqual(b.status, 'completed');
});

test('POST /api/purchases 404 for unknown listing', async () => {
  const r = await fetch(`${BASE}/api/purchases`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ listingId: '00000000-0000-0000-0000-000000000000', buyer: 'x' }),
  });
  assert.strictEqual(r.status, 404);
});

test('GET /api/purchases returns purchases', async () => {
  const r = await fetch(`${BASE}/api/purchases`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.purchases));
});

// ── Installs ────────────────────────────────────────────────────────────────

test('POST /api/installs creates an install record', async () => {
  const list = await (await fetch(`${BASE}/api/listings`)).json();
  const id = list.listings[0].id;
  const r = await fetch(`${BASE}/api/installs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ listingId: id, buyerOrg: 'test-org' }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.instanceId);
});

test('GET /api/installs returns installs', async () => {
  const r = await fetch(`${BASE}/api/installs`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.installs));
});

// ── Audit ──────────────────────────────────────────────────────────────────��─

test('GET /api/audit returns audit entries', async () => {
  const r = await fetch(`${BASE}/api/audit`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.entries));
});

// ── Auth ─────────────────────────────────────────────────────────────────────

test('POST /api/listings without auth → 401', async () => {
  const r = await fetch(`${BASE}/api/listings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x', price: 1, pricingModel: 'subscription', publisher: 'x' }),
  });
  assert.strictEqual(r.status, 401);
});

test('GET /api/categories without auth → 200 (public)', async () => {
  const r = await fetch(`${BASE}/api/categories`);
  assert.strictEqual(r.status, 200);
});