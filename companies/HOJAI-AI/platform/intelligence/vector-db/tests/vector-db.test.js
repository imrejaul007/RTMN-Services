'use strict';
var node_test_1 = require('node:test');
var assert_strict_1 = require('node:assert/strict');
var http = require('http');
Object.keys(require.cache).forEach(function (k) { if (k.includes('vector-db')) delete require.cache[k]; });
var app = require('./src/index.js');
var INTERNAL_TOKEN = 'vector-db-internal-token';
var TEST_COLLECTION = 'test-node-coll';
var TEST_DIM = 4;
var server;
var baseUrl;
(0, node_test_1.test)('setup', function () {
    var _this = this;
    return new Promise(function (resolve) {
        server = app.listen(0, function () {
            var addr = server.address();
            baseUrl = 'http://127.0.0.1:' + addr.port;
            resolve();
        });
    });
});
(0, node_test_1.test)('cleanup', function () {
    if (server) server.close();
});
function req(method, path, body, extraHeaders) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var url = new URL(baseUrl + path);
        var headers = { 'Content-Type': 'application/json' };
        if (extraHeaders) Object.assign(headers, extraHeaders);
        var opts = { method: method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: headers };
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
    var _a = body || {}, _token = _a._token, realBody = _a._token;
    var h = {};
    if (_token) h['x-internal-token'] = _token;
    var keys = realBody ? Object.keys(realBody) : [];
    return req(method, path, keys.length ? realBody : undefined, h);
}
// exports
(0, node_test_1.test)('app is function', function () {
    (0, assert_strict_1.ok)(typeof app === 'function');
});
(0, node_test_1.test)('PORT exported as 4780', function () {
    (0, assert_strict_1.equals)(app.PORT, 4780);
});
(0, node_test_1.test)('SERVICE_NAME exported', function () {
    (0, assert_strict_1.equals)(app.SERVICE_NAME, 'vector-db');
});
(0, node_test_1.test)('collections Map exported', function () {
    (0, assert_strict_1.ok)(app.collections instanceof Map);
});
(0, node_test_1.test)('stats object exported', function () {
    (0, assert_strict_1.ok)(typeof app.stats === 'object');
});
(0, node_test_1.test)('embed function exported', function () {
    (0, assert_strict_1.equals)(typeof app.embed, 'function');
});
(0, node_test_1.test)('similarity functions exported', function () {
    (0, assert_strict_1.equals)(typeof app.cosineSimilarity, 'function');
    (0, assert_strict_1.equals)(typeof app.dotSimilarity, 'function');
    (0, assert_strict_1.equals)(typeof app.euclideanSimilarity, 'function');
});
// embedding helpers
(0, node_test_1.test)('embed() returns 128 dims by default', function () {
    var v = app.embed('hello world');
    (0, assert_strict_1.equals)(v.length, 128);
});
(0, node_test_1.test)('embed() returns requested dim', function () {
    var v = app.embed('hello world', 4);
    (0, assert_strict_1.equals)(v.length, 4);
});
(0, node_test_1.test)('cosineSimilarity identical = 1', function () {
    var v = [0.5, 0.5, 0.5, 0.5];
    (0, assert_strict_1.ok)(Math.abs(app.cosineSimilarity(v, v) - 1) < 0.0001);
});
(0, node_test_1.test)('cosineSimilarity orthogonal ≈ 0', function () {
    (0, assert_strict_1.ok)(Math.abs(app.cosineSimilarity([1,0,0,0], [0,1,0,0])) < 0.0001);
});
// health
(0, node_test_1.test)('GET /api/health returns 200 + healthy', function () {
    var res = req('GET', '/api/health');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.status, 'healthy');
});
(0, node_test_1.test)('GET /ready returns 200 + ready:true', function () {
    var res = req('GET', '/ready');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.ready, true);
});
// stats
(0, node_test_1.test)('GET /api/stats returns stats', function () {
    var res = req('GET', '/api/stats');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)('collections' in res.body);
    (0, assert_strict_1.ok)('vectors' in res.body);
});
// collection CRUD
(0, node_test_1.test)('POST /api/collections creates collection', function () {
    var res = authReq('POST', '/api/collections', {
        name: TEST_COLLECTION,
        dimension: TEST_DIM,
        metric: 'cosine',
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.ok)([200, 201, 409].indexOf(res.status) >= 0, 'got ' + res.status);
});
(0, node_test_1.test)('POST /api/collections rejects duplicate', function () {
    var res = authReq('POST', '/api/collections', {
        name: TEST_COLLECTION, dimension: TEST_DIM, _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 409);
});
(0, node_test_1.test)('GET /api/collections lists collections', function () {
    var res = req('GET', '/api/collections');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)(Array.isArray(res.body.collections));
});
(0, node_test_1.test)('GET /api/collections/:name returns collection', function () {
    var res = req('GET', '/api/collections/' + TEST_COLLECTION);
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.name, TEST_COLLECTION);
});
(0, node_test_1.test)('GET /api/collections/:name 404 for unknown', function () {
    var res = req('GET', '/api/collections/does-not-exist-xyz');
    (0, assert_strict_1.equals)(res.status, 404);
});
(0, node_test_1.test)('PATCH /api/collections/:name updates metric', function () {
    var res = authReq('PATCH', '/api/collections/' + TEST_COLLECTION, {
        metric: 'dot', _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.metric, 'dot');
});
(0, node_test_1.test)('DELETE /api/collections/:name deletes collection', function () {
    authReq('POST', '/api/collections', { name: 'coll-delete-test', dimension: 4, _token: INTERNAL_TOKEN });
    var res = authReq('DELETE', '/api/collections/coll-delete-test', { _token: INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 200);
});
(0, node_test_1.test)('DELETE /api/collections/:name 404 for unknown', function () {
    var res = authReq('DELETE', '/api/collections/does-not-exist', { _token: INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 404);
});
// vectors
(0, node_test_1.test)('POST /api/embed returns embedding', function () {
    var res = authReq('POST', '/api/embed', {
        text: 'hello world', dimension: 4, _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)(Array.isArray(res.body.vector));
    (0, assert_strict_1.equals)(res.body.vector.length, 4);
});
(0, node_test_1.test)('POST /api/embed requires text', function () {
    var res = authReq('POST', '/api/embed', { _token: INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 400);
});
(0, node_test_1.test)('POST /api/collections/:name/vectors inserts vector', function () {
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        metadata: { tag: 'a' },
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.ok)([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
    (0, assert_strict_1.ok)(res.body.id);
});
(0, node_test_1.test)('POST /api/collections/:name/vectors rejects wrong dimension', function () {
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3],
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 409);
});
(0, node_test_1.test)('POST /api/collections/:name/vectors/batch inserts batch', function () {
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/batch', {
        vectors: [
            { values: [0.5, 0.5, 0.5, 0.5], metadata: { tag: 'b' } },
            { values: [0.9, 0.1, 0.1, 0.1], metadata: { tag: 'c' } }
        ],
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.ok)([200, 201].indexOf(res.status) >= 0, 'got ' + res.status);
    (0, assert_strict_1.ok)(Array.isArray(res.body.ids));
    (0, assert_strict_1.equals)(res.body.ids.length, 2);
});
(0, node_test_1.test)('GET /api/collections/:name/vectors lists vectors', function () {
    var res = req('GET', '/api/collections/' + TEST_COLLECTION + '/vectors');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)(Array.isArray(res.body.vectors));
});
(0, node_test_1.test)('GET /api/collections/:name/vectors/:id gets vector', function () {
    var upsert = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4],
        metadata: { tag: 'single' },
        _token: INTERNAL_TOKEN
    });
    var res = req('GET', '/api/collections/' + TEST_COLLECTION + '/vectors/' + upsert.body.id);
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.id, upsert.body.id);
});
(0, node_test_1.test)('DELETE /api/collections/:name/vectors/:id deletes', function () {
    var upsert = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4], _token: INTERNAL_TOKEN
    });
    var res = authReq('DELETE', '/api/collections/' + TEST_COLLECTION + '/vectors/' + upsert.body.id, {
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
});
(0, node_test_1.test)('POST /api/collections/:name/vectors/delete-batch deletes multiple', function () {
    var r1 = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.1, 0.2, 0.3, 0.4], _token: INTERNAL_TOKEN
    });
    var r2 = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors', {
        values: [0.5, 0.5, 0.5, 0.5], _token: INTERNAL_TOKEN
    });
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/delete-batch', {
        ids: [r1.body.id, r2.body.id],
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.deleted, 2);
});
(0, node_test_1.test)('POST /api/collections/:name/vectors/delete-batch rejects empty', function () {
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/vectors/delete-batch', {
        ids: [], _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 400);
});
// search
(0, node_test_1.test)('POST /api/collections/:name/search returns matches', function () {
    var res = authReq('POST', '/api/collections/' + TEST_COLLECTION + '/search', {
        query: [0.1, 0.2, 0.3, 0.4],
        topK: 2,
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)('matches' in res.body);
    (0, assert_strict_1.ok)(Array.isArray(res.body.matches));
});
(0, node_test_1.test)('POST /api/query searches across collection', function () {
    var res = authReq('POST', '/api/query', {
        collection: TEST_COLLECTION,
        query: [0.1, 0.2, 0.3, 0.4],
        topK: 1,
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.collection, TEST_COLLECTION);
});
(0, node_test_1.test)('POST /api/query requires collection', function () {
    var res = authReq('POST', '/api/query', {
        query: [0.1, 0.2, 0.3, 0.4],
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 400);
});
(0, node_test_1.test)('POST /api/collections/:name/search-by-text works', function () {
    var coll128 = 'test-text-search';
    authReq('POST', '/api/collections', { name: coll128, dimension: 128, _token: INTERNAL_TOKEN });
    authReq('POST', '/api/collections/' + coll128 + '/vectors', {
        values: app.embed('machine learning algorithms', 128),
        metadata: { domain: 'ml' },
        _token: INTERNAL_TOKEN
    });
    authReq('POST', '/api/collections/' + coll128 + '/vectors', {
        values: app.embed('cooking recipes food', 128),
        metadata: { domain: 'food' },
        _token: INTERNAL_TOKEN
    });
    var res = authReq('POST', '/api/collections/' + coll128 + '/search-by-text', {
        text: 'neural networks and deep learning',
        topK: 1,
        _token: INTERNAL_TOKEN
    });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)(res.body.queryText);
    (0, assert_strict_1.ok)(Array.isArray(res.body.matches));
    if (res.body.matches.length > 0) {
        (0, assert_strict_1.equals)(res.body.matches[0].metadata.domain, 'ml');
    }
});
// audit
(0, node_test_1.test)('GET /api/audit returns audit log', function () {
    var res = req('GET', '/api/audit');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)('count' in res.body);
});
(0, node_test_1.test)('GET /api/audit?limit=5 respects limit', function () {
    var res = req('GET', '/api/audit?limit=5');
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.ok)(res.body.returned <= 5);
});
(0, node_test_1.test)('POST /api/stats/reset resets counters', function () {
    var res = authReq('POST', '/api/stats/reset', { _token: INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 200);
    (0, assert_strict_1.equals)(res.body.stats.totalCollectionsCreated, 0);
});
// auth
(0, node_test_1.test)('POST /api/collections no token returns 401', function () {
    var res = req('POST', '/api/collections', { name: 'auth-test', dimension: 4 });
    (0, assert_strict_1.equals)(res.status, 401);
});
(0, node_test_1.test)('POST /api/embed no token returns 401', function () {
    var res = req('POST', '/api/embed', { text: 'hello' });
    (0, assert_strict_1.equals)(res.status, 401);
});
(0, node_test_1.test)('POST /api/collections wrong token returns 401', function () {
    var res = req('POST', '/api/collections', { name: 'auth-test2', dimension: 4 }, {
        'x-internal-token': 'wrong-token'
    });
    (0, assert_strict_1.equals)(res.status, 401);
});
(0, node_test_1.test)('GET /api/collections no token = 200 (public read)', function () {
    var res = req('GET', '/api/collections');
    (0, assert_strict_1.equals)(res.status, 200);
});
(0, node_test_1.test)('GET /api/audit no token = 200 (public read)', function () {
    var res = req('GET', '/api/audit');
    (0, assert_strict_1.equals)(res.status, 200);
});
// validation
(0, node_test_1.test)('POST /api/collections empty body returns 400', function () {
    var res = req('POST', '/api/collections', {}, { 'x-internal-token': INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 400);
});
(0, node_test_1.test)('POST /api/embed empty body returns 400', function () {
    var res = req('POST', '/api/embed', {}, { 'x-internal-token': INTERNAL_TOKEN });
    (0, assert_strict_1.equals)(res.status, 400);
});
// 404
(0, node_test_1.test)('unknown route returns 404', function () {
    var res = req('GET', '/api/does-not-exist');
    (0, assert_strict_1.equals)(res.status, 404);
});
