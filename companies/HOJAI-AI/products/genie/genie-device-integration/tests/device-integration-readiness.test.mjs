/**
 * genie-device-integration — readiness + seed tests (Phase A of Genie 100%).
 *
 * Spawns the service on an ephemeral port (with wake-word forwarding
 * disabled to avoid the live dependency), then asserts:
 *   - /health returns 200 with the seeded device counts
 *   - /api/llm-health, /api/db-health, /api/readiness all 200
 *   - GET /api/devices returns the 5 seeded devices
 *   - GET /api/device-types returns the 6 device types
 *   - GET /api/devices/:id returns a seeded device
 *   - GET /api/capabilities/:type returns capabilities
 *   - GET /api/statistics returns aggregate counts
 *   - GET /api/integration/wake-word returns the integration config
 *   - GET /ready returns 200
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

const INTERNAL_TOKEN = 'di-test-token-' + Date.now();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_aaaaa';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS  ${n}`)) : (f++, console.log(`  FAIL  ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'DI-USER-1', businessId: 'DI-BIZ', industry: 'devices', role: 'owner' });
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

async function waitReady(port, timeoutMs = 8000) {
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
    await wait(150);
  }
  return false;
}

function spawnService(env, label) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), `di-${label}-data-`));
        const child = spawn('node', [SRC], {
          cwd: SERVICE_DIR,
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
        child.stdout.on('data', (b) => { stdout += b.toString(); });
        child.stderr.on('data', (b) => { stderr += b.toString(); });
        child.on('exit', (code) => {
          reject(new Error(`Service ${label} exited (${code}):\n${stdout}\n${stderr}`));
        });
        const deadline = Date.now() + 8000;
        const tick = async () => {
          if (Date.now() > deadline) {
            child.kill('SIGTERM');
            reject(new Error(`Service ${label} didn't start within 8s:\n${stdout}\n${stderr}`));
            return;
          }
          if (/Listening on :/.test(stdout)) {
            resolve({ child, port, stdout, stderr });
            return;
          }
          await wait(120);
          tick();
        };
        tick();
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
  console.log('\n[genie-device-integration] readiness + seed tests:\n');

  const svc = await spawnService({ USE_WAKE_WORD_FORWARD: 'false' }, 'di');
  await waitReady(svc.port);
  a('service booted', true);

  // 1. /health
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports healthy', h.data?.status === 'healthy');
  a('/health has 6 device types', h.data?.counts?.deviceTypes === 6);
  a('/health shows 5 seeded devices', h.data?.counts?.devices === 5);
  a('/health shows >= 4 online devices', (h.data?.counts?.online || 0) >= 4);

  // 2. /ready
  const r = await req('GET', svc.port, '/ready');
  a('/ready returns 200', r.status === 200);
  a('/ready.ready === true', r.data?.ready === true);

  // 3. /api/llm-health
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-device-integration', lh.data?.data?.service === 'genie-device-integration');
  a('/api/llm-health has llm_available boolean', typeof lh.data?.data?.llm_available === 'boolean');

  // 4. /api/db-health
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health has mongo_connected boolean', typeof dh.data?.data?.mongo_connected === 'boolean');

  // 5. /api/readiness
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness reports service name', rd.data?.data?.service === 'genie-device-integration');
  a('/api/readiness.ready === true', rd.data?.data?.ready === true);
  a('/api/readiness has degraded boolean', typeof rd.data?.data?.degraded === 'boolean');

  // 6. Devices list
  const devs = await req('GET', svc.port, '/api/devices');
  a('GET /api/devices returns 200', devs.status === 200);
  a('GET /api/devices total=5', devs.data?.total === 5);
  a('GET /api/devices includes dev-001', devs.data?.devices?.some?.(d => d.id === 'dev-001'));

  // 7. Single device
  const d1 = await req('GET', svc.port, '/api/devices/dev-001');
  a('GET /api/devices/:id returns 200', d1.status === 200);
  a('GET /api/devices/dev-001 is smartphone', d1.data?.type === 'smartphone');

  // 8. Device types
  const types = await req('GET', svc.port, '/api/device-types');
  a('GET /api/device-types returns 200', types.status === 200);
  a('GET /api/device-types total=6', types.data?.total === 6);

  // 9. Capabilities
  const caps = await req('GET', svc.port, '/api/capabilities/smartphone');
  a('GET /api/capabilities/smartphone returns 200', caps.status === 200);
  a('smartphone has voice capability', caps.data?.capabilities?.includes('voice'));

  // 10. Statistics
  const stats = await req('GET', svc.port, '/api/statistics');
  a('GET /api/statistics returns 200', stats.status === 200);
  a('statistics total >= 5', (stats.data?.total || 0) >= 5);
  a('statistics has byType', typeof stats.data?.byType === 'object');

  // 11. Wake-word integration endpoint
  const ww = await req('GET', svc.port, '/api/integration/wake-word');
  a('GET /api/integration/wake-word returns 200', ww.status === 200);
  a('wake-word integration has enabled field', typeof ww.data?.enabled === 'boolean');

  // 12. Pairing codes seeded (round-trip via the existing POST endpoint)
  const pair = await req('POST', svc.port, '/api/pair/code', { userId: 'user-test', deviceType: 'smartphone' });
  a('POST /api/pair/code returns 201', pair.status === 201);
  a('pair code response has code field', typeof pair.data?.code === 'string');

  await killChild(svc.child);

  console.log(`\ngenie-device-integration: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});