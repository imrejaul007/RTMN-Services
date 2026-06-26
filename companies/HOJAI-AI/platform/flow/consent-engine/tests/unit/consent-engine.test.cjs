/**
 * Consent Engine — unit tests
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

process.env.REQUIRE_AUTH = 'false';
process.env.CONSENT_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const app = require('../../src/index.js');
const BASE = 'http://localhost:4263';

let server;
before(() => { server = app.listen(4263); });
after(() => { server.close(); });

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

describe('Health', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });
  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

describe('Purpose Catalog', () => {
  it('GET /api/purposes -> 200', async () => {
    const res = await req('GET', '/api/purposes');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.purposes['marketing.email']);
    assert.ok(res.body.purposes['fraud.scoring']);
  });
});

describe('Consent CRUD', () => {
  let consentId;
  it('POST /api/consents -> 201', async () => {
    const res = await req('POST', '/api/consents', { subjectId: 'user-a', purpose: 'marketing.email' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'active');
    consentId = res.body.id;
  });
  it('GET /api/consents/:id -> 200', async () => {
    const res = await req('GET', `/api/consents/${consentId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, consentId);
  });
  it('GET /api/consents/:id -> 404', async () => {
    const res = await req('GET', '/api/consents/doesnt-exist');
    assert.strictEqual(res.status, 404);
  });
  it('POST /api/consents/:id/withdraw -> 200', async () => {
    const res = await req('POST', `/api/consents/${consentId}/withdraw`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'withdrawn');
  });
  it('POST /api/consents -> 400 (missing subjectId)', async () => {
    const res = await req('POST', '/api/consents', { purpose: 'marketing.email' });
    assert.strictEqual(res.status, 400);
  });
});

describe('Consent Check (Fail-Closed)', () => {
  it('POST /api/check -> allowed=false (no consent)', async () => {
    const res = await req('POST', '/api/check', { subjectId: 'nobody', purpose: 'marketing.email' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.allowed, false);
  });
  it('POST /api/check -> allowed=true (active consent)', async () => {
    const g = await req('POST', '/api/consents', { subjectId: 'user-b', purpose: 'support.lookup' });
    const res = await req('POST', '/api/check', { subjectId: 'user-b', purpose: 'support.lookup' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.allowed, true);
    assert.strictEqual(res.body.consentId, g.body.id);
  });
});

describe('Summary', () => {
  it('GET /api/subjects/:id/summary -> 200', async () => {
    const res = await req('GET', '/api/subjects/user-a/summary');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.byPurpose);
  });
});
