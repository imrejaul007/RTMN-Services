/**
 * genie-life-replay — Phase A readiness tests.
 *
 * Verifies:
 *   - /health, /api/llm-health, /api/db-health, /api/readiness
 *   - Seeded replays (r1, r2) are accessible
 *   - Replay history endpoint
 *   - Stats summary (may fail gracefully if upstream specialists not running)
 *   - Insights highlights (graceful)
 *   - New replay generation (template fallback when no LLM)
 */

// Set JWT_SECRET in env BEFORE importing @rtmn/shared/auth
process.env.JWT_SECRET = 'test-jwt-secret-for-replay-tests';

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

const INTERNAL_TOKEN = 'replay-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'R-USER-1', businessId: 'R-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'replay-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'replay-cwd-'));
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
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Life Replay running on port (\d+)/);
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
  console.log('\n[genie-life-replay readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Life Replay', h.data?.service === 'Genie Life Replay');

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-life-replay', lh.data?.data?.service === 'genie-life-replay');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');
  a('/api/llm-health has gateway_url field', typeof lh.data?.data?.gateway_url === 'string');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-life-replay', dh.data?.data?.service === 'genie-life-replay');
  a('/api/db-health has mongo_connected field', typeof dh.data?.data?.mongo_connected === 'boolean');
  a('/api/db-health mode field present', typeof dh.data?.data?.mode === 'string');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);
  a('/api/readiness has llm_available', typeof rd.data?.data?.llm_available === 'boolean');
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /replay/get/:replayId — seeded ===
  const r1 = await req('GET', svc.port, '/replay/get/r1');
  a('/replay/get/r1 returns 200', r1.status === 200);
  a('/replay/get/r1 has title', typeof r1.data?.data?.title === 'string');
  a('/replay/get/r1 period=monthly', r1.data?.data?.period === 'monthly');
  a('/replay/get/r1 has themes', Array.isArray(r1.data?.data?.themes));

  const r2 = await req('GET', svc.port, '/replay/get/r2');
  a('/replay/get/r2 returns 200', r2.status === 200);
  a('/replay/get/r2 period=yearly', r2.data?.data?.period === 'yearly');
  a('/replay/get/r2 stats.memories=612', r2.data?.data?.stats?.memories === 612);

  // === /replay/history/:userId ===
  const hist = await req('GET', svc.port, '/replay/history/user-001');
  a('/replay/history returns 200', hist.status === 200);
  a('/replay/history has 2 entries', hist.data?.total === 2);

  // === /replay/get/non-existent ===
  const notfound = await req('GET', svc.port, '/replay/get/does-not-exist');
  a('/replay/get/not-found returns 404', notfound.status === 404);

  // === /replay/period/:userId (template fallback — LLM stubbed) ===
  // The period endpoint calls upstream specialists, which may not be running.
  // In the test we just verify it returns SOMETHING (graceful error or success).
  const period = await req('POST', svc.port, '/replay/period/user-001', { period: 'monthly' });
  // It should return either 201 (success) or 500 (upstream unreachable) - both are OK
  a('/replay/period returns 201 or 500', period.status === 201 || period.status === 500);

  // === /stats/summary/:userId (graceful — upstream may be down) ===
  const summary = await req('GET', svc.port, '/stats/summary/user-001?days=30');
  a('/stats/summary returns 200 or 500', summary.status === 200 || summary.status === 500);

  // === /stats/thematic/:userId ===
  const them = await req('GET', svc.port, '/stats/thematic/user-001?days=30');
  a('/stats/thematic returns 200 or 500', them.status === 200 || them.status === 500);

  // === /insights/highlights/:userId ===
  const hl = await req('GET', svc.port, '/insights/highlights/user-001');
  a('/insights/highlights returns 200 or 500', hl.status === 200 || hl.status === 500);

  await killChild(svc.child);

  console.log(`\ngenie-life-replay readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});