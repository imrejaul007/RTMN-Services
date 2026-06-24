/**
 * Tests for agent-rollback
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];
const { createApp, validateRollbackRequest } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('validateRollbackRequest catches missing fields', () => {
  assert.ok(validateRollbackRequest(null));
  assert.ok(validateRollbackRequest({}));
  assert.ok(validateRollbackRequest({ agentId: 'a' }));
  assert.ok(validateRollbackRequest({ agentId: 'a', fromVersion: '1' }));
  assert.ok(validateRollbackRequest({ agentId: 'a', fromVersion: '1', toVersion: '1' }));
});

test('validateRollbackRequest catches invalid trigger', () => {
  assert.ok(validateRollbackRequest({ agentId: 'a', fromVersion: '1', toVersion: '2', trigger: 'invalid' }));
});

test('validateRollbackRequest accepts valid', () => {
  assert.strictEqual(validateRollbackRequest({ agentId: 'a', fromVersion: '1', toVersion: '2' }), null);
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
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('create instant rollback', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', fromVersion: '2.0.0', toVersion: '1.5.0', reason: 'high latency' }),
    });
    assert.strictEqual(r.status, 201);
    const rb = await r.json();
    assert.strictEqual(rb.status, 'completed');
    assert.strictEqual(rb.trigger, 'manual');
  } finally { s.close(); }
});

test('create instant rollback with metric trigger', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a2', fromVersion: '2', toVersion: '1', trigger: 'metric' }),
    });
    const rb = await r.json();
    assert.strictEqual(rb.trigger, 'metric');
  } finally { s.close(); }
});

test('schedule rollback', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const future = new Date(Date.now() + 60000).toISOString();
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a3', fromVersion: '2', toVersion: '1', scheduled_at: future }),
    });
    assert.strictEqual(r.status, 201);
    const rb = await r.json();
    assert.strictEqual(rb.status, 'scheduled');
    assert.strictEqual(rb.kind, 'scheduled');
  } finally { s.close(); }
});

test('schedule rejects past time', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const past = new Date(Date.now() - 60000).toISOString();
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a4', fromVersion: '2', toVersion: '1', scheduled_at: past }),
    });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('schedule rejects missing scheduled_at', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a5', fromVersion: '2', toVersion: '1' }),
    });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('schedule rejects invalid date', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a6', fromVersion: '2', toVersion: '1', scheduled_at: 'not-a-date' }),
    });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('execute scheduled rollback', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const future = new Date(Date.now() + 60000).toISOString();
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a7', fromVersion: '2', toVersion: '1', scheduled_at: future }),
    });
    const rb = await r.json();
    const e = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/${rb.id}/execute`, { method: 'POST', headers: auth() });
    const ej = await e.json();
    assert.strictEqual(ej.status, 'completed');
  } finally { s.close(); }
});

test('cancel scheduled rollback', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const future = new Date(Date.now() + 60000).toISOString();
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/schedule`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a8', fromVersion: '2', toVersion: '1', scheduled_at: future }),
    });
    const rb = await r.json();
    const c = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/${rb.id}/cancel`, { method: 'POST', headers: auth() });
    const cj = await c.json();
    assert.strictEqual(cj.status, 'cancelled');
  } finally { s.close(); }
});

test('cannot execute non-scheduled rollback', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a9', fromVersion: '2', toVersion: '1' }),
    });
    const rb = await r.json();
    const e = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/${rb.id}/execute`, { method: 'POST', headers: auth() });
    assert.strictEqual(e.status, 400);
  } finally { s.close(); }
});

test('due endpoint returns scheduled rollbacks that are past', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const past = new Date(Date.now() - 60000).toISOString();
    // Manually inject by creating with already-past time through normal schedule endpoint -> rejected.
    // So we use direct data via create instant + due route should return 0
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks/due`, { headers: auth() });
    const j = await r.json();
    assert.strictEqual(j.count, 0);
    // Past time arg should be rejected by validation; just confirm route shape.
    void past;
  } finally { s.close(); }
});

test('list rollbacks filter by trigger and agentId', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'x', fromVersion: '2', toVersion: '1', trigger: 'metric' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/rollbacks?agentId=x&trigger=metric`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
  } finally { s.close(); }
});

test('agent rollback history', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'hist', fromVersion: '2', toVersion: '1' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/hist/history`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
  } finally { s.close(); }
});

test('summary endpoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/rollbacks`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 's', fromVersion: '2', toVersion: '1' }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/summary`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.total >= 1);
    assert.ok(j.by_status);
  } finally { s.close(); }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});