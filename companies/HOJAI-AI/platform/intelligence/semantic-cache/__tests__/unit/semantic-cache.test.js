'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

process.env.SEMANTIC_CACHE_NO_LISTEN = '1';
process.env.SEMANTIC_CACHE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

Object.keys(require.cache).forEach(function (k) { if (k.includes('semantic-cache')) delete require.cache[k]; });
var app = require('../../src/index.js');

var INTERNAL_TOKEN = 'semantic-cache-internal-token';

var server;
var baseUrl;

test('setup', function () {
    var _this = this;
    return new Promise(function (resolve) {
        server = http.createServer(app);
        server.listen(0, function () {
            var addr = server.address();
            baseUrl = 'http://127.0.0.1:' + addr.port;
            resolve();
        });
    });
});

function req(method, p, body, headers) {
    return new Promise(function (resolve, reject) {
        var url = new URL(baseUrl + p);
        var h = { 'Content-Type': 'application/json' };
        if (headers) Object.assign(h, headers);
        var opts = { method: method, hostname: url.hostname, port: url.port,
            path: url.pathname + url.search, headers: h };
        var r = http.request(opts, function (res) {
            var data = '';
            res.on('data', function (c) { data += c; });
            res.on('end', function () {
                var parsed;
                try { parsed = data ? JSON.parse(data) : null; }
                catch (_a) { parsed = data; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        r.on('error', reject);
        if (body !== undefined) r.write(JSON.stringify(body));
        r.end();
    });
}

// exports
test('app is function', function () {
    assert.equal(typeof app, 'function');
});

test('PORT exported as 4772', function () {
    assert.equal(app.PORT, 4772);
});

test('SERVICE_NAME exported', function () {
    assert.equal(app.SERVICE_NAME, 'semantic-cache');
});

test('entries Map exported', function () {
    assert.ok(app.entries instanceof Map);
});

test('stats object exported', function () {
    assert.ok(typeof app.stats === 'object');
});

test('embed function exported', function () {
    assert.equal(typeof app.embed, 'function');
});

test('cosineSimilarity function exported', function () {
    assert.equal(typeof app.cosineSimilarity, 'function');
});

// embedding helpers
test('embed() returns 128 dims by default', function () {
    var v = app.embed('hello world');
    assert.equal(v.length, 128);
});

test('embed() returns requested dim', function () {
    var v = app.embed('hello world', 4);
    assert.equal(v.length, 4);
});

test('cosineSimilarity identical = 1', function () {
    var v = [0.5, 0.5, 0.5, 0.5];
    assert.ok(Math.abs(app.cosineSimilarity(v, v) - 1) < 0.0001);
});

test('cosineSimilarity orthogonal ~ 0', function () {
    assert.ok(Math.abs(app.cosineSimilarity([1,0,0,0], [0,1,0,0])) < 0.0001);
});

// seeded entries should exist
test('seeded entries exist on startup', function () {
    assert.ok(app.entries.size > 0, 'seed should have populated entries');
});

// health
test('GET /api/health returns 200 + healthy', async function () {
    var res = await req('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'semantic-cache');
});

test('GET /ready returns 200 + ready:true', async function () {
    var res = await req('GET', '/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.ready, true);
});

// embeddings
test('POST /api/embed computes embedding', async function () {
    var res = await req('POST', '/api/embed', { text: 'hello world' });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.embedding));
    assert.equal(res.body.dimension, 128);
});

test('POST /api/embed rejects missing text', async function () {
    var res = await req('POST', '/api/embed', {});
    assert.equal(res.status, 400);
});

test('POST /api/embed/batch handles multiple', async function () {
    var res = await req('POST', '/api/embed/batch', { texts: ['hello', 'world'] });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
});

test('POST /api/similarity computes similarity', async function () {
    var res = await req('POST', '/api/similarity', { a: 'hello world', b: 'hello there' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.similarity, 'number');
});

// cache CRUD
test('POST /api/cache adds entry', async function () {
    var res = await req('POST', '/api/cache', {
        prompt: 'What is the weather in NYC? #' + Date.now(),
        response: 'Sunny, 72F',
        model: 'gpt-4'
    });
    assert.ok([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
    assert.ok(res.body.entry.id);
});

test('POST /api/cache rejects missing prompt', async function () {
    var res = await req('POST', '/api/cache', { response: 'ok', model: 'gpt-4' });
    assert.equal(res.status, 400);
});

test('GET /api/cache lists entries', async function () {
    var res = await req('GET', '/api/cache');
    assert.equal(res.status, 200);
    assert.ok(res.body.count >= 0);
    assert.ok(Array.isArray(res.body.entries));
});

test('GET /api/cache/:id returns entry', async function () {
    var list = await req('GET', '/api/cache');
    var id = list.body.entries[0].id;
    var res = await req('GET', '/api/cache/' + id);
    assert.equal(res.status, 200);
    assert.equal(res.body.entry.id, id);
});

test('GET /api/cache/:id 404 for unknown', async function () {
    var res = await req('GET', '/api/cache/does-not-exist-xyz');
    assert.equal(res.status, 404);
});

test('DELETE /api/cache/:id deletes entry', async function () {
    var list = await req('GET', '/api/cache');
    var id = list.body.entries[0].id;
    var res = await req('DELETE', '/api/cache/' + id);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, id);
});

test('POST /api/cache/clear clears all', async function () {
    var res = await req('POST', '/api/cache/clear', {});
    assert.ok([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
});

// lookup
test('POST /api/lookup on seeded data returns 200', async function () {
    var res = await req('POST', '/api/lookup', {
        prompt: 'weather in New York',
        model: 'gpt-4'
    });
    assert.equal(res.status, 200);
});

test('POST /api/lookup requires prompt', async function () {
    var res = await req('POST', '/api/lookup', {});
    assert.equal(res.status, 400);
});

test('POST /api/lookup/batch handles multiple', async function () {
    var res = await req('POST', '/api/lookup/batch', {
        prompts: ['weather in NYC', 'random unrelated xyz']
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
});

// stats + audit
test('GET /api/stats returns stats', async function () {
    var res = await req('GET', '/api/stats');
    assert.equal(res.status, 200);
    assert.ok('entries' in res.body);
    assert.ok('totalLookups' in res.body);
});

test('GET /api/audit returns log', async function () {
    var res = await req('GET', '/api/audit');
    assert.equal(res.status, 200);
    assert.ok('count' in res.body);
});

// auth (bypassed when SEMANTIC_CACHE_REQUIRE_AUTH=false in test mode)
// GET endpoints are publicly accessible (no auth required)
test('GET /api/cache no token = 200 (public read)', async function () {
    var res = await req('GET', '/api/cache');
    assert.equal(res.status, 200);
});

test('GET /api/audit no token = 200 (public read)', async function () {
    var res = await req('GET', '/api/audit');
    assert.equal(res.status, 200);
});

// 404
test('unknown route returns 404', async function () {
    var res = await req('GET', '/api/does-not-exist');
    assert.equal(res.status, 404);
});
