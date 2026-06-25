// Minimal test to check if authReq with template literal path works
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const srcPath = require.resolve('../../src/index.js');
delete require.cache[srcPath];
Object.keys(require.cache).forEach(k => { if (k.includes('vector-db')) delete require.cache[k]; });
const app = require('../../src/index.js');

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'vector-db-internal-token';
const TEST_COLLECTION = 'test-node-coll';

let server;
let baseUrl;

test('setup', async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = 'http://127.0.0.1:' + addr.port;
      resolve();
    });
  });
});

function authReq(method, path, body) {
  const { _token, ...realBody } = body || {};
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['x-internal-token'] = _token;
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers
    };
    const req2 = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req2.on('error', reject);
    if (Object.keys(realBody).length) req2.write(JSON.stringify(realBody));
    req2.end();
  });
}

test('POST /api/collections/:name/search with template literal path', async () => {
  const res = await authReq('POST', '/api/collections/' + TEST_COLLECTION + '/search', {
    query: [0.1, 0.2, 0.3, 0.4],
    topK: 2,
    _token: INTERNAL_TOKEN
  });
  assert.ok([200, 404].includes(res.status), 'got ' + res.status + ': ' + JSON.stringify(res.body));
});
