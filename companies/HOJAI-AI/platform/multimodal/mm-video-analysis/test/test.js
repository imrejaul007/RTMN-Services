/**
 * mm-video-analysis — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5353', 10);
const HOST = 'localhost';
const TOKEN = 'mm-video-analysis-internal-token';
// Minimal 1x1 PNG as stub video proxy
const STUB_VIDEO_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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
  process.env.DATA_DIR = `/tmp/mm-video-analysis-test-${PORT}`;
  const { createApp } = require('../src/index.js');
  server = createApp().listen(PORT, HOST);
});

test('GET /health', async () => {
  const r = await req('GET', '/health');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.strictEqual(r.data.ok, true);
});

test('GET /ready', async () => {
  const r = await req('GET', '/ready');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(typeof r.data.ffmpeg_available === 'boolean');
  assert.ok(typeof r.data.mode === 'string');
});

test('GET /modes', async () => {
  const r = await req('GET', '/modes');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(typeof r.data.scenes === 'object');
  assert.ok(typeof r.data.active === 'string');
});

test('POST /scenes — stub mode (no FFmpeg)', async () => {
  const r = await req('POST', '/scenes', {
    data: STUB_VIDEO_B64,
    duration_seconds: 30,
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.scene_count === 'number');
  assert.ok(Array.isArray(r.data.result.scenes));
  assert.ok(typeof r.data.id === 'string');
});

test('POST /actions — stub action classification', async () => {
  const r = await req('POST', '/actions', { data: STUB_VIDEO_B64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.action === 'string');
  assert.ok(typeof r.data.result.confidence === 'number');
});

test('POST /shots — stub shot detection', async () => {
  const r = await req('POST', '/shots', {
    data: STUB_VIDEO_B64,
    duration_seconds: 30,
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.shot_count === 'number');
  assert.ok(Array.isArray(r.data.result.shots));
});

test('POST /keyframes — stub keyframe extraction', async () => {
  const r = await req('POST', '/keyframes', {
    data: STUB_VIDEO_B64,
    duration_seconds: 30,
    count: 5,
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.frame_count === 'number');
  assert.ok(Array.isArray(r.data.result.frames));
});

test('POST /summarize — full summary', async () => {
  const r = await req('POST', '/summarize', {
    data: STUB_VIDEO_B64,
    duration_seconds: 30,
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.scenes === 'object');
  assert.ok(typeof r.data.result.shots === 'object');
  assert.ok(typeof r.data.result.keyframes === 'object');
  assert.ok(typeof r.data.result.action === 'object');
  assert.ok(typeof r.data.result.summary_text === 'string');
});

test('POST /scenes — missing auth → 401', async () => {
  const r = await req('POST', '/scenes', { data: STUB_VIDEO_B64, duration_seconds: 10 }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /scenes — missing data → 400', async () => {
  const r = await req('POST', '/scenes', { duration_seconds: 10 });
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('GET /jobs — list jobs', async () => {
  const r = await req('GET', '/jobs');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.jobs));
});

after(() => { if (server) server.close(); });

test('GET /jobs/:id — not found → 404', async () => {
  const r = await req('GET', '/jobs/va_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/scenes', { data: '!!!' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});

after(() => { if (server) server.close(); });
