'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-twin-')); }

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
function uniquePort() { testCounter += 1; return 28000 + (testCounter * 19) % 1000; }

function customerSchema() {
  return {
    name: 'customer',
    description: 'Customer twin',
    project_id: 'p1',
    user_id: 'alice',
    fields: [
      { name: 'email', type: 'email', required: true },
      { name: 'age', type: 'integer', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'tier', type: 'enum', values: ['bronze', 'silver', 'gold'], required: true },
      { name: 'birthday', type: 'date', required: false },
      { name: 'tags', type: 'array', required: false },
      { name: 'metadata', type: 'object', required: false }
    ],
    relations: [
      { name: 'orders', type: 'has_many', target: 'order' }
    ]
  };
}

test('Capabilities: returns valid types', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'GET', '/capabilities', null, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.field_types.includes('string'));
  assert.ok(r.body.field_types.includes('enum'));
  assert.ok(r.body.relation_types.includes('has_many'));

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD schema: create, read by id+name, update, delete', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const s = customerSchema();

  const c1 = await request(port, 'POST', '/schemas', s, 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('sch_'));
  assert.strictEqual(c1.body.status, 'draft');
  assert.strictEqual(c1.body.fields.length, 7);
  const sid = c1.body.id;

  // Read by id
  const r1 = await request(port, 'GET', `/schemas/${sid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);

  // Read by name
  const r2 = await request(port, 'GET', '/schemas/customer', null, 'tkn');
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.body.id, sid);

  // Update
  const u1 = await request(port, 'PUT', `/schemas/${sid}`, { description: 'Updated' }, 'tkn');
  assert.strictEqual(u1.body.description, 'Updated');
  assert.strictEqual(u1.body.version, 2);

  // Update with bad status
  const u2 = await request(port, 'PUT', `/schemas/${sid}`, { status: 'bad' }, 'tkn');
  assert.strictEqual(u2.status, 400);

  // Delete
  const d1 = await request(port, 'DELETE', `/schemas/${sid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  // Read by id - 404
  const r3 = await request(port, 'GET', `/schemas/${sid}`, null, 'tkn');
  assert.strictEqual(r3.status, 404);
  // Read by name - 404
  const r4 = await request(port, 'GET', '/schemas/customer', null, 'tkn');
  assert.strictEqual(r4.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schema validation: rejects missing/invalid fields', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Missing name
  const e1 = await request(port, 'POST', '/schemas', { project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  // Bad name format
  const e2 = await request(port, 'POST', '/schemas', { name: 'BadName', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  // Missing project_id
  const e3 = await request(port, 'POST', '/schemas', { name: 'foo', user_id: 'u' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  // Missing user_id
  const e4 = await request(port, 'POST', '/schemas', { name: 'foo', project_id: 'p' }, 'tkn');
  assert.strictEqual(e4.status, 400);
  // Duplicate field names
  const e5 = await request(port, 'POST', '/schemas', {
    name: 'foo', project_id: 'p', user_id: 'u',
    fields: [{ name: 'a', type: 'string' }, { name: 'a', type: 'number' }]
  }, 'tkn');
  assert.strictEqual(e5.status, 400);
  // Invalid field type
  const e6 = await request(port, 'POST', '/schemas', {
    name: 'foo', project_id: 'p', user_id: 'u',
    fields: [{ name: 'a', type: 'magic' }]
  }, 'tkn');
  assert.strictEqual(e6.status, 400);
  // Field missing name
  const e7 = await request(port, 'POST', '/schemas', {
    name: 'foo', project_id: 'p', user_id: 'u',
    fields: [{ type: 'string' }]
  }, 'tkn');
  assert.strictEqual(e7.status, 400);
  // Invalid relation type
  const e8 = await request(port, 'POST', '/schemas', {
    name: 'foo', project_id: 'p', user_id: 'u',
    relations: [{ name: 'r', type: 'cosmic', target: 'x' }]
  }, 'tkn');
  assert.strictEqual(e8.status, 400);
  // Relation missing target
  const e9 = await request(port, 'POST', '/schemas', {
    name: 'foo', project_id: 'p', user_id: 'u',
    relations: [{ name: 'r', type: 'has_many' }]
  }, 'tkn');
  assert.strictEqual(e9.status, 400);

  // Duplicate schema name
  await request(port, 'POST', '/schemas', { name: 'foo', project_id: 'p', user_id: 'u' }, 'tkn');
  const e10 = await request(port, 'POST', '/schemas', { name: 'foo', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e10.status, 409);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Instance: create, validate types, list, update, delete', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const s = customerSchema();
  const c1 = await request(port, 'POST', '/schemas', s, 'tkn');
  await request(port, 'PUT', `/schemas/${c1.body.id}`, { status: 'active' }, 'tkn');

  // Create valid instance
  const i1 = await request(port, 'POST', '/instances', {
    schema_name: 'customer',
    data: {
      email: 'alice@example.com',
      age: 30,
      name: 'Alice',
      tier: 'gold',
      birthday: '1994-05-15',
      tags: ['vip'],
      metadata: { source: 'web' }
    }
  }, 'tkn');
  assert.strictEqual(i1.status, 201);
  assert.ok(i1.body.id.startsWith('twi_'));
  assert.strictEqual(i1.body.schema_name, 'customer');

  // Get instance
  const g1 = await request(port, 'GET', `/instances/${i1.body.id}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);
  assert.strictEqual(g1.body.data.email, 'alice@example.com');

  // Update instance
  const u1 = await request(port, 'PUT', `/instances/${i1.body.id}`, { data: { tier: 'silver', age: 31 } }, 'tkn');
  assert.strictEqual(u1.status, 200);
  assert.strictEqual(u1.body.data.tier, 'silver');

  // List
  const l1 = await request(port, 'GET', '/instances', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);

  // Filter
  const l2 = await request(port, 'GET', '/instances?schema_name=customer', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port, 'GET', '/instances?schema_name=ghost', null, 'tkn');
  assert.strictEqual(l3.body.count, 0);

  // Delete
  const d1 = await request(port, 'DELETE', `/instances/${i1.body.id}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/instances/${i1.body.id}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Instance validation: rejects invalid types and missing required', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/schemas', customerSchema(), 'tkn');
  await request(port, 'PUT', `/schemas/${c1.body.id}`, { status: 'active' }, 'tkn');

  // Missing required
  const e1 = await request(port, 'POST', '/instances', { schema_name: 'customer', data: { name: 'X' } }, 'tkn');
  assert.strictEqual(e1.status, 400);

  // Wrong type for age
  const e2 = await request(port, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'a@b.com', age: 'thirty', name: 'X', tier: 'gold' }
  }, 'tkn');
  assert.strictEqual(e2.status, 400);

  // Bad enum
  const e3 = await request(port, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'a@b.com', age: 30, name: 'X', tier: 'platinum' }
  }, 'tkn');
  assert.strictEqual(e3.status, 400);

  // Bad date format
  const e4 = await request(port, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'a@b.com', age: 30, name: 'X', tier: 'gold', birthday: '15-May' }
  }, 'tkn');
  assert.strictEqual(e4.status, 400);

  // Bad email
  const e5 = await request(port, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'not-an-email', age: 30, name: 'X', tier: 'gold' }
  }, 'tkn');
  assert.strictEqual(e5.status, 400);

  // Schema not active
  await request(port, 'PUT', `/schemas/${c1.body.id}`, { status: 'draft' }, 'tkn');
  const e6 = await request(port, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'a@b.com', age: 30, name: 'X', tier: 'gold' }
  }, 'tkn');
  assert.strictEqual(e6.status, 400);

  // Schema not found
  const e7 = await request(port, 'POST', '/instances', {
    schema_name: 'ghost', data: { email: 'a@b.com', age: 30, name: 'X', tier: 'gold' }
  }, 'tkn');
  assert.strictEqual(e7.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validate endpoint: dry-run validation', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/schemas', customerSchema(), 'tkn');
  await request(port, 'PUT', `/schemas/${c1.body.id}`, { status: 'active' }, 'tkn');

  // Valid
  const v1 = await request(port, 'POST', '/schemas/customer/validate', {
    data: { email: 'a@b.com', age: 30, name: 'X', tier: 'gold' }
  }, 'tkn');
  assert.strictEqual(v1.status, 200);
  assert.strictEqual(v1.body.valid, true);

  // Invalid
  const v2 = await request(port, 'POST', '/schemas/customer/validate', {
    data: { email: 'bad', age: 'X', name: 'X' }
  }, 'tkn');
  assert.strictEqual(v2.status, 400);

  // Schema not found
  const v3 = await request(port, 'POST', '/schemas/ghost/validate', { data: {} }, 'tkn');
  assert.strictEqual(v3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List schemas, filter, auth, 404, health', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const a = customerSchema(); a.user_id = 'alice';
  const b = customerSchema(); b.name = 'order'; b.user_id = 'bob';
  await request(port, 'POST', '/schemas', a, 'tkn');
  await request(port, 'POST', '/schemas', b, 'tkn');

  const l1 = await request(port, 'GET', '/schemas', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);
  const l2 = await request(port, 'GET', '/schemas?user_id=alice', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port, 'GET', '/schemas?status=draft', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);
  const l4 = await request(port, 'GET', '/schemas?project_id=p1', null, 'tkn');
  assert.strictEqual(l4.body.count, 2);

  const u1 = await request(port, 'PUT', '/schemas/ghost', { description: 'X' }, 'tkn');
  assert.strictEqual(u1.status, 404);

  const a1 = await request(port, 'GET', '/schemas', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port, 'GET', '/capabilities', null, 'wrong');
  assert.strictEqual(a2.status, 401);

  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-twin');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: schemas and instances survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port1, 'POST', '/schemas', customerSchema(), 'tkn');
  await request(port1, 'PUT', `/schemas/${c1.body.id}`, { status: 'active' }, 'tkn');
  await request(port1, 'POST', '/instances', {
    schema_name: 'customer', data: { email: 'a@b.com', age: 30, name: 'X', tier: 'gold' }
  }, 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l1 = await request(port2, 'GET', '/schemas', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port2, 'GET', '/instances', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
