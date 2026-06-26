/**
 * Feature Flags — unit tests
 * Tests: health, flag CRUD, toggle, rules, evaluate, segments, audit.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

process.env.REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.NODE_ENV = 'test';

const app = require('../../src/index.js');
const BASE = 'http://localhost:4746';

let server;
before(() => { server = app.listen(4746); });
after(() => { server.close(); });

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-internal-token': 'dev-token' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /api/health -> 200 with counts', async () => {
    const res = await req('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.ok(res.body.flagCount >= 4);
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

// ============================================================
// FLAG CRUD
// ============================================================
describe('Flag CRUD', () => {
  let flagKey;

  it('POST /api/flags -> 201 creates flag', async () => {
    const res = await req('POST', '/api/flags', {
      key: 'test-flag-' + Date.now(),
      name: 'Test Flag',
      type: 'boolean',
      defaultValue: false,
    });
    assert.strictEqual(res.status, 201);
    flagKey = res.body.key;
  });

  it('POST /api/flags -> 409 for duplicate', async () => {
    await req('POST', '/api/flags', { key: 'dup-test', name: 'Dup', type: 'boolean' });
    const res = await req('POST', '/api/flags', { key: 'dup-test', name: 'Dup2', type: 'string' });
    assert.strictEqual(res.status, 409);
  });

  it('POST /api/flags -> 400 for invalid type', async () => {
    const res = await req('POST', '/api/flags', { key: 'bad', name: 'Bad', type: 'invalid' });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/flags -> 200 lists flags', async () => {
    const res = await req('GET', '/api/flags');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count >= 4);
  });

  it('GET /api/flags?tag=ai -> filters by tag', async () => {
    const res = await req('GET', '/api/flags?tag=ai');
    assert.strictEqual(res.status, 200);
    res.body.flags.forEach(f => assert.ok(f.tags.includes('ai')));
  });

  it('GET /api/flags/:key -> 200 for seeded flag', async () => {
    const res = await req('GET', '/api/flags/ai-model-v2-rollout');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.key, 'ai-model-v2-rollout');
  });

  it('GET /api/flags/:key -> 404 for unknown', async () => {
    const res = await req('GET', '/api/flags/nonexistent');
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/flags/:key -> 200 updates flag', async () => {
    const res = await req('PUT', `/api/flags/${flagKey}`, { name: 'Updated' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Updated');
  });

  it('POST /api/flags/:key/toggle -> 200 toggles flag', async () => {
    const res = await req('POST', `/api/flags/${flagKey}/toggle`, { enabled: false });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.enabled, false);
  });

  it('DELETE /api/flags/:key -> 200 deletes flag', async () => {
    const res = await req('DELETE', `/api/flags/${flagKey}`);
    assert.strictEqual(res.status, 200);
  });

  it('DELETE /api/flags/:key -> 404 for unknown', async () => {
    const res = await req('DELETE', '/api/flags/doesnt-exist');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// FLAG RULES
// ============================================================
describe('Flag Rules', () => {
  let flagKey;

  before(async () => {
    const res = await req('POST', '/api/flags', {
      key: 'rule-test-' + Date.now(),
      name: 'Rule Test',
      type: 'boolean',
    });
    flagKey = res.body.key;
  });

  it('POST /api/flags/:key/rules -> 201 adds rule', async () => {
    const res = await req('POST', `/api/flags/${flagKey}/rules`, {
      name: 'Beta users',
      conditions: [{ attribute: 'plan', op: 'eq', values: ['beta'] }],
      variation: true,
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
  });

  it('GET /api/flags/:key/history -> 200 returns history', async () => {
    const res = await req('GET', `/api/flags/${flagKey}/history`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.history));
  });
});

// ============================================================
// FLAG EVALUATION
// ============================================================
describe('Flag Evaluation', () => {
  it('POST /api/flags/evaluate -> 200 for valid flag', async () => {
    const res = await req('POST', '/api/flags/evaluate', {
      flagKey: 'use-new-checkout',
      context: { userId: 'user-1', tenantId: 'acme' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.value, true);
  });

  it('POST /api/flags/evaluate -> 404 for unknown flag', async () => {
    const res = await req('POST', '/api/flags/evaluate', {
      flagKey: 'unknown',
      context: { userId: 'user-1' },
    });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/flags/bulk-evaluate -> 200', async () => {
    const res = await req('POST', '/api/flags/bulk-evaluate', {
      flagKeys: ['ai-model-v2-rollout', 'use-new-checkout'],
      context: { userId: 'bulk-user', tenantId: 'acme' },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.results['ai-model-v2-rollout']);
    assert.ok(res.body.results['use-new-checkout']);
  });
});

// ============================================================
// SEGMENTS
// ============================================================
describe('Segments', () => {
  it('GET /api/segments -> 200 lists segments', async () => {
    const res = await req('GET', '/api/segments');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count >= 1);
  });

  it('POST /api/segments -> 201 creates segment', async () => {
    const res = await req('POST', '/api/segments', {
      key: 'premium-' + Date.now(),
      name: 'Premium Users',
      rules: [{ attribute: 'plan', op: 'eq', values: ['premium'] }],
    });
    assert.strictEqual(res.status, 201);
  });
});

// ============================================================
// AUDIT
// ============================================================
describe('Audit', () => {
  it('GET /api/audit -> 200 returns entries', async () => {
    const res = await req('GET', '/api/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
  });

  it('GET /api/audit?resource=flag -> filters by resource', async () => {
    const res = await req('GET', '/api/audit?resource=flag');
    assert.strictEqual(res.status, 200);
    res.body.entries.forEach(e => assert.strictEqual(e.resource, 'flag'));
  });
});
