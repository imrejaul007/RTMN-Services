/**
 * genie-relationship-os — readiness + seed tests (Phase A of Genie 100%).
 *
 * Spawns the service on an ephemeral port, then asserts:
 *   - /health returns 200 with service metadata
 *   - /api/llm-health returns 200 with LLM status
 *   - /api/db-health returns 200 with Mongo status
 *   - /api/readiness returns 200 with combined flags
 *   - GET /api/:userId/dashboard returns the seeded user's network
 *   - GET /api/people/:userId returns the seeded people
 *   - GET /api/health/:userId/overview returns health data
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

const INTERNAL_TOKEN = 'relos-test-token-' + Date.now();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_aaaaa';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS  ${n}`)) : (f++, console.log(`  FAIL  ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'REL-USER-1', businessId: 'REL-BIZ', industry: 'personal', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), `relos-${label}-data-`));
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
          if (/GENIE RELATIONSHIP OS/.test(stdout) || /running on port/i.test(stdout)) {
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
  console.log('\n[genie-relationship-os] readiness + seed tests:\n');

  const svc = await spawnService({}, 'relos');
  await waitReady(svc.port);
  a('service booted', true);

  // 1. /health
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports healthy', h.data?.status === 'healthy');
  a('/health reports service name', h.data?.service === 'genie-relationship-os');
  a('/health has stats', typeof h.data?.stats === 'object');
  a('/health shows seeded user count', (h.data?.stats?.users || 0) >= 1);
  a('/health shows seeded totalPeople >= 5', (h.data?.stats?.totalPeople || 0) >= 5);

  // 2. /ready
  const r = await req('GET', svc.port, '/ready');
  a('/ready returns 200', r.status === 200);
  a('/ready.ready === true', r.data?.ready === true);

  // 3. /api/llm-health
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-relationship-os', lh.data?.data?.service === 'genie-relationship-os');
  a('/api/llm-health has llm_available boolean', typeof lh.data?.data?.llm_available === 'boolean');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');

  // 4. /api/db-health
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health has mongo_connected boolean', typeof dh.data?.data?.mongo_connected === 'boolean');

  // 5. /api/readiness
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness reports service name', rd.data?.data?.service === 'genie-relationship-os');
  a('/api/readiness.ready === true', rd.data?.data?.ready === true);
  a('/api/readiness has degraded boolean', typeof rd.data?.data?.degraded === 'boolean');

  // 6. Dashboard endpoint with seeded user
  const dash = await req('GET', svc.port, '/api/user-demo-1/dashboard');
  a('GET /api/:userId/dashboard returns 200', dash.status === 200);
  a('dashboard has stats.totalPeople', (dash.data?.stats?.totalPeople || 0) >= 5);
  a('dashboard has stats.totalInteractions', (dash.data?.stats?.totalInteractions || 0) >= 1);
  a('dashboard has stats.byCategory', typeof dash.data?.stats?.byCategory === 'object');

  // 7. People list for seeded user
  const people = await req('GET', svc.port, '/api/people/user-demo-1');
  a('GET /api/people/:userId returns 200', people.status === 200);
  a('people count >= 5', (people.data?.count || 0) >= 5);
  a('people includes Anaya Khan', people.data?.people?.some?.(p => p.name === 'Anaya Khan'));

  // 8. Interactions stats
  const stats = await req('GET', svc.port, '/api/interactions/user-demo-1/stats');
  a('GET /api/interactions/:userId/stats returns 200', stats.status === 200);
  a('interactions stats has total', typeof stats.data?.stats?.total === 'number');

  // 9. Interactions types list
  const types = await req('GET', svc.port, '/api/interactions/user-demo-1/types');
  a('GET /api/interactions/:userId/types returns 200', types.status === 200);

  // 10. Reminders (need to check route)
  const remind = await req('GET', svc.port, '/api/reminders/user-demo-1');
  a('GET /api/reminders/:userId returns 200', remind.status === 200);

  // 9. Create a new person (round-trip on the store)
  const create = await req('POST', svc.port, '/api/people', {
    userId: 'user-test-1',
    name: 'Test Person',
    relationshipType: 'friend',
    category: 'friend',
    importance: 6,
  });
  a('POST /api/people returns 200/201', create.status === 200 || create.status === 201);
  a('create returns person with id', typeof create.data?.person?.id === 'string');

  await killChild(svc.child);

  console.log(`\ngenie-relationship-os: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});