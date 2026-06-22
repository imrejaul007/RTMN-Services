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
 * Uses a tiny in-process mock for runtime/genie and spawns the wake-word service
 * as a child node process so we don't need to refactor its CJS main entry.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createToken } from '@rtmn/shared/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_DIR = path.join(__dirname, '..');
const SRC = path.join(SERVICE_DIR, 'src', 'index.js');

// Use a per-test temp data dir so PersistentMap doesn't leak between runs
const tmp = mkdtempSync(path.join(tmpdir(), 'genie-wake-word-test-'));

const INTERNAL_TOKEN = 'test-internal-token-' + Date.now();

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function bearer() {
  const tok = createToken({ userId: 'TEST-USER-1', businessId: 'TEST-BIZ-1', industry: 'test', role: 'owner' });
  return {
    authorization: `Bearer ${tok}`,
    'x-internal-token': INTERNAL_TOKEN,
  };
}

async function req(method, port, urlPath, body, headers = bearer()) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalHeaders = { ...headers };
  if (bodyStr) {
    finalHeaders['content-type'] = 'application/json';
    finalHeaders['content-length'] = Buffer.byteLength(bodyStr);
  } else if (method !== 'GET') {
    finalHeaders['content-length'] = 0;
  }
  return new Promise((resolve) => {
    const r = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers: finalHeaders }, (res) => {
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
// Can be configured to return 500 via ?fail=1 query param.
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
        // Force a fail by setting port env? No — keep simple: always 200
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

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Wait until /health returns 200 on the given port (or timeout)
async function waitReady(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await new Promise((resolve, reject) => {
        const req2 = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET' }, (res2) => {
          res2.resume();
          resolve(res2.statusCode);
        });
        req2.on('error', reject);
        req2.end();
      });
      if (r === 200) return true;
    } catch {}
    await wait(100);
  }
  return false;
}

function spawnService(env) {
  return new Promise((resolve, reject) => {
    // Pre-allocate a free port by listening on 0 then closing
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const child = spawn('node', [SRC], {
          cwd: tmp,
          env: {
            ...process.env,
            ...env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let resolved = false;

        const onLine = (line) => {
          // The service uses console.log with ANSI, so look for the port after stripping
          const m = line.replace(/\[[0-9;]*m/g, '').match(/Listening on :(\d+)/);
          if (m && !resolved) {
            resolved = true;
            resolve({ child, port: parseInt(m[1], 10), stdout, stderr });
          }
        };

        child.stdout.on('data', (b) => {
          const s = b.toString();
          stdout += s;
          s.split('\n').forEach(onLine);
        });
        child.stderr.on('data', (b) => { stderr += b.toString(); });

        child.on('exit', (code) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`Service exited early (code ${code}):\n${stdout}\n${stderr}`));
          }
        });

        // Safety timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill('SIGTERM');
            reject(new Error(`Service didn't print 'Listening on :...' within 8s:\n${stdout}\n${stderr}`));
          }
        }, 8000);
      });
    });
  });
}

async function run() {
  console.log('\n[wake-word → runtime/genie forward] tests:');

  // --- Start mock runtime/genie on a random port ---
  const { mock, port: mockPort, calls } = await startMockRuntimeGenie();
  const mockUrl = `http://127.0.0.1:${mockPort}`;

  // --- Spawn wake-word service pointing at the mock ---
  const { child, port: wakePort } = await spawnService({
    RUNTIME_GENIE_URL: mockUrl,
    USE_RUNTIME_GENIE_FORWARD: 'true',
  });
  a('wake-word service booted', !!wakePort);

  const ready = await waitReady(wakePort);
  a('wake-word service ready', ready === true);

  // === /api/integration/runtime-genie returns config ===
  const integ = await req('GET', wakePort, '/api/integration/runtime-genie');
  a('integration runtime-genie returns 200', integ.status === 200);
  a('integration enabled flag present', integ.data?.enabled === true);
  a('integration url points at mock', integ.data?.url === mockUrl);

  // === /api/listen/start stores userId + genieForward on session ===
  const start = await req('POST', wakePort, '/api/listen/start', {
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
  const det = await req('POST', wakePort, `/api/listen/${sessionId}/detect`, {
    text: 'hey genie please turn on the lights',
    source: 'mic-test',
  });
  a('listen/detect returns 200', det.status === 200);
  a('listen/detect detected=true', det.data?.detected === true);
  a('listen/detect phrase is hey genie', det.data?.phrase === 'hey genie');
  a('listen/detect runtime_genie.sessionId present', !!det.data?.runtime_genie?.sessionId);
  await wait(250);
  a('mock received 1 forward call', calls.length === 1);
  a('mock got correct userId', calls[0]?.body?.userId === 'user-42');
  a('mock got correct wakeWord', calls[0]?.body?.wakeWord === 'hey genie');
  a('mock got correct language', calls[0]?.body?.language === 'english');
  a('mock got deviceId', !!calls[0]?.body?.deviceId);
  a('mock got sessionId (detection id)', !!calls[0]?.body?.sessionId);
  a('mock got x-internal-token', calls[0]?.headers?.['x-internal-token'] === INTERNAL_TOKEN);

  // === /api/listen/:sessionId/forward lets us toggle forwarding mid-session ===
  const off = await req('PUT', wakePort, `/api/listen/${sessionId}/forward`, { genieForward: false });
  a('forward toggle returns 200', off.status === 200);
  a('forward toggle disabled genieForward', off.data?.genieForward === false);

  const det2 = await req('POST', wakePort, `/api/listen/${sessionId}/detect`, {
    text: 'hey genie again',
  });
  a('listen/detect still works', det2.status === 200);
  a('listen/detect after disable: runtime_genie=null', det2.data?.runtime_genie === null);
  await wait(150);
  a('mock still at 1 call after disable', calls.length === 1);

  // === Re-enable forwarding on the same session ===
  const on = await req('PUT', wakePort, `/api/listen/${sessionId}/forward`, { genieForward: true });
  a('forward re-enable 200', on.status === 200);
  a('forward re-enable sets genieForward=true', on.data?.genieForward === true);

  // === /api/detect one-shot with userId forwards without a session ===
  const oneShot = await req('POST', wakePort, '/api/detect', {
    text: 'hey genie quick',
    language: 'english',
    userId: 'user-99',
    forwardToGenie: true,
  });
  a('one-shot detect returns 200', oneShot.status === 200);
  a('one-shot detect detected=true', oneShot.data?.detected === true);
  a('one-shot detect runtime_genie.sessionId present', !!oneShot.data?.runtime_genie?.sessionId);
  await wait(250);
  a('mock got a 2nd call from one-shot', calls.length === 2);
  a('one-shot call has userId=user-99', calls[1]?.body?.userId === 'user-99');

  // === Negative detection does NOT call mock ===
  const neg = await req('POST', wakePort, `/api/listen/${sessionId}/detect`, {
    text: 'nothing here',
  });
  a('negative detect returns 200', neg.status === 200);
  a('negative detect detected=false', neg.data?.detected === false);
  await wait(100);
  a('mock still at 2 calls after negative', calls.length === 2);

  // === Failed forward: mock returns 500, detection still succeeds ===
  const failMock = http.createServer((req2, res2) => {
    res2.writeHead(500);
    res2.end('boom');
  });
  await new Promise((r) => failMock.listen(0, '127.0.0.1', r));
  const failPort = failMock.address().port;
  child.kill('SIGTERM');
  await wait(500);

  // Re-spawn with bad URL
  const { child: child2, port: wakePort2 } = await spawnService({
    RUNTIME_GENIE_URL: `http://127.0.0.1:${failPort}`,
    USE_RUNTIME_GENIE_FORWARD: 'true',
  });
  await waitReady(wakePort2);
  const start2 = await req('POST', wakePort2, '/api/listen/start', {
    clientId: 'fail-test', language: 'english', userId: 'user-77', genieForward: true,
  });
  const det3 = await req('POST', wakePort2, `/api/listen/${start2.data.id}/detect`, {
    text: 'hey genie with 500',
  });
  a('detect still 200 when runtime/genie 500s', det3.status === 200);
  a('detect runtime_genie=null on 500', det3.data?.runtime_genie === null);
  child2.kill('SIGTERM');
  await wait(500);

  // === Forward disabled entirely via env flag ===
  const { child: child3, port: wakePort3 } = await spawnService({
    RUNTIME_GENIE_URL: mockUrl,
    USE_RUNTIME_GENIE_FORWARD: 'false',
  });
  await waitReady(wakePort3);
  const start3 = await req('POST', wakePort3, '/api/listen/start', {
    clientId: 'off-test', language: 'english', userId: 'user-88', genieForward: true,
  });
  // When USE_RUNTIME_GENIE_FORWARD=false, genieForward should be forced off
  a('genieForward forced false when USE_RUNTIME_GENIE_FORWARD=false', start3.data?.genieForward === false);
  const det4 = await req('POST', wakePort3, `/api/listen/${start3.data.id}/detect`, {
    text: 'hey genie with forward off',
  });
  a('detect still 200 when forwarding disabled', det4.status === 200);
  a('runtime_genie=null when USE_RUNTIME_GENIE_FORWARD=false', det4.data?.runtime_genie === null);
  child3.kill('SIGTERM');
  await wait(500);

  // === Missing userId = no forward even when enabled ===
  const { child: child4, port: wakePort4 } = await spawnService({
    RUNTIME_GENIE_URL: mockUrl,
    USE_RUNTIME_GENIE_FORWARD: 'true',
  });
  await waitReady(wakePort4);
  const noUserStart = await req('POST', wakePort4, '/api/listen/start', {
    clientId: 'no-user-test',
    language: 'english',
    // userId intentionally omitted
    genieForward: true,
  });
  a('listen/start without userId still 201', noUserStart.status === 201);
  a('listen/start without userId genieForward=false', noUserStart.data?.genieForward === false);
  const noUserSid = noUserStart.data?.id;
  const noUserDet = await req('POST', wakePort4, `/api/listen/${noUserSid}/detect`, {
    text: 'hey genie no user',
  });
  a('detect without userId still 200', noUserDet.status === 200);
  a('detect without userId: runtime_genie=null', noUserDet.data?.runtime_genie === null);
  child4.kill('SIGTERM');
  await wait(500);

  // === Mock closed (unreachable) — service still detects ===
  mock.close();
  const { child: child5, port: wakePort5 } = await spawnService({
    RUNTIME_GENIE_URL: mockUrl,  // mock already closed
    USE_RUNTIME_GENIE_FORWARD: 'true',
  });
  await waitReady(wakePort5);
  const start5 = await req('POST', wakePort5, '/api/listen/start', {
    clientId: 'unreach-test', language: 'english', userId: 'user-66', genieForward: true,
  });
  const det5 = await req('POST', wakePort5, `/api/listen/${start5.data.id}/detect`, {
    text: 'hey genie unreachable',
  });
  a('detect still 200 when runtime/genie unreachable', det5.status === 200);
  a('runtime_genie=null when unreachable', det5.data?.runtime_genie === null);
  child5.kill('SIGTERM');

  console.log(`\nWake-word → runtime/genie: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
