/**
 * agent-builder - vitest unit tests
 */
'use strict';
process.env.AGENT_BUILDER_NO_LISTEN = '1';
process.env.AGENT_BUILDER_REQUIRE_AUTH = 'false';
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

describe('Blueprints', () => {
  let bpId;
  test('POST /api/blueprints (no name -> 400)', async () => { const r = await req('POST', '/api/blueprints', { systemPrompt: 'x' }); expect(r.status).toBe(400); });
  test('POST /api/blueprints (no systemPrompt -> 400)', async () => { const r = await req('POST', '/api/blueprints', { name: 'x' }); expect(r.status).toBe(400); });
  test('POST /api/blueprints (ok)', async () => { const r = await req('POST', '/api/blueprints', { name: 'test', systemPrompt: 'You are helpful' }); expect(r.status).toBe(201); bpId = r.body.id; });
  test('GET /api/blueprints', async () => { const r = await req('GET', '/api/blueprints'); expect(r.status).toBe(200); expect(Array.isArray(r.body.blueprints)).toBe(true); });
  test('GET /api/blueprints/:id', async () => { const r = await req('GET', `/api/blueprints/${bpId}`); expect(r.status).toBe(200); });
  test('GET /api/blueprints/missing (404)', async () => { const r = await req('GET', '/api/blueprints/zzz'); expect(r.status).toBe(404); });
  test('PUT /api/blueprints/:id (missing -> 404)', async () => { const r = await req('PUT', '/api/blueprints/zzz', { name: 'x' }); expect(r.status).toBe(404); });
  test('PUT /api/blueprints/:id (ok)', async () => { const r = await req('PUT', `/api/blueprints/${bpId}`, { name: 'renamed' }); expect(r.status).toBe(200); expect(r.body.name).toBe('renamed'); expect(r.body.version).toBe(2); });
  test('POST /api/blueprints/:id/instantiate (missing -> 404)', async () => { const r = await req('POST', '/api/blueprints/zzz/instantiate', {}); expect(r.status).toBe(404); });
  test('POST /api/blueprints/:id/instantiate (ok)', async () => { const r = await req('POST', `/api/blueprints/${bpId}/instantiate`, {}); expect(r.status).toBe(201); expect(r.body.id).toBeDefined(); });
  test('GET /api/agents', async () => { const r = await req('GET', '/api/agents'); expect(r.status).toBe(200); });
  test('DELETE /api/blueprints/missing (404)', async () => { const r = await req('DELETE', '/api/blueprints/zzz'); expect(r.status).toBe(404); });
  test('DELETE /api/blueprints/:id (ok)', async () => { const r = await req('DELETE', `/api/blueprints/${bpId}`); expect(r.status).toBe(200); });
  test('GET /api/builder/audit', async () => { const r = await req('GET', '/api/builder/audit'); expect(r.status).toBe(200); });
});