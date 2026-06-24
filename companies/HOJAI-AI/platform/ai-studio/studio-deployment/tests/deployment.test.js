'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-deployment-')); }

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; }
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
    const server = app.listen(parseInt(env.PORT, 10), () => resolve({ mod, server, port: parseInt(env.PORT, 10), prev }));
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => { delete require.cache[require.resolve('../src/index.js')]; restoreEnv(handle.prev); resolve(); });
  });
}

function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) }
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCounter = 0;
function uniquePort() { testCounter += 1; return 31000 + (testCounter * 31) % 1000; }

function makeRelease(name = 'app', version = '1.0.0') {
  return {
    name,
    version,
    description: 'A release',
    project_id: 'p1',
    user_id: 'alice',
    artifact: { agent_id: 'agt_1', model: 'gpt-4' }
  };
}

test('Capabilities and health', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c = await request(port, 'GET', '/capabilities', null, 'tkn');
  assert.strictEqual(c.status, 200);
  assert.ok(c.body.strategies.includes('immediate'));
  assert.ok(c.body.strategies.includes('canary'));
  assert.ok(c.body.strategies.includes('blue_green'));

  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-deployment');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Default environments seeded (dev, staging, prod)', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l = await request(port, 'GET', '/environments', null, 'tkn');
  assert.strictEqual(l.body.count, 3);
  const slugs = l.body.environments.map(e => e.slug).sort();
  assert.deepStrictEqual(slugs, ['dev', 'prod', 'staging']);

  // Get by slug
  const p = await request(port, 'GET', '/environments/prod', null, 'tkn');
  assert.strictEqual(p.status, 200);
  assert.strictEqual(p.body.name, 'production');

  // Get by id
  const d = await request(port, 'GET', `/environments/${p.body.id}`, null, 'tkn');
  assert.strictEqual(d.body.id, p.body.id);

  // 404
  const g = await request(port, 'GET', '/environments/ghost', null, 'tkn');
  assert.strictEqual(g.status, 404);

  // Cannot delete default envs
  const del = await request(port, 'DELETE', `/environments/${p.body.id}`, null, 'tkn');
  assert.strictEqual(del.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD custom environment', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Create
  const c1 = await request(port, 'POST', '/environments', {
    name: 'QA', slug: 'qa', description: 'QA env', project_id: 'p', user_id: 'u'
  }, 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('env_'));
  const eid = c1.body.id;

  // Validation
  const e1 = await request(port, 'POST', '/environments', { slug: 'x' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/environments', { name: 'X' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  const e3 = await request(port, 'POST', '/environments', { name: 'X', slug: 'BadSlug' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  const e4 = await request(port, 'POST', '/environments', { name: 'X', slug: 'qa' }, 'tkn');
  assert.strictEqual(e4.status, 409);

  // Update
  const u1 = await request(port, 'PUT', `/environments/${eid}`, { description: 'Updated' }, 'tkn');
  assert.strictEqual(u1.body.description, 'Updated');
  const u2 = await request(port, 'PUT', `/environments/${eid}`, { status: 'banana' }, 'tkn');
  assert.strictEqual(u2.status, 400);
  const u3 = await request(port, 'PUT', '/environments/env_ghost', { description: 'X' }, 'tkn');
  assert.strictEqual(u3.status, 404);

  // Delete
  const d1 = await request(port, 'DELETE', `/environments/${eid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD release with semver version', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/releases', makeRelease(), 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.strictEqual(c1.body.key, 'app@1.0.0');
  const rid = c1.body.id;

  // Get by key
  const g1 = await request(port, 'GET', '/releases/app@1.0.0', null, 'tkn');
  assert.strictEqual(g1.body.id, rid);

  // Get by id
  const g2 = await request(port, 'GET', `/releases/${rid}`, null, 'tkn');
  assert.strictEqual(g2.body.id, rid);

  // Validation
  const e1 = await request(port, 'POST', '/releases', { version: '1.0.0', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/releases', { name: 'X', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  const e3 = await request(port, 'POST', '/releases', { name: 'X', version: '1.0', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  const e4 = await request(port, 'POST', '/releases', { name: 'X', version: '1.0.0', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e4.status, 201);
  const e5 = await request(port, 'POST', '/releases', makeRelease(), 'tkn');
  assert.strictEqual(e5.status, 409); // same name+version

  // List
  const l1 = await request(port, 'GET', '/releases', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);
  const l2 = await request(port, 'GET', '/releases?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port, 'GET', '/releases?name=app', null, 'tkn');
  assert.strictEqual(l3.body.count, 1);

  // Delete
  const d1 = await request(port, 'DELETE', `/releases/${rid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Deploy release to environment: immediate strategy', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/releases', makeRelease(), 'tkn');
  const d1 = await request(port, 'POST', '/deployments', {
    release_id: r.body.id,
    environment_slug: 'dev',
    strategy: 'immediate',
    user_id: 'alice'
  }, 'tkn');
  assert.strictEqual(d1.status, 201);
  assert.ok(d1.body.id.startsWith('dep_'));
  assert.strictEqual(d1.body.status, 'live');
  assert.strictEqual(d1.body.stages.length, 1);
  assert.strictEqual(d1.body.stages[0].stage, 'immediate_deploy');

  // Get current for env
  const c1 = await request(port, 'GET', '/environments/dev/current', null, 'tkn');
  assert.strictEqual(c1.body.current.id, d1.body.id);

  // Get deployment
  const g1 = await request(port, 'GET', `/deployments/${d1.body.id}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);

  // List
  const l1 = await request(port, 'GET', '/deployments', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port, 'GET', '/deployments?environment_id=' + d1.body.environment_id, null, 'tkn');
  assert.strictEqual(l2.body.count, 1);

  // Validation
  const e1 = await request(port, 'POST', '/deployments', { environment_slug: 'dev' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/deployments', { release_id: r.body.id, environment_slug: 'dev', strategy: 'weird' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  const e3 = await request(port, 'POST', '/deployments', { release_id: 'rel_ghost', environment_slug: 'dev' }, 'tkn');
  assert.strictEqual(e3.status, 404);
  const e4 = await request(port, 'POST', '/deployments', { release_id: r.body.id, environment_slug: 'ghost' }, 'tkn');
  assert.strictEqual(e4.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Deploy with canary strategy: 4 stages', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/releases', makeRelease(), 'tkn');
  const d1 = await request(port, 'POST', '/deployments', {
    release_id: r.body.id,
    environment_slug: 'prod',
    strategy: 'canary'
  }, 'tkn');
  assert.strictEqual(d1.status, 201);
  assert.strictEqual(d1.body.stages.length, 4);
  assert.strictEqual(d1.body.stages[0].percent, 1);
  assert.strictEqual(d1.body.stages[3].percent, 100);
  assert.strictEqual(d1.body.duration_ms, 60000);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Deploy with blue_green strategy: 3 stages', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/releases', makeRelease(), 'tkn');
  const d1 = await request(port, 'POST', '/deployments', {
    release_id: r.body.id,
    environment_slug: 'staging',
    strategy: 'blue_green'
  }, 'tkn');
  assert.strictEqual(d1.status, 201);
  assert.strictEqual(d1.body.stages.length, 3);
  assert.strictEqual(d1.body.stages[0].stage, 'deploy_to_green');
  assert.strictEqual(d1.body.stages[1].stage, 'switch_traffic');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rollback: revert to previous deployment', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r1 = await request(port, 'POST', '/releases', makeRelease('app', '1.0.0'), 'tkn');
  const r2 = await request(port, 'POST', '/releases', makeRelease('app', '1.1.0'), 'tkn');

  const d1 = await request(port, 'POST', '/deployments', {
    release_id: r1.body.id, environment_slug: 'prod', strategy: 'immediate'
  }, 'tkn');
  // Wait a tiny bit to ensure different timestamps
  await new Promise(r => setTimeout(r, 10));
  const d2 = await request(port, 'POST', '/deployments', {
    release_id: r2.body.id, environment_slug: 'prod', strategy: 'immediate'
  }, 'tkn');

  // Current should be d2
  const c1 = await request(port, 'GET', '/environments/prod/current', null, 'tkn');
  assert.strictEqual(c1.body.current.id, d2.body.id);

  // Rollback d2 → d1
  const rb = await request(port, 'POST', `/deployments/${d2.body.id}/rollback`, null, 'tkn');
  assert.strictEqual(rb.status, 200);
  assert.strictEqual(rb.body.deployment.status, 'rolled_back');
  assert.strictEqual(rb.body.rolled_back_to.id, d1.body.id);

  // Current is now d1
  const c2 = await request(port, 'GET', '/environments/prod/current', null, 'tkn');
  assert.strictEqual(c2.body.current.id, d1.body.id);

  // Cannot rollback the only deployment
  const r3 = await request(port, 'POST', '/releases', makeRelease('app', '1.2.0'), 'tkn');
  const d3 = await request(port, 'POST', '/deployments', {
    release_id: r3.body.id, environment_slug: 'staging', strategy: 'immediate'
  }, 'tkn');
  const rb2 = await request(port, 'POST', `/deployments/${d3.body.id}/rollback`, null, 'tkn');
  assert.strictEqual(rb2.status, 400);

  // 404
  const rb3 = await request(port, 'POST', '/deployments/dep_ghost/rollback', null, 'tkn');
  assert.strictEqual(rb3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter, auth, 404, persistence', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port1, 'POST', '/releases', makeRelease(), 'tkn');
  await request(port1, 'POST', '/deployments', { release_id: r.body.id, environment_slug: 'dev' }, 'tkn');

  // Auth
  const a1 = await request(port1, 'GET', '/environments', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port1, 'GET', '/capabilities', null, 'wrong');
  assert.strictEqual(a2.status, 401);

  // 404
  const g1 = await request(port1, 'GET', '/deployments/dep_ghost', null, 'tkn');
  assert.strictEqual(g1.status, 404);

  // Filter
  const l1 = await request(port1, 'GET', '/environments?status=active', null, 'tkn');
  assert.strictEqual(l1.body.count, 3);
  const l2 = await request(port1, 'GET', '/deployments?status=live', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);

  // Persistence
  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l3 = await request(port2, 'GET', '/environments', null, 'tkn');
  assert.strictEqual(l3.body.count, 3);
  const l4 = await request(port2, 'GET', '/releases', null, 'tkn');
  assert.strictEqual(l4.body.count, 1);
  const l5 = await request(port2, 'GET', '/deployments', null, 'tkn');
  assert.strictEqual(l5.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
