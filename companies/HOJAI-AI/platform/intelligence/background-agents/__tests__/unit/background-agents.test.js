/**
 * background-agents - vitest unit tests
 */
'use strict';
process.env.BACKGROUND_AGENTS_NO_LISTEN = '1';
process.env.BACKGROUND_AGENTS_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app } = require('../../src/index');

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

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Jobs', () => {
  let jobId, runId;
  test('POST /api/jobs (no name -> 400)', async () => { const r = await req('POST', '/api/jobs', {}); expect(r.status).toBe(400); });
  test('POST /api/jobs (ok)', async () => { const r = await req('POST', '/api/jobs', { name: 'test-job', schedule: 'hourly' }); expect(r.status).toBe(201); jobId = r.body.id; });
  test('GET /api/jobs', async () => { const r = await req('GET', '/api/jobs'); expect(r.status).toBe(200); expect(Array.isArray(r.body.jobs)).toBe(true); });
  test('GET /api/jobs/:id', async () => { const r = await req('GET', `/api/jobs/${jobId}`); expect(r.status).toBe(200); });
  test('GET /api/jobs/missing (404)', async () => { const r = await req('GET', '/api/jobs/zzz'); expect(r.status).toBe(404); });
  test('POST /api/jobs/:id/run (missing -> 404)', async () => { const r = await req('POST', '/api/jobs/zzz/run', {}); expect(r.status).toBe(404); });
  test('POST /api/jobs/:id/run (ok)', async () => {
    const r = await req('POST', `/api/jobs/${jobId}/run`, {});
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('completed');
    runId = r.body.id;
  });
  test('POST /api/jobs/:id/cancel (missing -> 404)', async () => { const r = await req('POST', '/api/jobs/zzz/cancel', {}); expect(r.status).toBe(404); });
  test('POST /api/jobs/:id/cancel (ok)', async () => {
    const r = await req('POST', '/api/jobs', { name: 'to-cancel' });
    const id = r.body.id;
    const c = await req('POST', `/api/jobs/${id}/cancel`, {});
    expect(c.status).toBe(200);
    expect(c.body.cancelled).toBe(true);
    const run = await req('POST', `/api/jobs/${id}/run`, {});
    expect(run.status).toBe(400);
  });
  test('GET /api/runs', async () => { const r = await req('GET', '/api/runs'); expect(r.status).toBe(200); expect(r.body.runs.length).toBeGreaterThanOrEqual(1); });
  test('GET /api/runs/:id', async () => { const r = await req('GET', `/api/runs/${runId}`); expect(r.status).toBe(200); });
  test('GET /api/runs/missing (404)', async () => { const r = await req('GET', '/api/runs/zzz'); expect(r.status).toBe(404); });
  test('GET /api/agents/audit', async () => { const r = await req('GET', '/api/agents/audit'); expect(r.status).toBe(200); });
});