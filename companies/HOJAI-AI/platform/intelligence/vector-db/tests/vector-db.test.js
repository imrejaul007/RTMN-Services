'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

Object.keys(require.cache).forEach(function (k) { if (k.includes('vector-db')) delete require.cache[k]; });
var app = require('../src/index.js');

var INTERNAL_TOKEN = 'vector-db-internal-token';
var TEST_COLLECTION = 'test-node-coll';
var TEST_DIM = 4;

var server;
var baseUrl;

test('setup', function () {
    var _this = this;
    return new Promise(function (resolve) {
        server = app.listen(0, function () {
            var addr = server.address();
            baseUrl = 'http://127.0.0.1:' + addr.port;
            resolve();
        });
    });
});

test('cleanup', function () {
    if (server) server.close();
});

function req(method, path, body, extraHeaders) {
    return new Promise(function (resolve, reject) {
        var url = new URL(baseUrl + path);
        var headers = { 'Content-Type': 'application/json' };
        if (extraHeaders) Object.assign(headers, extraHeaders);
        var opts = { method: method, hostname: url.hostname, port: url.port,
            path: url.pathname + url.search, headers: headers };
        var req2 = http.request(opts, function (res) {
            var data = '';
            res.on('data', function (chunk) { data += chunk; });
            res.on('end', function () {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (_a) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req2.on('error', reject);
        if (body !== undefined) req2.write(JSON.stringify(body));
        req2.end();
    });
}

function authReq(method, path, body) {
    var h = {};
    var token = (body || {})._token;
    if (token) h['x-internal-token'] = token;
    var rest = Object.assign({}, body || {});
    delete rest._token;
    var keys = Object.keys(rest);
    return req(method, path, keys.length > 0 ? rest : undefined, h);
}

// exports
test('app is function', function () {
    assert.equal(typeof app, 'function');
});

test('PORT exported as 4780', function () {
    assert.equal(app.PORT, 4780);
});

test('SERVICE_NAME exported', function () {
    assert.equal(app.SERVICE_NAME, 'vector-db');
});

test('collections Map exported', function () {
    assert.ok(app.collections instanceof Map);
});

test('stats object exported', function () {
    assert.ok(typeof app.stats === 'object');
});

test('embed function exported', function () {
    assert.equal(typeof app.embed, 'function');
});

test('similarity functions exported', function () {
    assert.equal(typeof app.cosineSimilarity, 'function');
    assert.equal(typeof app.dotSimilarity, 'function');
    assert.equal(typeof app.euclideanSimilarity, 'function');
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

// health
test('GET /api/health returns 200 + healthy', async function () {
    var res = await req('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
});

test('GET /ready returns 200 + ready:true', async function () {
    var res = await req('GET', '/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.ready, true);
});

// stats
test('GET /api/stats returns stats', async function () {
    var res = await req('GET', '/api/stats');
    assert.equal(res.status, 200);
    assert.ok('collections' in res.body);
    assert.ok('vectors' in res.body);
});

// collection CRUD
test('POST /api/collections creates collection', async function () {
    var res = await authReq('POST', '/api/collections', {
        name: TEST_COLLECTION, dimension: TEST_DIM, metric: 'cosine', _token: INTERNAL_TOKEN
    });
    assert.ok([200, 201, 409].indexOf(res.status) >= 0, 'got ' + res.status);
});

test('POST /api/collections rejects duplicate', async function () {
    var res = await authReq('POST', '/api/collections', {
        name: TEST_COLLECTION, dimension: TEST_DIM, _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 409);
});

test('GET /api/collections lists collections', async function () {
    var res = await req('GET', '/api/collections');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.collections));
});

test('GET /api/collections/:name returns collection', async function () {
    var res = await req('GET', '/api/collections/' + TEST_COLLECTION);
    assert.equal(res.status, 200);
    assert.equal(res.body.name, TEST_COLLECTION);
});

test('GET /api/collections/:name 404 for unknown', async function () {
    var res = await req('GET', '/api/collections/does-not-exist-xyz');
    assert.equal(res.status, 404);
});

test('PATCH /api/collections/:name updates metric', async function () {
    var res = await authReq('PATCH', '/api/collections/' + TEST_COLLECTION, {
        metric: 'dot', _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.metric, 'dot');
});

test('DELETE /api/collections/:name deletes collection', async function () {
    await authReq('POST', '/api/collections', {
        name: 'coll-delete-test', dimension: 4, _token: INTERNAL_TOKEN
    });
    var res = await authReq('DELETE', '/api/collections/coll-delete-test', {
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
});

test('DELETE /api/collections/:name 404 for unknown', async function () {
    var res = await authReq('DELETE', '/api/collections/does-not-exist', {
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 404);
});

// vectors
test('POST /api/embed returns embedding', async function () {
    var res = await authReq('POST', '/api/embed', {
        text: 'hello world', dimension: 4, _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.vector));
    assert.equal(res.body.vector.length, 4);
});

test('POST /api/embed requires text', async function () {
    var res = await authReq('POST', '/api/embed', { _token: INTERNAL_TOKEN });
    assert.equal(res.status, 400);
});

test('POST /api/collections/:name/vectors inserts vector', async function () {
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        metadata: { tag: 'a' },
        _token: INTERNAL_TOKEN
    });
    assert.ok([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
    assert.ok(res.body.id);
});

test('POST /api/collections/:name/vectors rejects wrong dimension', async function () {
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3],
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 409);
});

test('POST /api/collections/:name/vectors/batch inserts batch', async function () {
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/batch', {
        vectors: [
            { values: [0.5, 0.5, 0.5, 0.5], metadata: { tag: 'b' } },
            { values: [0.9, 0.1, 0.1, 0.1], metadata: { tag: 'c' } }
        ],
        _token: INTERNAL_TOKEN
    });
    assert.ok([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
    assert.ok(Array.isArray(res.body.ids));
    assert.equal(res.body.ids.length, 2);
});

test('GET /api/collections/:name/vectors lists vectors', async function () {
    var res = await req('GET', '/api/collections/' + TEST_COLLECTION + '/vectors');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.vectors));
});

test('GET /api/collections/:name/vectors/:id gets vector', async function () {
    var upsert = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        metadata: { tag: 'single' },
        _token: INTERNAL_TOKEN
    });
    assert.ok(upsert.body.id);
    var res = await req('GET', '/api/collections/' + TEST_COLLECTION + '/vectors/' + upsert.body.id);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, upsert.body.id);
});

test('DELETE /api/collections/:name/vectors/:id deletes', async function () {
    var upsert = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        _token: INTERNAL_TOKEN
    });
    assert.ok(upsert.body.id);
    var res = await authReq('DELETE', '/api/collections/' + TEST_COLLECTION + '/vectors/' + upsert.body.id, {
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
});

test('POST /api/collections/:name/vectors/delete-batch deletes multiple', async function () {
    var r1 = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        _token: INTERNAL_TOKEN
    });
    assert.ok(r1.body.id);
    var r2 = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.5, 0.5, 0.5, 0.5],
        _token: INTERNAL_TOKEN
    });
    assert.ok(r2.body.id);
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/delete-batch', {
        ids: [r1.body.id, r2.body.id],
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, 2);
});

test('POST /api/collections/:name/vectors/delete-batch rejects empty', async function () {
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/delete-batch', {
        ids: [], _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 400);
});

// search
test('POST /api/collections/:name/search returns matches', async function () {
    var res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/search', {
        query: [0.1, 0.2, 0.3, 0.4],
        topK: 2,
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.ok('matches' in res.body);
    assert.ok(Array.isArray(res.body.matches));
});

test('POST /api/query searches across collection', async function () {
    var res = await authReq('POST', '/api/query', {
        collection: TEST_COLLECTION,
        query: [0.1, 0.2, 0.3, 0.4],
        topK: 1,
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.collection, TEST_COLLECTION);
});

test('POST /api/query requires collection', async function () {
    var res = await authReq('POST', '/api/query', {
        query: [0.1, 0.2, 0.3, 0.4],
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 400);
});

test('POST /api/collections/:name/search-by-text works', async function () {
    var coll128 = 'test-text-search';
    await authReq('POST', '/api/collections', {
        name: coll128, dimension: 128, _token: INTERNAL_TOKEN
    });
    await authReq('POST', '/api/collections/' + coll128 + '/vectors', {
        values: app.embed('machine learning algorithms', 128),
        metadata: { domain: 'ml' },
        _token: INTERNAL_TOKEN
    });
    await authReq('POST', '/api/collections/' + coll128 + '/vectors', {
        values: app.embed('cooking recipes food', 128),
        metadata: { domain: 'food' },
        _token: INTERNAL_TOKEN
    });
    var res = await authReq('POST', '/api/collections/' + coll128 + '/search-by-text', {
        text: 'neural networks and deep learning',
        topK: 1,
        _token: INTERNAL_TOKEN
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.queryText);
    assert.ok(Array.isArray(res.body.matches));
    if (res.body.matches.length > 0) {
        assert.equal(res.body.matches[0].metadata.domain, 'ml');
    }
});

// audit
test('GET /api/audit returns audit log', async function () {
    var res = await req('GET', '/api/audit');
    assert.equal(res.status, 200);
    assert.ok('count' in res.body);
});

test('GET /api/audit?limit=5 respects limit', async function () {
    var res = await req('GET', '/api/audit?limit=5');
    assert.equal(res.status, 200);
    assert.ok(res.body.returned <= 5);
});

test('POST /api/stats/reset resets counters', async function () {
    var res = await authReq('POST', '/api/stats/reset', { _token: INTERNAL_TOKEN });
    assert.equal(res.status, 200);
    assert.equal(res.body.stats.totalCollectionsCreated, 0);
});

// auth
test('POST /api/collections no token returns 401', async function () {
    var res = await req('POST', '/api/collections', { name: 'auth-test', dimension: 4 });
    assert.equal(res.status, 401);
});

test('POST /api/embed no token returns 401', async function () {
    var res = await req('POST', '/api/embed', { text: 'hello' });
    assert.equal(res.status, 401);
});

test('POST /api/collections wrong token returns 401', async function () {
    var res = await req('POST', '/api/collections', { name: 'auth-test2', dimension: 4 }, {
        'x-internal-token': 'wrong-token'
    });
    assert.equal(res.status, 401);
});

test('GET /api/collections no token = 200 (public read)', async function () {
    var res = await req('GET', '/api/collections');
    assert.equal(res.status, 200);
});

test('GET /api/audit no token = 200 (public read)', async function () {
    var res = await req('GET', '/api/audit');
    assert.equal(res.status, 200);
});

// validation
test('POST /api/collections empty body returns 400', async function () {
    var res = await req('POST', '/api/collections', {}, { 'x-internal-token': INTERNAL_TOKEN });
    assert.equal(res.status, 400);
});

test('POST /api/embed empty body returns 400', async function () {
    var res = await req('POST', '/api/embed', {}, { 'x-internal-token': INTERNAL_TOKEN });
    assert.equal(res.status, 400);
});

// 404
test('unknown route returns 404', async function () {
    var res = await req('GET', '/api/does-not-exist');
    assert.equal(res.status, 404);
});
