'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

process.env.INTENT_ENGINE_NO_LISTEN = '1';
process.env.INTENT_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

Object.keys(require.cache).forEach(function (k) { if (k.includes('intent-engine')) delete require.cache[k]; });
var app = require('../../src/index.js');

var INTERNAL_TOKEN = 'intent-engine-internal-token';

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
        var opts = { method: method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: h };
        var r = http.request(opts, function (res) {
            var data = '';
            res.on('data', function (c) { data += c; });
            res.on('end', function () {
                var p2;
                try { p2 = data ? JSON.parse(data) : null; }
                catch (_a) { p2 = data; }
                resolve({ status: res.statusCode, body: p2 });
            });
        });
        r.on('error', reject);
        if (body !== undefined) r.write(JSON.stringify(body));
        r.end();
    });
}

// exports
test('SERVICE_NAME exported', function () {
    assert.equal(app.SERVICE_NAME, 'intent-engine');
});

test('INTENT_CATALOG exported with 9 intents', function () {
    assert.equal(typeof app.INTENT_CATALOG, 'object');
    assert.equal(Object.keys(app.INTENT_CATALOG).length, 9);
});

test('detectIntent helper exported', function () {
    assert.equal(typeof app.detectIntent, 'function');
});

test('authOrBypass exported', function () {
    assert.equal(typeof app.authOrBypass, 'function');
});

test('INTENT_ENGINE_REQUIRE_AUTH exported', function () {
    assert.equal(typeof app.INTENT_ENGINE_REQUIRE_AUTH, 'boolean');
});

test('INTENT_ENGINE_NO_LISTEN exported', function () {
    assert.equal(typeof app.INTENT_ENGINE_NO_LISTEN, 'boolean');
});

// detectIntent unit tests
test('detectIntent buy', function () {
    var r = app.detectIntent('I want to buy a new laptop');
    assert.equal(r.intent, 'buy');
    assert.ok(r.confidence > 0);
});

test('detectIntent search', function () {
    var r = app.detectIntent('find me a good restaurant');
    assert.equal(r.intent, 'search');
});

test('detectIntent cancel', function () {
    var r = app.detectIntent('cancel my subscription');
    assert.equal(r.intent, 'cancel');
});

test('detectIntent support', function () {
    var r = app.detectIntent('I have an issue with my order');
    assert.equal(r.intent, 'support');
});

test('detectIntent greet', function () {
    var r = app.detectIntent('hello there');
    assert.equal(r.intent, 'greet');
});

test('detectIntent track', function () {
    var r = app.detectIntent('track my order shipment 12345');
    assert.equal(r.intent, 'track');
});

test('detectIntent return', function () {
    var r = app.detectIntent('I want to return my product');
    assert.equal(r.intent, 'return');
});

test('detectIntent recommend', function () {
    var r = app.detectIntent('recommend a good movie');
    assert.equal(r.intent, 'recommend');
});

test('detectIntent compare', function () {
    var r = app.detectIntent('compare iphone vs android');
    assert.equal(r.intent, 'compare');
});

test('detectIntent unknown', function () {
    var r = app.detectIntent('xyzzy plover');
    assert.equal(r.intent, 'unknown');
});

test('detectIntent has alternatives when multiple match', function () {
    var r = app.detectIntent('help me find and compare products');
    assert.ok(r.alternatives);
    assert.ok(r.alternatives.length > 0);
});

// health
test('GET /health returns 200 + healthy', async function () {
    var r = await req('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'healthy');
    assert.equal(r.body.service, 'intent-engine');
});

test('GET /api/health returns 200', async function () {
    var r = await req('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'healthy');
});

test('GET /ready returns 200 + ready:true', async function () {
    var r = await req('GET', '/ready');
    assert.equal(r.status, 200);
    assert.equal(r.body.ready, true);
});

// intent detection
test('POST /api/intent no text returns 400', async function () {
    var r = await req('POST', '/api/intent', {});
    assert.equal(r.status, 400);
});

test('POST /api/intent detects buy', async function () {
    var r = await req('POST', '/api/intent', { text: 'I want to buy a book' });
    assert.equal(r.status, 200);
    assert.equal(r.body.intent, 'buy');
});

test('POST /api/intent detects cancel', async function () {
    var r = await req('POST', '/api/intent', { text: 'cancel my subscription' });
    assert.equal(r.status, 200);
    assert.equal(r.body.intent, 'cancel');
});

test('POST /api/intent detects greet', async function () {
    var r = await req('POST', '/api/intent', { text: 'hello there' });
    assert.equal(r.status, 200);
    assert.equal(r.body.intent, 'greet');
});

test('POST /api/intent detects search', async function () {
    var r = await req('POST', '/api/intent', { text: 'find me a restaurant' });
    assert.equal(r.status, 200);
    assert.equal(r.body.intent, 'search');
});

test('POST /api/intent/batch no texts returns 400', async function () {
    var r = await req('POST', '/api/intent/batch', {});
    assert.equal(r.status, 400);
});

test('POST /api/intent/batch multiple intents', async function () {
    var r = await req('POST', '/api/intent/batch', { texts: ['buy a phone', 'cancel order', 'hello'] });
    assert.equal(r.status, 200);
    assert.equal(r.body.results.length, 3);
    assert.equal(r.body.count, 3);
});

test('GET /api/intent/catalog returns catalog', async function () {
    var r = await req('GET', '/api/intent/catalog');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.intents));
    assert.ok(r.body.count > 0);
});

test('GET /api/intent/audit returns audit log', async function () {
    var r = await req('GET', '/api/intent/audit');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.entries));
});

// auth bypass tested in source (INTENT_ENGINE_REQUIRE_AUTH=false in test mode)

// 404
test('unknown route returns 404', async function () {
    var r = await req('GET', '/api/does-not-exist');
    assert.equal(r.status, 404);
});
