/**
 * genie-accounts — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-accounts-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src', 'index.js');

const INTERNAL_TOKEN = 'acc-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'A-USER-1', businessId: 'A-BIZ', industry: 'test', role: 'owner' });
  return { authorization: `Bearer ${tok}`, 'x-internal-token': INTERNAL_TOKEN };
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'acc-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'acc-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: { ...process.env, PORT: String(port), INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, JWT_SECRET, HOJAI_DATA_DIR: dataDir, INFERENCE_STUB_MODE: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Connected Accounts running on port (\d+)/);
          if (m && !resolved) { resolved = true; resolve({ child, port: parseInt(m[1], 10), stdout, stderr }); }
        };
        child.stdout.on('data', (b) => { const s = b.toString(); stdout += s; s.split('\n').forEach(onLine); });
        child.stderr.on('data', (b) => { stderr += b.toString(); });
        child.on('exit', (code) => {
          if (!resolved) { resolved = true; reject(new Error(`Service exited (${code}):\n${stdout}\n${stderr}`)); }
        });
        setTimeout(() => {
          if (!resolved) { resolved = true; child.kill('SIGTERM'); reject(new Error(`Service didn't print ready line within 10s:\n${stdout}\n${stderr}`)); }
        }, 10000);
      });
    });
  });
}

async function killChild(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM'); await wait(200);
  if (!child.killed) child.kill('SIGKILL'); await wait(100);
}

async function run() {
  console.log('\n[genie-accounts readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Connected Accounts', h.data?.service === 'Genie Connected Accounts');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);

  // === /accounts/providers ===
  const provs = await req('GET', svc.port, '/accounts/providers');
  a('/accounts/providers returns 200', provs.status === 200);
  a('/accounts/providers has 10', provs.data?.total === 10);
  a('/accounts/providers has gmail', provs.data?.providers?.some(p => p.id === 'gmail'));

  // === /accounts/list/user-001 (seeded) ===
  const list = await req('GET', svc.port, '/accounts/list/user-001');
  a('/accounts/list returns 200', list.status === 200);
  a('/accounts/list has 2 seeded', list.data?.total === 2);
  a('/accounts/list items have providerMeta', list.data?.accounts?.[0]?.providerMeta?.name?.length > 0);

  // === /accounts/connect new provider ===
  const conn = await req('POST', svc.port, '/accounts/connect/user-001/gmail', {});
  a('/accounts/connect returns 201', conn.status === 201);
  a('/accounts/connect has status=connected', conn.data?.data?.status === 'connected');
  a('/accounts/connect has authUrl', typeof conn.data?.authUrl === 'string');

  // === /accounts/connect already connected ===
  const connAgain = await req('POST', svc.port, '/accounts/connect/user-001/gmail', {});
  a('/accounts/connect already returns 409', connAgain.status === 409);

  // === /accounts/connect unknown provider ===
  const connBad = await req('POST', svc.port, '/accounts/connect/user-001/unknown', {});
  a('/accounts/connect unknown returns 404', connBad.status === 404);

  // === /accounts/list after connect ===
  const list2 = await req('GET', svc.port, '/accounts/list/user-001');
  a('/accounts/list after connect has 3', list2.data?.total === 3);

  // === /accounts/data ===
  const data = await req('GET', svc.port, '/accounts/data/user-001/gmail');
  a('/accounts/data returns 200', data.status === 200);
  a('/accounts/data has unread', typeof data.data?.data?.unread === 'number');

  // === /accounts/data — not connected ===
  const dataBad = await req('GET', svc.port, '/accounts/data/user-001/github');
  a('/accounts/data not connected returns 403', dataBad.status === 403);

  // === /accounts/sync ===
  const sync = await req('POST', svc.port, '/accounts/sync/user-001/gmail', {});
  a('/accounts/sync returns 200', sync.status === 200);
  a('/accounts/sync updates lastSync', typeof sync.data?.lastSync === 'string');

  // === /accounts/sync not connected ===
  const syncBad = await req('POST', svc.port, '/accounts/sync/user-001/slack', {});
  a('/accounts/sync not connected returns 404', syncBad.status === 404);

  // === /accounts/data — calendar (seeded) ===
  const cal = await req('GET', svc.port, '/accounts/data/user-001/google_calendar');
  a('/accounts/data calendar returns 200', cal.status === 200);
  a('/accounts/data calendar has events', Array.isArray(cal.data?.data?.events));

  // === /accounts/disconnect ===
  const disc = await req('POST', svc.port, '/accounts/disconnect/user-001/gmail', {});
  a('/accounts/disconnect returns 200', disc.status === 200);

  const discBad = await req('POST', svc.port, '/accounts/disconnect/user-001/gmail', {});
  a('/accounts/disconnect not connected returns 404', discBad.status === 404);

  await killChild(svc.child);

  console.log(`\ngenie-accounts readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
