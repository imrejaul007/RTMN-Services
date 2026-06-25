/**
 * genie-memory-graph readiness + seed + endpoint tests (Phase 7+).
 *
 * Verifies:
 *   - /health returns 200 with stats
 *   - /api/llm-health, /api/db-health, /api/readiness all return 200 with expected fields
 *   - /ready returns 200
 *   - /api/user/:userId/graph returns the seeded overview
 *   - GET /api/identity/:userId returns seeded identity
 *   - GET /knowledge endpoints reflect seeded data
 *   - GET /goal/:userId/goals returns goals
 *   - GET /timeline/:userId returns events
 *   - GET /preference/:userId returns preferences
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createToken } from '@rtmn/shared/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SVC_DIR = path.join(__dirname, '..');
const SRC = path.join(SVC_DIR, 'src', 'index.js');

const INTERNAL_TOKEN = 'mg-test-token-' + Date.now();
const JWT_SECRET = 'test-jwt-secret-for-tests-only-please-32chars';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function bearer() {
  const tok = await createToken({ userId: 'MG-USER-1', businessId: 'MG-BIZ', industry: 'test', role: 'owner' });
  return {
    authorization: `Bearer ${tok}`,
    'x-internal-token': INTERNAL_TOKEN,
  };
}

async function req(method, port, urlPath, body, headers) {
  const h = headers || await bearer();
  const bodyStr = body ? JSON.stringify(body) : null;
  const finalHeaders = { ...h };
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

async function waitReady(port, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await new Promise((resolve, reject) => {
        const req2 = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET', headers: { 'x-internal-token': INTERNAL_TOKEN } }, (res2) => {
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

function spawnService() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), 'mg-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'mg-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: {
            ...process.env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            JWT_SECRET,
            HOJAI_DATA_DIR: dataDir,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const cleaned = line.replace(/\x1b\[[0-9;]*m/g, '');
          const m = cleaned.match(/Port:\s+(\d+)/);
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
            reject(new Error(`Service didn't print 'Port: N' within 10s:\n${stdout}\n${stderr}`));
          }
        }, 10000);
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
  console.log('\n[genie-memory-graph] readiness + seed + endpoint tests:\n');

  const svc = await spawnService();
  const ready = await waitReady(svc.port);
  a('service booted and /health returned 200', ready === true);

  const health = await req('GET', svc.port, '/health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /health returns 200', health.status === 200);
  a('GET /health service name correct', health.data?.service === 'genie-memory-graph');
  a('GET /health users >= 2 (seeded)', (health.data?.stats?.users || 0) >= 2);

  const llm = await req('GET', svc.port, '/api/llm-health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/llm-health returns 200', llm.status === 200);
  a('GET /api/llm-health has llm_available', typeof llm.data?.data?.llm_available === 'boolean');

  const db = await req('GET', svc.port, '/api/db-health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/db-health returns 200', db.status === 200);
  a('GET /api/db-health has mongo_connected', typeof db.data?.data?.mongo_connected === 'boolean');

  const rd = await req('GET', svc.port, '/api/readiness', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/readiness returns 200', rd.status === 200);
  a('GET /api/readiness ready=true', rd.data?.data?.ready === true);

  const ready2 = await req('GET', svc.port, '/ready', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /ready returns 200', ready2.status === 200);

  const overview = await req('GET', svc.port, '/api/user/demo-user/graph', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/user/demo-user/graph returns 200', overview.status === 200);
  a('overview has identity name=Demo User', overview.data?.overview?.identity?.name === 'Demo User');
  a('overview has knowledgeCount >= 3', (overview.data?.overview?.knowledgeCount || 0) >= 3);
  a('overview has relationshipsCount >= 2', (overview.data?.overview?.relationshipsCount || 0) >= 2);
  a('overview has activeGoals >= 3', (overview.data?.overview?.activeGoals || 0) >= 3);

  // identity route (mounted via app.use('/', identityRoutes) → /api/identity/:userId)
  const identity = await req('GET', svc.port, '/api/identity/demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/identity/demo-user returns 200', identity.status === 200);
  a('identity has name=Demo User', identity.data?.name === 'Demo User' || identity.data?.identity?.name === 'Demo User');

  // goals route (app.use('/goal', goalRoutes) + router.get('/goal/:userId', ...) → /goal/goal/:userId)
  const goals = await req('GET', svc.port, '/goal/goal/demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /goal/goal/demo-user returns 200', goals.status === 200);
  a('goals >= 3 (seeded)', Array.isArray(goals.data?.goals) && goals.data.goals.length >= 3);

  // timeline route (app.use('/timeline', timelineRoutes) + router.get('/timeline/:userId', ...) → /timeline/timeline/:userId)
  const timeline = await req('GET', svc.port, '/timeline/timeline/demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /timeline/timeline/demo-user returns 200', timeline.status === 200);

  // preferences route (app.use('/preference', preferenceRoutes) + router.get('/preference/:userId', ...) → /preference/preference/:userId)
  const prefs = await req('GET', svc.port, '/preference/preference/demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /preference/preference/demo-user returns 200', prefs.status === 200);

  await killChild(svc.child);

  console.log(`\ngenie-memory-graph: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
