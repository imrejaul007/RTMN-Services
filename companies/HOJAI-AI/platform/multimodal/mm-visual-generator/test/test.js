/**
 * mm-visual-generator — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5373', 10);
const HOST = 'localhost';
const TOKEN = 'mm-visual-generator-internal-token';

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
  process.env.DATA_DIR = `/tmp/mm-visual-generator-test-${PORT}`;
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

test('GET /styles — list styles', async () => {
  const r = await req('GET', '/styles');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.styles));
  assert.ok(r.data.styles.length >= 10);
});

test('GET /templates — list templates', async () => {
  const r = await req('GET', '/templates');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.templates));
});

test('GET /layouts — list layouts', async () => {
  const r = await req('GET', '/layouts');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.layouts));
});

test('GET /models', async () => {
  const r = await req('GET', '/models');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.models));
});

test('POST /prompt — stub image generation', async () => {
  const r = await req('POST', '/prompt', { text: 'A beautiful sunset', style: 'realistic' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(typeof r.data.result.prompt === 'string');
  assert.ok(typeof r.data.id === 'string');
});

test('POST /render — returns SVG', async () => {
  const r = await req('POST', '/render', { prompt: { prompt: 'A cat', style: 'cartoon' } });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(typeof r.data.result.svg === 'string');
  assert.ok(r.data.result.svg.includes('<svg'), 'should be valid SVG');
});

test('POST /render/svg — valid SVG output', async () => {
  const r = await req('POST', '/render/svg', { prompt: { prompt: 'ocean waves', style: 'watercolor' } });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result.svg.includes('<svg'), 'should be valid SVG: ' + r.data.result.svg.slice(0, 100));
});

test('POST /layout — layout suggestion', async () => {
  const r = await req('POST', '/layout', { text: 'Introduction to AI with 10 concepts' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.result.layouts));
  assert.ok(r.data.result.layouts.length > 0);
});

test('POST /palette — color palette generation', async () => {
  const r = await req('POST', '/palette', { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.result.colors));
});

test('POST /prompt — style presets work', async () => {
  const styles = ['realistic', 'cartoon', 'watercolor', 'abstract', 'sketch'];
  for (const style of styles) {
    const r = await req('POST', '/prompt', { text: 'a tree', style });
    assert.strictEqual(r.status, 201, `${style}: ${JSON.stringify(r.data)}`);
  }
});

test('POST /prompt — missing auth → 401', async () => {
  const r = await req('POST', '/prompt', { prompt: 'a tree' }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /prompt — missing prompt → 400', async () => {
  const r = await req('POST', '/prompt', { style: 'cartoon' });
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('GET /jobs — list jobs', async () => {
  const r = await req('GET', '/jobs');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.jobs));
});

test('GET /jobs/:id — not found → 404', async () => {
  const r = await req('GET', '/jobs/vg_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/render', { prompt: 'test' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});
