/**
 * genie-simulation — Phase A readiness tests.
 */

// Set JWT_SECRET BEFORE importing
process.env.JWT_SECRET = 'test-jwt-secret-for-simulation-tests';

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

const INTERNAL_TOKEN = 'sim-test-token-' + Date.now();
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'sim-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'sim-cwd-'));
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
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Personal Simulation running on port (\d+)/);
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
  console.log('\n[genie-simulation readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Personal Simulation', h.data?.service === 'Genie Personal Simulation');

  // === /api/llm-health ===
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-simulation', lh.data?.data?.service === 'genie-simulation');
  a('/api/llm-health has stub_mode field', typeof lh.data?.data?.stub_mode === 'boolean');
  a('/api/llm-health has gateway_url field', typeof lh.data?.data?.gateway_url === 'string');

  // === /api/db-health ===
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health service=genie-simulation', dh.data?.data?.service === 'genie-simulation');
  a('/api/db-health has mongo_connected field', typeof dh.data?.data?.mongo_connected === 'boolean');
  a('/api/db-health mode field present', typeof dh.data?.data?.mode === 'string');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);
  a('/api/readiness has llm_available', typeof rd.data?.data?.llm_available === 'boolean');
  a('/api/readiness has degraded field', typeof rd.data?.data?.degraded === 'boolean');

  // === /templates/list ===
  const tpls = await req('GET', svc.port, '/templates/list');
  a('/templates/list returns 200', tpls.status === 200);
  a('/templates/list has 7 templates', tpls.data?.total === 7);

  // === /templates/list?category=career ===
  const careerTpls = await req('GET', svc.port, '/templates/list?category=career');
  a('/templates/list?category=career returns 200', careerTpls.status === 200);
  a('/templates/list?category=career has 3 templates', careerTpls.data?.total === 3);

  // === /templates/get/tpl-move ===
  const tplMove = await req('GET', svc.port, '/templates/get/tpl-move');
  a('/templates/get/tpl-move returns 200', tplMove.status === 200);
  a('/templates/get/tpl-move has prompt', tplMove.data?.data?.prompt?.includes('move'));

  // === /templates/get/not-found ===
  const tpl404 = await req('GET', svc.port, '/templates/get/nonexistent');
  a('/templates/get/nonexistent returns 404', tpl404.status === 404);

  // === /scenarios/run/:userId ===
  const run = await req('POST', svc.port, '/scenarios/run/user-001', {
    title: 'Moving to Dubai',
    scenario: 'move',
    variables: { location: 'Dubai', salary: 'AED 420k' }
  });
  a('/scenarios/run returns 201', run.status === 201);
  a('/scenarios/run returns id', typeof run.data?.data?.id === 'string');
  a('/scenarios/run has outcomes.financial', typeof run.data?.data?.outcomes?.financial === 'string');
  a('/scenarios/run has pros (>=2)', run.data?.data?.pros?.length >= 2);
  a('/scenarios/run has cons (>=2)', run.data?.data?.cons?.length >= 2);
  a('/scenarios/run has recommendation', run.data?.data?.recommendation?.length > 0);

  // === /scenarios/run — validation ===
  const noTitle = await req('POST', svc.port, '/scenarios/run/user-001', { scenario: 'move' });
  a('/scenarios/run no title returns 400', noTitle.status === 400);
  const noScenario = await req('POST', svc.port, '/scenarios/run/user-001', { title: 'Test' });
  a('/scenarios/run no scenario returns 400', noScenario.status === 400);

  // === /scenarios/run — different scenario types ===
  const jobRun = await req('POST', svc.port, '/scenarios/run/user-001', {
    title: 'Taking the Google offer',
    scenario: 'job',
    variables: { company: 'Google', role: 'Senior Engineer' }
  });
  a('/scenarios/run job returns 201', jobRun.status === 201);
  a('/scenarios/run job has outcomes.career', typeof jobRun.data?.data?.outcomes?.career === 'string');

  // === /scenarios/list/:userId === (1 seeded sim-1 + 2 new runs = 3 entries)
  const list = await req('GET', svc.port, '/scenarios/list/user-001');
  a('/scenarios/list returns 200', list.status === 200);
  a('/scenarios/list user-001 has 3 entries (1 seeded + 2 new)', list.data?.total === 3);

  // === /scenarios/get/:scenarioId ===
  const get = await req('GET', svc.port, '/scenarios/get/sim-1');
  a('/scenarios/get/sim-1 returns 200', get.status === 200);
  a('/scenarios/get/sim-1 has outcomes', typeof get.data?.data?.outcomes === 'object');

  // === /scenarios/get/not-found ===
  const s404 = await req('GET', svc.port, '/scenarios/get/nonexistent');
  a('/scenarios/get/nonexistent returns 404', s404.status === 404);

  // === /scenarios/compare/:userId ===
  // Both scenarios must be in user-001's store. Create a 2nd scenario for user-001.
  const run2 = await req('POST', svc.port, '/scenarios/run/user-001', {
    title: 'Staying in current city',
    scenario: 'quit',
    variables: { next_step: 'consulting' }
  });
  a('setup: created second sim for user-001', run2.status === 201);

  const list2 = await req('GET', svc.port, '/scenarios/list/user-001');
  const simIds = (list2.data?.scenarios || []).map(s => s.id);

  const cmp = await req('POST', svc.port, '/scenarios/compare/user-001', {
    scenarioIds: [simIds[0], simIds[1]]
  });
  a('/scenarios/compare returns 200', cmp.status === 200);
  a('/scenarios/compare has 2 titles', cmp.data?.data?.titles?.length === 2);
  a('/scenarios/compare has matrix', Array.isArray(cmp.data?.data?.matrix));
  a('/scenarios/compare matrix[0] has scores', typeof cmp.data?.data?.matrix?.[0]?.scores === 'object');

  // === /scenarios/compare — invalid input ===
  const cmpBad = await req('POST', svc.port, '/scenarios/compare/user-001', { scenarioIds: ['sim-1'] });
  a('/scenarios/compare 1 id returns 400', cmpBad.status === 400);

  await killChild(svc.child);

  console.log(`\ngenie-simulation readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});