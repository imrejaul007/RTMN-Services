/**
 * genie-calendar-service readiness + seed + endpoint tests (Phase 7+).
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health, /api/db-health, /api/readiness all return 200 with expected fields
 *   - /ready returns 200
 *   - GET /api/types returns 200 with event types
 *   - GET /api/events returns 200 with array of seeded events
 *   - GET /api/events/upcoming returns 200
 *   - GET /api/events/:id returns 200 for a seeded event
 *   - GET /api/events/search returns matches
 *   - GET /api/statistics returns 200
 *   - GET /api/context returns 200
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

const INTERNAL_TOKEN = 'cal-test-token-' + Date.now();
const JWT_SECRET = 'test-jwt-secret-for-tests-only-please-32chars';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function bearer() {
  const tok = await createToken({ userId: 'CAL-USER-1', businessId: 'CAL-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'cal-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'cal-cwd-'));
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
  console.log('\n[genie-calendar-service] readiness + seed + endpoint tests:\n');

  const svc = await spawnService();
  const ready = await waitReady(svc.port);
  a('service booted and /health returned 200', ready === true);

  const health = await req('GET', svc.port, '/health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /health returns 200', health.status === 200);
  a('GET /health service name correct', health.data?.service === 'genie-calendar-service');
  a('GET /health totalEvents >= 3 (seeded)', (health.data?.totalEvents || 0) >= 3);

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

  const types = await req('GET', svc.port, '/api/types', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/types returns 200', types.status === 200);
  a('GET /api/types has eventTypes', typeof types.data?.eventTypes === 'object');

  const events = await req('GET', svc.port, '/api/events?userId=user-1&limit=20', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/events returns 200', events.status === 200);
  a('GET /api/events has 3 seeded events', (events.data?.events?.length || 0) >= 3);

  const upcoming = await req('GET', svc.port, '/api/events/upcoming?userId=user-1&days=365', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/events/upcoming returns 200', upcoming.status === 200);

  const singleEvent = await req('GET', svc.port, '/api/events/evt-001', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/events/evt-001 returns 200', singleEvent.status === 200);
  a('single event has title', singleEvent.data?.event?.title === 'Team Standup');

  const search = await req('GET', svc.port, '/api/events/search?q=Team&userId=user-1', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/events/search returns 200', search.status === 200);
  a('search returns at least 1 match', (search.data?.events?.length || 0) >= 1);

  const stats = await req('GET', svc.port, '/api/statistics?userId=user-1', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/statistics returns 200', stats.status === 200);
  a('statistics has totalEvents', (stats.data?.totalEvents || 0) >= 3);

  const ctx = await req('GET', svc.port, '/api/context?userId=user-1', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/context returns 200', ctx.status === 200);
  a('context has todayCount', typeof ctx.data?.todayCount === 'number');

  await killChild(svc.child);

  console.log(`\ngenie-calendar-service: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
