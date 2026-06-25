/**
 * genie-widgets — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-widgets-tests';

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

const INTERNAL_TOKEN = 'widget-test-token-' + Date.now();
const JWT_SECRET = process.env.JWT_SECRET;

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS ${n}`)) : (f++, console.log(`  FAIL ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'W-USER-1', businessId: 'W-BIZ', industry: 'test', role: 'owner' });
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
        const dataDir = mkdtempSync(path.join(tmpdir(), 'wgt-data-'));
        const cwd = mkdtempSync(path.join(tmpdir(), 'wgt-cwd-'));
        const child = spawn('node', [SRC], {
          cwd,
          env: { ...process.env, PORT: String(port), INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, JWT_SECRET, HOJAI_DATA_DIR: dataDir, INFERENCE_STUB_MODE: 'true' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        let resolved = false;
        const onLine = (line) => {
          const m = line.replace(/\x1b\[[0-9;]*m/g, '').match(/Genie Lock-Screen Widgets running on port (\d+)/);
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
  console.log('\n[genie-widgets readiness] tests:\n');

  const svc = await spawnService();
  await waitReady(svc.port);

  // === /health ===
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Lock-Screen Widgets', h.data?.service === 'Genie Lock-Screen Widgets');

  // === /api/readiness ===
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness ready=true', rd.data?.data?.ready === true);

  // === /widgets/types ===
  const types = await req('GET', svc.port, '/widgets/types');
  a('/widgets/types returns 200', types.status === 200);
  a('/widgets/types has 8 widgets', types.data?.total === 8);

  // === /widgets/briefing/user-001 ===
  const brief = await req('GET', svc.port, '/widgets/briefing/user-001');
  a('/widgets/briefing returns 200', brief.status === 200);
  a('/widgets/briefing has data.headline', typeof brief.data?.data?.data?.headline === 'string');
  a('/widgets/briefing has meta', brief.data?.data?.meta?.icon === '☀️');

  // === /widgets/twin/user-001 ===
  const twin = await req('GET', svc.port, '/widgets/twin/user-001');
  a('/widgets/twin returns 200', twin.status === 200);
  a('/widgets/twin has data.topTrait', typeof twin.data?.data?.data?.topTrait === 'string');

  // === /widgets/unknown ===
  const unk = await req('GET', svc.port, '/widgets/unknown/user-001');
  a('/widgets/unknown returns 404', unk.status === 404);
  a('/widgets/unknown has available list', Array.isArray(unk.data?.available));

  // === /widgets/render/user-001 (all 8) ===
  const render = await req('POST', svc.port, '/widgets/render/user-001', {});
  a('/widgets/render returns 200', render.status === 200);
  a('/widgets/render bundle has 8 widgets', render.data?.bundle?.length === 8);
  a('/widgets/render totalBytes < 10000', render.data?.totalBytes < 10000);

  // === /widgets/render/user-001 (selected 2) ===
  const render2 = await req('POST', svc.port, '/widgets/render/user-001', { widgetTypes: ['briefing', 'gratitude'] });
  a('/widgets/render selective returns 200', render2.status === 200);
  a('/widgets/render selective has 2 widgets', render2.data?.bundle?.length === 2);

  // === /widgets/manifest/user-001 ===
  const manifest = await req('GET', svc.port, '/widgets/manifest/user-001');
  a('/widgets/manifest returns 200', manifest.status === 200);
  a('/widgets/manifest has 8 widgets', manifest.data?.data?.widgets?.length === 8);
  a('/widgets/manifest platform ios+android', manifest.data?.data?.platform?.includes('ios'));

  // === /config/user-001 (seeded) ===
  const cfg = await req('GET', svc.port, '/config/user-001');
  a('/config returns 200', cfg.status === 200);
  a('/config has 2 pinned widgets', cfg.data?.data?.pinned?.length === 2);

  // === /config/new-user (no record) ===
  const cfgNew = await req('GET', svc.port, '/config/user-002');
  a('/config new user returns 200', cfgNew.status === 200);
  a('/config new user has empty pinned', cfgNew.data?.data?.pinned?.length === 0);

  // === /config pin ===
  const pin = await req('POST', svc.port, '/config/user-002/pin/twin', {});
  a('/config pin returns 200', pin.status === 200);
  a('/config pin added twin', pin.data?.pinned?.includes('twin'));

  // === /config unpin ===
  const unpin = await req('POST', svc.port, '/config/user-002/unpin/twin', {});
  a('/config unpin returns 200', unpin.status === 200);
  a('/config unpin removed twin', !unpin.data?.pinned?.includes('twin'));

  // === /config update ===
  const upd = await req('POST', svc.port, '/config/user-002', { pinned: ['briefing', 'counter'], refreshIntervalMin: 60, theme: 'light' });
  a('/config update returns 200', upd.status === 200);
  a('/config update has 2 pinned', upd.data?.data?.pinned?.length === 2);
  a('/config update has theme=light', upd.data?.data?.theme === 'light');

  // === /config update invalid ===
  const updBad = await req('POST', svc.port, '/config/user-002', { refreshIntervalMin: 1 });
  a('/config update invalid returns 400', updBad.status === 400);

  await killChild(svc.child);

  console.log(`\ngenie-widgets readiness: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
