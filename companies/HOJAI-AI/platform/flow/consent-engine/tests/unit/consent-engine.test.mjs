/**
 * Consent Engine — unit tests (ESM)
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.CONSENT_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.CONSENT_LIMIT = '1000';
process.env.PORT = '0';

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
    assert.strictEqual(r.body.service, 'consent-engine');
  });
  test('GET /ready -> 200', async () => {
    const r = await req('GET', '/ready');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ready, true);
  });
});

describe('Purpose Catalog', () => {
  test('GET /api/purposes -> 200', async () => {
    const r = await req('GET', '/api/purposes');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.purposes['marketing.email']);
    assert.ok(r.body.purposes['fraud.scoring']);
    assert.ok(r.body.purposes['support.lookup']);
    assert.ok(r.body.count > 5);
  });
});

describe('Consent CRUD', () => {
  let consentId;
  test('POST /api/consents -> 201 creates consent', async () => {
    const r = await req('POST', '/api/consents', { subjectId: 'user-a', purpose: 'marketing.email' });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.status, 'active');
    assert.strictEqual(r.body.subjectId, 'user-a');
    consentId = r.body.id;
  });
  test('GET /api/consents/:id -> 200 for valid id', async () => {
    const r = await req('GET', `/api/consents/${consentId}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.id, consentId);
  });
  test('GET /api/consents/:id -> 404 for unknown', async () => {
    const r = await req('GET', '/api/consents/doesnt-exist');
    assert.strictEqual(r.status, 404);
  });
  test('POST /api/consents -> 400 for missing subjectId', async () => {
    const r = await req('POST', '/api/consents', { purpose: 'marketing.email' });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.includes('subjectId'));
  });
  test('POST /api/consents -> 400 for missing purpose', async () => {
    const r = await req('POST', '/api/consents', { subjectId: 'user-x' });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.includes('purpose'));
  });
  test('POST /api/consents/:id/withdraw -> 200', async () => {
    const r = await req('POST', `/api/consents/${consentId}/withdraw`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'withdrawn');
    assert.ok(r.body.withdrawnAt);
  });
  test('POST /api/consents/:id/withdraw -> idempotent on already withdrawn', async () => {
    const r = await req('POST', `/api/consents/${consentId}/withdraw`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'withdrawn');
  });
});

describe('Bulk Withdraw', () => {
  test('POST /api/consents/withdraw -> 200', async () => {
    const r = await req('POST', '/api/consents', { subjectId: 'bulk-user', purpose: 'analytics.cohort' });
    assert.strictEqual(r.status, 201);
    const r2 = await req('POST', '/api/consents/withdraw', { subjectId: 'bulk-user', purpose: 'analytics.cohort' });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.withdrawn, 1);
  });
  test('POST /api/consents/withdraw -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/consents/withdraw', {});
    assert.strictEqual(r.status, 400);
  });
});

describe('Consent Check (Fail-Closed)', () => {
  test('POST /api/check -> allowed=false when no consent', async () => {
    const r = await req('POST', '/api/check', { subjectId: 'nobody-' + Date.now(), purpose: 'marketing.email' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.allowed, false);
    assert.ok(r.body.reason);
  });
  test('POST /api/check -> allowed=true for active consent', async () => {
    const g = await req('POST', '/api/consents', { subjectId: 'user-b', purpose: 'support.lookup' });
    const r = await req('POST', '/api/check', { subjectId: 'user-b', purpose: 'support.lookup' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.allowed, true);
    assert.strictEqual(r.body.consentId, g.body.id);
  });
  test('POST /api/check -> allowed=false for withdrawn consent', async () => {
    const g = await req('POST', '/api/consents', { subjectId: 'withdrawn-user', purpose: 'personalization.recommendations' });
    await req('POST', `/api/consents/${g.body.id}/withdraw`);
    const r = await req('POST', '/api/check', { subjectId: 'withdrawn-user', purpose: 'personalization.recommendations' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.allowed, false);
  });
  test('POST /api/check -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/check', {});
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.allowed, false);
  });
});

describe('Subject Consents', () => {
  test('GET /api/subjects/:id/consents -> 200', async () => {
    const r = await req('GET', '/api/subjects/user-a/consents');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.consents));
    assert.ok(r.body.subjectId, 'user-a');
  });
  test('GET /api/subjects/:id/consents?status=active -> filters', async () => {
    const r = await req('GET', '/api/subjects/user-a/consents?status=active');
    assert.strictEqual(r.status, 200);
    r.body.consents.forEach((c) => assert.strictEqual(c.status, 'active'));
  });
  test('GET /api/subjects/:id/summary -> 200', async () => {
    const r = await req('GET', '/api/subjects/user-a/summary');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.byPurpose);
  });
});

describe('Audit', () => {
  test('GET /api/audit -> 200', async () => {
    const r = await req('GET', '/api/audit');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.entries));
  });
  test('GET /api/audit?type=consent.granted -> filters', async () => {
    const r = await req('GET', '/api/audit?type=consent.granted');
    assert.strictEqual(r.status, 200);
    r.body.entries.forEach((e) => assert.strictEqual(e.type, 'consent.granted'));
  });
});
