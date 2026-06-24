'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-projects-'));
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

function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => {
      resolve({ mod, server, port: parseInt(env.PORT, 10), prev });
    });
    server.once('error', (e) => {
      restoreEnv(prev);
      reject(e);
    });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => {
      delete require.cache[require.resolve('../src/index.js')];
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
        ...(token ? { 'X-Internal-Token': token } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try {
          const parsed = chunks ? JSON.parse(chunks) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCounter = 0;
function uniquePort() { testCounter += 1; return 24000 + (testCounter * 7) % 1000; }

test('CRUD: create, read, update, list, delete project', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const tok = 'tkn';

  // Create
  const c1 = await request(port, 'POST', '/projects', {
    name: 'My Project',
    description: 'A test project',
    owner_id: 'user_alice',
    tags: ['demo', 'test']
  }, tok);
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('proj_'));
  assert.strictEqual(c1.body.name, 'My Project');
  assert.strictEqual(c1.body.status, 'active');
  assert.deepStrictEqual(c1.body.tags, ['demo', 'test']);
  assert.strictEqual(c1.body.owner_id, 'user_alice');
  assert.strictEqual(c1.body.members.length, 1);
  assert.strictEqual(c1.body.members[0].role, 'owner');
  const pid = c1.body.id;

  // Read
  const r1 = await request(port, 'GET', `/projects/${pid}`, null, tok);
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.id, pid);
  assert.strictEqual(r1.body.name, 'My Project');

  // Update
  const u1 = await request(port, 'PUT', `/projects/${pid}`, {
    user_id: 'user_alice',
    name: 'Renamed Project',
    description: 'Updated'
  }, tok);
  assert.strictEqual(u1.status, 200);
  assert.strictEqual(u1.body.name, 'Renamed Project');

  // List
  const l1 = await request(port, 'GET', '/projects', null, tok);
  assert.strictEqual(l1.status, 200);
  assert.strictEqual(l1.body.count, 1);
  assert.strictEqual(l1.body.projects.length, 1);
  assert.strictEqual(l1.body.projects[0].id, pid);

  // Delete (soft)
  const d1 = await request(port, 'DELETE', `/projects/${pid}`, { user_id: 'user_alice' }, tok);
  assert.strictEqual(d1.status, 200);
  assert.strictEqual(d1.body.deleted, true);

  // Read after delete - the project still exists with status=deleted
  const r2 = await request(port, 'GET', `/projects/${pid}`, null, tok);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.body.status, 'deleted');

  // Delete again - hmm, since status is 'deleted', what happens?
  // The route doesn't check, so it works again
  const d2 = await request(port, 'DELETE', `/projects/${pid}`, { user_id: 'user_alice' }, tok);
  assert.strictEqual(d2.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: rejects missing/invalid fields', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn2' });
  const tok = 'tkn2';

  // Missing name
  const e1 = await request(port, 'POST', '/projects', { owner_id: 'u1' }, tok);
  assert.strictEqual(e1.status, 400);
  assert.match(e1.body.message, /name/);

  // Missing owner_id
  const e2 = await request(port, 'POST', '/projects', { name: 'X' }, tok);
  assert.strictEqual(e2.status, 400);
  assert.match(e2.body.message, /owner_id/);

  // Empty name
  const e3 = await request(port, 'POST', '/projects', { name: '   ', owner_id: 'u1' }, tok);
  assert.strictEqual(e3.status, 400);

  // Invalid status
  const c1 = await request(port, 'POST', '/projects', { name: 'Y', owner_id: 'u1' }, tok);
  assert.strictEqual(c1.status, 201);
  const u1 = await request(port, 'PUT', `/projects/${c1.body.id}`, { user_id: 'u1', status: 'banana' }, tok);
  assert.strictEqual(u1.status, 400);

  // Invalid tag type
  const e4 = await request(port, 'POST', '/projects', { name: 'Z', owner_id: 'u1', tags: 'notarray' }, tok);
  assert.strictEqual(e4.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Members: add, conflict, remove, owner protection', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn3' });
  const tok = 'tkn3';

  const c1 = await request(port, 'POST', '/projects', { name: 'P', owner_id: 'alice' }, tok);
  const pid = c1.body.id;

  // Add member
  const a1 = await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice',
    new_user_id: 'bob',
    role: 'editor'
  }, tok);
  assert.strictEqual(a1.status, 201);
  assert.strictEqual(a1.body.members.length, 2);
  const bob = a1.body.members.find(m => m.user_id === 'bob');
  assert.strictEqual(bob.role, 'editor');

  // Add conflict
  const a2 = await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice',
    new_user_id: 'bob',
    role: 'viewer'
  }, tok);
  assert.strictEqual(a2.status, 409);

  // Add invalid role
  const a3 = await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice',
    new_user_id: 'dave',
    role: 'wizard'
  }, tok);
  assert.strictEqual(a3.status, 400);

  // Add missing fields
  const a4 = await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice',
    role: 'editor'
  }, tok);
  assert.strictEqual(a4.status, 400);

  // Editor cannot add members (only admin)
  const a5 = await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'bob',
    new_user_id: 'eve',
    role: 'viewer'
  }, tok);
  assert.strictEqual(a5.status, 403);

  // Remove member
  const rm1 = await request(port, 'DELETE', `/projects/${pid}/members/bob`, { user_id: 'alice' }, tok);
  assert.strictEqual(rm1.status, 200);
  assert.strictEqual(rm1.body.members.length, 1);

  // Cannot remove owner
  const rm2 = await request(port, 'DELETE', `/projects/${pid}/members/alice`, { user_id: 'alice' }, tok);
  assert.strictEqual(rm2.status, 400);

  // Remove non-existent
  const rm3 = await request(port, 'DELETE', `/projects/${pid}/members/ghost`, { user_id: 'alice' }, tok);
  assert.strictEqual(rm3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Audit log: tracks all mutations with timestamps', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn4' });
  const tok = 'tkn4';

  const c1 = await request(port, 'POST', '/projects', { name: 'Audited', owner_id: 'alice' }, tok);
  const pid = c1.body.id;
  await request(port, 'PUT', `/projects/${pid}`, { user_id: 'alice', name: 'X1' }, tok);
  await request(port, 'PUT', `/projects/${pid}`, { user_id: 'alice', name: 'X2' }, tok);
  await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice', new_user_id: 'bob', role: 'viewer'
  }, tok);
  await request(port, 'DELETE', `/projects/${pid}/members/bob`, { user_id: 'alice' }, tok);
  await request(port, 'DELETE', `/projects/${pid}`, { user_id: 'alice' }, tok);

  const audit = await request(port, 'GET', `/projects/${pid}/audit`, null, tok);
  assert.strictEqual(audit.status, 200);
  assert.ok(audit.body.audit);
  const actions = audit.body.audit.map(e => e.action);
  assert.ok(actions.includes('project.create'));
  assert.ok(actions.includes('project.update'));
  assert.ok(actions.includes('member.add'));
  assert.ok(actions.includes('member.remove'));
  assert.ok(actions.includes('project.delete'));
  // All entries have timestamps
  audit.body.audit.forEach(e => {
    assert.ok(e.created_at);
    assert.ok(!isNaN(new Date(e.created_at).getTime()));
  });

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth: rejects requests without internal token', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'secret123' });

  const r1 = await request(port, 'GET', '/projects', null, null);
  assert.strictEqual(r1.status, 401);

  const r2 = await request(port, 'GET', '/projects', null, 'wrong');
  assert.strictEqual(r2.status, 401);

  const r3 = await request(port, 'GET', '/projects', null, 'secret123');
  assert.strictEqual(r3.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Health endpoint returns service status', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn6' });

  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-projects');
  assert.strictEqual(h.body.ok, true);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List filtering: by user_id and status', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn7' });
  const tok = 'tkn7';

  await request(port, 'POST', '/projects', { name: 'A', owner_id: 'alice' }, tok);
  const b = await request(port, 'POST', '/projects', { name: 'B', owner_id: 'bob' }, tok);
  await request(port, 'POST', '/projects', { name: 'C', owner_id: 'alice' }, tok);
  await request(port, 'POST', `/projects/${b.body.id}/members`, {
    user_id: 'bob', new_user_id: 'carol', role: 'viewer'
  }, tok);
  await request(port, 'DELETE', `/projects/${b.body.id}`, { user_id: 'bob' }, tok);

  // Filter by user_id (member-of)
  const l1 = await request(port, 'GET', '/projects?user_id=alice', null, tok);
  assert.strictEqual(l1.status, 200);
  assert.strictEqual(l1.body.count, 2);
  assert.ok(l1.body.projects.every(p => p.members.some(m => m.user_id === 'alice')));

  // Filter by user_id who is a member of B (carol)
  const l2 = await request(port, 'GET', '/projects?user_id=carol', null, tok);
  assert.strictEqual(l2.body.count, 1);

  // Filter by status
  const l3 = await request(port, 'GET', '/projects?status=active', null, tok);
  assert.strictEqual(l3.body.count, 2);
  const l4 = await request(port, 'GET', '/projects?status=deleted', null, tok);
  assert.strictEqual(l4.body.count, 1);

  // Combined
  const l5 = await request(port, 'GET', '/projects?user_id=alice&status=active', null, tok);
  assert.strictEqual(l5.body.count, 2);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Read of non-existent project returns 404', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn8' });
  const tok = 'tkn8';

  const r1 = await request(port, 'GET', '/projects/proj_ghost', null, tok);
  assert.strictEqual(r1.status, 404);

  const u1 = await request(port, 'PUT', '/projects/proj_ghost', { user_id: 'u1', name: 'X' }, tok);
  assert.strictEqual(u1.status, 404);

  const d1 = await request(port, 'DELETE', '/projects/proj_ghost', { user_id: 'u1' }, tok);
  assert.strictEqual(d1.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update without user_id returns 400; forbidden if not editor/admin', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn9' });
  const tok = 'tkn9';

  const c1 = await request(port, 'POST', '/projects', { name: 'P', owner_id: 'alice' }, tok);
  const pid = c1.body.id;
  await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice', new_user_id: 'bob', role: 'viewer'
  }, tok);

  // Missing user_id
  const u1 = await request(port, 'PUT', `/projects/${pid}`, { name: 'X' }, tok);
  assert.strictEqual(u1.status, 400);

  // Viewer (not editor) is forbidden
  const u2 = await request(port, 'PUT', `/projects/${pid}`, { user_id: 'bob', name: 'X' }, tok);
  assert.strictEqual(u2.status, 403);

  // Non-member is forbidden
  const u3 = await request(port, 'PUT', `/projects/${pid}`, { user_id: 'mallory', name: 'X' }, tok);
  assert.strictEqual(u3.status, 403);

  // Editor (own user) can update
  const u4 = await request(port, 'PUT', `/projects/${pid}`, { user_id: 'alice', name: 'New' }, tok);
  assert.strictEqual(u4.status, 200);

  // Editor can be added and can update
  await request(port, 'POST', `/projects/${pid}/members`, {
    user_id: 'alice', new_user_id: 'carol', role: 'editor'
  }, tok);
  const u5 = await request(port, 'PUT', `/projects/${pid}`, { user_id: 'carol', name: 'CarolEdit' }, tok);
  assert.strictEqual(u5.status, 200);
  assert.strictEqual(u5.body.name, 'CarolEdit');

  // Delete by non-admin fails
  const d1 = await request(port, 'DELETE', `/projects/${pid}`, { user_id: 'carol' }, tok);
  assert.strictEqual(d1.status, 403);

  // Delete by admin
  const d2 = await request(port, 'DELETE', `/projects/${pid}`, { user_id: 'alice' }, tok);
  assert.strictEqual(d2.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: data survives service restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const handle1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tknp' });
  const tok = 'tknp';

  const c1 = await request(port1, 'POST', '/projects', { name: 'Persistent', owner_id: 'u1' }, tok);
  const pid = c1.body.id;

  await stopService(handle1);

  const port2 = uniquePort();
  const handle2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tknp' });

  const r1 = await request(port2, 'GET', `/projects/${pid}`, null, tok);
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.name, 'Persistent');

  await stopService(handle2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
