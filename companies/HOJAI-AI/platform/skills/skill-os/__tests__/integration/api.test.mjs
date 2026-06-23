/**
 * SkillOS — Integration tests (HTTP)
 *
 * These tests import the real app (no listen) and use supertest-style
 * fetch to hit the endpoints. They exercise:
 *   - Skill CRUD
 *   - Skill execution (real VM sandbox)
 *   - Multi-asset registry
 *   - Install / uninstall flow
 *   - Certification
 *   - Billing
 *   - Audit
 *   - OpenAPI generation
 *   - All 4 originally-stub features
 *
 * Auth is bypassed for these tests by setting SKILLOS_REQUIRE_AUTH=false.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SKILLOS_REQUIRE_AUTH = 'false';
process.env.SKILLOS_NO_LISTEN = '1';
process.env.NODE_ENV = 'test';

const BASE = `http://localhost:${process.env.PORT || 4744}`;

// Use a unique data dir for tests so we don't clobber the dev data
process.env.HOJAI_DATA_DIR = `/tmp/hojai-skillos-test-${Date.now()}`;

let app;
let server;

// Start the server on a random port for these tests
async function start() {
  const mod = await import('file:///Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/skills/skill-os/src/index.js');
  app = mod.app;
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      process.env.PORT = String(addr.port);
      resolve();
    });
  });
  // Wait briefly for seed to finish
  await new Promise((r) => setTimeout(r, 200));
}

async function stop() {
  if (server) {
    await new Promise((r) => server.close(r));
  }
}

async function get(path) {
  const res = await fetch(`${BASE.replace(/:[0-9]+$/, ':' + process.env.PORT)}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${BASE.replace(/:[0-9]+$/, ':' + process.env.PORT)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function put(path, body) {
  const res = await fetch(`${BASE.replace(/:[0-9]+$/, ':' + process.env.PORT)}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function del(path) {
  const res = await fetch(`${BASE.replace(/:[0-9]+$/, ':' + process.env.PORT)}${path}`, { method: 'DELETE' });
  return { status: res.status, body: await res.json() };
}

test('SkillOS integration — boot + health', async (t) => {
  await t.test('app starts', async () => {
    await start();
    assert.ok(app);
    assert.ok(server.listening);
  });

  await t.test('GET / returns full metadata', async () => {
    const r = await get('/');
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.service, 'skill-os');
    assert.equal(r.body.version, '1.3.0');
    assert.ok(r.body.assetTypes.length >= 5);
    assert.ok(r.body.certificationLevels.length === 5);
    assert.ok(r.body.counts.skills >= 6);  // seeded
    assert.ok(r.body.counts.assets >= 5);  // seeded
    assert.equal(r.body.storage.mode, 'persistent-map');
  });

  await t.test('GET /health returns 200', async () => {
    const r = await get('/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'healthy');
  });

  await t.test('GET /ready returns 200', async () => {
    const r = await get('/ready');
    assert.equal(r.status, 200);
    assert.equal(r.body.ready, true);
  });
});

test('SkillOS integration — OpenAPI spec', async (t) => {
  await t.test('GET /openapi.json returns valid OpenAPI 3.0', async () => {
    const r = await get('/openapi.json');
    assert.equal(r.status, 200);
    assert.equal(r.body.openapi, '3.0.3');
    assert.equal(r.body.info.title, 'SkillOS — Universal AI Capability Marketplace');
    assert.ok(r.body.info.version);
    assert.ok(Array.isArray(r.body.tags));
    assert.ok(r.body.tags.length >= 5);
    assert.ok(r.body.paths['/api/skills']);
    assert.ok(r.body.paths['/api/skills/{id}/execute']);
    assert.ok(r.body.paths['/api/assets']);
    assert.ok(r.body.paths['/api/assets/{id}/install']);
    assert.ok(r.body.paths['/api/assets/{id}/certify']);
    assert.ok(r.body.paths['/api/billing/charge']);
    assert.ok(r.body.paths['/api/audit']);
  });
});

test('SkillOS integration — skill execution (real VM sandbox)', async (t) => {
  await t.test('GET /api/skills/discover returns seeded skills', async () => {
    const r = await get('/api/skills/discover');
    assert.equal(r.status, 200);
    assert.ok(r.body.discovered.length > 0);
  });

  await t.test('execute a real skill — runs the VM sandbox', async () => {
    // Create a skill with custom code that echoes its input
    const created = await post('/api/skills', {
      name: 'Echo', category: 'ai', code: 'result = { echoed: input, ctx: ctx };',
    });
    assert.equal(created.status, 201);
    const id = created.body.data.id;

    const exec = await post(`/api/skills/${id}/execute`, { input: { hello: 'world' } });
    assert.equal(exec.status, 200);
    assert.equal(exec.body.success, true);
    assert.equal(exec.body.data.result.echoed.hello, 'world');
    assert.ok(exec.body.data.durationMs >= 0);
  });

  await t.test('execute a skill that errors is reported (not stubbed)', async () => {
    const created = await post('/api/skills', {
      name: 'Boom', category: 'ai', code: 'throw new Error("intentional");',
    });
    const id = created.body.data.id;
    const exec = await post(`/api/skills/${id}/execute`, {});
    assert.equal(exec.status, 500);
    assert.equal(exec.body.success, false);
    assert.match(exec.body.data.error, /intentional/);
  });
});

test('SkillOS integration — multi-asset registry', async (t) => {
  let createdId;

  await t.test('GET /api/assets returns seeded multi-asset entries', async () => {
    const r = await get('/api/assets');
    assert.equal(r.status, 200);
    assert.ok(r.body.assets.length >= 5);
    const types = new Set(r.body.assets.map((a) => a.assetType));
    assert.ok(types.has('skill'));
    assert.ok(types.has('agent-template'));
    assert.ok(types.has('workflow-template'));
    assert.ok(types.has('prompt-pack'));
    assert.ok(types.has('knowledge-pack'));
  });

  await t.test('GET /api/assets?type=agent-template filters', async () => {
    const r = await get('/api/assets?type=agent-template');
    assert.equal(r.status, 200);
    for (const a of r.body.assets) {
      assert.equal(a.assetType, 'agent-template');
    }
  });

  await t.test('GET /api/assets?q=search does text search', async () => {
    const r = await get('/api/assets?q=healthcare');
    assert.equal(r.status, 200);
    assert.ok(r.body.assets.length >= 1);
    const found = r.body.assets.some((a) => a.name.toLowerCase().includes('icd') || (a.description || '').toLowerCase().includes('icd'));
    assert.ok(found, 'should find ICD-10 healthcare asset');
  });

  await t.test('POST /api/assets creates a new asset', async () => {
    const r = await post('/api/assets', {
      name: 'Test Asset', assetType: 'model-adapter', description: 'test', category: 'ai',
      publisher: 'Community', pricingModel: 'free',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.assetType, 'model-adapter');
    assert.equal(r.body.data.publisher, 'Community');
    createdId = r.body.data.id;
  });

  await t.test('GET /api/assets/:id returns the asset', async () => {
    const r = await get(`/api/assets/${createdId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.name, 'Test Asset');
  });

  await t.test('PUT /api/assets/:id updates the asset', async () => {
    const r = await put(`/api/assets/${createdId}`, { description: 'updated' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.description, 'updated');
  });

  await t.test('rejects invalid assetType', async () => {
    const r = await post('/api/assets', { name: 'Bad', assetType: 'bogus-type' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /invalid assetType/);
  });

  await t.test('DELETE /api/assets/:id removes the asset', async () => {
    const r = await del(`/api/assets/${createdId}`);
    assert.equal(r.status, 200);
    const check = await get(`/api/assets/${createdId}`);
    assert.equal(check.status, 404);
  });
});

test('SkillOS integration — install flow', async (t) => {
  let installId;

  await t.test('POST /api/assets/:id/install creates install row', async () => {
    const r = await post('/api/assets/ast-agent-salesbot/install', { tenantId: 't-test' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.tenantId, 't-test');
    assert.equal(r.body.data.assetId, 'ast-agent-salesbot');
    assert.equal(r.body.data.status, 'installed');
    installId = r.body.data.id;
  });

  await t.test('GET /api/installed?tenantId lists tenant installs', async () => {
    const r = await get('/api/installed?tenantId=t-test');
    assert.equal(r.status, 200);
    assert.ok(r.body.installs.length >= 1);
  });

  await t.test('DELETE /api/installed/:id uninstalls', async () => {
    const r = await del(`/api/installed/${installId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'uninstalled');
  });

  await t.test('rejects install without tenantId', async () => {
    const r = await post('/api/assets/ast-agent-salesbot/install', {});
    assert.equal(r.status, 400);
  });
});

test('SkillOS integration — certification', async (t) => {
  let certId;

  await t.test('POST /api/assets/:id/certify sets level', async () => {
    const r = await post('/api/assets/ast-agent-salesbot/certify', { level: 'enterprise', certifiedBy: 'hojai' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.certification.level, 'enterprise');
    assert.equal(r.body.data.certification.certifiedBy, 'hojai');
    certId = r.body.data.id;
  });

  await t.test('GET /api/assets/:id/certify returns current cert', async () => {
    const r = await get(`/api/assets/${certId}/certify`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.certification.level, 'enterprise');
  });

  await t.test('rejects invalid certification level', async () => {
    const r = await post('/api/assets/ast-agent-salesbot/certify', { level: 'platinum' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /invalid certification level/);
  });
});

test('SkillOS integration — billing', async (t) => {
  let txId;

  await t.test('POST /api/billing/charge records a transaction', async () => {
    const r = await post('/api/billing/charge', {
      kind: 'install', assetId: 'ast-agent-salesbot', tenantId: 't-bill',
      publisherId: 'hojai', amount: 49, currency: 'USD', status: 'completed',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.platformFee, 7.35);
    assert.equal(r.body.data.publisherNet, 41.65);
    txId = r.body.data.id;
  });

  await t.test('GET /api/billing/transactions lists with filters', async () => {
    const r = await get('/api/billing/transactions?publisherId=hojai');
    assert.equal(r.status, 200);
    assert.ok(r.body.transactions.length >= 1);
  });

  await t.test('GET /api/billing/payouts/:publisherId computes payout', async () => {
    const r = await get('/api/billing/payouts/hojai');
    assert.equal(r.status, 200);
    assert.ok(r.body.data.payoutAmount >= 0);
  });

  await t.test('rejects negative amount', async () => {
    const r = await post('/api/billing/charge', {
      kind: 'install', assetId: 'x', amount: -5,
    });
    assert.equal(r.status, 400);
  });
});

test('SkillOS integration — audit log', async (t) => {
  await t.test('GET /api/audit returns entries', async () => {
    const r = await get('/api/audit');
    assert.equal(r.status, 200);
    assert.ok(r.body.entries.length > 0);
  });

  await t.test('GET /api/audit?action=asset.installed filters', async () => {
    const r = await get('/api/audit?action=asset.installed');
    assert.equal(r.status, 200);
    for (const e of r.body.entries) {
      assert.equal(e.action, 'asset.installed');
    }
  });
});

test('SkillOS integration — governance (deprecate)', async (t) => {
  await t.test('POST /api/assets/:id/deprecate marks asset deprecated', async () => {
    const r = await post('/api/assets/ast-workflow-onboard/deprecate', { reason: 'superseded by v2' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.deprecation.status, 'deprecated');
    assert.ok(r.body.data.deprecation.sunsetAt);
  });
});

test('SkillOS integration — formerly-stub features are now real', async (t) => {
  await t.test('/memory returns UPSTREAM_UNREACHABLE (not silent stub) when MemoryOS is down', async () => {
    const r = await post('/api/skills/sk-reasoning/memory', { op: 'read' });
    // MemoryOS at 4703 is not running in this test, so we expect a 503
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'UPSTREAM_UNREACHABLE');
    assert.match(r.body.message, /MemoryOS/);
  });

  await t.test('/twin returns UPSTREAM_UNREACHABLE when TwinOS is down', async () => {
    const r = await post('/api/skills/sk-reasoning/twin', { op: 'read' });
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'UPSTREAM_UNREACHABLE');
  });

  await t.test('/flow returns UPSTREAM_UNREACHABLE when FlowOS is down', async () => {
    const r = await post('/api/skills/sk-reasoning/flow', { flowId: 'f1', step: 's1' });
    assert.equal(r.status, 503);
    assert.equal(r.body.error, 'UPSTREAM_UNREACHABLE');
  });

  await t.test('/test with mock=true echoes input (preserved for backward compat)', async () => {
    const r = await post('/api/skills/sk-reasoning/test', { input: 'hi', mock: true });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.result.mock, true);
    assert.equal(r.body.data.result.input, 'hi');
  });

  await t.test('/test with mock=false actually runs the VM sandbox', async () => {
    // Create a skill with deterministic code
    const created = await post('/api/skills', {
      name: 'Deterministic', category: 'ai',
      code: 'result = { answer: 42 };',
    });
    const id = created.body.data.id;
    const r = await post(`/api/skills/${id}/test`, { input: 'irrelevant', mock: false });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.result.mock, false);
    assert.equal(r.body.data.result.output.answer, 42);
  });
});

test('SkillOS integration — shutdown', async (t) => {
  await t.test('server closes cleanly', async () => {
    await stop();
    // Give a small grace period
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(server.listening, false);
  });
});
