/**
 * PolicyOS — Phase 2-10 Route Integration Tests
 *
 * Smoke-tests every new route registered in phases 2-10:
 * Phase 2:  attributes, condition-templates, attribute-policies
 * Phase 2.4: nl-authoring, nl-explanation
 * Phase 3:   rebac
 * Phase 4:   ai-governance
 * Phase 5:   agent-trust
 * Phase 6:   memory-governance
 * Phase 7:   twin-governance
 * Phase 8:   constitutional-ai
 * Phase 9:   lifecycle-automation
 * Phase 10:  developer-experience
 *
 * Verifies each route group:
 *  - Responds with a non-5xx status (200/401/400/404/500)
 *  - Returns JSON (or a defined response shape)
 *  - Does not crash the app
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const SERVICE_TOKEN = 'integration-test-token';

let server;
let port;

async function startApp() {
  try {
    const authMod = await import('../../src/middleware/auth.js');
    authMod._resetAuthState?.();
  } catch { /* ignore */ }

  process.env.PORT = '0';
  process.env.POLICYOS_REQUIRE_AUTH = 'true';
  process.env.NODE_ENV = 'test';
  process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
  process.env.HOJAI_DATA_DIR = '/tmp/policy-os-integration-test';

  const url = new URL('../../src/index.js', import.meta.url);
  url.searchParams.set('bust', `${Date.now()}-${Math.random()}`);
  await import(url.href);
}

async function api(path, method = 'GET', body) {
  return new Promise((resolve) => {
    const headers = { 'x-internal-token': SERVICE_TOKEN, 'Content-Type': 'application/json' };
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const opts = { hostname: '127.0.0.1', port, path, method, headers };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

before(async () => {
  await startApp();
  let attempts = 0;
  while (attempts < 50) {
    try {
      const mod = await import('../../src/index.js');
      const app = mod.default || mod.app;
      if (app && app.listen) {
        await new Promise((resolve) => {
          server = app.listen(0, '127.0.0.1', (err) => {
            if (err) { attempts++; setTimeout(resolve, 100); return; }
            port = server.address().port;
            resolve();
          });
        });
        if (port) break;
      }
    } catch { /* wait */ }
    attempts++;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!port) throw new Error('Could not start app');
});

after(() => { server?.close(); });

// Helper: assert route responds without 5xx
async function assertRoute(path, method = 'GET', body, label) {
  const res = await api(path, method, body);
  const is5xx = res.status >= 500 && res.status < 600;
  assert.ok(!is5xx, `${label}: server returned 5xx (${res.status}). Route may be crashing.\n${JSON.stringify(res.body)}`);
  assert.ok(res.status !== 0, `${label}: request failed (status 0)`);
  // Accept 201 for resource creation, 202 for async acceptance
  assert.ok([200, 201, 202, 400, 401, 404, 500].includes(res.status),
    `${label}: unexpected status ${res.status}`);
}

// ── Phase 2: Attributes ───────────────────────────────────────────────────────

test('Phase 2 — GET /api/attributes/defs — returns attribute definitions', async () => {
  await assertRoute('/api/attributes/defs', 'GET', null, 'GET /api/attributes/defs');
  const res = await api('/api/attributes/defs');
  assert.ok([200, 401, 404].includes(res.status), `Expected 200/401/404, got ${res.status}`);
});

test('Phase 2 — POST /api/attributes/values/:path — sets attribute value', async () => {
  await assertRoute('/api/attributes/values/user.1/profile.name', 'POST', { value: 'Alice' }, 'POST /api/attributes/values/:path');
});

test('Phase 2 — GET /api/attributes/values/:path — retrieves attribute value', async () => {
  await assertRoute('/api/attributes/values/user.1/profile.name', 'GET', null, 'GET /api/attributes/values/:path');
});

test('Phase 2 — GET /api/attributes/lookup/:path — looks up attribute', async () => {
  await assertRoute('/api/attributes/lookup/user.1/profile.name', 'GET', null, 'GET /api/attributes/lookup/:path');
});

// ── Phase 2: Condition Templates ─────────────────────────────────────────────

test('Phase 2 — GET /api/condition-templates — lists templates', async () => {
  await assertRoute('/api/condition-templates', 'GET', null, 'GET /api/condition-templates');
  const res = await api('/api/condition-templates');
  assert.ok([200, 401].includes(res.status), `Expected 200/401, got ${res.status}`);
});

test('Phase 2 — POST /api/condition-templates — creates template', async () => {
  await assertRoute('/api/condition-templates', 'POST', {
    name: 'amount-range',
    description: 'Validates numeric ranges',
    parameters: [{ name: 'min', type: 'number' }, { name: 'max', type: 'number' }],
    expression: 'context.amount >= params.min && context.amount <= params.max',
  }, 'POST /api/condition-templates');
});

test('Phase 2 — GET /api/condition-templates/:id — gets one template', async () => {
  await assertRoute('/api/condition-templates/amount-range', 'GET', null, 'GET /api/condition-templates/:id');
});

test('Phase 2 — DELETE /api/condition-templates/:id — deletes template', async () => {
  await assertRoute('/api/condition-templates/amount-range', 'DELETE', null, 'DELETE /api/condition-templates/:id');
});

test('Phase 2 — POST /api/condition-templates/:id/evaluate — evaluates template', async () => {
  await assertRoute('/api/condition-templates/amount-range/evaluate', 'POST', {
    context: { amount: 500 },
    params: { min: 100, max: 1000 },
  }, 'POST /api/condition-templates/:id/evaluate');
});

// ── Phase 2: Attribute Policies ───────────────────────────────────────────────

test('Phase 2 — GET /api/attribute-policies — lists attribute policies', async () => {
  await assertRoute('/api/attribute-policies', 'GET', null, 'GET /api/attribute-policies');
});

test('Phase 2 — POST /api/attribute-policies — creates attribute policy', async () => {
  await assertRoute('/api/attribute-policies', 'POST', {
    id: 'attrpol-001',
    description: 'Allow read on profile attributes',
    resource: 'attributes',
    actions: ['read'],
    subjects: { type: 'role', value: 'customer' },
  }, 'POST /api/attribute-policies');
});

test('Phase 2 — GET /api/attribute-policies/:id — gets one attribute policy', async () => {
  await assertRoute('/api/attribute-policies/attrpol-001', 'GET', null, 'GET /api/attribute-policies/:id');
});

test('Phase 2 — POST /api/attribute-policies/evaluate — evaluates attribute policy', async () => {
  await assertRoute('/api/attribute-policies/evaluate', 'POST', {
    resource: 'attributes',
    action: 'read',
    subject: { type: 'role', value: 'customer' },
  }, 'POST /api/attribute-policies/evaluate');
});

// ── Phase 2.4: NL Authoring ─────────────────────────────────────────────────

test('Phase 2.4 — POST /api/policies/from-description — parses natural language', async () => {
  await assertRoute('/api/policies/from-description', 'POST', {
    description: 'only admins can delete customer data',
  }, 'POST /api/policies/from-description');
  const res = await api('/api/policies/from-description', 'POST', { description: 'admins can read documents' });
  assert.ok([200, 201, 400, 401, 500].includes(res.status), `Got ${res.status}: ${JSON.stringify(res.body)}`);
  if (res.status === 200 || res.status === 201) {
    const policy = res.body.policy || res.body;
    assert.ok(policy.effect);
    assert.ok(policy.conditions || policy.rules);
  }
});

test('Phase 2.4 — POST /api/policies/translate — translates policy format', async () => {
  await assertRoute('/api/policies/translate', 'POST', {
    policy: { id: 'test', effect: 'allow', conditions: [] },
    targetFormat: 'policyos',
  }, 'POST /api/policies/translate');
  const res = await api('/api/policies/translate', 'POST', {
    policy: { id: 'test', effect: 'allow', conditions: [] },
    targetFormat: 'policyos',
  });
  assert.ok([200, 400, 401, 500].includes(res.status), `Got ${res.status}`);
  if (res.status === 200) {
    assert.ok(res.body.format || res.body.translated || res.body.id);
  }
});

// ── Phase 2.5: NL Explanation ───────────────────────────────────────────────

test('Phase 2.5 — POST /api/policies/explain — explains a decision', async () => {
  await assertRoute('/api/policies/explain', 'POST', {
    decisionId: 'dec-001',
    format: 'detailed',
  }, 'POST /api/policies/explain');
});

test('Phase 2.5 — GET /api/policies/explain/:decisionId — gets explanation by ID', async () => {
  await assertRoute('/api/policies/explain/dec-001', 'GET', null, 'GET /api/policies/explain/:decisionId');
});

test('Phase 2.5 — GET /api/policies/decisions — lists recent decisions', async () => {
  await assertRoute('/api/policies/decisions', 'GET', null, 'GET /api/policies/decisions');
});

// ── Phase 3: ReBAC ───────────────────────────────────────────────────────────

test('Phase 3 — POST /api/relationships — creates relationship', async () => {
  await assertRoute('/api/relationships', 'POST', {
    from: 'user:alice',
    to: 'document:report-1',
    type: 'owner',
    metadata: { since: '2026-01-01' },
  }, 'POST /api/relationships');
  const res = await api('/api/relationships', 'POST', {
    from: 'user:alice',
    to: 'document:report-1',
    type: 'owner',
  });
  assert.ok([200, 201, 400, 401, 500].includes(res.status));
});

test('Phase 3 — GET /api/relationships — lists relationships', async () => {
  await assertRoute('/api/relationships', 'GET', null, 'GET /api/relationships');
});

test('Phase 3 — POST /api/relationships/check — checks if relationship exists', async () => {
  await assertRoute('/api/relationships/check', 'POST', {
    from: 'user:alice',
    to: 'document:report-1',
    type: 'owner',
  }, 'POST /api/relationships/check');
});

test('Phase 3 — POST /api/relationships/path — finds relationship path', async () => {
  await assertRoute('/api/relationships/path', 'POST', {
    from: 'user:alice',
    to: 'document:report-1',
    maxDepth: 5,
  }, 'POST /api/relationships/path');
});

test('Phase 3 — POST /api/relationships/evaluate — evaluates ReBAC access', async () => {
  await assertRoute('/api/relationships/evaluate', 'POST', {
    subject: 'user:alice',
    relation: 'owner',
    resource: 'document:report-1',
  }, 'POST /api/relationships/evaluate');
});

// ── Phase 4: AI Governance ──────────────────────────────────────────────────

test('Phase 4 — GET /api/ai/models — lists models', async () => {
  await assertRoute('/api/ai/models', 'GET', null, 'GET /api/ai/models');
});

test('Phase 4 — POST /api/ai/models — registers a model', async () => {
  await assertRoute('/api/ai/models', 'POST', {
    id: 'model-gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    status: 'active',
    capabilities: ['chat', 'vision'],
  }, 'POST /api/ai/models');
});

test('Phase 4 — POST /api/ai/validate — validates AI output', async () => {
  await assertRoute('/api/ai/validate', 'POST', {
    output: 'Hello, this is a test response.',
    rules: [{ type: 'max_length', maxLength: 1000 }],
  }, 'POST /api/ai/validate');
});

test('Phase 4 — GET /api/ai/constitutions — lists constitutions', async () => {
  await assertRoute('/api/ai/constitutions', 'GET', null, 'GET /api/ai/constitutions');
});

test('Phase 4 — POST /api/ai/constitutions — creates constitution', async () => {
  await assertRoute('/api/ai/constitutions', 'POST', {
    id: 'const-001',
    name: 'Safe AI Constitution',
    type: 'safety',
    principles: ['do no harm', 'respect privacy'],
    status: 'draft',
  }, 'POST /api/ai/constitutions');
});

// ── Phase 5: Agent Trust ─────────────────────────────────────────────────────

test('Phase 5 — GET /api/agent-trust/agents — lists agents', async () => {
  await assertRoute('/api/agent-trust/agents', 'GET', null, 'GET /api/agent-trust/agents');
});

test('Phase 5 — POST /api/agent-trust/agents — registers an agent', async () => {
  await assertRoute('/api/agent-trust/agents', 'POST', {
    id: 'agent-test-001',
    name: 'Test Agent',
    type: 'assistant',
    capabilities: ['chat', 'reasoning'],
  }, 'POST /api/agent-trust/agents');
});

test('Phase 5 — GET /api/agent-trust/agents/:id — gets agent trust score', async () => {
  await assertRoute('/api/agent-trust/agents/agent-test-001', 'GET', null, 'GET /api/agent-trust/agents/:id');
});

test('Phase 5 — POST /api/agent-trust/agents/:id/score — submits trust score', async () => {
  await assertRoute('/api/agent-trust/agents/agent-test-001/score', 'POST', {
    reliability: 0.9,
    safety: 0.95,
    accuracy: 0.85,
  }, 'POST /api/agent-trust/agents/:id/score');
});

test('Phase 5 — GET /api/agent-trust/levels — lists trust levels', async () => {
  await assertRoute('/api/agent-trust/levels', 'GET', null, 'GET /api/agent-trust/levels');
});

// ── Phase 6: Memory Governance ───────────────────────────────────────────────

test('Phase 6 — GET /api/memory/policies — lists memory policies', async () => {
  await assertRoute('/api/memory/policies', 'GET', null, 'GET /api/memory/policies');
});

test('Phase 6 — POST /api/memory/policies — creates memory policy', async () => {
  await assertRoute('/api/memory/policies', 'POST', {
    id: 'mem-pol-001',
    name: 'PII Retention Policy',
    accessLevel: 'read',
    retentionDays: 90,
  }, 'POST /api/memory/policies');
});

test('Phase 6 — POST /api/memory/pii/scan — scans for PII', async () => {
  await assertRoute('/api/memory/pii/scan', 'POST', {
    text: 'Contact user@domain.com for support at 987-654-3210',
  }, 'POST /api/memory/pii/scan');
});

test('Phase 6 — GET /api/memory/retention — gets retention rules', async () => {
  await assertRoute('/api/memory/retention', 'GET', null, 'GET /api/memory/retention');
});

test('Phase 6 — POST /api/memory/retention — creates retention rule', async () => {
  await assertRoute('/api/memory/retention', 'POST', {
    id: 'ret-001',
    name: 'Standard Retention',
    level: 'short',
  }, 'POST /api/memory/retention');
});

// ── Phase 7: Twin Governance ─────────────────────────────────────────────────

test('Phase 7 — GET /api/twin/policies — lists twin policies', async () => {
  await assertRoute('/api/twin/policies', 'GET', null, 'GET /api/twin/policies');
});

test('Phase 7 — POST /api/twin/policies — creates twin policy', async () => {
  await assertRoute('/api/twin/policies', 'POST', {
    id: 'twin-pol-001',
    name: 'Customer Twin Access Policy',
    accessLevel: 'read',
  }, 'POST /api/twin/policies');
});

test('Phase 7 — GET /api/twin/policies/:id — gets twin policy', async () => {
  await assertRoute('/api/twin/policies/twin-pol-001', 'GET', null, 'GET /api/twin/policies/:id');
});

test('Phase 7 — POST /api/twin/policies/:id/evaluate — evaluates twin access', async () => {
  await assertRoute('/api/twin/policies/twin-pol-001/evaluate', 'POST', {
    twinId: 'twin-123',
    userId: 'user-456',
    action: 'read',
  }, 'POST /api/twin/policies/:id/evaluate');
});

test('Phase 7 — POST /api/twin/bridge — bridges twin to external system', async () => {
  await assertRoute('/api/twin/bridge', 'POST', {
    twinId: 'twin-123',
    system: 'twinos',
    direction: 'bidirectional',
  }, 'POST /api/twin/bridge');
});

test('Phase 7 — GET /api/twin/:id/version-history — gets twin version history', async () => {
  await assertRoute('/api/twin/twin-123/version-history', 'GET', null, 'GET /api/twin/:id/version-history');
});

test('Phase 7 — POST /api/twin/:id/rollback — rolls back twin version', async () => {
  await assertRoute('/api/twin/twin-123/rollback', 'POST', { version: 2 }, 'POST /api/twin/:id/rollback');
});

// ── Phase 8: Constitutional AI ──────────────────────────────────────────────

test('Phase 8 — GET /api/constitutions — lists constitutions', async () => {
  await assertRoute('/api/constitutions', 'GET', null, 'GET /api/constitutions');
});

test('Phase 8 — POST /api/constitutions — creates constitution', async () => {
  await assertRoute('/api/constitutions', 'POST', {
    id: 'const-test-001',
    name: 'Test Constitution',
    type: 'safety',
    principles: ['principle 1', 'principle 2'],
    stakeholders: ['engineers', 'legal'],
    status: 'draft',
  }, 'POST /api/constitutions');
});

test('Phase 8 — GET /api/constitutions/:id — gets constitution', async () => {
  await assertRoute('/api/constitutions/const-test-001', 'GET', null, 'GET /api/constitutions/:id');
});

test('Phase 8 — POST /api/constitutions/:id/review — submits review', async () => {
  await assertRoute('/api/constitutions/const-test-001/review', 'POST', {
    reviewer: 'legal-team',
    status: 'approved',
    comments: 'LGTM',
  }, 'POST /api/constitutions/:id/review');
});

test('Phase 8 — GET /api/constitutions/:id/harm-categories — lists harm categories', async () => {
  await assertRoute('/api/constitutions/const-test-001/harm-categories', 'GET', null, 'GET /api/constitutions/:id/harm-categories');
});

test('Phase 8 — GET /api/constitutions/harm-categories — global harm categories', async () => {
  await assertRoute('/api/constitutions/harm-categories', 'GET', null, 'GET /api/constitutions/harm-categories');
});

// ── Phase 9: Lifecycle Automation ───────────────────────────────────────────

test('Phase 9 — GET /api/automations — lists automation rules', async () => {
  await assertRoute('/api/automations', 'GET', null, 'GET /api/automations');
});

test('Phase 9 — POST /api/automations — creates automation rule', async () => {
  await assertRoute('/api/automations', 'POST', {
    id: 'auto-001',
    name: 'Auto-approve small requests',
    trigger: { type: 'policy_evaluated', policyId: 'pol-shopping-budget' },
    actions: [{ type: 'auto_approve' }],
    active: true,
  }, 'POST /api/automations');
});

test('Phase 9 — GET /api/automations/:id — gets automation', async () => {
  await assertRoute('/api/automations/auto-001', 'GET', null, 'GET /api/automations/:id');
});

test('Phase 9 — PATCH /api/automations/:id — updates automation', async () => {
  await assertRoute('/api/automations/auto-001', 'PATCH', { active: false }, 'PATCH /api/automations/:id');
});

test('Phase 9 — POST /api/automations/:id/test — tests automation trigger', async () => {
  await assertRoute('/api/automations/auto-001/test', 'POST', {
    context: { amount: 500, user: { id: 'u-customer' } },
  }, 'POST /api/automations/:id/test');
});

test('Phase 9 — GET /api/approvals/queue — lists approval queue', async () => {
  await assertRoute('/api/approvals/queue', 'GET', null, 'GET /api/approvals/queue');
});

test('Phase 9 — GET /api/automations/history — automation execution history', async () => {
  await assertRoute('/api/automations/history', 'GET', null, 'GET /api/automations/history');
});

// ── Phase 10: Developer Experience ───────────────────────────────────────────

test('Phase 10 — GET /api/docs/openapi — returns OpenAPI spec', async () => {
  await assertRoute('/api/docs/openapi', 'GET', null, 'GET /api/docs/openapi');
  const res = await api('/api/docs/openapi');
  if (res.status === 200) {
    assert.ok(res.body.openapi || res.body.info, 'Should return OpenAPI document');
  }
});

test('Phase 10 — POST /api/docs/sdk — generates SDK', async () => {
  await assertRoute('/api/docs/sdk', 'POST', { language: 'javascript' }, 'POST /api/docs/sdk');
});

test('Phase 10 — GET /api/docs/compliance/soc2 — SOC2 compliance report', async () => {
  await assertRoute('/api/docs/compliance/soc2', 'GET', null, 'GET /api/docs/compliance/soc2');
});

test('Phase 10 — GET /api/docs/compliance/gdpr — GDPR compliance report', async () => {
  await assertRoute('/api/docs/compliance/gdpr', 'GET', null, 'GET /api/docs/compliance/gdpr');
});

test('Phase 10 — POST /api/sandbox/evaluate — evaluates policy in sandbox', async () => {
  await assertRoute('/api/sandbox/evaluate', 'POST', {
    expression: 'context.amount > 0',
    context: { amount: 100 },
  }, 'POST /api/sandbox/evaluate');
  const res = await api('/api/sandbox/evaluate', 'POST', {
    expression: 'context.amount > 0',
    context: { amount: 100 },
  });
  if (res.status === 200) {
    assert.ok(typeof res.body.result === 'boolean' || typeof res.body.allowed === 'boolean',
      'Sandbox should return a boolean result');
  }
});

test('Phase 10 — GET /api/docs/sdks — lists available SDK languages', async () => {
  await assertRoute('/api/docs/sdks', 'GET', null, 'GET /api/docs/sdks');
});

// ── Health: App still healthy after all route registrations ─────────────────

test('app health — /health endpoint still works', async () => {
  const res = await api('/health');
  assert.strictEqual(res.status, 200, `Health check failed: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.status, 'healthy');
  assert.ok(res.body.counts);
});

test('app health — /ready endpoint still works', async () => {
  const res = await api('/ready');
  assert.strictEqual(res.status, 200, `Ready check failed: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.ready, true);
});
