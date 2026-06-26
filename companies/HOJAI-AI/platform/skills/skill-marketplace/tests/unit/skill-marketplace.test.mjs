/**
 * Skill Marketplace — unit tests (ESM)
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.SKILL_MARKETPLACE_PORT = '0';

const app = (await import('../../src/index.js')).default;

let server;
let baseURL;

function req(method, path, body) {
  return new Promise((resolve) => {
    const url = new URL(path, baseURL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'dev-token',
      },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseURL = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => { if (server) server.close(); });

describe('Health & Lifecycle', () => {
  test('GET /health -> 200', async () => {
    const r = await req('GET', '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.strictEqual(r.body.service, 'skill-marketplace');
  });
  test('GET /ready -> 200', async () => {
    const r = await req('GET', '/ready');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ready, true);
  });
});

describe('Categories', () => {
  test('GET /api/categories -> 200 with seeded data', async () => {
    const r = await req('GET', '/api/categories');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.categories));
    assert.ok(r.body.categories.length >= 6);
  });
  test('POST /api/categories -> 201', async () => {
    const r = await req('POST', '/api/categories', { name: 'Test Category' });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.name, 'Test Category');
  });
  test('POST /api/categories -> 400 for missing name', async () => {
    const r = await req('POST', '/api/categories', {});
    assert.strictEqual(r.status, 400);
  });
});

describe('Listings CRUD', () => {
  let listingId;
  test('POST /api/listings -> 201', async () => {
    const r = await req('POST', '/api/listings', {
      title: 'Test Skill',
      category: 'cat-ai',
      price: 99,
      pricingModel: 'one-time',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.title, 'Test Skill');
    listingId = r.body.id;
  });
  test('GET /api/listings -> 200 with listings', async () => {
    const r = await req('GET', '/api/listings');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.listings));
  });
  test('GET /api/listings?category=cat-ai -> filters', async () => {
    const r = await req('GET', '/api/listings?category=cat-ai');
    assert.strictEqual(r.status, 200);
    r.body.listings.forEach((l) => assert.strictEqual(l.category, 'cat-ai'));
  });
  test('GET /api/listings?q=react -> search', async () => {
    const r = await req('GET', '/api/listings?q=react');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/listings/featured -> 200', async () => {
    const r = await req('GET', '/api/listings/featured');
    assert.strictEqual(r.status, 200);
    r.body.listings.forEach((l) => assert.strictEqual(l.featured, true));
  });
  test('GET /api/listings/trending -> 200', async () => {
    const r = await req('GET', '/api/listings/trending');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/listings/:id -> 200 for seeded', async () => {
    const r = await req('GET', '/api/listings/' + listingId);
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/listings/:id -> 404 for unknown', async () => {
    const r = await req('GET', '/api/listings/no-such-id');
    assert.strictEqual(r.status, 404);
  });
  test('PATCH /api/listings/:id -> 200', async () => {
    const r = await req('PATCH', '/api/listings/' + listingId, { title: 'Updated Title' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.title, 'Updated Title');
  });
  test('PATCH /api/listings/:id -> 404 for unknown', async () => {
    const r = await req('PATCH', '/api/listings/no-such-id', { title: 'X' });
    assert.strictEqual(r.status, 404);
  });
  test('DELETE /api/listings/:id -> 204', async () => {
    const r = await req('DELETE', '/api/listings/' + listingId);
    assert.strictEqual(r.status, 204);
  });
  test('POST /api/listings -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/listings', { title: 'No Price' });
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/listings -> 400 for unknown category', async () => {
    const r = await req('POST', '/api/listings', {
      title: 'Bad Cat', category: 'cat-doesnt-exist', price: 10, pricingModel: 'one-time',
    });
    assert.strictEqual(r.status, 400);
  });
});

describe('Reviews', () => {
  let reviewListingId;
  test('POST /api/listings -> create listing for reviews', async () => {
    const r = await req('POST', '/api/listings', {
      title: 'Review Test', category: 'cat-ai', price: 5, pricingModel: 'one-time',
    });
    reviewListingId = r.body.id;
  });
  test('POST /api/listings/:id/reviews -> 201', async () => {
    const r = await req('POST', '/api/listings/' + reviewListingId + '/reviews', {
      rating: 5, comment: 'Great!', reviewer: 'tester',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.rating, 5);
  });
  test('POST /api/listings/:id/reviews -> 400 for bad rating', async () => {
    const r = await req('POST', '/api/listings/' + reviewListingId + '/reviews', {
      rating: 10, comment: 'Bad',
    });
    assert.strictEqual(r.status, 400);
  });
  test('GET /api/listings/:id/reviews -> 200', async () => {
    const r = await req('GET', '/api/listings/' + reviewListingId + '/reviews');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.count >= 1);
  });
});

describe('Purchases', () => {
  let purchaseListingId;
  test('POST /api/listings -> create listing', async () => {
    const r = await req('POST', '/api/listings', {
      title: 'Purchase Test', category: 'cat-biz', price: 49, pricingModel: 'one-time',
    });
    purchaseListingId = r.body.id;
  });
  test('POST /api/purchases -> 201', async () => {
    const r = await req('POST', '/api/purchases', {
      listingId: purchaseListingId, buyer: 'test-buyer',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.status, 'completed');
  });
  test('POST /api/purchases -> 404 for unknown listing', async () => {
    const r = await req('POST', '/api/purchases', {
      listingId: 'no-such-listing', buyer: 'test',
    });
    assert.strictEqual(r.status, 404);
  });
  test('GET /api/purchases -> 200', async () => {
    const r = await req('GET', '/api/purchases');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.purchases));
  });
  test('GET /api/purchases?buyer=test-buyer -> filters', async () => {
    const r = await req('GET', '/api/purchases?buyer=test-buyer');
    assert.strictEqual(r.status, 200);
    r.body.purchases.forEach((p) => assert.strictEqual(p.buyer, 'test-buyer'));
  });
});

describe('Audit', () => {
  test('GET /api/audit -> 200', async () => {
    const r = await req('GET', '/api/audit');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.entries));
  });
});
