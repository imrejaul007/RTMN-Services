/**
 * multi-agent-runtime - vitest unit tests
 */
'use strict';
process.env.MULTI_AGENT_RUNTIME_NO_LISTEN = '1';
process.env.MULTI_AGENT_RUNTIME_REQUIRE_AUTH = 'false';
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

describe('Agents', () => {
  test('POST /api/agents (no name -> 400)', async () => { const r = await req('POST', '/api/agents', {}); expect(r.status).toBe(400); });
  test('POST /api/agents (ok)', async () => { const r = await req('POST', '/api/agents', { name: 'test-agent', role: 'worker' }); expect(r.status).toBe(201); expect(r.body.id).toBeDefined(); });
  test('GET /api/agents', async () => { const r = await req('GET', '/api/agents'); expect(r.status).toBe(200); expect(Array.isArray(r.body.agents)).toBe(true); });
  test('GET /api/agents/missing (404)', async () => { const r = await req('GET', '/api/agents/zzz'); expect(r.status).toBe(404); });
  test('DELETE /api/agents/missing (404)', async () => { const r = await req('DELETE', '/api/agents/zzz'); expect(r.status).toBe(404); });
});

describe('Assignments', () => {
  let agentId, assignmentId;
  test('create agent for assignment', async () => {
    const r = await req('POST', '/api/agents', { name: 'a2' });
    agentId = r.body.id;
  });
  test('POST /api/agents/:id/assign (no task -> 400)', async () => { const r = await req('POST', `/api/agents/${agentId}/assign`, {}); expect(r.status).toBe(400); });
  test('POST /api/agents/missing/assign (404)', async () => { const r = await req('POST', '/api/agents/zzz/assign', { task: 'x' }); expect(r.status).toBe(404); });
  test('POST /api/agents/:id/assign (ok)', async () => {
    const r = await req('POST', `/api/agents/${agentId}/assign`, { task: 'process item' });
    expect(r.status).toBe(201);
    assignmentId = r.body.id;
  });
  test('GET /api/agents/:id/tasks', async () => { const r = await req('GET', `/api/agents/${agentId}/tasks`); expect(r.status).toBe(200); expect(r.body.tasks.length).toBe(1); });
  test('GET /api/agents/missing/tasks (404)', async () => { const r = await req('GET', '/api/agents/zzz/tasks'); expect(r.status).toBe(404); });
  test('POST /api/assignments/:id/complete (missing -> 404)', async () => { const r = await req('POST', '/api/assignments/zzz/complete', { result: 'ok' }); expect(r.status).toBe(404); });
  test('POST /api/assignments/:id/complete (bad status -> 400)', async () => { const r = await req('POST', `/api/assignments/${assignmentId}/complete`, { status: 'galactic' }); expect(r.status).toBe(400); });
  test('POST /api/assignments/:id/complete (ok)', async () => { const r = await req('POST', `/api/assignments/${assignmentId}/complete`, { result: 'done' }); expect(r.status).toBe(200); expect(r.body.status).toBe('completed'); });
  test('GET /api/assignments', async () => { const r = await req('GET', '/api/assignments'); expect(r.status).toBe(200); });
  test('GET /api/runtime/audit', async () => { const r = await req('GET', '/api/runtime/audit'); expect(r.status).toBe(200); });
});