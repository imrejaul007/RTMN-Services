'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-rag-')); }

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
function uniquePort() { testCounter += 1; return 29000 + (testCounter * 23) % 1000; }

function simpleKB() {
  return {
    name: 'kb1',
    description: 'A test KB',
    project_id: 'p1',
    user_id: 'alice',
    chunking: { strategy: 'fixed', chunk_size: 256, chunk_overlap: 20 },
    embeddings: { model: 'text-embedding-3-small', dimension: 1536 },
    retrieval: { strategy: 'hybrid', top_k: 3, score_threshold: 0.0, rerank: true },
    generation: { model: 'gpt-4', prompt_template: 'Use: {{context}}', max_tokens: 512 }
  };
}

test('Capabilities: returns valid types', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'GET', '/capabilities', null, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.chunk_strategies.includes('fixed'));
  assert.ok(r.body.chunk_strategies.includes('semantic'));
  assert.ok(r.body.retrieval_strategies.includes('vector'));
  assert.ok(r.body.retrieval_strategies.includes('hybrid'));
  assert.ok(r.body.embedding_models.includes('text-embedding-3-small'));

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD KB: create, read by id+name, update, delete', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/knowledge-bases', simpleKB(), 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('kb_'));
  assert.strictEqual(c1.body.chunking.strategy, 'fixed');
  assert.strictEqual(c1.body.retrieval.top_k, 3);
  const kid = c1.body.id;

  const r1 = await request(port, 'GET', `/knowledge-bases/${kid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  const r2 = await request(port, 'GET', '/knowledge-bases/kb1', null, 'tkn');
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.body.id, kid);

  const u1 = await request(port, 'PUT', `/knowledge-bases/${kid}`, { description: 'Updated' }, 'tkn');
  assert.strictEqual(u1.body.description, 'Updated');
  // Update nested
  const u2 = await request(port, 'PUT', `/knowledge-bases/${kid}`, { retrieval: { top_k: 10 } }, 'tkn');
  assert.strictEqual(u2.body.retrieval.top_k, 10);
  assert.strictEqual(u2.body.retrieval.strategy, 'hybrid'); // preserved

  const d1 = await request(port, 'DELETE', `/knowledge-bases/${kid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const r3 = await request(port, 'GET', `/knowledge-bases/${kid}`, null, 'tkn');
  assert.strictEqual(r3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('KB validation: rejects missing/invalid config', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Missing name
  const e1 = await request(port, 'POST', '/knowledge-bases', { project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  // Missing project_id
  const e2 = await request(port, 'POST', '/knowledge-bases', { name: 'x', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  // Missing user_id
  const e3 = await request(port, 'POST', '/knowledge-bases', { name: 'x', project_id: 'p' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  // Bad chunking strategy
  const e4 = await request(port, 'POST', '/knowledge-bases', {
    name: 'x', project_id: 'p', user_id: 'u',
    chunking: { strategy: 'magic' }
  }, 'tkn');
  assert.strictEqual(e4.status, 400);
  // Chunk size too small
  const e5 = await request(port, 'POST', '/knowledge-bases', {
    name: 'x', project_id: 'p', user_id: 'u',
    chunking: { strategy: 'fixed', chunk_size: 10 }
  }, 'tkn');
  assert.strictEqual(e5.status, 400);
  // Bad embedding model
  const e6 = await request(port, 'POST', '/knowledge-bases', {
    name: 'x', project_id: 'p', user_id: 'u',
    embeddings: { model: 'fake' }
  }, 'tkn');
  assert.strictEqual(e6.status, 400);
  // Bad retrieval strategy
  const e7 = await request(port, 'POST', '/knowledge-bases', {
    name: 'x', project_id: 'p', user_id: 'u',
    retrieval: { strategy: 'cosmic' }
  }, 'tkn');
  assert.strictEqual(e7.status, 400);
  // Bad top_k
  const e8 = await request(port, 'POST', '/knowledge-bases', {
    name: 'x', project_id: 'p', user_id: 'u',
    retrieval: { top_k: 200 }
  }, 'tkn');
  assert.strictEqual(e8.status, 400);

  // Duplicate name
  await request(port, 'POST', '/knowledge-bases', { name: 'dup', project_id: 'p', user_id: 'u' }, 'tkn');
  const e9 = await request(port, 'POST', '/knowledge-bases', { name: 'dup', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e9.status, 409);

  // Update non-existent
  const e10 = await request(port, 'PUT', '/knowledge-bases/kb_ghost', { description: 'X' }, 'tkn');
  assert.strictEqual(e10.status, 404);

  // Delete non-existent
  const e11 = await request(port, 'DELETE', '/knowledge-bases/kb_ghost', null, 'tkn');
  assert.strictEqual(e11.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Documents: add, list, get, delete; KB document count tracks', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/knowledge-bases', simpleKB(), 'tkn');

  // Add doc
  const d1 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, {
    title: 'Doc 1',
    content: 'The capital of France is Paris.',
    source_url: 'https://example.com/doc1',
    metadata: { author: 'Alice' }
  }, 'tkn');
  assert.strictEqual(d1.status, 201);
  assert.ok(d1.body.id.startsWith('doc_'));
  assert.strictEqual(d1.body.chunk_count, 1);
  assert.strictEqual(d1.body.knowledge_base_id, c1.body.id);

  // Add doc 2
  const d2 = await request(port, 'POST', '/knowledge-bases/kb1/documents', {
    title: 'Doc 2',
    content: 'The Eiffel Tower is in Paris.'
  }, 'tkn');
  assert.strictEqual(d2.status, 201);

  // KB document_count should be 2
  const k1 = await request(port, 'GET', `/knowledge-bases/${c1.body.id}`, null, 'tkn');
  assert.strictEqual(k1.body.document_count, 2);

  // List
  const l1 = await request(port, 'GET', `/knowledge-bases/${c1.body.id}/documents`, null, 'tkn');
  assert.strictEqual(l1.body.count, 2);

  // Get
  const g1 = await request(port, 'GET', `/documents/${d1.body.id}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);
  assert.strictEqual(g1.body.title, 'Doc 1');

  // Delete
  const r1 = await request(port, 'DELETE', `/documents/${d1.body.id}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  const k2 = await request(port, 'GET', `/knowledge-bases/${c1.body.id}`, null, 'tkn');
  assert.strictEqual(k2.body.document_count, 1);

  // Delete KB - should also delete remaining docs
  const r2 = await request(port, 'DELETE', `/knowledge-bases/${c1.body.id}`, null, 'tkn');
  assert.strictEqual(r2.status, 200);
  const g2 = await request(port, 'GET', `/documents/${d2.body.id}`, null, 'tkn');
  assert.strictEqual(g2.status, 404);

  // Add doc to non-existent KB
  const e1 = await request(port, 'POST', '/knowledge-bases/kb_ghost/documents', {
    title: 'X', content: 'Y'
  }, 'tkn');
  assert.strictEqual(e1.status, 404);

  // List docs in non-existent KB
  const e2 = await request(port, 'GET', '/knowledge-bases/kb_ghost/documents', null, 'tkn');
  assert.strictEqual(e2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Document validation: rejects missing/empty fields', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/knowledge-bases', simpleKB(), 'tkn');

  const e1 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, { content: 'X' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, { title: 'X' }, 'tkn');
  assert.strictEqual(e2.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Query: returns relevant results with scores', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/knowledge-bases', simpleKB(), 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, {
    title: 'France Capital', content: 'The capital of France is Paris. Paris is beautiful.'
  }, 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, {
    title: 'Eiffel Tower', content: 'The Eiffel Tower is a famous landmark in Paris, France.'
  }, 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, {
    title: 'Tokyo', content: 'Tokyo is the capital of Japan, a bustling metropolis.'
  }, 'tkn');

  // Query
  const q1 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, {
    query: 'What is the capital of France?',
    user_id: 'alice'
  }, 'tkn');
  assert.strictEqual(q1.status, 200);
  assert.ok(q1.body.id.startsWith('q_'));
  assert.ok(q1.body.results.length > 0);
  // Top result should be the France doc
  assert.strictEqual(q1.body.results[0].title, 'France Capital');
  assert.ok(q1.body.results[0].score > 0);
  // France doc should rank higher than Tokyo doc
  const franceScore = q1.body.results.find(r => r.title === 'France Capital').score;
  const tokyoScore = q1.body.results.find(r => r.title === 'Tokyo') ? q1.body.results.find(r => r.title === 'Tokyo').score : 0;
  assert.ok(franceScore > tokyoScore, 'France doc should outrank Tokyo doc');

  // Custom top_k
  const q2 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, {
    query: 'Paris landmark'
  }, 'tkn');
  assert.ok(q2.body.results.length <= 3);

  // Empty query
  const e1 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, { query: '' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, {}, 'tkn');
  assert.strictEqual(e2.status, 400);

  // Query on non-existent KB
  const e3 = await request(port, 'POST', '/knowledge-bases/kb_ghost/query', { query: 'X' }, 'tkn');
  assert.strictEqual(e3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Query history: filter and list', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/knowledge-bases', simpleKB(), 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/documents`, {
    title: 'X', content: 'Y'
  }, 'tkn');

  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, { query: 'Q1', user_id: 'alice' }, 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, { query: 'Q2', user_id: 'alice' }, 'tkn');
  await request(port, 'POST', `/knowledge-bases/${c1.body.id}/query`, { query: 'Q3', user_id: 'bob' }, 'tkn');

  const l1 = await request(port, 'GET', '/queries', null, 'tkn');
  assert.strictEqual(l1.body.count, 3);
  const l2 = await request(port, 'GET', '/queries?user_id=alice', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);
  const l3 = await request(port, 'GET', `/queries?knowledge_base_id=${c1.body.id}`, null, 'tkn');
  assert.strictEqual(l3.body.count, 3);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List KBs: filter, auth, health', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const a = simpleKB(); a.user_id = 'alice';
  const b = simpleKB(); b.name = 'kb2'; b.user_id = 'bob';
  await request(port, 'POST', '/knowledge-bases', a, 'tkn');
  await request(port, 'POST', '/knowledge-bases', b, 'tkn');

  const l1 = await request(port, 'GET', '/knowledge-bases', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);
  const l2 = await request(port, 'GET', '/knowledge-bases?user_id=alice', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port, 'GET', '/knowledge-bases?project_id=p1', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);

  const a1 = await request(port, 'GET', '/knowledge-bases', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port, 'GET', '/capabilities', null, 'wrong');
  assert.strictEqual(a2.status, 401);

  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-rag');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: KBs, docs, queries survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port1, 'POST', '/knowledge-bases', simpleKB(), 'tkn');
  await request(port1, 'POST', `/knowledge-bases/${c1.body.id}/documents`, { title: 'X', content: 'Y' }, 'tkn');
  await request(port1, 'POST', `/knowledge-bases/${c1.body.id}/query`, { query: 'find' }, 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l1 = await request(port2, 'GET', '/knowledge-bases', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port2, 'GET', `/knowledge-bases/${c1.body.id}/documents`, null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port2, 'GET', '/queries', null, 'tkn');
  assert.strictEqual(l3.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
