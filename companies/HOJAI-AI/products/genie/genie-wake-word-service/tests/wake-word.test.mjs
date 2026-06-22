/**
 * Wake-word → runtime/genie forward tests.
 *
 * Verifies that when a wake-word is detected:
 *   - /api/listen/start accepts userId + genieForward and persists them on the session
 *   - /api/listen/:sessionId/detect fires a forward to runtime/genie /api/voice/wake
 *   - /api/listen/:sessionId/forward lets callers toggle forwarding mid-session
 *   - /api/detect supports one-shot detection with userId (no session)
 *   - /api/integration/runtime-genie returns the configured URL + enabled flag
 *   - Failures in runtime/genie (down/unreachable) do NOT break detection
 *
 * Uses a tiny in-process mock for runtime/genie so we don't depend on a live
 * service.  All tests run against an isolated PORT and a temporary data dir so
 * PersistentMap doesn't leak between runs.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '0';
process.env.INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'test-internal-token';
// IMPORTANT: PersistentMap writes under .data dir relative to cwd — use a temp one.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const tmp = mkdtempSync(join(tmpdir(), 'genie-wake-word-test-'));
process.chdir(tmp);

import http from 'node:http';
import { app } from '../src/index.js';
import { createToken } from '@rtmn/shared/auth';

let server;
let port;
let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function bearer() {
  const tok = createToken({ userId: 'TEST-USER-1', businessId: 'TEST-BIZ-1', industry: 'test', role: 'owner' });
  return {
    'content-type': 'application/json',
    'authorization': `Bearer ${tok}`,
    'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
  };
}

async function req(method, path, body, headers = bearer()) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalHeaders = { ...headers };
  if (bodyStr) {
    finalHeaders['content-type'] = 'application/json';
    finalHeaders['content-length'] = Buffer.byteLength(bodyStr);
  }
  return new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: finalHeaders }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    // Allow GET by re-issuing with correct method
    if (method === 'GET') {
      // Re-issue with GET (http.request above was POST). Easiest: re-implement.
    }
    r.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

async function reqGet(path, headers = bearer()) {
  return new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    r.end();
  });
}

async function reqPut(path, body, headers = bearer()) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalHeaders = { ...headers };
  if (bodyStr) {
    finalHeaders['content-type'] = 'application/json';
    finalHeaders['content-length'] = Buffer.byteLength(bodyStr);
  }
  return new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port, path, method: 'PUT', headers: finalHeaders }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

// === Mock runtime/genie server ===
// Captures any POST /api/voice/wake and returns a fake sessionId.
function startMockRuntimeGenie() {
  const calls = [];
  const mock = http.createServer((req2, res2) => {
    let body = '';
    req2.on('data', (c) => (body += c));
    req2.on('end', () => {
      if (req2.method === 'POST' && req2.url === '/api/voice/wake') {
        const parsed = body ? JSON.parse(body) : {};
        calls.push({
          headers: req2.headers,
          body: parsed,
          ts: Date.now(),
        });
        res2.writeHead(200, { 'content-type': 'application/json' });
        res2.end(JSON.stringify({
          ok: true,
          data: {
            sessionId: 'rgsess-' + Math.random().toString(36).slice(2, 10),
            userId: parsed.userId,
            deviceId: parsed.deviceId,
            wakeWord: parsed.wakeWord,
            language: parsed.language,
          },
        }));
        return;
      }
      if (req2.method === 'GET' && req2.url === '/health') {
        res2.writeHead(200, { 'content-type': 'application/json' });
        res2.end(JSON.stringify({ ok: true }));
        return;
      }
      res2.writeHead(404);
      res2.end();
    });
  });
  return new Promise((resolve) => {
    mock.listen(0, '127.0.0.1', () => {
      const addr = mock.address();
      resolve({ mock, port: addr.port, calls });
    });
  });
}

async function run() {
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  port = server.address().port;

  console.log('\n[wake-word → runtime/genie forward] tests:');

  // --- Start mock runtime/genie on a random port and point env at it ---
  const { mock, port: mockPort, calls } = await startMockRuntimeGenie();
  process.env.RUNTIME_GENIE_URL = `http://127.0.0.1:${mockPort}`;
  process.env.USE_RUNTIME_GENIE_FORWARD = 'true';

  // === /api/integration/runtime-genie returns config ===
  const integ = await reqGet('/api/integration/runtime-genie');
  a('integration runtime-genie returns 200', integ.status === 200);
  a('integration enabled flag present', integ.data?.enabled === true);
  a('integration url points at mock', integ.data?.url === process.env.RUNTIME_GENIE_URL);

  // === /api/listen/start stores userId + genieForward on session ===
  const start = await req('POST', '/api/listen/start', {
    clientId: 'wake-word-test-1',
    language: 'english',
    userId: 'user-42',
    genieForward: true,
  });
  a('listen/start returns 201', start.status === 201);
  a('listen/start echoes userId', start.data?.userId === 'user-42');
  a('listen/start sets genieForward=true', start.data?.genieForward === true);
  const sessionId = start.data?.id;
  a('listen/start returns id', !!sessionId);

  // === /api/listen/:sessionId/detect with wake phrase forwards to mock ===
  const det = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'hey genie please turn on the lights',
    source: 'mic-test',
  });
  a('listen/detect returns 200', det.status === 200);
  a('listen/detect detected=true', det.data?.detected === true);
  a('listen/detect phrase is hey genie', det.data?.phrase === 'hey genie');
  a('listen/detect runtime_genie.sessionId present', !!det.data?.runtime_genie?.sessionId);
  // Wait for the forward to land (it's async via fetch)
  await new Promise((r) => setTimeout(r, 200));
  a('mock received 1 forward call', calls.length === 1);
  a('mock got correct userId', calls[0]?.body?.userId === 'user-42');
  a('mock got correct wakeWord', calls[0]?.body?.wakeWord === 'hey genie');
  a('mock got correct language', calls[0]?.body?.language === 'english');
  a('mock got deviceId', !!calls[0]?.body?.deviceId);
  a('mock got sessionId (detection id)', !!calls[0]?.body?.sessionId);
  a('mock got x-internal-token', calls[0]?.headers?.['x-internal-token'] === process.env.INTERNAL_SERVICE_TOKEN);

  // === /api/listen/:sessionId/forward lets us toggle forwarding mid-session ===
  const off = await reqPut(`/api/listen/${sessionId}/forward`, { genieForward: false });
  a('forward toggle returns 200', off.status === 200);
  a('forward toggle disabled genieForward', off.data?.genieForward === false);

  const det2 = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'hey genie again',
  });
  a('listen/detect still works', det2.status === 200);
  a('listen/detect after disable: runtime_genie=null', det2.data?.runtime_genie === null);
  await new Promise((r) => setTimeout(r, 100));
  a('mock still at 1 call after disable', calls.length === 1);

  // === Re-enable forwarding on the same session ===
  const on = await reqPut(`/api/listen/${sessionId}/forward`, { genieForward: true });
  a('forward re-enable 200', on.status === 200);
  a('forward re-enable sets genieForward=true', on.data?.genieForward === true);
  // (note: we did NOT add a new userId, so toggle should keep the existing userId)

  // === /api/detect one-shot with userId forwards without a session ===
  const oneShot = await req('POST', '/api/detect', {
    text: 'hey genie quick',
    language: 'english',
    userId: 'user-99',
    forwardToGenie: true,
  });
  a('one-shot detect returns 200', oneShot.status === 200);
  a('one-shot detect detected=true', oneShot.data?.detected === true);
  a('one-shot detect runtime_genie.sessionId present', !!oneShot.data?.runtime_genie?.sessionId);
  await new Promise((r) => setTimeout(r, 200));
  a('mock got a 2nd call from one-shot', calls.length === 2);
  a('one-shot call has userId=user-99', calls[1]?.body?.userId === 'user-99');

  // === Negative detection does NOT call mock ===
  const neg = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'nothing here',
  });
  a('negative detect returns 200', neg.status === 200);
  a('negative detect detected=false', neg.data?.detected === false);
  await new Promise((r) => setTimeout(r, 100));
  a('mock still at 2 calls after negative', calls.length === 2);

  // === Failed forward: mock returns 500, detection still succeeds ===
  const failMock = http.createServer((req2, res2) => {
    res2.writeHead(500);
    res2.end('boom');
  });
  await new Promise((r) => failMock.listen(0, '127.0.0.1', r));
  const failPort = failMock.address().port;
  process.env.RUNTIME_GENIE_URL = `http://127.0.0.1:${failPort}`;

  const det3 = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'hey genie once more',
  });
  a('detect still 200 when runtime/genie down', det3.status === 200);
  a('detect runtime_genie=null on 500', det3.data?.runtime_genie === null);

  // === Forward disabled entirely via env flag ===
  process.env.USE_RUNTIME_GENIE_FORWARD = 'false';
  const det4 = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'hey genie with forward off',
  });
  a('detect still 200 when forwarding disabled', det4.status === 200);
  a('runtime_genie=null when USE_RUNTIME_GENIE_FORWARD=false', det4.data?.runtime_genie === null);

  // === Missing userId = no forward even when enabled ===
  process.env.USE_RUNTIME_GENIE_FORWARD = 'true';
  process.env.RUNTIME_GENIE_URL = `http://127.0.0.1:${mockPort}`;
  const noUserStart = await req('POST', '/api/listen/start', {
    clientId: 'no-user-test',
    language: 'english',
    // userId intentionally omitted
    genieForward: true,
  });
  a('listen/start without userId still 201', noUserStart.status === 201);
  a('listen/start without userId genieForward=false', noUserStart.data?.genieForward === false);
  const noUserSid = noUserStart.data?.id;
  const noUserDet = await req('POST', `/api/listen/${noUserSid}/detect`, {
    text: 'hey genie no user',
  });
  a('detect without userId still 200', noUserDet.status === 200);
  a('detect without userId: runtime_genie=null', noUserDet.data?.runtime_genie === null);

  // === Auth required ===
  const noAuth = await req('POST', '/api/listen/start', { clientId: 'x', language: 'english' }, {
    'content-type': 'application/json',
    'content-length': 30,
  });
  a('listen/start without auth returns 401', noAuth.status === 401);

  // === Mock runtime/genie down (port closed) — service still detects ===
  mock.close();
  failMock.close();
  // Use a port that is definitely closed
  process.env.RUNTIME_GENIE_URL = 'http://127.0.0.1:1';
  const det5 = await req('POST', `/api/listen/${sessionId}/detect`, {
    text: 'hey genie unreachable',
  });
  a('detect still 200 when runtime/genie unreachable', det5.status === 200);
  a('runtime_genie=null when unreachable', det5.data?.runtime_genie === null);

  console.log(`\nWake-word → runtime/genie: ${p} passed, ${f} failed`);
  if (server) server.close();
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  if (server) server.close();
  process.exit(1);
});
