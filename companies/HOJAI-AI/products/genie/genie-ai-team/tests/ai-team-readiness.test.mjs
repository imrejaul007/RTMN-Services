/**
 * genie-ai-team — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-ai-team-tests';

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

const INTERNAL_TOKEN = 'team-test-token-' + Date.now();
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'team-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'team-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: { ...process.env, PORT: String(port), INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, JWT_SECRET, HOJAI_DATA_DIR: dataDir, INFERENCE_STUB_MODE: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Personal AI Team running on port (\d+)/);
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
  console.log('\n[genie-ai-team readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Personal AI Team', h.data?.service === 'Genie Personal AI Team');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);

  // === /team/list/user-001 (seeded) ===
  const list = await req('GET', svc.port, '/team/list/user-001');
  a('/team/list returns 200', list.status === 200);
  a('/team/list has 5 seeded specialists', list.data?.total === 5);

  // === /team/get/mem-coach-001 ===
  const coach = await req('GET', svc.port, '/team/get/mem-coach-001');
  a('/team/get returns 200', coach.status === 200);
  a('/team/get name=Maya the Coach', coach.data?.data?.name === 'Maya the Coach');
  a('/team/get role=coach', coach.data?.data?.role === 'coach');

  // === /team/get/not-found ===
  const t404 = await req('GET', svc.port, '/team/get/nonexistent');
  a('/team/get/nonexistent returns 404', t404.status === 404);

  // === /team/hire/user-001 ===
  const hire = await req('POST', svc.port, '/team/hire/user-001', {
    name: 'Chef Marco', role: 'chef', avatar: '👨‍🍳',
    specialty: 'Italian home cooking', persona: 'Warm, encouraging, recipe-first',
    expertise: ['cooking', 'recipes']
  });
  a('/team/hire returns 201', hire.status === 201);
  a('/team/hire has id', typeof hire.data?.data?.id === 'string');
  const chefId = hire.data.data.id;

  // === /team/hire — validation ===
  const hBad1 = await req('POST', svc.port, '/team/hire/user-001', { name: 'x', role: 'coach', specialty: 'test test', persona: 'test test' });
  a('/team/hire short name returns 400', hBad1.status === 400);
  const hBad2 = await req('POST', svc.port, '/team/hire/user-001', { name: 'Test', role: 'invalid', specialty: 'test test', persona: 'test test' });
  a('/team/hire invalid role returns 400', hBad2.status === 400);

  // === /team/chat/user-001/mem-coach-001 ===
  const chat = await req('POST', svc.port, '/team/chat/user-001/mem-coach-001', { message: "I'm thinking about quitting my job to start something new." });
  a('/team/chat returns 201', chat.status === 201);
  a('/team/chat userMessage captured', chat.data?.data?.userMessage?.content?.includes('quitting'));
  a('/team/chat reply captured', typeof chat.data?.data?.reply?.content === 'string');
  a('/team/chat reply.length > 10', chat.data?.data?.reply?.content?.length > 10);

  // === /team/chat — validation ===
  const cBad = await req('POST', svc.port, '/team/chat/user-001/mem-coach-001', { message: '' });
  a('/team/chat empty message returns 400', cBad.status === 400);

  // === /team/chat — wrong user ===
  const cWrong = await req('POST', svc.port, '/team/chat/user-002/mem-coach-001', { message: 'hi' });
  a('/team/chat wrong user returns 403', cWrong.status === 403);

  // === /team/chat — unknown member ===
  const cUnk = await req('POST', svc.port, '/team/chat/user-001/nonexistent', { message: 'hi' });
  a('/team/chat unknown member returns 404', cUnk.status === 404);

  // === /team/history/user-001/mem-coach-001 ===
  const hist = await req('GET', svc.port, '/team/history/user-001/mem-coach-001');
  a('/team/history returns 200', hist.status === 200);
  a('/team/history has 2 messages', hist.data?.total === 2);
  a('/team/history first is user', hist.data?.messages?.[0]?.role === 'user');
  a('/team/history second is assistant', hist.data?.messages?.[1]?.role === 'assistant');

  // === /team/recommend/user-001?message=... ===
  const rec = await req('GET', svc.port, '/team/recommend/user-001?message=health%20sleep%20nutrition');
  a('/team/recommend returns 200', rec.status === 200);
  a('/team/recommend has 3 picks', rec.data?.recommendations?.length === 3);
  // Doctor should win because of "health" keyword
  const top = rec.data?.recommendations?.[0];
  a('/team/recommend top is doctor (health match)', top?.role === 'doctor');

  // === /team/recommend empty ===
  const recEmpty = await req('GET', svc.port, '/team/recommend/user-002');
  a('/team/recommend empty team returns 0', recEmpty.data?.recommendations?.length === 0);

  // === /team/fire ===
  const fire = await req('DELETE', svc.port, `/team/fire/user-001/${chefId}`);
  a('/team/fire returns 200', fire.status === 200);

  // === /team/fire wrong user ===
  const fireWrong = await req('DELETE', svc.port, '/team/fire/user-002/mem-coach-001');
  a('/team/fire wrong user returns 403', fireWrong.status === 403);

  await killChild(svc.child);

  console.log(`\ngenie-ai-team readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
