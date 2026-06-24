// Tests for studio-collab (4909)
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-collab-'));
}

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) {
    prev[k] = process.env[k];
    process.env[k] = obj[k];
  }
  return prev;
}

function restoreEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

let testCounter = 0;
function uniquePort() {
  testCounter += 1;
  return 32000 + (testCounter * 37) % 1000;
}

function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    let mod;
    try {
      mod = require('../src/index.js');
    } catch (e) {
      restoreEnv(prev);
      return reject(e);
    }
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => {
      resolve({ mod, server, port: parseInt(env.PORT, 10), prev, dataDir: env.DATA_DIR });
    });
    server.on('error', (e) => {
      restoreEnv(prev);
      reject(e);
    });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => {
      restoreEnv(handle.prev);
      resolve();
    });
  });
}

function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path: p,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'X-Internal-Token': token } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = buf ? JSON.parse(buf) : null; } catch { parsed = buf; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const TOKEN = 'test-token-collab';

test('Capabilities and health', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    const r1 = await request(handle.port, 'GET', '/');
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.service, 'studio-collab');
    assert.ok(r1.body.capabilities.comments);
    assert.ok(r1.body.capabilities.locks);
    assert.ok(r1.body.capabilities.activity);
    assert.ok(r1.body.capabilities.share_links);

    const r2 = await request(handle.port, 'GET', '/health');
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.status, 'ok');
  } finally {
    await stopService(handle);
  }
});

test('Comment CRUD: post, list, resolve', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    // Create
    const r1 = await request(handle.port, 'POST', '/comments', {
      target_type: 'workflow',
      target_id: 'wf_abc',
      user_id: 'u1',
      body: 'This needs a guardrail',
    }, TOKEN);
    assert.strictEqual(r1.status, 201);
    assert.ok(r1.body.id.startsWith('cmt_'));
    assert.strictEqual(r1.body.resolved, false);

    // Reject empty body
    const r2 = await request(handle.port, 'POST', '/comments', {
      target_type: 'workflow', target_id: 'wf_abc', user_id: 'u1', body: '   ',
    }, TOKEN);
    assert.strictEqual(r2.status, 400);

    // List
    const r3 = await request(handle.port, 'GET', '/comments?target_type=workflow&target_id=wf_abc', null, TOKEN);
    assert.strictEqual(r3.status, 200);
    assert.strictEqual(r3.body.total, 1);
    assert.strictEqual(r3.body.comments[0].id, r1.body.id);

    // Resolve
    const r4 = await request(handle.port, 'POST', `/comments/${r1.body.id}/resolve`, { user_id: 'u1' }, TOKEN);
    assert.strictEqual(r4.status, 200);
    assert.strictEqual(r4.body.resolved, true);
    assert.ok(r4.body.resolved_at);

    // Filter by resolved=false
    const r5 = await request(handle.port, 'GET', '/comments?target_type=workflow&target_id=wf_abc&resolved=false', null, TOKEN);
    assert.strictEqual(r5.body.total, 0);
  } finally {
    await stopService(handle);
  }
});

test('Threaded comments: parent_id links replies', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    const parent = await request(handle.port, 'POST', '/comments', {
      target_type: 'agent', target_id: 'agt_x', user_id: 'u1', body: 'parent',
    }, TOKEN);
    assert.strictEqual(parent.status, 201);

    const reply = await request(handle.port, 'POST', '/comments', {
      target_type: 'agent', target_id: 'agt_x', user_id: 'u2', body: 'reply',
      parent_id: parent.body.id,
    }, TOKEN);
    assert.strictEqual(reply.status, 201);
    assert.strictEqual(reply.body.parent_id, parent.body.id);

    const list = await request(handle.port, 'GET', '/comments?target_type=agent&target_id=agt_x', null, TOKEN);
    assert.strictEqual(list.body.total, 2);
  } finally {
    await stopService(handle);
  }
});

test('Locks: acquire, conflict, release', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    // u1 acquires
    const r1 = await request(handle.port, 'POST', '/locks/acquire', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u1', ttl_seconds: 60,
    }, TOKEN);
    assert.strictEqual(r1.status, 201);
    assert.ok(r1.body.id.startsWith('lk_'));

    // u2 tries to acquire same target -> 409
    const r2 = await request(handle.port, 'POST', '/locks/acquire', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u2', ttl_seconds: 60,
    }, TOKEN);
    assert.strictEqual(r2.status, 409);
    assert.strictEqual(r2.body.error, 'locked');

    // u1 re-acquires (idempotent, same lock returned)
    const r3 = await request(handle.port, 'POST', '/locks/acquire', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u1', ttl_seconds: 60,
    }, TOKEN);
    assert.strictEqual(r3.body.id, r1.body.id);

    // List active
    const r4 = await request(handle.port, 'GET', '/locks?target_type=workflow&target_id=wf_1', null, TOKEN);
    assert.strictEqual(r4.body.total, 1);

    // u2 tries to release u1's lock -> 403
    const r5 = await request(handle.port, 'POST', '/locks/release', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u2',
    }, TOKEN);
    assert.strictEqual(r5.status, 403);

    // u1 releases
    const r6 = await request(handle.port, 'POST', '/locks/release', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u1',
    }, TOKEN);
    assert.strictEqual(r6.status, 200);
    assert.ok(r6.body.released_at);

    // u2 now succeeds
    const r7 = await request(handle.port, 'POST', '/locks/acquire', {
      target_type: 'workflow', target_id: 'wf_1', user_id: 'u2',
    }, TOKEN);
    assert.strictEqual(r7.status, 201);
  } finally {
    await stopService(handle);
  }
});

test('Activity: record, list, ordering', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    const a1 = await request(handle.port, 'POST', '/activity', {
      project_id: 'proj_a', user_id: 'u1', action: 'workflow.create',
      target: { type: 'workflow', id: 'wf_1' },
    }, TOKEN);
    assert.strictEqual(a1.status, 201);

    const a2 = await request(handle.port, 'POST', '/activity', {
      project_id: 'proj_a', user_id: 'u2', action: 'workflow.update',
      target: { type: 'workflow', id: 'wf_1' },
    }, TOKEN);
    assert.strictEqual(a2.status, 201);

    const a3 = await request(handle.port, 'POST', '/activity', {
      project_id: 'proj_b', user_id: 'u3', action: 'workflow.create',
    }, TOKEN);

    // Missing fields
    const bad = await request(handle.port, 'POST', '/activity', {
      project_id: 'proj_a', user_id: 'u1',
    }, TOKEN);
    assert.strictEqual(bad.status, 400);

    // List
    const list = await request(handle.port, 'GET', '/activity?project_id=proj_a', null, TOKEN);
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.body.total, 2);
    // Newest first
    assert.strictEqual(list.body.activities[0].id, a2.body.id);

    // Missing project_id -> 400
    const noProj = await request(handle.port, 'GET', '/activity', null, TOKEN);
    assert.strictEqual(noProj.status, 400);
  } finally {
    await stopService(handle);
  }
});

test('Share links: create, resolve, expire', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    // Invalid permission
    const bad = await request(handle.port, 'POST', '/share', {
      target_type: 'workflow', target_id: 'wf_1', permission: 'admin',
    }, TOKEN);
    assert.strictEqual(bad.status, 400);

    // Create
    const r1 = await request(handle.port, 'POST', '/share', {
      target_type: 'workflow', target_id: 'wf_1', permission: 'view',
    }, TOKEN);
    assert.strictEqual(r1.status, 201);
    assert.ok(r1.body.id.startsWith('shr_'));
    assert.strictEqual(r1.body.permission, 'view');
    assert.strictEqual(r1.body.expires_at, null);
    assert.ok(r1.body.url.includes(r1.body.id));

    // Resolve
    const r2 = await request(handle.port, 'GET', `/share/${r1.body.id}`, null, TOKEN);
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.target_id, 'wf_1');

    // Expired
    const past = new Date(Date.now() - 1000).toISOString();
    const r3 = await request(handle.port, 'POST', '/share', {
      target_type: 'agent', target_id: 'agt_x', permission: 'edit', expires_at: past,
    }, TOKEN);
    const r4 = await request(handle.port, 'GET', `/share/${r3.body.id}`, null, TOKEN);
    assert.strictEqual(r4.status, 410);

    // 404
    const r5 = await request(handle.port, 'GET', '/share/shr_doesnotexist', null, TOKEN);
    assert.strictEqual(r5.status, 404);
  } finally {
    await stopService(handle);
  }
});

test('Auth: missing/wrong X-Internal-Token rejected', async () => {
  const env = { PORT: String(uniquePort()), DATA_DIR: makeTmpDir(), INTERNAL_TOKEN: TOKEN };
  const handle = await startService(env);
  try {
    // POST without token -> 401
    const r1 = await request(handle.port, 'POST', '/comments', {
      target_type: 't', target_id: 'i', user_id: 'u', body: 'b',
    }, null);
    assert.strictEqual(r1.status, 401);

    // POST with wrong token -> 401
    const r2 = await request(handle.port, 'POST', '/comments', {
      target_type: 't', target_id: 'i', user_id: 'u', body: 'b',
    }, 'wrong');
    assert.strictEqual(r2.status, 401);

    // GET on protected endpoint without token -> 401 (only /, /health, /ready are public)
    const r3 = await request(handle.port, 'GET', '/comments', null, null);
    assert.strictEqual(r3.status, 401);

    // Public endpoints accessible without token
    const r4 = await request(handle.port, 'GET', '/', null, null);
    assert.strictEqual(r4.status, 200);
    const r5 = await request(handle.port, 'GET', '/health', null, null);
    assert.strictEqual(r5.status, 200);
  } finally {
    await stopService(handle);
  }
});

test('Persistence across restart', async () => {
  const dir = makeTmpDir();
  const env1 = { PORT: String(uniquePort()), DATA_DIR: dir, INTERNAL_TOKEN: TOKEN };
  const h1 = await startService(env1);
  try {
    await request(h1.port, 'POST', '/comments', {
      target_type: 'workflow', target_id: 'wf_persist', user_id: 'u1', body: 'hello',
    }, TOKEN);
  } finally { await stopService(h1); }

  // Restart with same DATA_DIR
  const env2 = { PORT: String(uniquePort()), DATA_DIR: dir, INTERNAL_TOKEN: TOKEN };
  const h2 = await startService(env2);
  try {
    const list = await request(h2.port, 'GET', '/comments?target_type=workflow&target_id=wf_persist', null, TOKEN);
    assert.strictEqual(list.body.total, 1);
    assert.strictEqual(list.body.comments[0].body, 'hello');
  } finally { await stopService(h2); }
});
