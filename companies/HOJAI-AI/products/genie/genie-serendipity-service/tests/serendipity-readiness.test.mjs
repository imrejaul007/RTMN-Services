/**
 * genie-serendipity-service readiness + seed + endpoint tests (Phase 7+).
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health, /api/db-health, /api/readiness all return 200 with expected fields
 *   - /ready returns 200
 *   - GET /api/serendipity returns items
 *   - GET /api/serendipity/daily returns items
 *   - GET /api/serendipity/time returns items
 *   - GET /api/serendipity/people returns items
 *   - GET /api/serendipity/history returns seeded resurfaced items
 *   - GET /api/subscriptions returns seeded subscriptions
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

const INTERNAL_TOKEN = 'ser-test-token-' + Date.now();
const JWT_SECRET = 'test-jwt-secret-for-tests-only-please-32chars';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function bearer() {
  const tok = await createToken({ userId: 'SER-USER-1', businessId: 'SER-BIZ', industry: 'test', role: 'owner' });
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
    await wait(120);
  }
  return false;
}

function spawnService() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), 'ser-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'ser-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: {
            ...process.env,
            PORT: String(port),
            GENIE_SERENDIPITY_PORT: String(port),
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
          const m = cleaned.match(/started on port (\d+)/);
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
            reject(new Error(`Service didn't print 'started on port N' within 10s:\n${stdout}\n${stderr}`));
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
  console.log('\n[genie-serendipity-service] readiness + seed + endpoint tests:\n');

  const svc = await spawnService();
  const ready = await waitReady(svc.port);
  a('service booted and /health returned 200', ready === true);

  const health = await req('GET', svc.port, '/health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /health returns 200', health.status === 200);
  a('GET /health service name correct', health.data?.service === 'genie-serendipity');
  a('GET /health resurfacedCount >= 3 (seeded)', (health.data?.resurfacedCount || 0) >= 3);

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

  const ser = await req('GET', svc.port, '/api/serendipity?userId=demo-user&limit=5', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/serendipity returns 200', ser.status === 200);
  a('serendipity has items array', Array.isArray(ser.data?.items));

  const daily = await req('GET', svc.port, '/api/serendipity/daily?userId=demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/serendipity/daily returns 200', daily.status === 200);
  a('daily has 2 items', (daily.data?.items?.length || 0) >= 2);

  const time = await req('GET', svc.port, '/api/serendipity/time?userId=demo-user&period=month', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/serendipity/time returns 200', time.status === 200);

  const people = await req('GET', svc.port, '/api/serendipity/people?userId=demo-user&limit=3', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/serendipity/people returns 200', people.status === 200);

  const history = await req('GET', svc.port, '/api/serendipity/history?userId=demo-user&limit=20', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/serendipity/history returns 200', history.status === 200);
  a('history >= 3 (seeded)', (history.data?.history?.length || 0) >= 3);

  const subs = await req('GET', svc.port, '/api/subscriptions?userId=demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/subscriptions returns 200', subs.status === 200);
  a('subscriptions for demo-user >= 1 (seeded)', (subs.data?.subscriptions?.length || 0) >= 1);

  await killChild(svc.child);

  console.log(`\ngenie-serendipity-service: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
