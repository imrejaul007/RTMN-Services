/**
 * genie-smart-forgetting-service readiness + endpoint tests (Phase 7+).
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health, /api/db-health, /api/readiness all return 200 with expected fields
 *   - /ready returns 200
 *   - GET /api/forgetting/stats returns 200
 *   - GET /api/forgetting/analyze returns 200 with analysis
 *   - GET /api/archive/stats returns 200
 *   - GET /api/config/ returns current rules
 *   - GET /api/config/retention returns retention policy
 *   - GET /api/config/presets returns preset list
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

const INTERNAL_TOKEN = 'sf-test-token-' + Date.now();
const JWT_SECRET = 'test-jwt-secret-for-tests-only-please-32chars';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function bearer() {
  const tok = await createToken({ userId: 'SF-USER-1', businessId: 'SF-BIZ', industry: 'test', role: 'owner' });
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
        const req2 = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET', headers: { 'x-internal-token': INTERNAL_TOKEN } }, (res2) => {
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'sf-data-'));
        const child = spawn('node', [SRC], {
          cwd: SVC_DIR,
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
  console.log('\n[genie-smart-forgetting-service] readiness + endpoint tests:\n');

  const svc = await spawnService();
  const ready = await waitReady(svc.port);
  a('service booted and /health returned 200', ready === true);

  const health = await req('GET', svc.port, '/health', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /health returns 200', health.status === 200);
  a('GET /health service name correct', health.data?.service === 'genie-smart-forgetting-service');
  a('GET /health status healthy', health.data?.status === 'healthy');

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

  // Domain endpoints (some require auth)
  const analyze = await req('GET', svc.port, '/api/forgetting/analyze?userId=demo-user', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/forgetting/analyze returns 200', analyze.status === 200);
  a('analyze has analysis with statistics', analyze.data?.analysis?.statistics?.total >= 0);

  const fstats = await req('GET', svc.port, '/api/forgetting/stats', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/forgetting/stats returns 200', fstats.status === 200);

  const astats = await req('GET', svc.port, '/api/archive/stats', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/archive/stats returns 200', astats.status === 200);

  const cfg = await req('GET', svc.port, '/api/config', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/config returns 200', cfg.status === 200);

  const retention = await req('GET', svc.port, '/api/config/retention', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/config/retention returns 200', retention.status === 200);

  const presets = await req('GET', svc.port, '/api/config/presets', null, { 'x-internal-token': INTERNAL_TOKEN });
  a('GET /api/config/presets returns 200', presets.status === 200);
  a('presets has data', Array.isArray(presets.data?.data) || typeof presets.data === 'object');

  await killChild(svc.child);

  console.log(`\ngenie-smart-forgetting-service: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
