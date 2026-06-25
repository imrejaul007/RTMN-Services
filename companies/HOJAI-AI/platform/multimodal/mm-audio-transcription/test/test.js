/**
 * mm-audio-transcription — Tests
 * Run: node --test --test-force-exit --test-concurrency=1 test/test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const PORT = parseInt(process.env.PORT || '5370', 10);
const HOST = 'localhost';
const TOKEN = 'mm-audio-transcription-internal-token';

// Real WAV header (44-byte header + 100 bytes of silence)
const WAV_HEADER = Buffer.alloc(44);
WAV_HEADER.write('RIFF', 0); WAV_HEADER.writeUInt32LE(144, 4);
WAV_HEADER.write('WAVE', 8); WAV_HEADER.write('fmt ', 12);
WAV_HEADER.writeUInt32LE(16, 16); WAV_HEADER.writeUInt16LE(1, 20);
WAV_HEADER.writeUInt16LE(1, 22); WAV_HEADER.writeUInt32LE(16000, 24);
WAV_HEADER.writeUInt32LE(32000, 28); WAV_HEADER.writeUInt16LE(2, 32);
WAV_HEADER.writeUInt16LE(16, 34); WAV_HEADER.write('data', 36);
WAV_HEADER.writeUInt32LE(100, 40);
WAV_HEADER.writeUInt32LE(36 + 100, 4);
WAV_HEADER.writeUInt32LE(100, 40);
const WAV_BASE64 = Buffer.concat([WAV_HEADER, Buffer.alloc(100)]).toString('base64');

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
  process.env.DATA_DIR = `/tmp/mm-audio-transcription-test-${PORT}`;
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

test('GET /languages', async () => {
  const r = await req('GET', '/languages');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.languages));
  assert.ok(r.data.languages.length > 0);
});

test('GET /models', async () => {
  const r = await req('GET', '/models');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(Array.isArray(r.data.models));
});

test('POST /transcribe — stub mode', async () => {
  const r = await req('POST', '/transcribe', { data: WAV_BASE64, language: 'en' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.text === 'string');
  assert.ok(typeof r.data.id === 'string');
});

test('POST /transcribe — without language', async () => {
  const r = await req('POST', '/transcribe', { data: WAV_BASE64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
});

test('POST /transcribe — missing auth → 401', async () => {
  const r = await req('POST', '/transcribe', { data: WAV_BASE64 }, null);
  assert.strictEqual(r.status, 401, JSON.stringify(r.data));
});

test('POST /transcribe — missing audio → 400', async () => {
  const r = await req('POST', '/transcribe', {});
  assert.strictEqual(r.status, 400, JSON.stringify(r.data));
});

test('POST /language/detect — language detection', async () => {
  const r = await req('POST', '/language/detect', { data: WAV_BASE64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.language === 'string');
});

test('POST /speakers/count — speaker count estimation', async () => {
  const r = await req('POST', '/speakers/count', { data: WAV_BASE64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(typeof r.data.result.count === 'number');
});

test('POST /speakers/diarize — speaker diarization', async () => {
  const r = await req('POST', '/speakers/diarize', { data: WAV_BASE64 });
  assert.strictEqual(r.status, 201, JSON.stringify(r.data));
  assert.ok(r.data.result);
  assert.ok(Array.isArray(r.data.result.segments));
});

test('POST /transcribe/batch — batch transcription', async () => {
  const r = await req('POST', '/transcribe/batch', {
    items: [{ data: WAV_BASE64, language: 'en' }, { data: WAV_BASE64 }],
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
  const r = await req('GET', '/jobs/at_nonexistent');
  assert.strictEqual(r.status, 404, JSON.stringify(r.data));
});

test('Error handler — throws → JSON (not HTML)', async () => {
  const r = await req('POST', '/transcribe', { data: '!!!' });
  assert.ok(!JSON.stringify(r.data).startsWith('<'), 'should be JSON, not HTML: ' + JSON.stringify(r.data));
});
