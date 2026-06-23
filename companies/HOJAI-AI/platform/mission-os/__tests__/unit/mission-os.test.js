/**
 * mission-os - vitest unit tests
 */
'use strict';
process.env.MISSION_OS_NO_LISTEN = '1';
process.env.MISSION_OS_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, MISSION_STATUSES, TASK_STATUSES } = require('../../src/index');

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
  test('exports MISSION_STATUSES + TASK_STATUSES', () => {
    expect(MISSION_STATUSES).toContain('completed');
    expect(TASK_STATUSES).toContain('pending');
  });
});

describe('Health', () => {
  test('GET /health', async () => { const r = await req('GET', '/health'); expect(r.status).toBe(200); });
  test('GET /api/health', async () => { const r = await req('GET', '/api/health'); expect(r.status).toBe(200); });
  test('GET /ready', async () => { const r = await req('GET', '/ready'); expect(r.status).toBe(200); });
});

describe('Missions', () => {
  let missionId, taskId;
  test('POST /api/missions (no title -> 400)', async () => { const r = await req('POST', '/api/missions', { goal: 'x' }); expect(r.status).toBe(400); });
  test('POST /api/missions (no goal -> 400)', async () => { const r = await req('POST', '/api/missions', { title: 'x' }); expect(r.status).toBe(400); });
  test('POST /api/missions (ok)', async () => {
    const r = await req('POST', '/api/missions', { title: 'Test mission', goal: 'Achieve something' });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
    missionId = r.body.id;
  });
  test('GET /api/missions', async () => { const r = await req('GET', '/api/missions'); expect(r.status).toBe(200); expect(Array.isArray(r.body.missions)).toBe(true); });
  test('GET /api/missions/:id (with tasks array)', async () => { const r = await req('GET', `/api/missions/${missionId}`); expect(r.status).toBe(200); expect(r.body.tasks).toBeDefined(); });
  test('GET /api/missions/missing (404)', async () => { const r = await req('GET', '/api/missions/zzz'); expect(r.status).toBe(404); });
  test('PUT /api/missions/missing (404)', async () => { const r = await req('PUT', '/api/missions/zzz', { title: 'x' }); expect(r.status).toBe(404); });
  test('PUT /api/missions/:id (bad status -> 400)', async () => { const r = await req('PUT', `/api/missions/${missionId}`, { status: 'galactic' }); expect(r.status).toBe(400); });
  test('PUT /api/missions/:id (ok)', async () => { const r = await req('PUT', `/api/missions/${missionId}`, { status: 'active' }); expect(r.status).toBe(200); expect(r.body.status).toBe('active'); });
});

describe('Tasks', () => {
  let missionId, taskId;
  test('create mission for tasks', async () => {
    const r = await req('POST', '/api/missions', { title: 'T2', goal: 'G2' });
    missionId = r.body.id;
  });
  test('POST /api/missions/:id/tasks (missing mission -> 404)', async () => { const r = await req('POST', '/api/missions/zzz/tasks', { title: 't' }); expect(r.status).toBe(404); });
  test('POST /api/missions/:id/tasks (no title -> 400)', async () => { const r = await req('POST', `/api/missions/${missionId}/tasks`, {}); expect(r.status).toBe(400); });
  test('POST /api/missions/:id/tasks (ok)', async () => {
    const r = await req('POST', `/api/missions/${missionId}/tasks`, { title: 'first task' });
    expect(r.status).toBe(201);
    taskId = r.body.id;
  });
  test('PUT task/missing (404)', async () => { const r = await req('PUT', `/api/missions/${missionId}/tasks/zzz`, { status: 'completed' }); expect(r.status).toBe(404); });
  test('PUT task (bad status -> 400)', async () => { const r = await req('PUT', `/api/missions/${missionId}/tasks/${taskId}`, { status: 'galactic' }); expect(r.status).toBe(400); });
  test('PUT task (ok -> completed)', async () => { const r = await req('PUT', `/api/missions/${missionId}/tasks/${taskId}`, { status: 'completed' }); expect(r.status).toBe(200); expect(r.body.status).toBe('completed'); });
  test('POST /api/missions/:id/complete', async () => {
    const r = await req('POST', `/api/missions/${missionId}/complete`, {});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('completed');
    expect(r.body.progress).toBe(1);
  });
  test('GET /api/missions/audit', async () => { const r = await req('GET', '/api/missions/audit'); expect(r.status).toBe(200); });
});