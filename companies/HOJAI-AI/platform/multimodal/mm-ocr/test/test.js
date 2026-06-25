/**
 * mm-ocr — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5372', 10);
const HOST = 'localhost';
const TOKEN = 'mm-ocr-internal-token';
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
  process.env.DATA_DIR = `/tmp/mm-ocr-test-${PORT}`;
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
});

test('GET /languages', async () => {
  const r = await req('GET', '/languages');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.languages));
});

test('POST /ocr — stub mode', async () => {
  const r = await req('POST', '/ocr', { data: IMG_1X1_PNG, language: 'en' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.text);
  assert.ok(typeof r.data.id === 'string');
});

test('POST /ocr — returns text', async () => {
  const r = await req('POST', '/ocr', { data: IMG_1X1_PNG });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.text);
  assert.ok(typeof r.data.confidence === 'number');
});

test('POST /ocr — missing auth → 401', async () => {
  const r = await req('POST', '/ocr', { data: IMG_1X1_PNG }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /ocr — missing image → 400', async () => {
  const r = await req('POST', '/ocr', {});
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('POST /ocr — handles any base64 gracefully', async () => {
  const r = await req('POST', '/ocr', { data: '!!!not-valid-base64' });
  // stub mode accepts any input
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
});

test('POST /ocr/batch — batch OCR', async () => {
  const r = await req('POST', '/ocr/batch', {
    items: [{ data: IMG_1X1_PNG, language: 'en' }, { data: IMG_1X1_PNG }],
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.jobs));
});

test('GET /jobs — list jobs', async () => {
  const r = await req('GET', '/jobs');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.jobs));
});

test('GET /jobs/:id — not found → 404', async () => {
  const r = await req('GET', '/jobs/ocr_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/ocr', { data: '!!!' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});
