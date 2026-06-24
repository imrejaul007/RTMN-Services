/**
 * Tests for agent-testing
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'at-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];
const { createApp, validateSuite } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('validateSuite catches missing name', () => {
  assert.ok(validateSuite(null));
  assert.ok(validateSuite({}));
  assert.ok(validateSuite({ name: 'x' }));
});

test('validateSuite catches invalid kind', () => {
  const err = validateSuite({ name: 'x', tests: [{ name: 't', kind: 'invalid' }] });
  assert.ok(err);
});

test('validateSuite passes valid suite', () => {
  assert.strictEqual(validateSuite({ name: 's', tests: [{ name: 't', kind: 'unit' }] }), null);
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
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('register suite and retrieve', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'a1', version: '1.0.0',
        suite: { name: 's1', tests: [{ name: 't1', kind: 'unit' }] },
      }),
    });
    assert.strictEqual(r.status, 201);
    const r2 = await fetch(`http://127.0.0.1:${s.address().port}/suites/a1@1.0.0`, { headers: auth() });
    assert.strictEqual(r2.status, 200);
  } finally { s.close(); }
});

test('register suite validation errors', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', suite: { name: 'x' } }),
    });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('run a passing suite', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'b', version: '1.0.0',
        suite: { name: 'pass', tests: [{ name: 't', kind: 'unit', check: 'true' }] },
      }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites/b@1.0.0/run`, { method: 'POST', headers: auth() });
    assert.strictEqual(r.status, 201);
    const j = await r.json();
    assert.strictEqual(j.status, 'pass');
    assert.strictEqual(j.summary.passed, 1);
  } finally { s.close(); }
});

test('run a failing suite', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'c', version: '1.0.0',
        suite: { name: 'fail', tests: [{ name: 't', kind: 'unit', check: 'false' }] },
      }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites/c@1.0.0/run`, { method: 'POST', headers: auth() });
    const j = await r.json();
    assert.strictEqual(j.status, 'fail');
    assert.strictEqual(j.summary.failed, 1);
  } finally { s.close(); }
});

test('run a suite with an error check', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'd', version: '1.0.0',
        suite: { name: 'err', tests: [{ name: 't', kind: 'unit', check: 'throw new Error("boom")' }] },
      }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites/d@1.0.0/run`, { method: 'POST', headers: auth() });
    const j = await r.json();
    assert.strictEqual(j.status, 'fail');
    assert.ok(j.cases[0].error);
  } finally { s.close(); }
});

test('list runs filter by status', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'e', version: '1.0.0',
        suite: { name: 's', tests: [{ name: 't', kind: 'unit', check: 'true' }] },
      }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/suites/e@1.0.0/run`, { method: 'POST', headers: auth() });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/runs?status=pass`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
    for (const run of j.runs) assert.strictEqual(run.status, 'pass');
  } finally { s.close(); }
});

test('summary endpoint returns aggregated stats', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'f', version: '1.0.0',
        suite: { name: 's', tests: [{ name: 't', kind: 'unit', check: 'true' }] },
      }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/suites/f@1.0.0/run`, { method: 'POST', headers: auth() });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/summary`, { headers: auth() });
    const j = await r.json();
    const found = j.agents.find((a) => a.agent_id === 'f');
    assert.ok(found);
    assert.strictEqual(found.passed, 1);
  } finally { s.close(); }
});

test('get one run by id', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'g', version: '1.0.0',
        suite: { name: 's', tests: [{ name: 't', kind: 'unit' }] },
      }),
    });
    const rr = await fetch(`http://127.0.0.1:${s.address().port}/suites/g@1.0.0/run`, { method: 'POST', headers: auth() });
    const run = await rr.json();
    const r = await fetch(`http://127.0.0.1:${s.address().port}/runs/${run.id}`, { headers: auth() });
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('list suites filter by agentId', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/suites`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        agentId: 'h', version: '1.0.0',
        suite: { name: 's', tests: [{ name: 't', kind: 'smoke' }] },
      }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites?agentId=h`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
    assert.ok(j.suites.every((x) => x.agent_id === 'h'));
  } finally { s.close(); }
});

test('not found for missing suite', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/suites/missing@1.0.0`, { headers: auth() });
    assert.strictEqual(r.status, 404);
  } finally { s.close(); }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});