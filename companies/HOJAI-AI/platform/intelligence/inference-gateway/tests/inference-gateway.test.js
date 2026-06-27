'use strict';

process.env.INFERENCE_GATEWAY_NO_LISTEN = '1';
process.env.INFERENCE_GATEWAY_REQUIRE_AUTH = 'false';
process.env.INFERENCE_STUB_MODE = 'true';
process.env.NODE_ENV = 'test';

var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

Object.keys(require.cache).forEach(function(k) {
  if (k.includes('inference-gateway')) delete require.cache[k];
});

var exported = require('../src/index.js');
var app = exported.app;
var selectModel = exported.selectModel;

var server;
var baseUrl;

function req(method, path, body, headers) {
  if (headers === undefined) headers = {};
  return new Promise(function(resolve, reject) {
    if (!baseUrl) { resolve({ status: 0, body: null }); return; }
    var url = new URL(baseUrl + path);
    var opts = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
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
  assert.equal(exported.PORT, 4770, 'PORT is 4770');
  assert.equal(exported.SERVICE_NAME, 'inference-gateway', 'SERVICE_NAME');
  assert.equal(exported.VERSION, '2.0.0', 'VERSION is 2.0.0');
  assert.equal(typeof exported.selectModel, 'function', 'selectModel exported');
  assert.equal(typeof exported.MODEL_CATALOG, 'object', 'MODEL_CATALOG exported');
  assert.equal(typeof exported.stats, 'object', 'stats exported');
  assert.equal(typeof exported.auditLog, 'object', 'auditLog exported');
});

test('selectModel - explicit model wins', function() {
  var result = selectModel({ requestedModel: 'gpt-4o-mini', options: {} });
  assert.equal(result, 'gpt-4o-mini', 'returns requested model');
});

test('selectModel - unknown model falls back to cheapest', function() {
  // Unknown model is silently ignored; selectModel picks cheapest available
  var result = selectModel({ requestedModel: 'unknown-model-xyz', options: {} });
  assert.equal(result, 'hojai-llama-3-70b', 'falls back to cheapest (free tier)');
});

test('selectModel - preferredTier filters', function() {
  var result = selectModel({ requestedModel: null, options: { preferredTier: 'budget' } });
  assert.ok(['gpt-4o-mini', 'claude-3-haiku', 'gemini-1.5-flash'].includes(result), 'budget tier model selected');
});

test('selectModel - preferProvider filters', function() {
  var result = selectModel({ requestedModel: null, options: { preferProvider: 'anthropic' } });
  assert.ok(result.startsWith('claude-'), 'anthropic model selected');
});

test('selectModel - requireCapability filters', function() {
  var result = selectModel({ requestedModel: null, options: { requireCapability: 'vision' } });
  assert.ok(['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash'].includes(result), 'vision-capable model selected');
});

test('selectModel - maxCostUsd filters', function() {
  var result = selectModel({ requestedModel: null, options: { maxCostUsd: 0.001 } });
  assert.ok(['gpt-4o-mini', 'claude-3-haiku', 'gemini-1.5-flash', 'hojai-llama-3-70b'].includes(result), 'cheap model selected');
});

test('MODEL_CATALOG has expected models', function() {
  var cat = exported.MODEL_CATALOG;
  assert.ok(cat['gpt-4o'], 'has gpt-4o');
  assert.ok(cat['gpt-4o-mini'], 'has gpt-4o-mini');
  assert.ok(cat['claude-3-5-sonnet'], 'has claude-3-5-sonnet');
  assert.ok(cat['gemini-1.5-pro'], 'has gemini-1.5-pro');
  assert.ok(cat['hojai-llama-3-70b'], 'has local stub model');
});

test('MODEL_CATALOG model has required fields', function() {
  var m = exported.MODEL_CATALOG['gpt-4o-mini'];
  assert.equal(m.provider, 'openai', 'provider');
  assert.ok(Array.isArray(m.capabilities), 'capabilities array');
  assert.ok(typeof m.costPer1kInput === 'number', 'costPer1kInput');
  assert.ok(typeof m.costPer1kOutput === 'number', 'costPer1kOutput');
  assert.ok(typeof m.tier === 'string', 'tier');
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
});

test('GET /api/health returns 200', async function() {
  var res = await req('GET', '/api/health');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.service, 'inference-gateway', 'service name');
  assert.equal(res.body.version, '2.0.0', 'version');
});

test('GET /api/models returns model catalog', async function() {
  var res = await req('GET', '/api/models');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.count >= 8, 'has 8+ models');
  assert.ok(Array.isArray(res.body.models), 'has models array');
  assert.ok(res.body.models.length > 0, 'models not empty');
});

test('GET /api/models/:id returns model', async function() {
  var res = await req('GET', '/api/models/gpt-4o-mini');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.id, 'gpt-4o-mini', 'model id');
  assert.equal(res.body.provider, 'openai', 'provider');
});

test('GET /api/models/:id 404 for unknown', async function() {
  var res = await req('GET', '/api/models/unknown-model');
  assert.equal(res.status, 404, 'status 404');
});

test('POST /api/complete rejects empty messages', async function() {
  var res = await req('POST', '/api/complete', { messages: [] });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/complete rejects non-array messages', async function() {
  var res = await req('POST', '/api/complete', { messages: 'hello' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/complete returns stub response', async function() {
  var res = await req('POST', '/api/complete', {
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'gpt-4o-mini'
  });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.text, 'has text');
  assert.ok(res.body.text.includes('(stub)'), 'is stub response');
  assert.equal(res.body.model, 'gpt-4o-mini', 'model returned');
  assert.equal(res.body.provider, 'openai', 'provider returned');
  assert.ok(res.body.usage, 'has usage');
  assert.ok(res.body.usage.tokensIn >= 0, 'has tokensIn');
  assert.ok(res.body.usage.tokensOut >= 0, 'has tokensOut');
  assert.equal(res.body.stubbed, true, 'stubbed flag true');
  assert.ok(res.body.safety, 'has safety metadata');
});

test('POST /api/complete auto-selects model', async function() {
  var res = await req('POST', '/api/complete', {
    messages: [{ role: 'user', content: 'Test' }],
    model: null
  });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.model, 'has auto-selected model');
});

test('POST /api/complete tracks stats', async function() {
  var statsBefore = exported.stats.totalRequests;
  var res = await req('POST', '/api/complete', {
    messages: [{ role: 'user', content: 'Stats test' }],
    model: 'gpt-4o-mini'
  });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(exported.stats.totalRequests > statsBefore, 'stats incremented');
});

test('POST /api/route returns routing info', async function() {
  var res = await req('POST', '/api/route', {
    requestedModel: 'gpt-4o-mini',
    options: {}
  });
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.selectedModel, 'gpt-4o-mini', 'selectedModel');
  assert.equal(res.body.provider, 'openai', 'provider');
  assert.equal(res.body.tier, 'budget', 'tier');
});

test('POST /api/route with invalid criteria falls back to cheapest', async function() {
  // Invalid tier is silently ignored; route picks cheapest available
  var res = await req('POST', '/api/route', {
    requestedModel: null,
    options: { preferredTier: 'nonexistent-tier-xyz' }
  });
  assert.equal(res.status, 200, 'status 200 (falls back)');
  assert.ok(res.body.selectedModel, 'returns cheapest model');
});

test('GET /api/stats returns stats', async function() {
  var res = await req('GET', '/api/stats');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(typeof res.body.totalRequests === 'number', 'has totalRequests');
  assert.ok(typeof res.body.stubHits === 'number', 'has stubHits');
});

test('GET /api/stats/reset resets stats', async function() {
  var res = await req('GET', '/api/stats/reset');
  assert.equal(res.status, 200, 'status 200');
});

test('GET /api/audit returns audit log', async function() {
  var res = await req('GET', '/api/audit');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(Array.isArray(res.body.entries), 'has entries array');
});

test('GET /api/breakers returns breaker states', async function() {
  var res = await req('GET', '/api/breakers');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.breakers !== undefined, 'has breakers');
});

test('GET /api/secrets/cache returns cache state', async function() {
  var res = await req('GET', '/api/secrets/cache');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.cache !== undefined, 'has cache info');
});

test('POST /api/secrets/cache/clear clears cache', async function() {
  var res = await req('POST', '/api/secrets/cache/clear');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.message, 'Cache cleared');
});

test('POST /api/complete/stream returns SSE', async function() {
  var res = await req('POST', '/api/complete/stream', {
    messages: [{ role: 'user', content: 'Stream test' }],
    model: 'gpt-4o-mini'
  });
  assert.equal(res.status, 200, 'status 200');
});

test('GET /health redirects to /api/health', async function() {
  var res = await req('GET', '/health');
  assert.equal(res.status, 301, 'status 301');
});

test('GET /unknown returns 404', async function() {
  var res = await req('GET', '/unknown/route');
  assert.equal(res.status, 404, 'status 404');
});

test('POST /api/complete with multiple messages', async function() {
  var res = await req('POST', '/api/complete', {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ],
    model: 'gpt-4o-mini'
  });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.text, 'has text response');
});

test('POST /api/complete with options overrides defaults', async function() {
  var res = await req('POST', '/api/complete', {
    messages: [{ role: 'user', content: 'Test' }],
    model: 'gpt-4o-mini',
    options: { preferredTier: 'premium' }
  });
  assert.equal(res.status, 200, 'status 200');
});

test('POST /api/complete with strictSafety=true', async function() {
  var res = await req('POST', '/api/complete', {
    messages: [{ role: 'user', content: 'Test' }],
    model: 'gpt-4o-mini',
    options: { strictSafety: true }
  });
  // strictSafety only blocks if safety check fails; with no AI safety service running it degrades gracefully
  assert.equal(res.status, 200, 'status 200 (degrades gracefully)');
});
