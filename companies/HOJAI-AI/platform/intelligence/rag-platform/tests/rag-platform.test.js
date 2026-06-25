'use strict';

process.env.RAG_PLATFORM_NO_LISTEN = '1';
process.env.RAG_PLATFORM_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

// Clear module cache so env vars take effect
Object.keys(require.cache).forEach(function(k) {
  if (k.includes('rag-platform')) delete require.cache[k];
});

var exported = require('../src/index.js');
var app = exported.app;
var chunkText = exported.chunkText;
var splitSentences = exported.splitSentences;
var buildContext = exported.buildContext;
var buildUserPrompt = exported.buildUserPrompt;

var server;
var baseUrl;

// Helper: HTTP request
function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    var url = new URL(baseUrl + path);
    var opts = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    var r = http.request(opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var raw = Buffer.concat(chunks).toString('utf8');
        var parsed;
        try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

// ============================================================
// Tests
// ============================================================

test('exports', function() {
  assert.equal(typeof app, 'function', 'app is function');
  assert.equal(typeof chunkText, 'function', 'chunkText is function');
  assert.equal(typeof splitSentences, 'function', 'splitSentences is function');
  assert.equal(typeof buildContext, 'function', 'buildContext is function');
  assert.equal(typeof buildUserPrompt, 'function', 'buildUserPrompt is function');
  assert.equal(exported.PORT, 4781, 'PORT is 4781');
  assert.equal(exported.SERVICE_NAME, 'rag-platform', 'SERVICE_NAME is rag-platform');
  assert.equal(exported.VERSION, '1.0.0', 'VERSION is 1.0.0');
  assert.equal(typeof exported.REQUIRE_AUTH, 'boolean', 'REQUIRE_AUTH is boolean');
  assert.equal(exported.REQUIRE_AUTH, false, 'REQUIRE_AUTH is false (bypassed in test)');
});

test('splitSentences', function() {
  var out = splitSentences('Hello world. How are you? Fine!');
  assert.equal(out.length, 3, 'splits into 3 sentences');
  assert.equal(out[0], 'Hello world.', 'first sentence');
  assert.equal(out[1], 'How are you?', 'second sentence');
  assert.equal(out[2], 'Fine!', 'third sentence');
});

test('splitSentences handles abbreviations', function() {
  var out = splitSentences('Dr. Smith visited Mr. Jones. It was great.');
  assert.equal(out.length, 2, 'protects abbreviations');
});

test('splitSentences handles newlines', function() {
  var out = splitSentences('Line one.\nLine two.\nLine three.');
  assert.ok(out.length >= 2, 'splits on newlines');
});

test('chunkText returns single chunk for short text', function() {
  var chunks = chunkText('Hello world.', 500, 50);
  assert.equal(chunks.length, 1, 'single chunk for short text');
  assert.equal(chunks[0].text, 'Hello world.');
  assert.equal(chunks[0].chunkIndex, 0);
});

test('chunkText splits long text', function() {
  var text = 'The quick brown fox. '.repeat(50);
  var chunks = chunkText(text, 100, 10);
  assert.ok(chunks.length > 1, 'multiple chunks for long text');
  assert.ok(chunks[0].text.length <= 100, 'first chunk within size');
});

test('chunkText respects overlap', function() {
  var text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
  var chunks = chunkText(text, 30, 10);
  assert.ok(chunks.length > 1, 'respects chunkSize');
});

test('chunkText rejects invalid params', function() {
  assert.throws(function() { chunkText('text', 0, 0); }, /chunkSize must be > 0/);
  assert.throws(function() { chunkText('text', 100, 100); }, /chunkOverlap must be/);
  assert.throws(function() { chunkText('text', 100, -1); }, /chunkOverlap must be/);
});

test('buildContext assembles citations', function() {
  var matches = [
    { document: 'hello world from doc-1' },
    { document: 'another document text' }
  ];
  var ctx = buildContext(matches);
  assert.ok(ctx.includes('Source 1'), 'has Source 1');
  assert.ok(ctx.includes('Source 2'), 'has Source 2');
  assert.ok(ctx.includes('doc-1'), 'includes doc-1');
});

test('buildContext handles empty matches', function() {
  var ctx = buildContext([]);
  assert.equal(ctx, '', 'empty for no matches');
});

test('buildContext handles missing document', function() {
  var ctx = buildContext([{}]);
  assert.ok(ctx.includes('[no document text]'), 'falls back to placeholder');
});

test('buildUserPrompt embeds query and context', function() {
  var prompt = buildUserPrompt('What is X?', 'Context: X is foo.');
  assert.ok(prompt.includes('What is X'), 'includes query');
  assert.ok(prompt.includes('Context: X is foo'), 'includes context');
  assert.ok(prompt.includes('Question:'), 'has Question: label');
});

test('determineConfidence helper', function() {
  assert.equal(exported.determineConfidence(0.9), 'high');
  assert.equal(exported.determineConfidence(0.5), 'high');
  assert.equal(exported.determineConfidence(0.3), 'medium');
  assert.equal(exported.determineConfidence(0.1), 'low');
  assert.equal(exported.determineConfidence(null), 'low');
  assert.equal(exported.determineConfidence(undefined), 'low');
});

test('defaultSystemPrompt helper', function() {
  var p = exported.defaultSystemPrompt();
  assert.ok(p.includes('HOJAI AI'), 'mentions HOJAI AI');
});

test('setup - starts server on port 0', async function() {
  server = http.createServer(app);
  await new Promise(function(resolve) { server.listen(0, resolve); });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  assert.ok(server.address().port > 0, 'server on non-zero port');
});

test('GET /ready returns 200', async function() {
  var res = await req('GET', '/ready');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.ready, true, 'ready true');
  assert.ok(res.body.timestamp, 'has timestamp');
});

test('GET /api/health returns 200', async function() {
  var res = await req('GET', '/api/health');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.service, 'rag-platform', 'service name');
  assert.ok(res.body.version, 'has version');
  assert.ok(typeof res.body.documents === 'number', 'has documents count');
});

test('GET /api/config returns defaults', async function() {
  var res = await req('GET', '/api/config');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.defaultChunkSize, 500, 'defaultChunkSize');
  assert.equal(res.body.defaultChunkOverlap, 50, 'defaultChunkOverlap');
  assert.equal(res.body.defaultModel, 'gpt-4o-mini', 'defaultModel');
});

test('POST /api/config updates chunkSize', async function() {
  var res = await req('POST', '/api/config', { defaultChunkSize: 300 });
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.config.defaultChunkSize, 300, 'updated chunkSize');
});

test('POST /api/config validates chunkSize range', async function() {
  var res = await req('POST', '/api/config', { defaultChunkSize: 0 });
  assert.equal(res.status, 400, 'rejects zero chunkSize');
  assert.ok(res.body.code === 'INVALID_CHUNK_SIZE');

  var res2 = await req('POST', '/api/config', { defaultChunkSize: 60000 });
  assert.equal(res2.status, 400, 'rejects too-large chunkSize');
});

test('POST /api/config validates temperature range', async function() {
  var res = await req('POST', '/api/config', { defaultTemperature: -0.5 });
  assert.equal(res.status, 400, 'rejects negative temp');
  var res2 = await req('POST', '/api/config', { defaultTemperature: 3 });
  assert.equal(res2.status, 400, 'rejects temp > 2');
});

test('POST /api/config validates URL fields', async function() {
  var res = await req('POST', '/api/config', { vectorDbUrl: 'not-a-url' });
  assert.equal(res.status, 400, 'rejects invalid vectorDbUrl');
  var res2 = await req('POST', '/api/config', { inferenceUrl: 'not-a-url' });
  assert.equal(res2.status, 400, 'rejects invalid inferenceUrl');
});

test('GET /api/stats returns stats object', async function() {
  var res = await req('GET', '/api/stats');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(typeof res.body.documentsIngested === 'number', 'has documentsIngested');
  assert.ok(typeof res.body.totalChunksCreated === 'number', 'has totalChunksCreated');
});

test('GET /api/audit returns audit log', async function() {
  var res = await req('GET', '/api/audit');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(Array.isArray(res.body.entries), 'has entries array');
  assert.ok(typeof res.body.count === 'number', 'has count');
});

test('GET /api/audit supports action filter', async function() {
  var res = await req('GET', '/api/audit?action=nonexistent');
  assert.equal(res.status, 200, 'status 200');
});

test('POST /api/documents rejects missing collection', async function() {
  var res = await req('POST', '/api/documents', { content: 'hello' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'COLLECTION_REQUIRED');
});

test('POST /api/documents rejects missing content', async function() {
  var res = await req('POST', '/api/documents', { collection: 'c1' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'CONTENT_REQUIRED');
});

test('POST /api/documents rejects empty content', async function() {
  var res = await req('POST', '/api/documents', { collection: 'c1', content: '' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/documents rejects invalid chunkSize', async function() {
  var res = await req('POST', '/api/documents', { collection: 'c1', content: 'hello world', chunkSize: 60000 });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'INVALID_CHUNK_SIZE');
});

test('POST /api/documents rejects invalid chunkOverlap', async function() {
  var res = await req('POST', '/api/documents', { collection: 'c1', content: 'hello world', chunkSize: 100, chunkOverlap: 100 });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'INVALID_CHUNK_OVERLAP');
});

test('GET /api/documents returns empty list initially', async function() {
  var res = await req('GET', '/api/documents');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.count, 0, 'count is 0');
  assert.deepEqual(res.body.documents, [], 'documents empty');
});

test('GET /api/documents/:id returns 404 for unknown doc', async function() {
  var res = await req('GET', '/api/documents/unknown-id-12345');
  assert.equal(res.status, 404, 'status 404');
  assert.equal(res.body.code, 'DOCUMENT_NOT_FOUND');
});

test('POST /api/retrieve rejects missing collection', async function() {
  var res = await req('POST', '/api/retrieve', { query: 'hello' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'COLLECTION_REQUIRED');
});

test('POST /api/retrieve rejects missing query', async function() {
  var res = await req('POST', '/api/retrieve', { collection: 'c1' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'QUERY_REQUIRED');
});

test('POST /api/retrieve rejects empty query', async function() {
  var res = await req('POST', '/api/retrieve', { collection: 'c1', query: '' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'QUERY_REQUIRED');
});

test('POST /api/rag/query rejects missing collection', async function() {
  var res = await req('POST', '/api/rag/query', { query: 'hello' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'COLLECTION_REQUIRED');
});

test('POST /api/rag/query rejects missing query', async function() {
  var res = await req('POST', '/api/rag/query', { collection: 'c1' });
  assert.equal(res.status, 400, 'status 400');
  assert.equal(res.body.code, 'QUERY_REQUIRED');
});

test('POST /api/rag/stream returns 501 NOT_IMPLEMENTED', async function() {
  var res = await req('POST', '/api/rag/stream', { collection: 'c1', query: 'hello' });
  assert.equal(res.status, 501, 'status 501');
  assert.equal(res.body.error, 'NOT_IMPLEMENTED');
});

test('GET /health redirects to /api/health', async function() {
  var res = await req('GET', '/health');
  assert.equal(res.status, 301, 'status 301 redirect');
});

test('GET /unknown returns 404', async function() {
  var res = await req('GET', '/unknown/route');
  assert.equal(res.status, 404, 'status 404');
  assert.equal(res.body.error, 'NOT_FOUND');
});

test('GET /api/stats/reset POST is allowed (auth bypassed)', async function() {
  var res = await req('POST', '/api/stats/reset', {});
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.message, 'query counters reset');
});
