/**
 * genie-wellness-os — Phase A readiness tests.
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health returns 200 with expected fields
 *   - /api/db-health returns 200 with expected fields
 *   - /api/readiness returns 200 with combined fields
 *   - /api/wellness/moods returns seeded mood entries
 *   - /api/wellness/sleep returns seeded sleep logs
 *   - /api/wellness/hydration returns seeded hydration logs
 *   - Seeded counts match
 */

// Set JWT_SECRET in env BEFORE importing @rtmn/shared/auth (auth module reads env at module load)
process.env.JWT_SECRET = 'test-jwt-secret-for-readiness-tests';

// Now load the auth module via dynamic import so env is set first
const authModule = await import('@rtmn/shared/auth');
const createToken = authModule.createToken;

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src', 'index.js');

const INTERNAL_TOKEN = 'wellness-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'W-USER-1', businessId: 'W-BIZ', industry: 'test', role: 'owner' });
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
        const req2 = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET', headers: bearer() }, (res2) => {
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'wellness-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'wellness-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: {
            ...process.env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            JWT_SECRET,
            HOJAI_DATA_DIR: dataDir,
            INFERENCE_STUB_MODE: 'true',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Wellness OS running on port (\d+)/);
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
            reject(new Error(`Service didn't print ready line within 10s:\n${stdout}\n${stderr}`));
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
  console.log('\n[genie-wellness-os readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Wellness OS', h.data?.service === 'Genie Wellness OS');

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-wellness-os', lh.data?.data?.service === 'genie-wellness-os');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');
  a('/api/llm-health has gateway_url field', typeof lh.data?.data?.gateway_url === 'string');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-wellness-os', dh.data?.data?.service === 'genie-wellness-os');
  a('/api/db-health has mongo_connected field', typeof dh.data?.data?.mongo_connected === 'boolean');
  a('/api/db-health mode field present', typeof dh.data?.data?.mode === 'string');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);
  a('/api/readiness has llm_available', typeof rd.data?.data?.llm_available === 'boolean');
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /api/wellness/moods ===
  const moods = await req('GET', svc.port, '/api/wellness/moods');
  a('/api/wellness/moods returns 200', moods.status === 200);
  a('/api/wellness/moods has 5 entries', moods.data?.total === 5);
  a('/api/wellness/moods m1 score=7', moods.data?.moods?.find(m => m.id === 'm1')?.score === 7);

  // === /api/wellness/sleep ===
  const sleep = await req('GET', svc.port, '/api/wellness/sleep');
  a('/api/wellness/sleep returns 200', sleep.status === 200);
  a('/api/wellness/sleep has 5 entries', sleep.data?.total === 5);

  // === /api/wellness/hydration ===
  const hyd = await req('GET', svc.port, '/api/wellness/hydration');
  a('/api/wellness/hydration returns 200', hyd.status === 200);
  a('/api/wellness/hydration has 5 entries', hyd.data?.total === 5);
  a('/api/wellness/hydration h2 has 10 glasses', hyd.data?.hydration?.find(h => h.id === 'h2')?.glasses === 10);

  await killChild(svc.child);

  console.log(`\ngenie-wellness-os readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});