/**
 * genie-spiritual-os — Phase A readiness tests.
 *
 * Verifies:
 *   - /health returns 200
 *   - /api/llm-health returns 200 with expected fields
 *   - /api/db-health returns 200 with expected fields
 *   - /api/readiness returns 200 with combined fields
 *   - /api/spiritual/prayers returns seeded prayers
 *   - /api/spiritual/gratitude returns seeded gratitude entries
 *   - /api/spiritual/reflections returns seeded reflections
 *   - /api/spiritual/meditations returns seeded meditation logs
 *   - Seeded counts match
 *   - Route endpoints respond (prayer categories, meditation types, daily focus, weekly verse)
 */

// Set JWT_SECRET in env BEFORE importing @rtmn/shared/auth
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

const INTERNAL_TOKEN = 'spiritual-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'S-USER-1', businessId: 'S-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'spiritual-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'spiritual-cwd-'));
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
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Spiritual OS running on port (\d+)/);
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
  console.log('\n[genie-spiritual-os readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Spiritual OS', h.data?.service === 'Genie Spiritual OS');

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-spiritual-os', lh.data?.data?.service === 'genie-spiritual-os');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');
  a('/api/llm-health has gateway_url field', typeof lh.data?.data?.gateway_url === 'string');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-spiritual-os', dh.data?.data?.service === 'genie-spiritual-os');
  a('/api/db-health has mongo_connected field', typeof dh.data?.data?.mongo_connected === 'boolean');
  a('/api/db-health mode field present', typeof dh.data?.data?.mode === 'string');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);
  a('/api/readiness has llm_available', typeof rd.data?.data?.llm_available === 'boolean');
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /api/spiritual/prayers ===
  const prayers = await req('GET', svc.port, '/api/spiritual/prayers');
  a('/api/spiritual/prayers returns 200', prayers.status === 200);
  a('/api/spiritual/prayers has 5 entries', prayers.data?.total === 5);
  a('/api/spiritual/prayers p1 answered=true', prayers.data?.prayers?.find(p => p.id === 'p1')?.answered === true);

  // === /api/spiritual/gratitude ===
  const gratitude = await req('GET', svc.port, '/api/spiritual/gratitude');
  a('/api/spiritual/gratitude returns 200', gratitude.status === 200);
  a('/api/spiritual/gratitude has 5 entries', gratitude.data?.total === 5);
  a('/api/spiritual/gratitude g1 has 3 items', gratitude.data?.gratitude?.find(g => g.id === 'g1')?.items?.length === 3);

  // === /api/spiritual/reflections ===
  const reflections = await req('GET', svc.port, '/api/spiritual/reflections');
  a('/api/spiritual/reflections returns 200', reflections.status === 200);
  a('/api/spiritual/reflections has 4 entries', reflections.data?.total === 4);
  a('/api/spiritual/reflections r1 has themes', Array.isArray(reflections.data?.reflections?.find(r => r.id === 'r1')?.themes));

  // === /api/spiritual/meditations ===
  const meditations = await req('GET', svc.port, '/api/spiritual/meditations');
  a('/api/spiritual/meditations returns 200', meditations.status === 200);
  a('/api/spiritual/meditations has 5 entries', meditations.data?.total === 5);
  a('/api/spiritual/meditations m3 type=mantra', meditations.data?.meditations?.find(m => m.id === 'm3')?.type === 'mantra');

  // === Route endpoints ===
  const cats = await req('GET', svc.port, '/prayer/categories');
  a('/prayer/categories returns 200', cats.status === 200);
  a('/prayer/categories has 10 items', cats.data?.data?.categories?.length === 10);

  const types = await req('GET', svc.port, '/meditation/types');
  a('/meditation/types returns 200', types.status === 200);
  a('/meditation/types has 8 types', types.data?.data?.types?.length === 8);

  const prompts = await req('GET', svc.port, '/reflection/prompts?count=3');
  a('/reflection/prompts returns 200', prompts.status === 200);
  a('/reflection/prompts returns 3 prompts', prompts.data?.data?.prompts?.length === 3);

  const focus = await req('GET', svc.port, '/insights/daily-focus');
  a('/insights/daily-focus returns 200', focus.status === 200);
  a('/insights/daily-focus has title', typeof focus.data?.data?.title === 'string');

  const verse = await req('GET', svc.port, '/insights/weekly-verse');
  a('/insights/weekly-verse returns 200', verse.status === 200);
  a('/insights/weekly-verse has source', typeof verse.data?.data?.source === 'string');

  // === Authenticated route smoke (POST) ===
  const add = await req('POST', svc.port, '/prayer/add/user-001', {
    text: 'For continued peace of mind',
    category: 'peace'
  });
  a('POST /prayer/add returns 201', add.status === 201);
  a('POST /prayer/add returns prayer id', typeof add.data?.data?.id === 'string');

  const medLog = await req('POST', svc.port, '/meditation/log/user-001', {
    type: 'breath',
    minutes: 10,
    focus: 'calm'
  });
  a('POST /meditation/log returns 201', medLog.status === 201);
  a('POST /meditation/log returns session id', typeof medLog.data?.data?.id === 'string');

  await killChild(svc.child);

  console.log(`\ngenie-spiritual-os readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});