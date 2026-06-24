/**
 * Tests for the @hojai/marketplace SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 *
 * Mirrors @hojai/sutar's test pattern: 1 instantiation test + 1 happy-path
 * test per sub-client (9 clients) + 1 retry test + 1 throw test = 12 tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Marketplace } from '../index.js';

/**
 * Mock fetch helper — replaces globalThis.fetch and restores after the test.
 */
function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Marketplace client instantiates with all 9 sub-clients', () => {
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(bam.listings, 'listings client present');
  assert.ok(bam.reviews, 'reviews client present');
  assert.ok(bam.discover, 'discover client present');
  assert.ok(bam.explore, 'explore client present');
  assert.ok(bam.evaluate, 'evaluate client present');
  assert.ok(bam.reputation, 'reputation client present');
  assert.ok(bam.roi, 'roi client present');
  assert.ok(bam.founder, 'founder client present');
  assert.ok(bam.twins, 'twins client present');
});

test('ListingsClient.create POSTs to /api/listings', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        tenantId: 't-1', listingId: 'l-1', title: 'Negotiation Bot',
        description: '', shortDescription: '', category: 'agent',
        tags: [], pricingModel: 'free', price: 0, currency: 'USD',
        visibility: 'PUBLIC', status: 'DRAFT',
        reviewCount: 0, averageRating: 0, installCount: 0, viewCount: 0,
        publisherName: 'HOJAI', sampleData: {}, assets: [], metadata: {},
        createdAt: 't', updatedAt: 't',
      }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const listing = await bam.listings.create({ title: 'Negotiation Bot', category: 'agent', publisherName: 'HOJAI' });
  assert.equal(captured.url, 'http://localhost:9999/api/listings');
  assert.equal(captured.body.category, 'agent');
  assert.equal(listing.title, 'Negotiation Bot');
  restore();
});

test('ReviewsClient.addOrUpdate PUTs review to listing', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body), method: options.method };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        review: { id: 'r-1', tenantId: 't-1', listingId: 'l-1',
          reviewerId: 'u-1', reviewerName: 'Alice', rating: 5,
          title: 'Great', body: '', dimensions: {},
          status: 'published', createdAt: 't', updatedAt: 't' },
        listing: { listingId: 'l-1', averageRating: 5, reviewCount: 1 },
        created: true,
      }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await bam.reviews.addOrUpdate('l-1', { rating: 5, title: 'Great' });
  assert.equal(captured.url, 'http://localhost:9999/api/listings/l-1/reviews');
  assert.equal(captured.method, 'PUT');
  assert.equal(captured.body.rating, 5);
  restore();
});

test('DiscoverClient.search POSTs query to search endpoint', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ hits: [{ id: 'h-1', kind: 'listings', title: 'Negotiation', score: 0.95 }], total: 1, limit: 20, offset: 0 }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const res = await bam.discover.search({ q: 'negotiation' });
  assert.equal(captured.url, 'http://localhost:9999/api/search');
  assert.equal(captured.body.q, 'negotiation');
  assert.equal(res.hits[0].title, 'Negotiation');
  restore();
});

test('ExploreClient.startJourney POSTs to start a session', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 's-1', journeyId: 'j-1', tenantId: 't-1',
        currentStepId: 'step-1', state: {}, status: 'in-progress',
        startedAt: 't', completedAt: null,
      }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const session = await bam.explore.startJourney('j-1');
  assert.equal(captured.url, 'http://localhost:9999/api/journeys/j-1/start');
  assert.equal(session.status, 'in-progress');
  restore();
});

test('EvaluateClient.compare POSTs head-to-head comparison', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        scores: { a: 0.6, b: 0.8 },
        winnerId: 'b',
        normalized: { a: { price: 1, rating: 0.6 }, b: { price: 0.66, rating: 0.8 } },
      }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const res = await bam.evaluate.compare({
    criteria: [{ id: 'price', direction: 'lower' }, { id: 'rating', direction: 'higher' }],
    candidates: [{ id: 'a', values: { price: 99, rating: 4.8 } }, { id: 'b', values: { price: 149, rating: 4.9 } }],
  });
  assert.equal(captured.url, 'http://localhost:9999/api/evaluations/compare');
  assert.equal(res.winnerId, 'b');
  restore();
});

test('ReputationClient.leaderboard GETs public leaderboard', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { rank: 1, entityId: 'pub-1', name: 'HOJAI', kind: 'publisher', overallScore: 95 },
        { rank: 2, entityId: 'pub-2', name: 'Acme', kind: 'publisher', overallScore: 88 },
      ]),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const board = await bam.reputation.leaderboard({ kind: 'publisher', limit: 10 });
  assert.equal(captured.url, 'http://localhost:9999/api/leaderboard?kind=publisher&limit=10');
  assert.equal(board[0].rank, 1);
  restore();
});

test('RoiClient.quick POSTs a one-shot ROI calc', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        totalCost: 50000, totalGain: 96000, netProfit: 46000,
        paybackMonths: 7, npv: 38000, irr: 0.42, roi: 0.92,
      }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const roi = await bam.roi.quick({ upfrontCost: 50000, monthlyGain: 8000, months: 12 });
  assert.equal(captured.url, 'http://localhost:9999/api/quick-roi');
  assert.equal(roi.paybackMonths, 7);
  restore();
});

test('FounderClient.recordKpi POSTs KPI to founder', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ metric: 'mrr', value: 10000, unit: 'USD', period: 'monthly', capturedAt: 't' }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const kpi = await bam.founder.recordKpi('f-1', { metric: 'mrr', value: 10000, unit: 'USD', period: 'monthly' });
  assert.equal(captured.url, 'http://localhost:9999/api/founders/f-1/kpis');
  assert.equal(kpi.metric, 'mrr');
  restore();
});

test('TwinsClient.featured GETs curated featured twins', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([{
        id: 'tw-1', categoryId: 'c-1', title: 'Restaurant Twin', description: '',
        schema: {}, pricingModel: 'free', price: 0, currency: 'USD',
        publisherName: 'HOJAI', installCount: 1000, averageRating: 4.7,
        reviewCount: 50, createdAt: 't', updatedAt: 't',
      }]),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const twins = await bam.twins.featured();
  assert.equal(captured.url, 'http://localhost:9999/api/listings/featured');
  assert.equal(twins[0].title, 'Restaurant Twin');
  restore();
});

test('Marketplace client retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ tenantId: 't-1', listingId: 'l-1', title: 'X', description: '', shortDescription: '', category: 'agent', tags: [], pricingModel: 'free', price: 0, currency: 'USD', visibility: 'PUBLIC', status: 'PUBLISHED', reviewCount: 0, averageRating: 0, installCount: 0, viewCount: 0, publisherName: 'H', sampleData: {}, assets: [], metadata: {}, createdAt: 't', updatedAt: 't' }),
    };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const listing = await bam.listings.get('l-1');
  assert.equal(calls, 3);
  assert.equal(listing.listingId, 'l-1');
  restore();
});

test('Marketplace client throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const bam = new Marketplace({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(
    () => bam.listings.get('missing'),
    /HTTP 404/
  );
  restore();
});
