/**
 * genie-personal-twin — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-personal-twin-tests';

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

const INTERNAL_TOKEN = 'twin-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'T-USER-1', businessId: 'T-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'twin-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'twin-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: { ...process.env, PORT: String(port), INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, JWT_SECRET, HOJAI_DATA_DIR: dataDir, INFERENCE_STUB_MODE: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Personal Digital Twin running on port (\d+)/);
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
  console.log('\n[genie-personal-twin readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Personal Digital Twin', h.data?.service === 'Genie Personal Digital Twin');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);

  // === /twin/get/user-001 (seeded) ===
  const tg = await req('GET', svc.port, '/twin/get/user-001');
  a('/twin/get/user-001 returns 200', tg.status === 200);
  a('/twin/get has name', tg.data?.data?.name === 'You');
  a('/twin/get has headline', typeof tg.data?.data?.headline === 'string');
  a('/twin/get has 8 traits', tg.data?.data?.traits?.length === 8);
  a('/twin/get has 4 moments', tg.data?.data?.moments?.length === 4);

  // === /twin/get/not-found ===
  const tg404 = await req('GET', svc.port, '/twin/get/nonexistent');
  a('/twin/get/nonexistent returns 404', tg404.status === 404);

  // === /twin/summary/user-001 ===
  const ts = await req('GET', svc.port, '/twin/summary/user-001');
  a('/twin/summary returns 200', ts.status === 200);
  a('/twin/summary has 3 top traits', ts.data?.data?.topTraits?.length === 3);
  a('/twin/summary mood present', typeof ts.data?.data?.mood === 'object');

  // === /twin/update/user-001 ===
  const tu = await req('POST', svc.port, '/twin/update/user-001', { headline: 'Updated headline', age: 33 });
  a('/twin/update returns 200', tu.status === 200);
  a('/twin/update headline updated', tu.data?.data?.headline === 'Updated headline');
  a('/twin/update age updated', tu.data?.data?.age === 33);

  // === /twin/update/new-user (creates new) ===
  const tn = await req('POST', svc.port, '/twin/update/user-002', { name: 'New User', headline: 'Hello world' });
  a('/twin/update new user returns 200', tn.status === 200);
  a('/twin/update new user has name', tn.data?.data?.name === 'New User');

  // === /twin/mood/user-001 ===
  const tm = await req('GET', svc.port, '/twin/mood/user-001');
  a('/twin/mood returns 200', tm.status === 200);
  a('/twin/mood has 30-day series', tm.data?.data?.series?.length === 30);
  a('/twin/mood has avg', typeof tm.data?.data?.avg === 'number');
  a('/twin/mood has trend', ['up', 'down', 'steady'].includes(tm.data?.data?.trend));

  // === /traits/list/user-001 ===
  const tl = await req('GET', svc.port, '/traits/list/user-001');
  a('/traits/list returns 200', tl.status === 200);
  a('/traits/list has 8 traits', tl.data?.total === 8);
  a('/traits/list grouped has 5 categories', Object.keys(tl.data?.grouped || {}).length === 5);

  // === /traits/list?category=value ===
  const tlv = await req('GET', svc.port, '/traits/list/user-001?category=value');
  a('/traits/list?category=value returns 200', tlv.status === 200);
  a('/traits/list?category=value has 2', tlv.data?.total === 2);

  // === /traits/add/user-001 ===
  const ta = await req('POST', svc.port, '/traits/add/user-001', {
    category: 'skill', name: 'Public speaking', strength: 6, examples: ['Conferences 2025']
  });
  a('/traits/add returns 201', ta.status === 201);
  a('/traits/add has id', typeof ta.data?.data?.id === 'string');
  a('/traits/add name saved', ta.data?.data?.name === 'Public speaking');

  // === /traits/add — validation ===
  const taBad1 = await req('POST', svc.port, '/traits/add/user-001', { category: 'invalid', name: 'x' });
  a('/traits/add invalid category returns 400', taBad1.status === 400);
  const taBad2 = await req('POST', svc.port, '/traits/add/user-001', { category: 'value', name: 'x', strength: 99 });
  a('/traits/add invalid strength returns 400', taBad2.status === 400);

  // === /traits/remove ===
  const tr = await req('DELETE', svc.port, `/traits/remove/user-001/${ta.data.data.id}`);
  a('/traits/remove returns 200', tr.status === 200);
  const tlAfter = await req('GET', svc.port, '/traits/list/user-001');
  a('/traits/list after remove has 8', tlAfter.data?.total === 8);

  // === /traits/remove — wrong user ===
  const trWrong = await req('DELETE', svc.port, `/traits/remove/user-002/tr-1`);
  a('/traits/remove wrong user returns 403', trWrong.status === 403);

  // === /moments/add/user-001 ===
  const ma = await req('POST', svc.port, '/moments/add/user-001', {
    type: 'win', title: 'Shipped C1', date: '2026-06-24', description: 'Personal Simulation Engine done', impact: 'high'
  });
  a('/moments/add returns 201', ma.status === 201);
  a('/moments/add has id', typeof ma.data?.data?.id === 'string');

  // === /moments/add — validation ===
  const maBad = await req('POST', svc.port, '/moments/add/user-001', { title: 'x' });
  a('/moments/add no date returns 400', maBad.status === 400);

  // === /moments/list/user-001 ===
  const ml = await req('GET', svc.port, '/moments/list/user-001');
  a('/moments/list returns 200', ml.status === 200);
  a('/moments/list has 5 (4 seeded + 1 new)', ml.data?.total === 5);

  // === /moments/get/:momentId ===
  const mg = await req('GET', svc.port, '/moments/get/mmt-1');
  a('/moments/get/mmt-1 returns 200', mg.status === 200);
  a('/moments/get/mmt-1 has title', mg.data?.data?.title === 'First startup exit');

  await killChild(svc.child);

  console.log(`\ngenie-personal-twin readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
