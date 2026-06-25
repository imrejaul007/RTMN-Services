/**
 * genie-future-self — Phase A readiness tests.
 */

// Set JWT_SECRET BEFORE importing @rtmn/shared/auth
process.env.JWT_SECRET = 'test-jwt-secret-for-future-tests';

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

const INTERNAL_TOKEN = 'future-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  // createToken in ESM is async — the test process is ESM (.mjs), so we use
  // createTokenSync which calls the CJS path synchronously.
  return {
    authorization: `Bearer ${createTokenSync()}`,
    'x-internal-token': INTERNAL_TOKEN,
  };
}

// Use the CJS createToken synchronously. In ESM .mjs, the @rtmn/shared/auth
// export is async — so we import the CJS file directly.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken: createTokenCjs } = require('@rtmn/shared/auth');
function createTokenSync() {
  return createTokenCjs({ userId: 'F-USER-1', businessId: 'F-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'future-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'future-cwd-'));
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
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Future Self running on port (\d+)/);
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
  console.log('\n[genie-future-self readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Future Self', h.data?.service === 'Genie Future Self');

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-future-self', lh.data?.data?.service === 'genie-future-self');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');
  a('/api/llm-health has gateway_url field', typeof lh.data?.data?.gateway_url === 'string');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-future-self', dh.data?.data?.service === 'genie-future-self');
  a('/api/db-health has mongo_connected field', typeof dh.data?.data?.mongo_connected === 'boolean');
  a('/api/db-health mode field present', typeof dh.data?.data?.mode === 'string');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);
  a('/api/readiness has llm_available', typeof rd.data?.data?.llm_available === 'boolean');
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /profile/get/:userId ===
  const prof = await req('GET', svc.port, '/profile/get/user-001');
  a('/profile/get returns 200', prof.status === 200);
  a('/profile/get has values array', Array.isArray(prof.data?.data?.values));
  a('/profile/get has 5 seeded values', prof.data?.data?.values?.length === 5);

  // === /profile/update/:userId ===
  const upd = await req('POST', svc.port, '/profile/update/user-002', {
    values: ['creativity', 'family'],
    goals: ['Write a book'],
    age: 40
  });
  a('/profile/update returns 200', upd.status === 200);
  a('/profile/update values[0]=creativity', upd.data?.data?.values?.[0] === 'creativity');
  a('/profile/update goals has 1 item', upd.data?.data?.goals?.length === 1);
  a('/profile/update age=40', upd.data?.data?.age === 40);
  a('/profile/update isDefault=false', upd.data?.data?.isDefault === false);

  // === /advice/history/:userId === (BEFORE creating new entries)
  const hist = await req('GET', svc.port, '/advice/history/user-001');
  a('/advice/history returns 200', hist.status === 200);
  a('/advice/history has 2 seeded entries', hist.data?.total === 2);

  // === /advice/get/:adviceId ===
  const one = await req('GET', svc.port, '/advice/get/a1');
  a('/advice/get/a1 returns 200', one.status === 200);
  a('/advice/get/a1 question matches', one.data?.data?.question?.includes('job offer'));

  // === /letter/list/:userId === (BEFORE writing new letters)
  const ll = await req('GET', svc.port, '/letter/list/user-001');
  a('/letter/list returns 200', ll.status === 200);
  a('/letter/list has 1 seeded entry', ll.data?.total === 1);

  // === /letter/read/:letterId ===
  const lr = await req('GET', svc.port, '/letter/read/l1');
  a('/letter/read/l1 returns 200', lr.status === 200);
  a('/letter/read/l1 body contains "Dear"', lr.data?.data?.body?.includes('Dear'));

  // === /letter/read/not-found ===
  const nf = await req('GET', svc.port, '/letter/read/nonexistent');
  a('/letter/read/nonexistent returns 404', nf.status === 404);

  // === /advice/ask/:userId === (AFTER history check to avoid affecting counts)
  const ask = await req('POST', svc.port, '/advice/ask/user-001', {
    question: 'Should I take a sabbatical?',
    year: 2030
  });
  a('/advice/ask returns 201', ask.status === 201);
  a('/advice/ask returns advice id', typeof ask.data?.data?.id === 'string');
  a('/advice/ask year=2030', ask.data?.data?.year === 2030);
  a('/advice/ask has themes', Array.isArray(ask.data?.data?.themes));
  a('/advice/ask has advice text', ask.data?.data?.advice?.length > 0);

  // === /advice/ask — validation ===
  const short = await req('POST', svc.port, '/advice/ask/user-001', { question: 'a' });
  a('/advice/ask short question returns 400', short.status === 400);

  // === /letter/write/:userId ===
  const w = await req('POST', svc.port, '/letter/write/user-001', { year: 2045 });
  a('/letter/write returns 201', w.status === 201);
  a('/letter/write has body', w.data?.data?.body?.length > 100);
  a('/letter/write has subject', typeof w.data?.data?.subject === 'string');
  a('/letter/write year=2045', w.data?.data?.year === 2045);

  await killChild(svc.child);

  console.log(`\ngenie-future-self readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});