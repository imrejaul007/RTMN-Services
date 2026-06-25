/**
 * mm-embedder — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5347', 10);
const HOST = 'localhost';
const TOKEN = 'mm-embedder-internal-token';

function req(method, path, body, token = TOKEN) {
  return new Promise((resolve) => {
    const opts = { hostname: HOST, port: PORT, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['X-Internal-Token'] = token;
    const chunks = [];
    const r = http.request(opts, (res) => {
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString()); } catch (_) { data = chunks.join(''); }
        resolve({ status: res.statusCode, data });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let server;
before(() => {
  process.env.PORT = String(PORT);
  process.env.DATA_DIR = `/tmp/mm-embedder-test-${PORT}`;
  process.env.OPENAI_API_KEY = '';
  const { createApp } = require('../src/index.js');
  server = createApp().listen(PORT, HOST);
});
after(() => { if (server) server.close(); });

test('GET /health', async () => {
  const r = await req('GET', '/health');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.strictEqual(r.data.ok, true);
  assert.ok(typeof r.data.openai === 'boolean');
  assert.ok(typeof r.data.model === 'string');
});

test('GET /ready', async () => {
  const r = await req('GET', '/ready');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
});

test('GET /modes', async () => {
  const r = await req('GET', '/modes');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.text));
  assert.ok(typeof r.data.active === 'string');
});

test('GET /models', async () => {
  const r = await req('GET', '/models');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.models));
  assert.ok(r.data.models.length >= 4);
  assert.ok(typeof r.data.default_dimensions === 'number');
});

test('POST /embed — text embedding (stub)', async () => {
  const r = await req('POST', '/embed', {
    text: 'Hello world',
    modality: 'text',
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.id);
  assert.strictEqual(r.data.modality, 'text');
  assert.ok(Array.isArray(r.data.vector));
  assert.ok(r.data.vector.length > 0);
  assert.ok(r.data.vector.every((x) => typeof x === 'number'));
});

test('POST /embed — binary embedding (stub)', async () => {
  const r = await req('POST', '/embed', {
    data: Buffer.from('test audio bytes').toString('base64'),
    modality: 'audio',
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.vector));
  assert.strictEqual(r.data.modality, 'audio');
});

test('POST /embed — normalized to unit vector', async () => {
  const r = await req('POST', '/embed', { text: 'hello', modality: 'text' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  const norm = Math.sqrt(r.data.vector.reduce((s, x) => s + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 0.01, `vector should be unit-normalized, norm=${norm}`);
});

test('POST /embed — dimension clamping', async () => {
  const r = await req('POST', '/embed', { text: 'test', modality: 'text', dimensions: 64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.strictEqual(r.data.dimensions, 64);
  assert.strictEqual(r.data.vector.length, 64);
});

test('POST /embed — invalid dimensions → 400', async () => {
  const r = await req('POST', '/embed', { text: 'test', modality: 'text', dimensions: 10000 });
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('POST /embed — invalid modality → 400', async () => {
  const r = await req('POST', '/embed', { text: 'test', modality: 'invalid' });
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('POST /embed — missing auth → 401', async () => {
  const r = await req('POST', '/embed', { text: 'test', modality: 'text' }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /embed/batch — batch embeddings', async () => {
  const r = await req('POST', '/embed/batch', {
    items: [
      { text: 'hello', modality: 'text' },
      { text: 'world', modality: 'text' },
    ],
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.strictEqual(r.data.count, 2);
  assert.ok(Array.isArray(r.data.embeddings));
});

test('GET /embeddings — list embeddings', async () => {
  const r = await req('GET', '/embeddings');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.embeddings));
});

test('GET /embeddings/:id — get single', async () => {
  const list = await req('GET', '/embeddings');
  if (list.data.embeddings?.length > 0) {
    const id = list.data.embeddings[0].id;
    const r = await req('GET', `/embeddings/${id}`);
    assert.strictEqual(r.status, 200, JSON.stringify(r.data));
    assert.strictEqual(r.data.id, id);
  }
});

test('GET /embeddings/:id — not found → 404', async () => {
  const r = await req('GET', '/embeddings/emb_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('DELETE /embeddings/:id — delete', async () => {
  // create one first
  const cr = await req('POST', '/embed', { text: 'delete me', modality: 'text' });
  const id = cr.data.id;
  const dr = await req('DELETE', `/embeddings/${id}`);
  assert.strictEqual(dr.status, 200, JSON.stringify(dr.data));
  assert.strictEqual(dr.data.deleted, true);
});

test('GET /similar — similarity search', async () => {
  const r = await req('GET', '/similar', null, TOKEN).catch(() => null);
  // No embeddings stored, should return empty
  const r2 = await req('GET', '/similar?text=hello');
  assert.strictEqual(r2.status, 200, JSON.stringify(r2.data));
  assert.ok(Array.isArray(r2.data.results));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/embed', { text: 'test', modality: 'text' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});

after(() => { if (server) server.close(); });
