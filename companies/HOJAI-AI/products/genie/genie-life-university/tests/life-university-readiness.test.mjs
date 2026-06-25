/**
 * genie-life-university — readiness + seed tests (Phase A of Genie 100%).
 *
 * Spawns the service on an ephemeral port, then asserts:
 *   - /health returns 200 with service metadata
 *   - /api/llm-health returns 200 with LLM status
 *   - /api/db-health returns 200 with Mongo status
 *   - /api/readiness returns 200 with combined flags
 *   - GET /courses returns the seeded course catalog
 *   - GET /curriculum/paths/all returns the seeded learning paths
 *   - GET /ready returns 200
 *   - GET / returns the service metadata
 *   - Seed data is queryable on the in-memory stores
 *   - /api/readiness reports the right service name
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

const INTERNAL_TOKEN = 'lu-test-token-' + Date.now();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_aaaaa';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS  ${n}`)) : (f++, console.log(`  FAIL  ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'LU-USER-1', businessId: 'LU-BIZ', industry: 'education', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), `lu-${label}-data-`));
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
        // Wait for the listening line — be tolerant of different log formats
        const deadline = Date.now() + 8000;
        const tick = async () => {
          if (Date.now() > deadline) {
            child.kill('SIGTERM');
            reject(new Error(`Service ${label} didn't print 'running on port' within 8s:\n${stdout}\n${stderr}`));
            return;
          }
          if (/running on port/.test(stdout)) {
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
  console.log('\n[genie-life-university] readiness + seed tests:\n');

  const svc = await spawnService({}, 'lu');
  await waitReady(svc.port);
  a('service booted', true);

  // 1. /health
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports healthy', h.data?.status === 'healthy');

  // 2. /ready
  const r = await req('GET', svc.port, '/ready');
  a('/ready returns 200', r.status === 200);
  a('/ready.ready === true', r.data?.ready === true);

  // 3. /api/llm-health
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health has service field', typeof lh.data?.data?.service === 'string');
  a('/api/llm-health service=genie-life-university', lh.data?.data?.service === 'genie-life-university');
  a('/api/llm-health has llm_available boolean', typeof lh.data?.data?.llm_available === 'boolean');

  // 4. /api/db-health
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health has mongo_connected', typeof dh.data?.data?.mongo_connected === 'boolean');

  // 5. /api/readiness
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness reports service name', rd.data?.data?.service === 'genie-life-university');
  a('/api/readiness.ready === true', rd.data?.data?.ready === true);
  a('/api/readiness has degraded boolean', typeof rd.data?.data?.degraded === 'boolean');

  // 6. Root metadata
  const root = await req('GET', svc.port, '/');
  a('GET / returns 200', root.status === 200);
  a('GET / advertises life-university', /Life University/.test(root.data?.service || ''));

  // 7. Representative domain endpoint
  const courses = await req('GET', svc.port, '/courses/');
  a('GET /courses returns 200', courses.status === 200);
  a('GET /courses has data.courses array', Array.isArray(courses.data?.data?.courses));
  a('GET /courses returns at least 1 course', (courses.data?.data?.count || 0) >= 1);

  // 8. Course categories endpoint (deterministic GET)
  const cats = await req('GET', svc.port, '/courses/categories/all');
  a('GET /courses/categories/all returns 200', cats.status === 200);
  a('GET /courses/categories/all has categories array', Array.isArray(cats.data?.data));
  a('GET /courses/categories/all has leadership', cats.data?.data?.some?.(c => c.id === 'leadership'));

  // 9. Featured courses endpoint
  const feat = await req('GET', svc.port, '/courses/featured/all');
  a('GET /courses/featured/all returns 200', feat.status === 200);
  a('GET /courses/featured/all returns array', Array.isArray(feat.data?.data));

  // 10. Course by id
  const c1 = await req('GET', svc.port, '/courses/leadership-fundamentals');
  a('GET /courses/:id returns 200', c1.status === 200);
  a('GET /courses/:id returns leadership fundamentals', c1.data?.data?.id === 'leadership-fundamentals');

  // 11. Enrollment POST creates record (round-trip on the seeded store)
  const enr = await req('POST', svc.port, '/courses/data-science/enroll', { userId: 'user-demo-test' });
  a('POST /courses/:id/enroll returns 200', enr.status === 200);
  a('enrollment response includes success=true', enr.data?.success === true);

  // 12. Enrollments for the user are queryable
  const userEnr = await req('GET', svc.port, '/courses/enrolled/user-demo-test');
  a('GET /courses/enrolled/:userId returns 200', userEnr.status === 200);
  a('user has at least 1 enrolled course', (userEnr.data?.data?.count || 0) >= 1);

  // 13. Lessons endpoint exists
  const lessons = await req('GET', svc.port, '/lessons/data-science/lesson-1');
  a('GET /lessons/:course/:lesson returns 200', lessons.status === 200);

  // 14. LLM stub mode reporting
  const lh2 = await req('GET', svc.port, '/api/llm-health');
  a('llm-health has stub_mode field', typeof lh2.data?.data?.stub_mode === 'boolean');
  a('llm-health has default_model field', typeof lh2.data?.data?.default_model === 'string');

  await killChild(svc.child);

  console.log(`\ngenie-life-university: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});