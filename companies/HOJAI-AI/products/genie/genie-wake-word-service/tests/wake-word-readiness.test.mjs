/**
 * genie-wake-word-service — Phase A readiness tests.
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health, /api/db-health, /api/readiness all return 200 with expected fields
 *   - /ready returns 200
 *   - /api/models returns 5 seeded models (from existing seed fn, preserved)
 *   - /api/clients returns seeded clients (Phase A augmentation)
 *   - /api/wake-words lists languages
 *   - /api/statistics returns detection counts
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-readiness-tests';

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

const INTERNAL_TOKEN = 'wake-test-token-' + Date.now();
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'wake-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'wake-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: {
            ...process.env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            JWT_SECRET,
            HOJAI_DATA_DIR: dataDir,
            INFERENCE_STUB_MODE: 'true',
            USE_RUNTIME_GENIE_FORWARD: 'false',
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
  console.log('\n[genie-wake-word-service readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health service=genie-wake-word-service', h.data?.service === 'genie-wake-word-service');

  // === /ready ===
  const rd2 = await req('GET', svc.port, '/ready');
  a('/ready returns 200', rd2.status === 200);

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-wake-word-service', lh.data?.data?.service === 'genie-wake-word-service');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-wake-word-service', dh.data?.data?.service === 'genie-wake-word-service');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /api/models (existing seed fn preserved) ===
  const models = await req('GET', svc.port, '/api/models');
  a('/api/models returns 200', models.status === 200);
  a('/api/models has 5 seeded models', models.data?.total === 5);

  // === /api/wake-words (existing seed fn) ===
  const ww = await req('GET', svc.port, '/api/wake-words');
  a('/api/wake-words returns 200', ww.status === 200);
  a('/api/wake-words has 5 entries', ww.data?.total === 5);

  // === /api/clients (Phase A augmented) ===
  const clients = await req('GET', svc.port, '/api/clients');
  a('/api/clients returns 200', clients.status === 200);
  a('/api/clients has 5 seeded clients', clients.data?.total === 5);

  // === /api/statistics ===
  const stats = await req('GET', svc.port, '/api/statistics');
  a('/api/statistics returns 200', stats.status === 200);
  a('/api/statistics totalDetections >= 3', (stats.data?.totalDetections || 0) >= 3);

  await killChild(svc.child);

  console.log(`\ngenie-wake-word-service readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});