/**
 * proactive-engine - vitest unit tests
 */
'use strict';
process.env.PROACTIVE_ENGINE_NO_LISTEN = '1';
process.env.PROACTIVE_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, evaluate } = require('../../src/index');

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

describe('Helpers', () => {
  test('evaluate unconditional rule returns true', () => {
    expect(evaluate({ trigger: {} }, {})).toBe(true);
  });
  test('evaluate eq condition', () => {
    const r = { trigger: { conditions: [{ key: 'plan', op: 'eq', value: 'pro' }] } };
    expect(evaluate(r, { plan: 'pro' })).toBe(true);
    expect(evaluate(r, { plan: 'free' })).toBe(false);
  });
  test('evaluate in condition', () => {
    const r = { trigger: { conditions: [{ key: 'region', op: 'in', value: ['us', 'eu'] }] } };
    expect(evaluate(r, { region: 'us' })).toBe(true);
    expect(evaluate(r, { region: 'asia' })).toBe(false);
  });
});

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Rules', () => {
  test('POST /api/proactive/rule (no name -> 400)', async () => { const r = await req('POST', '/api/proactive/rule', { action: { type: 'msg' } }); expect(r.status).toBe(400); });
  test('POST /api/proactive/rule (no action -> 400)', async () => { const r = await req('POST', '/api/proactive/rule', { name: 'test' }); expect(r.status).toBe(400); });
  test('POST /api/proactive/rule (ok)', async () => { const r = await req('POST', '/api/proactive/rule', { name: 'welcome', action: { type: 'greet', text: 'hi' } }); expect(r.status).toBe(201); });
  test('GET /api/proactive/rules', async () => { const r = await req('GET', '/api/proactive/rules'); expect(r.status).toBe(200); expect(Array.isArray(r.body.rules)).toBe(true); });
  test('GET /api/proactive/rules/:id (404)', async () => { const r = await req('GET', '/api/proactive/rules/zzz-missing'); expect(r.status).toBe(404); });
  test('DELETE /api/proactive/rules/:id (404)', async () => { const r = await req('DELETE', '/api/proactive/rules/zzz-missing'); expect(r.status).toBe(404); });
  test('POST /api/proactive/suggest (no userId -> 400)', async () => { const r = await req('POST', '/api/proactive/suggest', {}); expect(r.status).toBe(400); });
  test('POST /api/proactive/suggest (ok)', async () => { const r = await req('POST', '/api/proactive/suggest', { userId: 'u1' }); expect(r.status).toBe(200); expect(Array.isArray(r.body.suggestions)).toBe(true); });
  test('GET /api/proactive/audit', async () => { const r = await req('GET', '/api/proactive/audit'); expect(r.status).toBe(200); });
});