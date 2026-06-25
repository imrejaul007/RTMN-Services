/**
 * genie-shopping-agent — readiness + seed tests (Phase A of Genie 100%).
 *
 * Spawns the service on an ephemeral port, then asserts:
 *   - /health returns 200 with service metadata
 *   - /api/llm-health, /api/db-health, /api/readiness all 200
 *   - /ready returns 200
 *   - GET /api/history/:userId returns the seeded orders
 *   - GET /api/wishlist/:userId returns the seeded wishlist
 *   - GET /api/preferences/:userId returns the seeded profile
 *   - GET /api/sessions/:id returns the seeded session
 *   - POST /api/shop creates a real shopping session
 *   - GET /api/recommendations/:userId returns recommendations
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createToken } from '@rtmn/shared/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_DIR = path.join(__dirname, '..');
const SRC = path.join(SERVICE_DIR, 'src', 'index.js');

const INTERNAL_TOKEN = 'shop-test-token-' + Date.now();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_aaaaa';

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  PASS  ${n}`)) : (f++, console.log(`  FAIL  ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bearer() {
  const tok = createToken({ userId: 'SHOP-USER-1', businessId: 'SHOP-BIZ', industry: 'shopping', role: 'owner' });
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
        const req2 = http.request({ host: '127.0.0.1', port, path: '/health', method: 'GET' }, (res2) => {
          res2.resume();
          resolve(res2.statusCode);
        });
        req2.on('error', reject);
        req2.end();
      });
      if (r === 200) return true;
    } catch {}
    await wait(150);
  }
  return false;
}

function spawnService(env, label) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), `shop-${label}-data-`));
        const child = spawn('node', [SRC], {
          cwd: SERVICE_DIR,
          env: {
            ...process.env,
            ...env,
            PORT: String(port),
            INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN,
            HOJAI_DATA_DIR: dataDir,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        child.stdout.on('data', (b) => { stdout += b.toString(); });
        child.stderr.on('data', (b) => { stderr += b.toString(); });
        child.on('exit', (code) => {
          reject(new Error(`Service ${label} exited (${code}):\n${stdout}\n${stderr}`));
        });
        const deadline = Date.now() + 8000;
        const tick = async () => {
          if (Date.now() > deadline) {
            child.kill('SIGTERM');
            reject(new Error(`Service ${label} didn't start within 8s:\n${stdout}\n${stderr}`));
            return;
          }
          if (/GENIE SHOPPING AGENT/.test(stdout) || /status: RUNNING/i.test(stdout)) {
            resolve({ child, port, stdout, stderr });
            return;
          }
          await wait(120);
          tick();
        };
        tick();
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
  console.log('\n[genie-shopping-agent] readiness + seed tests:\n');

  const svc = await spawnService({}, 'shop');
  await waitReady(svc.port);
  a('service booted', true);

  // 1. /health
  const h = await req('GET', svc.port, '/health');
  a('/health returns 200', h.status === 200);
  a('/health reports Genie Shopping Agent', /Shopping Agent/.test(h.data?.service || ''));
  a('/health has capabilities array', Array.isArray(h.data?.capabilities));

  // 2. /ready
  const r = await req('GET', svc.port, '/ready');
  a('/ready returns 200', r.status === 200);
  a('/ready.ready === true', r.data?.ready === true);

  // 3. /api/llm-health
  const lh = await req('GET', svc.port, '/api/llm-health');
  a('/api/llm-health returns 200', lh.status === 200);
  a('/api/llm-health service=genie-shopping-agent', lh.data?.data?.service === 'genie-shopping-agent');
  a('/api/llm-health has llm_available boolean', typeof lh.data?.data?.llm_available === 'boolean');

  // 4. /api/db-health
  const dh = await req('GET', svc.port, '/api/db-health');
  a('/api/db-health returns 200', dh.status === 200);
  a('/api/db-health has mongo_connected boolean', typeof dh.data?.data?.mongo_connected === 'boolean');

  // 5. /api/readiness
  const rd = await req('GET', svc.port, '/api/readiness');
  a('/api/readiness returns 200', rd.status === 200);
  a('/api/readiness reports service name', rd.data?.data?.service === 'genie-shopping-agent');
  a('/api/readiness.ready === true', rd.data?.data?.ready === true);
  a('/api/readiness has degraded boolean', typeof rd.data?.data?.degraded === 'boolean');

  // 6. Purchase history (seeded)
  const hist = await req('GET', svc.port, '/api/history/user-demo-1');
  a('GET /api/history/:userId returns 200', hist.status === 200);
  a('history total >= 2', (hist.data?.total || 0) >= 2);
  a('history includes Wireless Earbuds Pro', hist.data?.orders?.some?.(o => o.product?.name === 'Wireless Earbuds Pro'));

  // 7. Wishlist (seeded)
  const wish = await req('GET', svc.port, '/api/wishlist/user-demo-1');
  a('GET /api/wishlist/:userId returns 200', wish.status === 200);
  a('wishlist has >= 2 items', (wish.data?.wishlist?.length || 0) >= 2);

  // 8. Preferences (seeded)
  const prefs = await req('GET', svc.port, '/api/preferences/user-demo-1');
  a('GET /api/preferences/:userId returns 200', prefs.status === 200);
  a('preferences has shoppingProfile', typeof prefs.data?.shoppingProfile === 'object');
  a('preferences has budget', typeof prefs.data?.budget === 'object');

  // 9. Seeded session
  const sess = await req('GET', svc.port, '/api/sessions/shop-demo-001');
  a('GET /api/sessions/:id returns 200', sess.status === 200);
  a('seeded session has userId', sess.data?.userId === 'user-demo-1');
  a('seeded session has products', Array.isArray(sess.data?.products));

  // 10. Recommendations endpoint
  const rec = await req('GET', svc.port, '/api/recommendations/user-demo-1');
  a('GET /api/recommendations/:userId returns 200', rec.status === 200);
  a('recommendations has >= 2 items', (rec.data?.recommendations?.length || 0) >= 2);

  // 11. Live shop request (creates a fresh session)
  const shop = await req('POST', svc.port, '/api/shop', {
    userId: 'user-live-test',
    message: 'Find me wireless earbuds under $100',
  });
  a('POST /api/shop returns 200', shop.status === 200);
  a('shop returns session with id', typeof shop.data?.session?.id === 'string');
  a('shop returns products array', Array.isArray(shop.data?.products));

  await killChild(svc.child);

  console.log(`\ngenie-shopping-agent: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});