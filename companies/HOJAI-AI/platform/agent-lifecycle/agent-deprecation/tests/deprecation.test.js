/**
 * Tests for agent-deprecation
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adep-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];
const { createApp, validateDeprecateRequest, validateSubscribeRequest, daysUntil } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('validateDeprecateRequest catches missing fields', () => {
  assert.ok(validateDeprecateRequest(null));
  assert.ok(validateDeprecateRequest({}));
  assert.ok(validateDeprecateRequest({ agentId: 'a' }));
  assert.ok(validateDeprecateRequest({ agentId: 'a', version: '1' }));
  assert.ok(validateDeprecateRequest({ agentId: 'a', version: '1', reason: 'r' }));
});

test('validateDeprecateRequest accepts valid', () => {
  assert.strictEqual(validateDeprecateRequest({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2' }), null);
});

test('validateSubscribeRequest catches missing fields', () => {
  assert.ok(validateSubscribeRequest(null));
  assert.ok(validateSubscribeRequest({ agentId: 'a' }));
});

test('validateSubscribeRequest accepts valid', () => {
  assert.strictEqual(validateSubscribeRequest({ agentId: 'a', version: '1', consumer: 'c' }), null);
});

test('daysUntil computes correctly', () => {
  const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(daysUntil(future), 5);
  const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(daysUntil(past), -5);
});

test('health/ready', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('rejects unauth', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('set and get policy', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const p = await fetch(`http://127.0.0.1:${s.address().port}/policy`, {
      method: 'PUT', headers: auth(),
      body: JSON.stringify({ notice_days: 60, auto_migrate: false }),
    });
    const pj = await p.json();
    assert.strictEqual(pj.notice_days, 60);
    assert.strictEqual(pj.auto_migrate, false);
    const g = await fetch(`http://127.0.0.1:${s.address().port}/policy`, { headers: auth() });
    const gj = await g.json();
    assert.strictEqual(gj.notice_days, 60);
  } finally { s.close(); }
});

test('deprecate a version', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1.0.0', reason: 'security', replacement_version: '2.0.0' }),
    });
    assert.strictEqual(r.status, 201);
    const dep = await r.json();
    assert.strictEqual(dep.status, 'deprecated');
    assert.ok(dep.sunset_at);
  } finally { s.close(); }
});

test('cannot deprecate same version twice', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const body = JSON.stringify({ agentId: 'a', version: '1.0.0', reason: 'r', replacement_version: '2' });
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, { method: 'POST', headers: auth(), body });
    const r2 = await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, { method: 'POST', headers: auth(), body });
    assert.strictEqual(r2.status, 409);
  } finally { s.close(); }
});

test('get deprecation status', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2', notice_days: 30 }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/a/1`, { headers: auth() });
    assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.ok(typeof j.days_until_sunset === 'number');
  } finally { s.close(); }
});

test('list deprecations filter by agentId', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'x', version: '1', reason: 'r', replacement_version: '2' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations?agentId=x`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
    assert.ok(j.deprecations.every((d) => d.agent_id === 'x'));
  } finally { s.close(); }
});

test('subscribe and list subscribers', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2' }),
    });
    const sub = await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1', contact: 'team@example.com' }),
    });
    assert.strictEqual(sub.status, 201);
    const list = await fetch(`http://127.0.0.1:${s.address().port}/subscribers?agentId=a&version=1`, { headers: auth() });
    const lj = await list.json();
    assert.strictEqual(lj.count, 1);
  } finally { s.close(); }
});

test('subscribe is idempotent for same consumer', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2' }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1' }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1' }),
    });
    const list = await (await fetch(`http://127.0.0.1:${s.address().port}/subscribers?agentId=a&version=1`, { headers: auth() })).json();
    assert.strictEqual(list.count, 1);
  } finally { s.close(); }
});

test('issue notices to subscribers', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'security', replacement_version: '2' }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1' }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-2' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/a/1/notice`, { method: 'POST', headers: auth() });
    const j = await r.json();
    assert.strictEqual(j.count, 2);
  } finally { s.close(); }
});

test('migrate subscriber', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2' }),
    });
    const sub = await (await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1' }),
    })).json();
    const m = await fetch(`http://127.0.0.1:${s.address().port}/subscribers/${sub.id}/migrate`, { method: 'POST', headers: auth() });
    const mj = await m.json();
    assert.strictEqual(mj.migrated, true);
  } finally { s.close(); }
});

test('retire fails when subscribers remain unmigrated', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', reason: 'r', replacement_version: '2' }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', consumer: 'svc-1' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/a/1/retire`, { method: 'POST', headers: auth() });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('retire succeeds after all subscribers migrate', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'r1', version: '1', reason: 'r', replacement_version: '2' }),
    });
    const sub = await (await fetch(`http://127.0.0.1:${s.address().port}/subscribers`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'r1', version: '1', consumer: 'svc-1' }),
    })).json();
    await fetch(`http://127.0.0.1:${s.address().port}/subscribers/${sub.id}/migrate`, { method: 'POST', headers: auth() });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/r1/1/retire`, { method: 'POST', headers: auth() });
    const rj = await r.json();
    assert.strictEqual(rj.status, 'retired');
  } finally { s.close(); }
});

test('cannot retire twice', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/deprecations`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'r2', version: '1', reason: 'r', replacement_version: '2' }),
    });
    const r1 = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/r2/1/retire`, { method: 'POST', headers: auth() });
    assert.strictEqual(r1.status, 200);
    const r2 = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/r2/1/retire`, { method: 'POST', headers: auth() });
    assert.strictEqual(r2.status, 400);
  } finally { s.close(); }
});

test('summary endpoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/summary`, { headers: auth() });
    const j = await r.json();
    assert.ok(typeof j.total === 'number');
    assert.ok(j.by_status);
  } finally { s.close(); }
});

test('not found for missing deprecation', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/deprecations/missing/1.0.0`, { headers: auth() });
    assert.strictEqual(r.status, 404);
  } finally { s.close(); }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});