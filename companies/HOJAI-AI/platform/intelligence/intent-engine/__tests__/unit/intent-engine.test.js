/**
 * intent-engine - vitest unit tests
 */
'use strict';

process.env.INTENT_ENGINE_NO_LISTEN = '1';
process.env.INTENT_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, detectIntent, INTENT_CATALOG } = require('../../src/index');

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise(r => server.listen(0, () => r()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => { await new Promise(r => server.close(r)); });

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => { let p; try { p = data ? JSON.parse(data) : null; } catch { p = data; } resolve({ status: res.statusCode, body: p }); });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Exports', () => {
  test('flags + catalog', () => {
    expect(app.SERVICE_NAME).toBe('intent-engine');
    expect(Object.keys(INTENT_CATALOG).length).toBeGreaterThanOrEqual(5);
  });
  test('detectIntent helper', () => {
    const r = detectIntent('I want to buy a new laptop');
    expect(r.intent).toBe('buy');
    expect(r.confidence).toBeGreaterThan(0);
  });
  test('detectIntent returns unknown for unmatched', () => {
    const r = detectIntent('xyzzy plover');
    expect(r.intent).toBe('unknown');
  });
});

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Intent detection', () => {
  test('POST /api/intent (no text -> 400)', async () => { const r = await req('POST', '/api/intent', {}); expect(r.status).toBe(400); });
  test('POST /api/intent (detect buy)', async () => { const r = await req('POST', '/api/intent', { text: 'I want to buy a book' }); expect(r.status).toBe(200); expect(r.body.intent).toBe('buy'); });
  test('POST /api/intent (detect cancel)', async () => { const r = await req('POST', '/api/intent', { text: 'cancel my subscription' }); expect(r.status).toBe(200); expect(r.body.intent).toBe('cancel'); });
  test('POST /api/intent (detect greet)', async () => { const r = await req('POST', '/api/intent', { text: 'hello there' }); expect(r.status).toBe(200); expect(r.body.intent).toBe('greet'); });
  test('POST /api/intent/batch (no texts -> 400)', async () => { const r = await req('POST', '/api/intent/batch', {}); expect(r.status).toBe(400); });
  test('POST /api/intent/batch (multiple)', async () => { const r = await req('POST', '/api/intent/batch', { texts: ['buy a phone', 'cancel order', 'hello'] }); expect(r.status).toBe(200); expect(r.body.results.length).toBe(3); });
  test('GET /api/intent/catalog', async () => { const r = await req('GET', '/api/intent/catalog'); expect(r.status).toBe(200); expect(r.body.count).toBeGreaterThan(0); });
  test('GET /api/intent/audit', async () => { const r = await req('GET', '/api/intent/audit'); expect(r.status).toBe(200); expect(Array.isArray(r.body.entries)).toBe(true); });
});