/**
 * mm-image-understanding — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5351', 10);
const HOST = 'localhost';
const BASE = `http://${HOST}:${PORT}`;
const TOKEN = 'mm-image-understanding-internal-token';
const IMG_1X1_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

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
  process.env.DATA_DIR = `/tmp/mm-image-understanding-test-${PORT}`;
  process.env.OPENAI_API_KEY = '';
  const { createApp } = require('../src/index.js');
  server = createApp().listen(PORT, HOST);
});
after(() => { if (server) server.close(); });

test('GET /health', async () => {
  const r = await req('GET', '/health');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.strictEqual(r.data.ok, true);
});

test('GET /ready', async () => {
  const r = await req('GET', '/ready');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
});

test('GET /modes', async () => {
  const r = await req('GET', '/modes');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(typeof r.data.stub === 'boolean');
  assert.ok(typeof r.data.has_api_key === 'boolean');
});

test('POST /detect/objects — stub mode', async () => {
  const r = await req('POST', '/detect/objects', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(Array.isArray(r.data.result.detections));
  assert.ok(typeof r.data.id === 'string');
});

test('POST /classify/scene — stub mode', async () => {
  const r = await req('POST', '/classify/scene', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.label === 'string');
});

test('POST /caption — stub mode', async () => {
  const r = await req('POST', '/caption', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.caption === 'string');
});

test('POST /colors/dominant — stub always works', async () => {
  const r = await req('POST', '/colors/dominant', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.result?.colors));
});

test('POST /understand — all-in-one', async () => {
  const r = await req('POST', '/understand', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
});

test('POST /detect/objects — missing auth → 401', async () => {
  const r = await req('POST', '/detect/objects', { data: IMG_1X1_PNG }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /detect/objects — missing data → 400', async () => {
  const r = await req('POST', '/detect/objects', {});
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('GET /jobs — list jobs', async () => {
  const r = await req('GET', '/jobs');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.jobs));
});

test('GET /jobs/:id — not found → 404', async () => {
  const r = await req('GET', '/jobs/iu_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/detect/objects', { data: '!!!' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});
