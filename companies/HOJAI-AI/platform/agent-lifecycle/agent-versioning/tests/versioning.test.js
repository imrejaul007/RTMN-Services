/**
 * Tests for agent-versioning
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Set up ephemeral data dir BEFORE requiring the app
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-token-123';

// Delete require cache to ensure env vars are picked up
const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];

const { createApp, compareSemver, bumpSemver, contentHash } = require('../src/index.js');
const TOKEN = 'test-token-123';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('compareSemver handles equal, less than, greater than', () => {
  assert.strictEqual(compareSemver('1.0.0', '1.0.0'), 0);
  assert.strictEqual(compareSemver('1.0.0', '1.0.1'), -1);
  assert.strictEqual(compareSemver('2.0.0', '1.99.99'), 1);
  assert.strictEqual(compareSemver('1.10.0', '1.9.0'), 1);
});

test('bumpSemver handles major, minor, patch', () => {
  assert.strictEqual(bumpSemver('1.2.3', 'major'), '2.0.0');
  assert.strictEqual(bumpSemver('1.2.3', 'minor'), '1.3.0');
  assert.strictEqual(bumpSemver('1.2.3', 'patch'), '1.2.4');
});

test('bumpSemver throws on invalid kind', () => {
  assert.throws(() => bumpSemver('1.2.3', 'invalid'), /Unknown bump kind/);
});

test('contentHash is deterministic and different for different content', () => {
  const snap1 = { agent_id: 'a', version: '1.0.0', config: { x: 1 }, code: 'hello', metadata: {} };
  const snap2 = { agent_id: 'a', version: '1.0.0', config: { x: 2 }, code: 'hello', metadata: {} };
  assert.strictEqual(contentHash(snap1), contentHash(snap1));
  assert.notStrictEqual(contentHash(snap1), contentHash(snap2));
});

test('health and ready return ok', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const r1 = await fetch(`http://127.0.0.1:${port}/health`);
    assert.strictEqual(r1.status, 200);
    const j1 = await r1.json();
    assert.strictEqual(j1.service, 'agent-versioning');
    const r2 = await fetch(`http://127.0.0.1:${port}/ready`);
    assert.strictEqual(r2.status, 200);
  } finally { server.close(); }
});

test('rejects requests without auth token', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/agents`, { headers: { 'Content-Type': 'application/json' } });
    assert.strictEqual(r.status, 401);
  } finally { server.close(); }
});

test('create + list + get version', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const create = await fetch(`http://127.0.0.1:${port}/agents/agent-A/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0', config: { temp: 0.7 }, code: 'print(1)', tags: ['stable'] }),
    });
    assert.strictEqual(create.status, 201);
    const created = await create.json();
    assert.strictEqual(created.version, '1.0.0');
    assert.strictEqual(created.agent_id, 'agent-A');
    assert.ok(created.content_hash);
    assert.ok(created.tags.includes('stable'));

    const list = await fetch(`http://127.0.0.1:${port}/agents/agent-A/versions`, { headers: auth() });
    assert.strictEqual(list.status, 200);
    const lj = await list.json();
    assert.strictEqual(lj.count, 1);

    const get = await fetch(`http://127.0.0.1:${port}/agents/agent-A/versions/1.0.0`, { headers: auth() });
    assert.strictEqual(get.status, 200);
  } finally { server.close(); }
});

test('rejects invalid semver', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/agents/agent-B/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: 'not-semver' }),
    });
    assert.strictEqual(r.status, 400);
  } finally { server.close(); }
});

test('rejects duplicate version', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/agent-C/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0' }),
    });
    const r2 = await fetch(`http://127.0.0.1:${port}/agents/agent-C/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0' }),
    });
    assert.strictEqual(r2.status, 409);
  } finally { server.close(); }
});

test('bump creates new version from base', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/agent-D/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0', config: { a: 1 } }),
    });
    const bump = await fetch(`http://127.0.0.1:${port}/agents/agent-D/versions/1.0.0/bump`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ kind: 'minor' }),
    });
    assert.strictEqual(bump.status, 201);
    const bj = await bump.json();
    assert.strictEqual(bj.version, '1.1.0');
    assert.strictEqual(bj.parent_version, '1.0.0');
    assert.deepStrictEqual(bj.config, { a: 1 });

    const bump2 = await fetch(`http://127.0.0.1:${port}/agents/agent-D/versions/1.1.0/bump`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ kind: 'major' }),
    });
    const bj2 = await bump2.json();
    assert.strictEqual(bj2.version, '2.0.0');
  } finally { server.close(); }
});

test('tag a version and retrieve via tag', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/agent-E/versions`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ version: '1.0.0' }),
    });
    const tag = await fetch(`http://127.0.0.1:${port}/agents/agent-E/versions/1.0.0/tags`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ tag: 'production' }),
    });
    assert.strictEqual(tag.status, 200);
    const tj = await tag.json();
    assert.ok(tj.tags.includes('production'));
  } finally { server.close(); }
});

test('list agents tracks all known agents', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/x1/versions`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ version: '1.0.0' }),
    });
    await fetch(`http://127.0.0.1:${port}/agents/x2/versions`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ version: '1.0.0' }),
    });
    const r = await fetch(`http://127.0.0.1:${port}/agents`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 2);
    assert.ok(j.agents.find((a) => a.agent_id === 'x1'));
    assert.ok(j.agents.find((a) => a.agent_id === 'x2'));
  } finally { server.close(); }
});

test('diff two versions', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/d/versions`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ version: '1.0.0', code: 'a' }),
    });
    await fetch(`http://127.0.0.1:${port}/agents/d/versions`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ version: '2.0.0', code: 'b' }),
    });
    const r = await fetch(`http://127.0.0.1:${port}/agents/d/versions/1.0.0/diff/2.0.0`, { headers: auth() });
    assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.strictEqual(j.code_changed, true);
    assert.notStrictEqual(j.hash_from, j.hash_to);
  } finally { server.close(); }
});

test('versions sorted by semver asc', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    for (const v of ['2.0.0', '1.0.0', '1.2.0', '10.0.0']) {
      await fetch(`http://127.0.0.1:${port}/agents/sort/versions`, {
        method: 'POST', headers: auth(), body: JSON.stringify({ version: v }),
      });
    }
    const r = await fetch(`http://127.0.0.1:${port}/agents/sort/versions`, { headers: auth() });
    const j = await r.json();
    assert.deepStrictEqual(j.versions.map((v) => v.version), ['1.0.0', '1.2.0', '2.0.0', '10.0.0']);
  } finally { server.close(); }
});

test('delete agent version history', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    await fetch(`http://127.0.0.1:${port}/agents/del/versions`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ version: '1.0.0' }),
    });
    const r = await fetch(`http://127.0.0.1:${port}/agents/del/versions`, { method: 'DELETE', headers: auth() });
    assert.strictEqual(r.status, 200);
    const r2 = await fetch(`http://127.0.0.1:${port}/agents/del/versions`, { headers: auth() });
    const j = await r2.json();
    assert.strictEqual(j.count, 0);
  } finally { server.close(); }
});

test('not found for missing version', async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/agents/nope/versions/9.9.9`, { headers: auth() });
    assert.strictEqual(r.status, 404);
  } finally { server.close(); }
});

// Cleanup
test('cleanup tmp', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});