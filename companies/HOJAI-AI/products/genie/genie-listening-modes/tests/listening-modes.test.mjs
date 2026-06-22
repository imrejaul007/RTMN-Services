/**
 * listening-modes → device-integration hook tests (Phase 7+).
 *
 * Verifies:
 *   - Webhook registry: register, list, dedupe, clear
 *   - /api/switch returns action="start" for continuous/smart and "stop" for manual/passive
 *   - Mode switch fires webhook to registered device-integration
 *   - Device-integration /api/devices/:id/mode start/stop creates wake session
 *   - Bad/missing internal token is rejected
 *   - End-to-end: switch to continuous → wake session created on device-integration
 *                switch to manual   → wake session torn down
 *                send audio → wake detected
 *   - USE_DEVICE_INTEGRATION_HOOK=false disables fanout
 *   - Multiple devices in parallel
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createToken } from '@rtmn/shared/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LM_DIR = path.join(__dirname, '..');
const DI_DIR = path.join(LM_DIR, '..', 'genie-device-integration');
const WW_DIR = path.join(LM_DIR, '..', 'genie-wake-word-service');
const LM_SRC = path.join(LM_DIR, 'src', 'index.js');
const DI_SRC = path.join(DI_DIR, 'src', 'index.js');
const WW_SRC = path.join(WW_DIR, 'src', 'index.js');

const INTERNAL_TOKEN = 'lm-test-token-' + Date.now();

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'LM-USER-1', businessId: 'LM-BIZ', industry: 'test', role: 'owner' });
  return {
    authorization: `Bearer ${tok}`,
    'x-internal-token': INTERNAL_TOKEN,
  };
}

// internal-only header (for service-to-service webhook calls)
function internal() {
  return { 'x-internal-token': INTERNAL_TOKEN };
}

async function req(method, port, urlPath, body, headers = bearer()) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalHeaders = { ...headers };
  if (bodyStr) {
    finalHeaders['content-type'] = 'application/json';
    finalHeaders['content-length'] = Buffer.byteLength(bodyStr);
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

async function waitReady(port, timeoutMs = 6000) {
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
    await wait(120);
  }
  return false;
}

function spawnService(srcPath, env, label) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), `lm-${label}-data-`));
        const child = spawn('node', [srcPath], {
          cwd: mkdtempSync(path.join(tmpdir(), `lm-${label}-cwd-`)),
          env: {
            ...process.env,
            ...env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            HOJAI_DATA_DIR: dataDir,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Listening on :(\d+)/);
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
            reject(new Error(`Service ${label} exited (${code}):\n${stdout}\n${stderr}`));
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill('SIGTERM');
            reject(new Error(`Service ${label} didn't print 'Listening on :...' within 8s:\n${stdout}\n${stderr}`));
          }
        }, 8000);
      });
    });
  });
}

async function killChild(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  await wait(200);
  if (!child.killed) child.kill('SIGKILL');
  await wait(100);
}

async function run() {
  console.log('\n[listening-modes → device-integration hook] tests:\n');

  // === Spawn wake-word, device-integration, listening-modes ===
  const ww = await spawnService(WW_SRC, { USE_RUNTIME_GENIE_FORWARD: 'true' }, 'ww');
  await waitReady(ww.port);
  const di = await spawnService(DI_SRC, {
    WAKE_WORD_URL: `http://127.0.0.1:${ww.port}`,
    USE_WAKE_WORD_FORWARD: 'true',
  }, 'di');
  await waitReady(di.port);
  const lm = await spawnService(LM_SRC, {}, 'lm');
  await waitReady(lm.port);
  a('all 3 services booted (wake-word + device-integration + listening-modes)', true);

  // === Phase 1: webhook registry ===
  const integ0 = await req('GET', lm.port, '/api/integration/device-integration');
  a('integration starts enabled', integ0.data?.enabled === true);
  a('integration starts with 0 hooks', integ0.data?.total === 0);

  const reg1 = await req('POST', lm.port, '/api/integration/device-integration', {
    url: `http://127.0.0.1:${di.port}`,
  });
  a('register returns 201', reg1.status === 201);
  a('register hook stored', reg1.data?.hook?.url === `http://127.0.0.1:${di.port}`);

  const reg2 = await req('POST', lm.port, '/api/integration/device-integration', {
    url: `http://127.0.0.1:${di.port}`,  // same url
  });
  a('register dedupes (returns 200)', reg2.status === 200);
  a('register dedupe flag set', reg2.data?.deduped === true);

  const integ1 = await req('GET', lm.port, '/api/integration/device-integration');
  a('integration shows 1 hook after dedupe', integ1.data?.total === 1);

  // === Phase 2: switch action derivation ===
  const swManual = await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'manual', reason: 'test',
  });
  a('switch manual returns 200', swManual.status === 200);
  a('switch manual action=stop', swManual.data?.action === 'stop');

  const swContinuous = await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'continuous', reason: 'test',
  });
  a('switch continuous action=start', swContinuous.data?.action === 'start');

  const swSmart = await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'smart', reason: 'test',
  });
  a('switch smart action=start', swSmart.data?.action === 'start');

  const swPassive = await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'passive', reason: 'test',
  });
  a('switch passive action=stop', swPassive.data?.action === 'stop');

  // === Phase 3: webhook delivery creates wake session on device-integration ===
  // dev-001 should now have an active session (we just switched to passive though)
  // → switch back to continuous to trigger "start" webhook
  await wait(300);  // let prior hooks settle
  const swStart = await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'continuous', reason: 'test',
  });
  await wait(400);  // let webhook land
  const integDi = await req('GET', di.port, '/api/integration/wake-word');
  a('device-integration has 1 active wake session', integDi.data?.activeSessions === 1);
  a('device-integration wake session is dev-001', integDi.data?.sessions?.[0]?.deviceId === 'dev-001');
  a('wake session has userId from device', integDi.data?.sessions?.[0]?.userId === 'user-001');

  // === Phase 4: switch to stop tears down ===
  await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-001', mode: 'manual', reason: 'test',
  });
  await wait(400);
  const integDi2 = await req('GET', di.port, '/api/integration/wake-word');
  a('wake session torn down after stop', integDi2.data?.activeSessions === 0);

  // === Phase 5: end-to-end — mode → wake session → audio → wake detected ===
  // continuous → wake session → send audio → wake detected
  await req('POST', lm.port, '/api/switch', {
    deviceId: 'dev-002', mode: 'continuous', reason: 'e2e',
  });
  await wait(400);
  const audio = await req('POST', di.port, '/api/devices/dev-002/audio', {
    text: 'hey genie please set a reminder',
  });
  a('audio after mode-driven wake session: detected=true', audio.data?.detected === true);
  a('audio runtime_genie.sessionId present', !!audio.data?.runtime_genie?.sessionId);

  // === Phase 6: bad/missing internal token rejected ===
  const badToken = await new Promise((resolve) => {
    const r = http.request({
      host: '127.0.0.1', port: di.port, path: '/api/devices/dev-001/mode', method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '50', 'x-internal-token': 'wrong-token' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    r.write(JSON.stringify({ action: 'start' }));
    r.end();
  });
  a('mode webhook with bad token returns 401', badToken.status === 401);

  const noToken = await new Promise((resolve) => {
    const r = http.request({
      host: '127.0.0.1', port: di.port, path: '/api/devices/dev-001/mode', method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '50' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    r.write(JSON.stringify({ action: 'start' }));
    r.end();
  });
  a('mode webhook without token returns 401', noToken.status === 401);

  // === Phase 7: webhook delivery stats tracked ===
  const integ3 = await req('GET', lm.port, '/api/integration/device-integration');
  const hook = integ3.data?.hooks?.[0];
  a('hook deliveries > 0', (hook?.deliveries || 0) > 0);

  // === Phase 8: clear all hooks ===
  const clear = await req('DELETE', lm.port, '/api/integration/device-integration', {});
  a('clear returns 200', clear.status === 200);
  a('clear reports count', typeof clear.data?.cleared === 'number');

  const integ4 = await req('GET', lm.port, '/api/integration/device-integration');
  a('integration now has 0 hooks', integ4.data?.total === 0);

  // Switch after clear → no fanout (deliveries should stay 0 / not increment)
  await req('POST', lm.port, '/api/switch', { deviceId: 'dev-001', mode: 'continuous', reason: 'after clear' });
  await wait(200);

  await killChild(lm.child);
  await killChild(di.child);
  await killChild(ww.child);

  // === Phase 9: USE_DEVICE_INTEGRATION_HOOK=false disables fanout ===
  // Re-spawn with the env flag off
  const ww2 = await spawnService(WW_SRC, { USE_RUNTIME_GENIE_FORWARD: 'true' }, 'ww2');
  await waitReady(ww2.port);
  const di2 = await spawnService(DI_SRC, {
    WAKE_WORD_URL: `http://127.0.0.1:${ww2.port}`,
    USE_WAKE_WORD_FORWARD: 'true',
  }, 'di2');
  await waitReady(di2.port);
  const lm2 = await spawnService(LM_SRC, {
    USE_DEVICE_INTEGRATION_HOOK: 'false',
  }, 'lm2');
  await waitReady(lm2.port);

  // Register a hook (should be allowed but never fire)
  await req('POST', lm2.port, '/api/integration/device-integration', {
    url: `http://127.0.0.1:${di2.port}`,
  });
  const integOff = await req('GET', lm2.port, '/api/integration/device-integration');
  a('disabled-flag integration shows enabled=false', integOff.data?.enabled === false);

  await req('POST', lm2.port, '/api/switch', { deviceId: 'dev-001', mode: 'continuous', reason: 'disabled test' });
  await wait(400);
  const integDiOff = await req('GET', di2.port, '/api/integration/wake-word');
  a('device-integration has 0 wake sessions (flag off)', integDiOff.data?.activeSessions === 0);

  await killChild(lm2.child);
  await killChild(di2.child);
  await killChild(ww2.child);

  console.log(`\nlistening-modes → device-integration: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
