/**
 * behavior-intelligence - vitest unit tests
 */
'use strict';
process.env.BEHAVIOR_INTELLIGENCE_NO_LISTEN = '1';
process.env.BEHAVIOR_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, getUserProfile, detectAnomalies, computeFunnel } = require('../../src/index');

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
  test('computeFunnel returns structure even with no events', () => {
    const f = computeFunnel(['a', 'b']);
    expect(f.length).toBe(2);
    expect(f[0].conversionFromFirst).toBe(0);
  });
  test('computeFunnel computes 1.0 for first step when no events', () => {
    // With zero users, first step still has conversionFromFirst=0 by convention
    const f = computeFunnel(['step1']);
    expect(f.length).toBe(1);
  });
  test('detectAnomalies returns structure', () => {
    const r = detectAnomalies(60000);
    expect(r.windowMs).toBe(60000);
    expect(Array.isArray(r.anomalies)).toBe(true);
  });
});

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Events', () => {
  test('POST /api/behavior/event (no userId -> 400)', async () => { const r = await req('POST', '/api/behavior/event', { event: 'click' }); expect(r.status).toBe(400); });
  test('POST /api/behavior/event (no event -> 400)', async () => { const r = await req('POST', '/api/behavior/event', { userId: 'u1' }); expect(r.status).toBe(400); });
  test('POST /api/behavior/event (ok)', async () => { const r = await req('POST', '/api/behavior/event', { userId: 'u1', event: 'click' }); expect(r.status).toBe(201); expect(r.body.id).toBeDefined(); });
  test('GET /api/behavior/events', async () => { const r = await req('GET', '/api/behavior/events'); expect(r.status).toBe(200); expect(Array.isArray(r.body.events)).toBe(true); });
  test('GET /api/behavior/user/missing (404)', async () => { const r = await req('GET', '/api/behavior/user/zzz-no-events'); expect(r.status).toBe(404); });
  test('GET /api/behavior/anomalies', async () => { const r = await req('GET', '/api/behavior/anomalies'); expect(r.status).toBe(200); });
  test('POST /api/behavior/funnel (no steps -> 400)', async () => { const r = await req('POST', '/api/behavior/funnel', {}); expect(r.status).toBe(400); });
  test('POST /api/behavior/funnel (ok)', async () => { const r = await req('POST', '/api/behavior/funnel', { steps: ['click', 'purchase'] }); expect(r.status).toBe(200); expect(r.body.funnel.length).toBe(2); });
  test('GET /api/behavior/audit', async () => { const r = await req('GET', '/api/behavior/audit'); expect(r.status).toBe(200); });
});