/**
 * Proactive Engine Unit Tests (CommonJS)
 *
 * Tests all endpoints of the proactive-engine service.
 * Run: node --test tests/unit/proactive-engine.test.cjs
 */

process.env.INTERNAL_TOKEN = 'dev-token-pe';
process.env.PROACTIVE_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const app = require('../../src/index.js');
const { evaluate } = require('../../src/index.js');

const PORT = 4790;
const TOKEN = 'dev-token-pe';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token-pe';
let server;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, 'http://localhost:' + PORT);
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
// UNIT: evaluate
// ============================================================
describe('evaluate (unit)', () => {
  it('returns true for rule with no conditions', () => {
    assert.strictEqual(evaluate({ trigger: {} }, {}), true);
    assert.strictEqual(evaluate({ trigger: { conditions: [] } }, { x: 1 }), true);
  });

  it('eq: matches equal value', () => {
    const rule = { trigger: { conditions: [{ key: 'status', op: 'eq', value: 'active' }] } };
    assert.strictEqual(evaluate(rule, { status: 'active' }), true);
    assert.strictEqual(evaluate(rule, { status: 'inactive' }), false);
  });

  it('neq: matches non-equal value', () => {
    const rule = { trigger: { conditions: [{ key: 'status', op: 'neq', value: 'banned' }] } };
    assert.strictEqual(evaluate(rule, { status: 'active' }), true);
    assert.strictEqual(evaluate(rule, { status: 'banned' }), false);
  });

  it('gt: greater than', () => {
    const rule = { trigger: { conditions: [{ key: 'age', op: 'gt', value: 18 }] } };
    assert.strictEqual(evaluate(rule, { age: 25 }), true);
    assert.strictEqual(evaluate(rule, { age: 17 }), false);
    assert.strictEqual(evaluate(rule, { age: 18 }), false);
  });

  it('lt: less than', () => {
    const rule = { trigger: { conditions: [{ key: 'balance', op: 'lt', value: 100 }] } };
    assert.strictEqual(evaluate(rule, { balance: 50 }), true);
    assert.strictEqual(evaluate(rule, { balance: 100 }), false);
    assert.strictEqual(evaluate(rule, { balance: 150 }), false);
  });

  it('in: value in array', () => {
    const rule = { trigger: { conditions: [{ key: 'plan', op: 'in', value: ['pro', 'enterprise'] }] } };
    assert.strictEqual(evaluate(rule, { plan: 'pro' }), true);
    assert.strictEqual(evaluate(rule, { plan: 'free' }), false);
  });

  it('contains: string contains substring', () => {
    const rule = { trigger: { conditions: [{ key: 'email', op: 'contains', value: '@gmail' }] } };
    assert.strictEqual(evaluate(rule, { email: 'user@gmail.com' }), true);
    assert.strictEqual(evaluate(rule, { email: 'user@yahoo.com' }), false);
  });

  it('multiple conditions (AND)', () => {
    const rule = { trigger: { conditions: [
      { key: 'status', op: 'eq', value: 'active' },
      { key: 'age', op: 'gt', value: 18 }
    ] } };
    assert.strictEqual(evaluate(rule, { status: 'active', age: 25 }), true);
    assert.strictEqual(evaluate(rule, { status: 'active', age: 15 }), false);
    assert.strictEqual(evaluate(rule, { status: 'inactive', age: 25 }), false);
  });

  it('unknown operator: returns true (no-op)', () => {
    const rule = { trigger: { conditions: [{ key: 'x', op: 'unknown', value: 1 }] } };
    assert.strictEqual(evaluate(rule, { x: 999 }), true);
  });
});

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'proactive-engine');
  });

  it('GET /api/health -> 200', async () => {
    const res = await req('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(typeof res.body.rules === 'number', true);
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

// ============================================================
// RULES CRUD
// ============================================================
describe('Rules CRUD', () => {
  let createdRuleId;

  it('POST /api/proactive/rule -> 201', async () => {
    const res = await req('POST', '/api/proactive/rule', {
      name: 'test-rule-1',
      trigger: { conditions: [{ key: 'age', op: 'gt', value: 18 }] },
      action: { type: 'notify', message: 'You are eligible' },
      priority: 3
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.name, 'test-rule-1');
    assert.strictEqual(res.body.priority, 3);
    assert.strictEqual(res.body.enabled, true);
    createdRuleId = res.body.id;
  });

  it('POST /api/proactive/rule -> 201 (defaults priority to 5)', async () => {
    const res = await req('POST', '/api/proactive/rule', {
      name: 'test-rule-defaults',
      action: { type: 'email' }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.priority, 5);
  });

  it('POST /api/proactive/rule -> 400 (missing name)', async () => {
    const res = await req('POST', '/api/proactive/rule', { action: { type: 'x' } });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/proactive/rule -> 400 (missing action)', async () => {
    const res = await req('POST', '/api/proactive/rule', { name: 'orphan' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/proactive/rules -> 200', async () => {
    const res = await req('GET', '/api/proactive/rules');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.rules));
    assert.ok(res.body.count >= 1);
  });

  it('GET /api/proactive/rules returns sorted by priority', async () => {
    const res = await req('GET', '/api/proactive/rules');
    const rules = res.body.rules;
    for (let i = 1; i < rules.length; i++) {
      assert.ok(rules[i].priority >= rules[i - 1].priority, 'rules sorted by priority');
    }
  });

  it('GET /api/proactive/rules/:id -> 200', async () => {
    const res = await req('GET', '/api/proactive/rules/' + createdRuleId);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, createdRuleId);
  });

  it('GET /api/proactive/rules/:id -> 404', async () => {
    const res = await req('GET', '/api/proactive/rules/does-not-exist');
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/proactive/rules/:id -> 200', async () => {
    const res = await req('DELETE', '/api/proactive/rules/' + createdRuleId);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id);
  });

  it('DELETE /api/proactive/rules/:id -> 404', async () => {
    const res = await req('DELETE', '/api/proactive/rules/already-gone');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// SUGGESTIONS
// ============================================================
describe('Suggestions', () => {
  let ruleId;

  before(async () => {
    // Clear all rules so Suggestions tests start clean (await all DELETEs)
    const list = await req('GET', '/api/proactive/rules');
    await Promise.all(list.body.rules.map(r => req('DELETE', '/api/proactive/rules/' + r.id)));
    const res = await req('POST', '/api/proactive/rule', {
      name: 'suggest-test-rule',
      trigger: { conditions: [{ key: 'tier', op: 'eq', value: 'premium' }] },
      action: { type: 'offer', message: 'Upgrade offer' },
      priority: 1
    });
    ruleId = res.body.id;
  });

  it('POST /api/proactive/suggest -> 200 (matches)', async () => {
    const res = await req('POST', '/api/proactive/suggest', {
      userId: 'user-123', context: { tier: 'premium' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.userId, 'user-123');
    assert.ok(Array.isArray(res.body.suggestions));
    assert.ok(res.body.count >= 1);
  });

  it('POST /api/proactive/suggest -> 200 (no match)', async () => {
    const res = await req('POST', '/api/proactive/suggest', {
      userId: 'user-456', context: { tier: 'free' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 0);
  });

  it('POST /api/proactive/suggest -> 200 (prefer filter)', async () => {
    const res = await req('POST', '/api/proactive/suggest', {
      userId: 'user-789', context: { tier: 'premium' }, prefer: ['offer']
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.suggestions.every(s => s.action?.type === 'offer'));
  });

  it('POST /api/proactive/suggest -> 400 (missing userId)', async () => {
    const res = await req('POST', '/api/proactive/suggest', { context: {} });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns max 5 suggestions', async () => {
    // Create 7 rules
    const ids = [];
    for (let i = 0; i < 7; i++) {
      const res = await req('POST', '/api/proactive/rule', {
        name: 'many-rules-' + i, action: { type: 'notify' }
      });
      ids.push(res.body.id);
    }
    const suggest = await req('POST', '/api/proactive/suggest', { userId: 'user-many' });
    assert.ok(suggest.body.count <= 5);
    // Cleanup
    for (const id of ids) await req('DELETE', '/api/proactive/rules/' + id);
  });
});

// ============================================================
// AUDIT
// ============================================================
describe('Audit', () => {
  it('GET /api/proactive/audit -> 200', async () => {
    const res = await req('GET', '/api/proactive/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
  });

  it('GET /api/proactive/audit?limit=2 -> respects limit', async () => {
    const res = await req('GET', '/api/proactive/audit?limit=2');
    assert.ok(res.body.entries.length <= 2);
  });

  it('GET /api/proactive/audit?action=rule.create -> filters', async () => {
    const res = await req('GET', '/api/proactive/audit?action=rule.create');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
  });
});
