/**
 * genie-household — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-household-tests';

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

const INTERNAL_TOKEN = 'hh-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'H-USER-1', businessId: 'H-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'hh-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'hh-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: { ...process.env, PORT: String(port), INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, JWT_SECRET, HOJAI_DATA_DIR: dataDir, INFERENCE_STUB_MODE: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Household OS running on port (\d+)/);
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
  console.log('\n[genie-household readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Household OS', h.data?.service === 'Genie Household OS');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);

  // === GET seeded household ===
  const hg = await req('GET', svc.port, '/household/get/hh-shared-001');
  a('/household/get returns 200', hg.status === 200);
  a('/household/get has 3 members', hg.data?.data?.members?.length === 3);
  a('/household/get has counts', typeof hg.data?.data?.counts === 'object');
  a('/household/get counts.listItems=5', hg.data?.data?.counts?.listItems === 5);

  // === GET 404 ===
  const h404 = await req('GET', svc.port, '/household/get/nonexistent');
  a('/household/get 404', h404.status === 404);

  // === LIST households for user-001 ===
  const hl = await req('GET', svc.port, '/household/list/user-001');
  a('/household/list returns 200', hl.status === 200);
  a('/household/list has 1 (user-001 is member)', hl.data?.total === 1);

  // === CREATE household ===
  const create = await req('POST', svc.port, '/household/create/user-007', { name: 'Beach House', timezone: 'America/Los_Angeles' });
  a('/household/create returns 201', create.status === 201);
  const newHhId = create.data?.data?.id;
  a('/household/create has id', typeof newHhId === 'string');

  // === CREATE validation ===
  const cBad = await req('POST', svc.port, '/household/create/user-007', { name: 'x' });
  a('/household/create short name returns 400', cBad.status === 400);

  // === ADD member ===
  const addM = await req('POST', svc.port, `/household/${newHhId}/members/add/user-007`, { userId: 'user-008', name: 'Friend', role: 'adult' });
  a('/members/add returns 201', addM.status === 201);
  a('/members/add added user', addM.data?.data?.members?.length === 2);

  // === ADD member — invalid role ===
  const addMbad = await req('POST', svc.port, `/household/${newHhId}/members/add/user-007`, { userId: 'u9', name: 'X', role: 'invalid' });
  a('/members/add invalid role returns 400', addMbad.status === 400);

  // === ADD member — already ===
  const addM2 = await req('POST', svc.port, `/household/${newHhId}/members/add/user-007`, { userId: 'user-008', name: 'F', role: 'adult' });
  a('/members/add already returns 409', addM2.status === 409);

  // === ADD list item ===
  const addI = await req('POST', svc.port, '/household/hh-shared-001/lists/add/user-001', { text: 'Coffee', category: 'shopping' });
  a('/lists/add returns 201', addI.status === 201);

  // === LIST items ===
  const listL = await req('GET', svc.port, '/household/hh-shared-001/lists/list');
  a('/lists/list returns 200', listL.status === 200);
  a('/lists/list has 6 items (5 seeded + 1 new)', listL.data?.total === 6);
  a('/lists/list unchecked=5 (5 seeded unchecked + 1 new)', listL.data?.unchecked === 5);

  // === LIST items ?category=shopping ===
  const listS = await req('GET', svc.port, '/household/hh-shared-001/lists/list?category=shopping');
  a('/lists/list?category=shopping has 4', listS.data?.total === 4);

  // === CHECK off ===
  const check = await req('POST', svc.port, '/household/hh-shared-001/lists/check/li-1/user-001', {});
  a('/lists/check returns 200', check.status === 200);
  a('/lists/check marks checked', check.data?.data?.checked === true);

  // === ADD meal ===
  const addMeal = await req('POST', svc.port, '/household/hh-shared-001/meals/add/user-001', { day: 'friday', meal: 'dinner', title: 'Curry' });
  a('/meals/add returns 201', addMeal.status === 201);

  // === GET meals/week ===
  const week = await req('GET', svc.port, '/household/hh-shared-001/meals/week');
  a('/meals/week returns 200', week.status === 200);
  a('/meals/week has 7 days', Object.keys(week.data?.week || {}).length === 7);
  a('/meals/week monday has 1 dinner', week.data?.week?.monday?.dinner?.length === 1);

  // === ADD chore ===
  const addCh = await req('POST', svc.port, '/household/hh-shared-001/chores/add/user-001', { title: 'Mow lawn', assignedTo: 'user-001', cadence: 'weekly' });
  a('/chores/add returns 201', addCh.status === 201);

  // === LIST chores ===
  const chList = await req('GET', svc.port, '/household/hh-shared-001/chores/list');
  a('/chores/list returns 200', chList.status === 200);
  a('/chores/list has 4 (3 seeded + 1 new)', chList.data?.total === 4);

  // === ADD event ===
  const addEv = await req('POST', svc.port, '/household/hh-shared-001/events/add/user-001', { title: 'Mom\'s visit', date: '2026-07-20', type: 'other' });
  a('/events/add returns 201', addEv.status === 201);

  // === LIST events ===
  const evList = await req('GET', svc.port, '/household/hh-shared-001/events/list');
  a('/events/list returns 200', evList.status === 200);
  a('/events/list has 4 (3 seeded + 1 new)', evList.data?.total === 4);

  await killChild(svc.child);

  console.log(`\ngenie-household readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});