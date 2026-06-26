/**
 * Journey Intelligence Unit Tests (ESM)
 *
 * Tests all API endpoints of the journey-intelligence service.
 * Run: node --test tests/unit/journey-intelligence.test.mjs
 */

// Set env vars BEFORE importing the service module
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token-ji';
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = (await import(resolve(__dirname, '../../src/index.js'))).default;

// Auth token used by requireAuth
const TOKEN = 'dev-token-ji';

const PORT = 4955;
let server;
const BASE = 'http://localhost:' + PORT;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: PORT,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', 'x-internal-token': TOKEN, ...(extraHeaders || {}) },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, function(res) {
      let chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() {
        let parsed;
        try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  await new Promise(function(resolve) { server = app.listen(PORT, '127.0.0.1', resolve); });
});

after(async () => {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'journey-intelligence');
    assert.ok(res.body.port);
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
    assert.ok(res.body.timestamp);
  });

  it('GET /overview -> 200', async () => {
    const res = await req('GET', '/overview');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.totalLeads === 'number');
    assert.ok(typeof res.body.revenue === 'number');
    assert.ok(typeof res.body.conversionRate === 'number');
  });
});

// ============================================================
// JOURNEY CRUD
// ============================================================
describe('Journey CRUD', () => {
  it('POST /journey -> 201 (create)', async () => {
    const res = await req('POST', '/journey', {
      leadId: 'lead_test_001',
      stage: 'awareness',
      company: 'TestCo',
      value: 25000
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.journey.id.startsWith('journey_'));
    assert.strictEqual(res.body.journey.leadId, 'lead_test_001');
    assert.strictEqual(res.body.journey.stage, 'awareness');
    assert.strictEqual(res.body.journey.company, 'TestCo');
    assert.strictEqual(res.body.journey.value, 25000);
    assert.deepStrictEqual(res.body.journey.milestones, []);
    assert.ok(res.body.journey.createdAt);
  });

  it('POST /journey -> 201 (defaults stage to awareness)', async () => {
    const res = await req('POST', '/journey', { leadId: 'lead_nostage' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.journey.stage, 'awareness');
  });

  it('POST /journey -> 400 (missing leadId)', async () => {
    const res = await req('POST', '/journey', { company: 'Acme' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('leadId'));
  });

  it('GET /journey -> 200 (list all)', async () => {
    const res = await req('GET', '/journey');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.journeys));
    assert.ok(res.body.journeys.length >= 3); // seeded journeys + created above
  });

  it('GET /journey?stage=awareness -> 200 (filter by stage)', async () => {
    const res = await req('GET', '/journey?stage=awareness');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.journeys.every(j => j.stage === 'awareness'));
  });

  it('GET /journey?leadId=X -> 200 (filter by leadId)', async () => {
    const res = await req('GET', '/journey?leadId=lead_test_001');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.journeys.every(j => j.leadId === 'lead_test_001'));
  });

  it('GET /journey/:id -> 200 (exists)', async () => {
    // Create a journey to get a known ID
    const create = await req('POST', '/journey', { leadId: 'lead_get_001', stage: 'consideration' });
    const id = create.body.journey.id;
    const res = await req('GET', '/journey/' + id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.journey.id, id);
    assert.strictEqual(res.body.journey.leadId, 'lead_get_001');
  });

  it('GET /journey/:id -> 404 (not found)', async () => {
    const res = await req('GET', '/journey/journey_nonexistent_id_99999');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });

  it('PATCH /journey/:id -> 200 (update stage)', async () => {
    const create = await req('POST', '/journey', { leadId: 'lead_patch_001', stage: 'awareness', value: 10000 });
    const id = create.body.journey.id;
    const res = await req('PATCH', '/journey/' + id, { stage: 'consideration', value: 15000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.journey.stage, 'consideration');
    assert.strictEqual(res.body.journey.value, 15000);
    assert.strictEqual(res.body.journey.milestones.length, 1);
    assert.strictEqual(res.body.journey.milestones[0].from, 'awareness');
    assert.strictEqual(res.body.journey.milestones[0].to, 'consideration');
  });

  it('PATCH /journey/:id -> 404 (not found)', async () => {
    const res = await req('PATCH', '/journey/journey_nonexistent_xyz', { stage: 'acquisition' });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /journey/:id -> 200', async () => {
    const create = await req('POST', '/journey', { leadId: 'lead_del_001' });
    const id = create.body.journey.id;
    const del = await req('DELETE', '/journey/' + id);
    assert.strictEqual(del.status, 200);
    assert.strictEqual(del.body.success, true);
    const get = await req('GET', '/journey/' + id);
    assert.strictEqual(get.status, 404);
  });

  it('DELETE /journey/:id -> 404 (not found)', async () => {
    const res = await req('DELETE', '/journey/journey_nonexistent_del');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// ANALYTICS
// ============================================================
describe('Analytics', () => {
  it('GET /analytics/overview -> 200', async () => {
    const res = await req('GET', '/analytics/overview');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.totalLeads, 1247);
    assert.strictEqual(res.body.qualifiedLeads, 423);
    assert.strictEqual(res.body.openDeals, 89);
    assert.strictEqual(res.body.revenue, 2450000);
    assert.strictEqual(res.body.conversionRate, 12.5);
    assert.strictEqual(res.body.activeCampaigns, 12);
  });

  it('GET /analytics/funnel -> 200', async () => {
    const res = await req('GET', '/analytics/funnel');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const funnel = res.body.funnel;
    assert.ok(Array.isArray(funnel));
    assert.ok(funnel.length >= 5);
    // Check funnel structure
    funnel.forEach(f => {
      assert.ok(f.stage);
      assert.ok(typeof f.count === 'number');
      assert.ok(typeof f.conversionRate === 'number');
      assert.ok(typeof f.dropoff === 'number');
      assert.strictEqual(f.dropoff, Math.round(f.count * (1 - f.conversionRate)));
    });
    // Check funnel stages
    const stages = funnel.map(f => f.stage);
    assert.ok(stages.includes('awareness'));
    assert.ok(stages.includes('consideration'));
    assert.ok(stages.includes('acquisition'));
  });

  it('GET /analytics/pipeline -> 200', async () => {
    const res = await req('GET', '/analytics/pipeline');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const stages = res.body.stages;
    assert.ok(Array.isArray(stages));
    assert.ok(stages.length >= 5);
    stages.forEach(s => {
      assert.ok(s.stage);
      assert.ok(typeof s.count === 'number');
      assert.ok(typeof s.value === 'number');
      assert.ok(typeof s.probability === 'number');
    });
  });

  it('GET /analytics/trends -> 200', async () => {
    const res = await req('GET', '/analytics/trends');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const trends = res.body.trends;
    assert.ok(Array.isArray(trends));
    assert.ok(trends.length >= 6);
    trends.forEach(t => {
      assert.ok(t.month);
      assert.ok(typeof t.leads === 'number');
      assert.ok(typeof t.conversions === 'number');
      assert.ok(typeof t.revenue === 'number');
    });
  });

  it('GET /analytics/performance -> 200', async () => {
    const res = await req('GET', '/analytics/performance');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const sources = res.body.sources;
    assert.ok(Array.isArray(sources));
    assert.ok(sources.length >= 4);
    sources.forEach(s => {
      assert.ok(s.source);
      assert.ok(typeof s.leads === 'number');
      assert.ok(typeof s.mqls === 'number');
      assert.ok(typeof s.sqls === 'number');
      assert.ok(typeof s.revenue === 'number');
    });
  });

  it('GET /analytics/performance -> known sources', async () => {
    const res = await req('GET', '/analytics/performance');
    const sources = res.body.sources.map(s => s.source);
    assert.ok(sources.includes('Website'));
    assert.ok(sources.includes('Email'));
    assert.ok(sources.includes('Social'));
    assert.ok(sources.includes('Referral'));
  });
});

// ============================================================
// AUTH GUARD
// ============================================================
describe('Auth Guard', () => {
  it('rejects requests without token', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'GET',
        hostname: 'localhost',
        port: PORT,
        path: '/health',
        headers: { 'Content-Type': 'application/json' },
      };
      const r = http.request(opts, function(res) {
        let chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      r.end();
    });
    assert.strictEqual(res.status, 401);
  });
});
