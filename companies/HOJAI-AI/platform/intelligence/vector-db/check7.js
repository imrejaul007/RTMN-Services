'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

Object.keys(require.cache).forEach(k => { if (k.includes('vector-db')) delete require.cache[k]; });
const app = require('./src/index.js');

const INTERNAL_TOKEN = 'vector-db-internal-token';
const TEST_COLLECTION = 'test-node-coll';

let server;
let baseUrl;

before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = 'http://127.0.0.1:' + addr.port;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

function req(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const headers = { 'Content-Type': 'application/json' };
    if (extraHeaders) Object.assign(headers, extraHeaders);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers };
    const req2 = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req2.on('error', reject);
    if (body !== undefined) req2.write(JSON.stringify(body));
    req2.end();
  });
}

function authReq(method, path, body) {
  const { _token, ...realBody } = body || {};
  return req(method, path, Object.keys(realBody).length ? realBody : undefined,
    _token ? { 'x-internal-token': _token } : {});
}

// ---------- Test the problematic line ----------

test('template literal in authReq path - DELETE batch', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/vectors/delete-batch`, {
    ids: [], _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 400);
});

test('template literal in authReq path - SEARCH', async () => {
  const res = await authReq('POST', `/api/collections/${TEST_COLLECTION}/search`, {
    query: [0.1, 0.2, 0.3, 0.4],
    topK: 2,
    _token: INTERNAL_TOKEN
  });
  assert.ok([200, 404].includes(res.status), 'got ' + res.status);
});
