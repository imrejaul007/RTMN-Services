/**
 * device-integration → wake-word integration tests.
 *
 * Verifies that when a device sends audio (transcript) to
 *   POST /api/devices/:id/audio
 * the device-integration service forwards it to the wake-word service
 * /api/listen/:sessionId/detect which detects the wake phrase.
 *
 * Tests:
 *   - /api/integration/wake-word returns config
 *   - /api/devices/:id/listen/start creates a wake session and stores mapping
 *   - /api/devices/:id/audio forwards to wake-word and returns detected=true
 *   - audio without wake phrase returns detected=false
 *   - /api/devices/:id/audio without listen/start returns 409
 *   - /api/devices/:id/listen/stop tears down the mapping
 *   - Wake-word service unreachable → /api/devices/:id/listen/start returns 502
 *   - /api/devices/:id/audio forwards userId to wake-word correctly
 *   - Auth required
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createToken } from '@rtmn/shared/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DI_DIR = path.join(__dirname, '..');
const DI_SRC = path.join(DI_DIR, 'src', 'index.js');
const WW_SRC = path.join(DI_DIR, '..', 'genie-wake-word-service', 'src', 'index.js');

const tmp = mkdtempSync(path.join(tmpdir(), 'genie-device-integration-test-'));
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

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

function spawnService(srcPath, env, portEnv) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        // Per-spawn data dir so PersistentMap doesn't bleed between tests.
        const dataDir = mkdtempSync(path.join(tmpdir(), 'genie-di-data-'));
        const child = spawn('node', [srcPath], {
          cwd: tmp,
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
            reject(new Error(`Service exited (${code}):\n${stdout}\n${stderr}`));
          }
        });
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

// Pre-allocate a port we can use as a "fake" wake-word that's just closed.
async function reserveClosedPort() {
  return new Promise((resolve) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

async function run() {
  console.log('\n[device-integration → wake-word] tests:');

  // === Phase 1: spawn wake-word + device-integration together ===
  const { child: wwChild, port: wwPort } = await spawnService(WW_SRC, {
    USE_RUNTIME_GENIE_FORWARD: 'true',
  }, 'ww');
  await waitReady(wwPort);
  a('wake-word booted', wwPort > 0);

  const { child: diChild, port: diPort } = await spawnService(DI_SRC, {
    WAKE_WORD_URL: `http://127.0.0.1:${wwPort}`,
    USE_WAKE_WORD_FORWARD: 'true',
  }, 'di');
  await waitReady(diPort);
  a('device-integration booted', diPort > 0);

  // === /api/integration/wake-word returns config ===
  const integ = await req('GET', diPort, '/api/integration/wake-word');
  a('integration returns 200', integ.status === 200);
  a('integration enabled=true', integ.data?.enabled === true);
  a('integration url matches', integ.data?.url === `http://127.0.0.1:${wwPort}`);
  a('integration starts with 0 sessions', integ.data?.activeSessions === 0);

  // === Start listening for dev-001 (seeded smartphone, user-001) ===
  const start = await req('POST', diPort, '/api/devices/dev-001/listen/start', {
    language: 'english',
  });
  a('listen/start returns 201', start.status === 201);
  a('listen/start echoes deviceId', start.data?.deviceId === 'dev-001');
  a('listen/start has wakeSessionId', !!start.data?.wakeSessionId);
  a('listen/start has userId from device', start.data?.userId === 'user-001');
  a('listen/start genieForward=true', start.data?.genieForward === true);

  // === integration now shows 1 active session ===
  const integ2 = await req('GET', diPort, '/api/integration/wake-word');
  a('integration shows 1 active session', integ2.data?.activeSessions === 1);
  a('integration lists dev-001', integ2.data?.sessions?.[0]?.deviceId === 'dev-001');

  // === /api/devices/:id/audio with wake phrase → detected=true ===
  const audio1 = await req('POST', diPort, '/api/devices/dev-001/audio', {
    text: 'hey genie please turn on the lights',
  });
  a('audio returns 200', audio1.status === 200);
  a('audio detected=true', audio1.data?.detected === true);
  a('audio wakeWord=hey genie', audio1.data?.wakeWord === 'hey genie');
  a('audio language=english', audio1.data?.language === 'english');
  a('audio has wakeSessionId', !!audio1.data?.wakeSessionId);
  // runtime_genie will be null because there's no RUNTIME_GENIE_URL on the
  // wake-word service in this test (we only set USE_RUNTIME_GENIE_FORWARD).
  // That just verifies the field is plumbed through correctly.
  a('audio runtime_genie field present (null is ok)', 'runtime_genie' in audio1.data);

  // === /api/devices/:id/audio with negative text → detected=false ===
  const audio2 = await req('POST', diPort, '/api/devices/dev-001/audio', {
    text: 'just chatting, no wake word here',
  });
  a('audio no-wake returns 200', audio2.status === 200);
  a('audio no-wake detected=false', audio2.data?.detected === false);
  a('audio no-wake wakeWord=null', audio2.data?.wakeWord === null);

  // === /api/devices/:id/audio without listen/start → 409 ===
  const audio3 = await req('POST', diPort, '/api/devices/dev-002/audio', {
    text: 'hey genie',
  });
  a('audio without session returns 409', audio3.status === 409);

  // === Missing device → 404 ===
  const audio4 = await req('POST', diPort, '/api/devices/does-not-exist/audio', {
    text: 'hey genie',
  });
  a('audio with unknown device returns 404', audio4.status === 404);

  // === Missing text → 400 ===
  const audio5 = await req('POST', diPort, '/api/devices/dev-001/audio', {});
  a('audio without text returns 400', audio5.status === 400);

  // === /api/devices/:id/listen/stop ===
  const stop = await req('POST', diPort, '/api/devices/dev-001/listen/stop', {});
  a('listen/stop returns 200', stop.status === 200);
  a('listen/stop stopped=true', stop.data?.stopped === true);

  // === After stop, audio returns 409 ===
  const audio6 = await req('POST', diPort, '/api/devices/dev-001/audio', {
    text: 'hey genie after stop',
  });
  a('audio after stop returns 409', audio6.status === 409);

  // === Restart listen on dev-002 (seeded earbuds, user-002) ===
  const start2 = await req('POST', diPort, '/api/devices/dev-002/listen/start', {
    language: 'english',
    userId: 'custom-user',
    genieForward: false,  // turn off the runtime/genie forward
  });
  a('listen/start2 returns 201', start2.status === 201);
  a('listen/start2 custom userId', start2.data?.userId === 'custom-user');
  a('listen/start2 genieForward=false', start2.data?.genieForward === false);

  const audio7 = await req('POST', diPort, '/api/devices/dev-002/audio', {
    text: 'hey genie custom user',
  });
  a('audio on dev-002 detected=true', audio7.data?.detected === true);

  // === Auth required ===
  const noAuth = await req('POST', diPort, '/api/devices/dev-001/listen/start', {}, {
    'content-type': 'application/json',
    'content-length': 2,
  });
  a('listen/start without auth returns 401', noAuth.status === 401);

  // === listen/stop on device with no session → 404 ===
  const stop2 = await req('POST', diPort, '/api/devices/dev-001/listen/stop', {});
  a('listen/stop without session returns 404', stop2.status === 404);

  wwChild.kill('SIGTERM');
  diChild.kill('SIGTERM');
  await wait(500);

  // === Phase 2: wake-word unreachable ===
  const closedPort = await reserveClosedPort();
  const { child: diChild2, port: diPort2 } = await spawnService(DI_SRC, {
    WAKE_WORD_URL: `http://127.0.0.1:${closedPort}`,
    USE_WAKE_WORD_FORWARD: 'true',
  }, 'di2');
  await waitReady(diPort2);

  const start3 = await req('POST', diPort2, '/api/devices/dev-003/listen/start', {
    language: 'english',
  });
  a('listen/start with bad wake-word returns 502', start3.status === 502);

  diChild2.kill('SIGTERM');
  await wait(500);

  // === Phase 3: USE_WAKE_WORD_FORWARD=false ===
  const { child: diChild3, port: diPort3 } = await spawnService(DI_SRC, {
    WAKE_WORD_URL: `http://127.0.0.1:${wwPort}`,
    USE_WAKE_WORD_FORWARD: 'false',
  }, 'di3');
  // ww was killed earlier, but we only need the env flag check on /listen/start
  await waitReady(diPort3);
  const start4 = await req('POST', diPort3, '/api/devices/dev-001/listen/start', {
    language: 'english',
  });
  a('listen/start with USE_WAKE_WORD_FORWARD=false returns 503', start4.status === 503);

  const integ3 = await req('GET', diPort3, '/api/integration/wake-word');
  a('integration enabled=false when USE_WAKE_WORD_FORWARD=false', integ3.data?.enabled === false);
  diChild3.kill('SIGTERM');

  console.log(`\ndevice-integration → wake-word: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
