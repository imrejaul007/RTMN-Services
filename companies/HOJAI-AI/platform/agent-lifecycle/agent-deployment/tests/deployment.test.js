/**
 * Tests for agent-deployment
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];
const { createApp, validateDeployRequest, advanceCanary, DEFAULT_POLICY } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('validateDeployRequest catches missing fields', () => {
  assert.ok(validateDeployRequest(null));
  assert.ok(validateDeployRequest({}));
  assert.ok(validateDeployRequest({ agentId: 'a' }));
});

test('validateDeployRequest catches invalid strategy', () => {
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1.0.0', strategy: 'invalid' }));
});

test('validateDeployRequest catches bad canary stages', () => {
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1', canary_stages: 'nope' }));
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1', canary_stages: [] }));
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1', canary_stages: [1, 50] })); // doesn't end at 100
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1', canary_stages: [50, 30, 100] })); // not monotonic
  assert.ok(validateDeployRequest({ agentId: 'a', version: '1', canary_stages: [150, 100] })); // > 100
});

test('validateDeployRequest accepts valid request', () => {
  assert.strictEqual(validateDeployRequest({ agentId: 'a', version: '1.0.0' }), null);
  assert.strictEqual(validateDeployRequest({ agentId: 'a', version: '1.0.0', strategy: 'blue_green' }), null);
});

test('advanceCanary moves through stages and completes', () => {
  const dep = {
    policy: { canary_stages: [1, 10, 50, 100] },
    current_stage: 0,
    current_percent: 1,
    stage_history: [],
    status: 'active',
  };
  advanceCanary(dep);
  assert.strictEqual(dep.current_stage, 1);
  assert.strictEqual(dep.current_percent, 10);
  advanceCanary(dep);
  advanceCanary(dep);
  assert.strictEqual(dep.current_percent, 100);
  advanceCanary(dep);
  assert.strictEqual(dep.status, 'completed');
});

test('health/ready work', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('rejects unauth requests', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('create canary deployment', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a1', version: '1.0.0' }),
    });
    assert.strictEqual(r.status, 201);
    const dep = await r.json();
    assert.strictEqual(dep.strategy, 'canary');
    assert.strictEqual(dep.current_percent, 1);
    assert.strictEqual(dep.status, 'active');
  } finally { s.close(); }
});

test('create blue-green deployment completes immediately', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a2', version: '1.0.0', strategy: 'blue_green' }),
    });
    const dep = await r.json();
    assert.strictEqual(dep.current_percent, 100);
    assert.strictEqual(dep.status, 'completed');
  } finally { s.close(); }
});

test('immediate deployment completes at 100%', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a3', version: '1.0.0', strategy: 'immediate' }),
    });
    const dep = await r.json();
    assert.strictEqual(dep.current_percent, 100);
  } finally { s.close(); }
});

test('new deployment supersedes existing active one', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a4', version: '1.0.0' }),
    });
    const r2 = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a4', version: '2.0.0' }),
    });
    const newDep = await r2.json();
    assert.strictEqual(newDep.previous_version, '1.0.0');
    const oldDep = await (await fetch(`http://127.0.0.1:${s.address().port}/deployments/${newDep.id}`, { headers: auth() })).json();
    assert.strictEqual(oldDep.id, newDep.id);
    const list = await (await fetch(`http://127.0.0.1:${s.address().port}/deployments?agentId=a4`, { headers: auth() })).json();
    const superseded = list.deployments.find((d) => d.status === 'superseded');
    assert.ok(superseded);
  } finally { s.close(); }
});

test('advance canary deployment through all stages', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a5', version: '1.0.0', canary_stages: [1, 50, 100] }),
    });
    const dep = await r.json();
    assert.strictEqual(dep.current_percent, 1);
    // Advance 1 → 50
    const a1 = await (await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/advance`, { method: 'POST', headers: auth() })).json();
    assert.strictEqual(a1.current_percent, 50);
    assert.strictEqual(a1.status, 'active');
    // Advance 2 → 100 → completed
    const a2 = await (await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/advance`, { method: 'POST', headers: auth() })).json();
    assert.strictEqual(a2.current_percent, 100);
    assert.strictEqual(a2.status, 'completed');
  } finally { s.close(); }
});

test('pause and resume', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a6', version: '1.0.0', canary_stages: [1, 50, 100] }),
    });
    const dep = await r.json();
    const p = await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/pause`, { method: 'POST', headers: auth() });
    const pj = await p.json();
    assert.strictEqual(pj.status, 'paused');
    const res = await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/resume`, { method: 'POST', headers: auth() });
    const rj = await res.json();
    assert.strictEqual(rj.status, 'active');
  } finally { s.close(); }
});

test('fail triggers rollback_pending when auto_rollback is true', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a7', version: '1.0.0' }),
    });
    const dep = await r.json();
    const f = await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/fail`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reason: 'metrics breach' }),
    });
    const fj = await f.json();
    assert.strictEqual(fj.status, 'failed');
    assert.strictEqual(fj.rollback_pending, true);
  } finally { s.close(); }
});

test('rolled-back endpoint marks dep as rolled_back', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a8', version: '1.0.0' }),
    });
    const dep = await r.json();
    const rb = await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/rolled-back`, { method: 'POST', headers: auth() });
    const rbj = await rb.json();
    assert.strictEqual(rbj.status, 'rolled_back');
    assert.strictEqual(rbj.rollback_pending, false);
  } finally { s.close(); }
});

test('set and get policy', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const p = await fetch(`http://127.0.0.1:${s.address().port}/agents/p1/policy`, {
      method: 'PUT', headers: auth(),
      body: JSON.stringify({ strategy: 'blue_green', auto_rollback: false }),
    });
    assert.strictEqual(p.status, 200);
    const pj = await p.json();
    assert.strictEqual(pj.strategy, 'blue_green');
    assert.strictEqual(pj.auto_rollback, false);
    const g = await fetch(`http://127.0.0.1:${s.address().port}/agents/p1/policy`, { headers: auth() });
    const gj = await g.json();
    assert.strictEqual(gj.strategy, 'blue_green');
  } finally { s.close(); }
});

test('active deployment endpoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a9', version: '1.0.0', strategy: 'blue_green' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/a9/active`, { headers: auth() });
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('summary endpoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a10', version: '1.0.0', strategy: 'blue_green' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/summary`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.total >= 1);
    assert.ok(j.by_status);
  } finally { s.close(); }
});

test('cannot advance non-canary or completed deployment', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deployments`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a11', version: '1.0.0', strategy: 'blue_green' }),
    });
    const dep = await r.json();
    const a = await fetch(`http://127.0.0.1:${s.address().port}/deployments/${dep.id}/advance`, { method: 'POST', headers: auth() });
    assert.strictEqual(a.status, 400);
  } finally { s.close(); }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});