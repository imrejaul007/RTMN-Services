'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-playground-'));
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
      hostname: '127.0.0.1', port, method, path: p,
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
        } catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCounter = 0;
function uniquePort() { testCounter += 1; return 25000 + (testCounter * 11) % 1000; }

test('Models endpoint returns the full list', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'GET', '/models', null, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.count >= 10);
  assert.ok(Array.isArray(r.body.models));
  assert.ok(r.body.models.includes('gpt-4'));
  assert.ok(r.body.models.includes('claude-opus-4'));
  assert.ok(r.body.models.includes('llama-70b'));

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execute a prompt: returns completion with usage and latency', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/runs', {
    prompt: 'What is the capital of France?',
    model: 'gpt-4',
    user_id: 'alice',
    project_id: 'proj_1'
  }, 'tkn');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id.startsWith('run_'));
  assert.strictEqual(r.body.model, 'gpt-4');
  assert.strictEqual(r.body.user_id, 'alice');
  assert.strictEqual(r.body.project_id, 'proj_1');
  assert.ok(r.body.response);
  assert.ok(r.body.response.text);
  assert.ok(r.body.response.usage);
  assert.ok(r.body.response.usage.total_tokens > 0);
  assert.ok(r.body.response.latency_ms >= 0);
  assert.strictEqual(r.body.favorited, false);
  assert.deepStrictEqual(r.body.tags, []);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: rejects missing/invalid fields on run', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Missing prompt
  const e1 = await request(port, 'POST', '/runs', { model: 'gpt-4' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  assert.match(e1.body.message, /prompt/);

  // Missing model
  const e2 = await request(port, 'POST', '/runs', { prompt: 'Hi' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  assert.match(e2.body.message, /model/);

  // Invalid model
  const e3 = await request(port, 'POST', '/runs', { prompt: 'Hi', model: 'gpt-99' }, 'tkn');
  assert.strictEqual(e3.status, 400);

  // Invalid temperature
  const e4 = await request(port, 'POST', '/runs', { prompt: 'Hi', model: 'gpt-4', temperature: 5 }, 'tkn');
  assert.strictEqual(e4.status, 400);

  // Invalid max_tokens
  const e5 = await request(port, 'POST', '/runs', { prompt: 'Hi', model: 'gpt-4', max_tokens: 0 }, 'tkn');
  assert.strictEqual(e5.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Compare: runs prompt across multiple models', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/runs/compare', {
    prompt: 'Write a haiku',
    models: ['gpt-4', 'claude-opus-4', 'llama-70b'],
    user_id: 'alice'
  }, 'tkn');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.type, 'compare');
  assert.strictEqual(r.body.completions.length, 3);
  assert.strictEqual(r.body.completions[0].model, 'gpt-4');
  assert.strictEqual(r.body.completions[1].model, 'claude-opus-4');
  assert.strictEqual(r.body.completions[2].model, 'llama-70b');

  // Compare validation
  const e1 = await request(port, 'POST', '/runs/compare', { prompt: 'x', models: [] }, 'tkn');
  assert.strictEqual(e1.status, 400);

  const e2 = await request(port, 'POST', '/runs/compare', { prompt: 'x', models: ['gpt-4', 'gpt-4', 'gpt-4', 'gpt-4', 'gpt-4', 'gpt-4'] }, 'tkn');
  assert.strictEqual(e2.status, 400);

  const e3 = await request(port, 'POST', '/runs/compare', { prompt: 'x', models: ['bad-model'] }, 'tkn');
  assert.strictEqual(e3.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List runs: filter by project_id, user_id, model, favorited', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  await request(port, 'POST', '/runs', { prompt: 'A1', model: 'gpt-4', user_id: 'alice', project_id: 'p1' }, 'tkn');
  await request(port, 'POST', '/runs', { prompt: 'A2', model: 'claude-opus-4', user_id: 'alice', project_id: 'p1' }, 'tkn');
  const r3 = await request(port, 'POST', '/runs', { prompt: 'B1', model: 'gpt-4', user_id: 'bob', project_id: 'p2' }, 'tkn');
  await request(port, 'POST', `/runs/${r3.body.id}/favorite`, {}, 'tkn');

  // Filter by user
  const l1 = await request(port, 'GET', '/runs?user_id=alice', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);

  // Filter by project
  const l2 = await request(port, 'GET', '/runs?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);

  // Filter by model
  const l3 = await request(port, 'GET', '/runs?model=gpt-4', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);

  // Filter by favorited
  const l4 = await request(port, 'GET', '/runs?favorited=true', null, 'tkn');
  assert.strictEqual(l4.body.count, 1);
  assert.strictEqual(l4.body.runs[0].id, r3.body.id);

  // Combined
  const l5 = await request(port, 'GET', '/runs?user_id=alice&model=gpt-4', null, 'tkn');
  assert.strictEqual(l5.body.count, 1);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Favorite / unfavorite / tag a run', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/runs', { prompt: 'X', model: 'gpt-4' }, 'tkn');
  const rid = r.body.id;

  // Favorite
  const f1 = await request(port, 'POST', `/runs/${rid}/favorite`, {}, 'tkn');
  assert.strictEqual(f1.body.favorited, true);
  assert.ok(f1.body.favorited_at);

  // Tag
  const t1 = await request(port, 'POST', `/runs/${rid}/tags`, { tag: 'good' }, 'tkn');
  assert.deepStrictEqual(t1.body.tags, ['good']);

  // Tag again (idempotent)
  const t2 = await request(port, 'POST', `/runs/${rid}/tags`, { tag: 'good' }, 'tkn');
  assert.strictEqual(t2.body.tags.length, 1);

  // Add another tag
  const t3 = await request(port, 'POST', `/runs/${rid}/tags`, { tag: 'reviewed' }, 'tkn');
  assert.strictEqual(t3.body.tags.length, 2);

  // Tag missing field
  const t4 = await request(port, 'POST', `/runs/${rid}/tags`, {}, 'tkn');
  assert.strictEqual(t4.status, 400);

  // Unfavorite
  const u1 = await request(port, 'DELETE', `/runs/${rid}/favorite`, null, 'tkn');
  assert.strictEqual(u1.body.favorited, false);
  assert.ok(!u1.body.favorited_at);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete a run; 404 on missing', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'POST', '/runs', { prompt: 'X', model: 'gpt-4' }, 'tkn');
  const d1 = await request(port, 'DELETE', `/runs/${r.body.id}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  assert.strictEqual(d1.body.deleted, true);

  const d2 = await request(port, 'DELETE', `/runs/${r.body.id}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  const g1 = await request(port, 'GET', `/runs/${r.body.id}`, null, 'tkn');
  assert.strictEqual(g1.status, 404);

  // Favorite a non-existent run
  const f1 = await request(port, 'POST', '/runs/run_ghost/favorite', {}, 'tkn');
  assert.strictEqual(f1.status, 404);

  // Tag a non-existent run
  const tg1 = await request(port, 'POST', '/runs/run_ghost/tags', { tag: 'x' }, 'tkn');
  assert.strictEqual(tg1.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Prompt library: CRUD + versioning', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Create
  const c1 = await request(port, 'POST', '/prompts', {
    name: 'Summarize',
    content: 'Summarize the following: {{text}}',
    description: 'A summarize template',
    project_id: 'p1',
    user_id: 'alice',
    tags: ['template'],
    variables: ['text']
  }, 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('pmt_'));
  assert.strictEqual(c1.body.version, 1);
  const pid = c1.body.id;

  // Read
  const r1 = await request(port, 'GET', `/prompts/${pid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.name, 'Summarize');

  // Update (bumps version)
  const u1 = await request(port, 'PUT', `/prompts/${pid}`, { content: 'New: {{text}}' }, 'tkn');
  assert.strictEqual(u1.body.version, 2);
  assert.strictEqual(u1.body.content, 'New: {{text}}');

  // List
  const l1 = await request(port, 'GET', '/prompts', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);

  // Filter
  const l2 = await request(port, 'GET', '/prompts?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port, 'GET', '/prompts?user_id=alice', null, 'tkn');
  assert.strictEqual(l3.body.count, 1);

  // Delete
  const d1 = await request(port, 'DELETE', `/prompts/${pid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/prompts/${pid}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  // Get non-existent
  const g1 = await request(port, 'GET', '/prompts/pmt_ghost', null, 'tkn');
  assert.strictEqual(g1.status, 404);

  // Put non-existent
  const pu1 = await request(port, 'PUT', '/prompts/pmt_ghost', { name: 'X' }, 'tkn');
  assert.strictEqual(pu1.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Prompt library: validation rejects missing fields', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const e1 = await request(port, 'POST', '/prompts', { content: 'x' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/prompts', { name: 'X' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  const e3 = await request(port, 'POST', '/prompts', { name: 'X', content: 'y', tags: 'notarray' }, 'tkn');
  assert.strictEqual(e3.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth: rejects requests without token', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'secret' });

  const r1 = await request(port, 'GET', '/runs', null, null);
  assert.strictEqual(r1.status, 401);
  const r2 = await request(port, 'GET', '/models', null, 'wrong');
  assert.strictEqual(r2.status, 401);

  // Health is open
  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: runs and prompts survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  await request(port1, 'POST', '/runs', { prompt: 'Persist', model: 'gpt-4' }, 'tkn');
  await request(port1, 'POST', '/prompts', { name: 'P', content: 'C' }, 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l1 = await request(port2, 'GET', '/runs', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port2, 'GET', '/prompts', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
