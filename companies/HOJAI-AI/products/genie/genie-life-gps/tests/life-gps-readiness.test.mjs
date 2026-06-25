/**
 * genie-life-gps — readiness + seed smoke tests
 *
 * Verifies:
 *   - /health returns 200 with life-gps capabilities
 *   - /api/llm-health returns 200 with expected fields
 *   - /api/db-health returns 200 with expected fields
 *   - /api/readiness returns 200 with combined fields
 *   - /ready still works
 *   - Representative route GET (e.g., /gps/next/:userId) returns data
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
const SVC_SRC = path.join(SVC_DIR, 'src', 'index.js');

const INTERNAL_TOKEN = 'lf-test-token-' + Date.now();

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getBearer() {
  const tok = await createToken({ userId: 'LF-USER-1', businessId: 'LF-BIZ', industry: 'test', role: 'owner' });
  return {
    authorization: `Bearer ${tok}`,
    'x-internal-token': INTERNAL_TOKEN,
  };
}

async function req(method, port, urlPath, body, headers = null) {
  if (!headers) headers = await getBearer();
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
    await wait(120);
  }
  return false;
}

function spawnService(srcPath, env, label) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), `lf-${label}-data-`));
        const child = spawn('node', [srcPath], {
          cwd: mkdtempSync(path.join(tmpdir(), `lf-${label}-cwd-`)),
          env: {
            ...process.env,
            ...env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            JWT_SECRET: 'lf-test-jwt-secret-' + Date.now(),
            HOJAI_DATA_DIR: dataDir,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          if (line.includes('RUNNING') && !resolved) {
            resolved = true;
            resolve({ child, port, stdout, stderr });
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
            reject(new Error(`Service ${label} exited (${code}):\n${stdout}\n${stderr}`));
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill('SIGTERM');
            reject(new Error(`Service ${label} didn't print RUNNING within 10s:\n${stdout}\n${stderr}`));
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
  console.log('\n[genie-life-gps] readiness tests:\n');

  const { child, port } = await spawnService(SVC_SRC, {}, 'lf');
  await waitReady(port);
  a('service booted', true);

  // === /health ===
  const health = await req('GET', port, '/health');
  a('/health returns 200', health.status === 200);
  a('/health identifies life-gps', health.data?.service === 'genie-life-gps');
  a('/health exposes capabilities array', Array.isArray(health.data?.capabilities));

  // === /ready ===
  const ready = await req('GET', port, '/ready');
  a('/ready returns 200', ready.status === 200);
  a('/ready reports ready=true', ready.data?.ready === true);

  // === /api/llm-health ===
  const llm = await req('GET', port, '/api/llm-health');
  a('/api/llm-health returns 200', llm.status === 200);
  a('/api/llm-health identifies life-gps', llm.data?.data?.service === 'genie-life-gps');
  a('/api/llm-health exposes llm_available boolean', typeof llm.data?.data?.llm_available === 'boolean');

  // === /api/db-health ===
  const db = await req('GET', port, '/api/db-health');
  a('/api/db-health returns 200', db.status === 200);
  a('/api/db-health identifies life-gps', db.data?.data?.service === 'genie-life-gps');
  a('/api/db-health reports mode', typeof db.data?.data?.mode === 'string');

  // === /api/readiness ===
  const readiness = await req('GET', port, '/api/readiness');
  a('/api/readiness returns 200', readiness.status === 200);
  a('/api/readiness ready=true', readiness.data?.data?.ready === true);
  a('/api/readiness combines llm_available flag', typeof readiness.data?.data?.llm_available === 'boolean');
  a('/api/readiness combines mongo_connected flag', typeof readiness.data?.data?.mongo_connected === 'boolean');

  // === Representative route GET (next best action) ===
  const next = await req('GET', port, '/gps/next/user-001');
  if (next.status !== 200) console.log('    (debug /gps/next/user-001: status=' + next.status + ')');
  a('/gps/next/:userId returns 200', next.status === 200);

  await killChild(child);

  console.log(`\ngenie-life-gps readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});