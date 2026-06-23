/**
 * reflection-engine - vitest unit tests
 */
'use strict';
process.env.REFLECTION_ENGINE_NO_LISTEN = '1';
process.env.REFLECTION_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, scoreText, DIMENSIONS } = require('../../src/index');

let server, baseUrl;
beforeAll(async () => { server = http.createServer(app); await new Promise(r => server.listen(0, () => r())); baseUrl = `http://127.0.0.1:${server.address().port}`; });
afterAll(async () => { await new Promise(r => server.close(r)); });

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let data = ''; res.on('data', c => (data += c));
      res.on('end', () => { let p; try { p = data ? JSON.parse(data) : null; } catch { p = data; } resolve({ status: res.statusCode, body: p }); });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Exports', () => {
  test('DIMENSIONS has 5 dimensions', () => { expect(Object.keys(DIMENSIONS).length).toBe(5); });
  test('scoreText returns scores + overall', () => {
    const r = scoreText('This is a clear, complete, accurate, professional, relevant response with sources', ['clarity', 'accuracy']);
    expect(r.scores.clarity).toBeDefined();
    expect(r.overall).toBeGreaterThan(0);
  });
});

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Reflect', () => {
  test('POST /api/reflect (no text -> 400)', async () => { const r = await req('POST', '/api/reflect', {}); expect(r.status).toBe(400); });
  test('POST /api/reflect (ok)', async () => { const r = await req('POST', '/api/reflect', { text: 'A clear and accurate response that is complete and professional' }); expect(r.status).toBe(201); expect(r.body.overall).toBeGreaterThan(0); });
  test('POST /api/reflect (with custom dimensions)', async () => { const r = await req('POST', '/api/reflect', { text: 'test', dimensions: ['clarity', 'tone'] }); expect(r.status).toBe(201); });
  test('POST /api/reflect/compare (no items -> 400)', async () => { const r = await req('POST', '/api/reflect/compare', {}); expect(r.status).toBe(400); });
  test('POST /api/reflect/compare (ranked)', async () => { const r = await req('POST', '/api/reflect/compare', { items: [{ text: 'short' }, { text: 'A clear, complete, accurate, professional, relevant, comprehensive, verified, thorough response' }] }); expect(r.status).toBe(200); expect(r.body.ranked.length).toBe(2); expect(r.body.winner).toBe(1); });
  test('GET /api/reflect/dimensions', async () => { const r = await req('GET', '/api/reflect/dimensions'); expect(r.status).toBe(200); expect(r.body.count).toBe(5); });
  test('GET /api/reflect', async () => { const r = await req('GET', '/api/reflect'); expect(r.status).toBe(200); expect(Array.isArray(r.body.reflections)).toBe(true); });
  test('GET /api/reflect/audit', async () => { const r = await req('GET', '/api/reflect/audit'); expect(r.status).toBe(200); });
});