/**
 * genie-gateway — readiness + seed tests (Phase A of Genie 100%).
 *
 * Spawns the service on an ephemeral port, then asserts:
 *   - /health returns 200 with the gateway service metadata
 *   - /api/llm-health, /api/db-health, /api/readiness all 200
 *   - /api/services returns the configured service registry
 *   - /api/sessions/:userId returns the seeded sessions
 *   - /api/health-cache returns the seeded cache entries
 *   - /ready returns 200 (with service statuses — likely all 'down' since
 *     no downstream services are running in this test, but the route must
 *     respond and report structured service statuses)
 *   - POST /api/query returns the AI-stub response shape
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

const INTERNAL_TOKEN = 'gw-test-token-' + Date.now();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_aaaaa';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS  ${n}`)) : (f++, console.log(`  FAIL  ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'GW-USER-1', businessId: 'GW-BIZ', industry: 'gateway', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), `gw-${label}-data-`));
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
          if (/Genie Gateway started on port/.test(stdout) || /Listening on port/.test(stdout)) {
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
  console.log('\n[genie-gateway] readiness + seed tests:\n');

  const svc = await spawnService({}, 'gw');
  await waitReady(svc.port);
  a('service booted', true);

  // 1. /health
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports healthy', h.data?.status === 'healthy');
  a('/health reports service name', h.data?.service === 'genie-gateway');

  // 2. /ready (this hits downstream services that won't be reachable — the
  // route should still respond with a structured status)
  const r = await req('GET', svc.port, '/ready');
  a('/ready returns 200', r.status === 200);
  a('/ready has services map', typeof r.data?.services === 'object');
  a('/ready has ready boolean', typeof r.data?.ready === 'boolean');

  // 3. /api/llm-health
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-gateway', lh.data?.data?.service === 'genie-gateway');
  a('/api/llm-health has llm_available boolean', typeof lh.data?.data?.llm_available === 'boolean');

  // 4. /api/db-health
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health has mongo_connected boolean', typeof dh.data?.data?.mongo_connected === 'boolean');

  // 5. /api/readiness
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness reports service name', rd.data?.data?.service === 'genie-gateway');
  a('/api/readiness.ready === true', rd.data?.data?.ready === true);
  a('/api/readiness has degraded boolean', typeof rd.data?.data?.degraded === 'boolean');

  // 6. /api/services — registry of configured downstream services
  const svcs = await req('GET', svc.port, '/api/services');
  a('GET /api/services returns 200', svcs.status === 200);
  a('/api/services has services array', Array.isArray(svcs.data?.services));
  a('/api/services has >= 10 services', (svcs.data?.services?.length || 0) >= 10);
  a('/api/services includes memory service', svcs.data?.services?.some?.(s => s.name === 'memory'));

  // 7. /api/sessions/:userId (seeded data)
  const sess = await req('GET', svc.port, '/api/sessions/user-demo-1');
  a('GET /api/sessions/:userId returns 200', sess.status === 200);
  a('sessions total >= 3 for user-demo-1', (sess.data?.total || 0) >= 3);
  a('sessions include memory service call', sess.data?.sessions?.some?.(s => s.service === 'memory'));

  // 8. /api/health-cache (seeded data)
  const hc = await req('GET', svc.port, '/api/health-cache');
  a('GET /api/health-cache returns 200', hc.status === 200);
  a('health-cache total >= 10', (hc.data?.total || 0) >= 10);
  a('health-cache has memory entry', hc.data?.cache?.some?.(c => c.name === 'memory'));

  // 9. POST /api/query (stub AI response)
  const q = await req('POST', svc.port, '/api/query', { query: 'What\'s the weather today?', userId: 'user-demo-1' });
  a('POST /api/query returns 200', q.status === 200);
  a('query response has type=weather', q.data?.response?.type === 'weather');
  a('query response has requestId', typeof q.data?.requestId === 'string');

  // 10. /api/user/:userId/preferences (graceful failure → empty prefs)
  const prefs = await req('GET', svc.port, '/api/user/user-demo-1/preferences');
  a('GET /api/user/:userId/preferences returns 200', prefs.status === 200);

  await killChild(svc.child);

  console.log(`\ngenie-gateway: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});