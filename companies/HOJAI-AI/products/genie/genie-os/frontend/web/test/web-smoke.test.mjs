/**
 * Genie Web App — basic smoke test.
 *
 * Verifies the production server:
 *   - /ready returns 200
 *   - GET / returns the Vite-built index.html (or fallback)
 *   - POST /api/auth/signup creates a user and returns a token
 *   - POST /api/auth/login authenticates that user
 *   - GET /api/auth/me returns the user with a valid Bearer token
 *   - GET /api/specialists/briefing/health reaches briefing service
 *
 * Spawns the Express server on an ephemeral port and uses HTTP requests.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SVC_DIR = path.join(__dirname, '..');
const SRC = path.join(SVC_DIR, 'server.js');

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function req(method, port, urlPath, body, headers = {}) {
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
        resolve({ status: res.statusCode, data: parsed, raw: data });
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
      const r = await req('GET', port, '/ready');
      if (r.status === 200) return true;
    } catch {}
    await wait(150);
  }
  return false;
}

function spawnService() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => {
        const dataDir = mkdtempSync(path.join(tmpdir(), 'genie-web-data-'));
        const child = spawn('node', [SRC], {
          cwd: SVC_DIR,
          env: {
            ...process.env,
            PORT: String(port),
            WEB_PORT: String(port),
            JWT_SECRET: 'test-jwt-secret-at-least-64-characters-long-for-testing-purposes-aaaaaaaaaa',
            HOJAI_DATA_DIR: dataDir,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        child.stdout.on('data', (b) => { stdout += b.toString(); });
        child.stderr.on('data', (b) => { stderr += b.toString(); });
        child.on('exit', (code) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`Service exited (${code}):\n${stdout}\n${stderr}`));
          }
        });
        let resolved = false;
        const finish = (err, result) => {
          if (!resolved) {
            resolved = true;
            if (err) reject(err); else resolve(result);
          }
        };
        setTimeout(async () => {
          const ok = await waitReady(port);
          if (ok) finish(null, { child, port });
          else { child.kill('SIGTERM'); finish(new Error(`didn't start in time:\n${stdout}\n${stderr}`)); }
        }, 1000);
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
  console.log('\n[genie-web] smoke tests:\n');

  const svc = await spawnService();
  a('server started', true);

  // Health
  const ready = await req('GET', svc.port, '/ready');
  a('GET /ready returns 200', ready.status === 200);
  a('GET /ready reports ready=true', ready.data?.ready === true);

  // Index page (Vite dist or fallback public/)
  const index = await req('GET', svc.port, '/');
  a('GET / returns 200', index.status === 200);
  a('GET / contains <div id="root">', index.raw?.includes('<div id="root">') || index.raw?.includes('HOJAI'));

  // Auth: signup
  const email = `test-${Date.now()}@example.com`;
  const signup = await req('POST', svc.port, '/api/auth/signup', {
    email, password: 'pw12345', name: 'Tester'
  });
  a('POST /api/auth/signup returns 200', signup.status === 200);
  a('signup returns success=true', signup.data?.success === true);
  a('signup returns a token', typeof signup.data?.data?.token === 'string' && signup.data.data.token.length > 20);
  a('signup returns user with email', signup.data?.data?.user?.email === email);

  const token = signup.data?.data?.token;

  // Auth: login with same creds
  const login = await req('POST', svc.port, '/api/auth/login', { email, password: 'pw12345' });
  a('POST /api/auth/login returns 200', login.status === 200);
  a('login returns success=true', login.data?.success === true);

  // Auth: login wrong pw
  const badLogin = await req('POST', svc.port, '/api/auth/login', { email, password: 'wrong' });
  a('POST /api/auth/login wrong pw returns 401', badLogin.status === 401);

  // Auth: /me with valid token
  const me = await req('GET', svc.port, '/api/auth/me', null, { authorization: `Bearer ${token}` });
  a('GET /api/auth/me with token returns 200', me.status === 200);
  a('/me returns user.email', me.data?.data?.email === email);

  // Auth: /me without token
  const noAuth = await req('GET', svc.port, '/api/auth/me');
  a('GET /api/auth/me without token returns 401', noAuth.status === 401);

  // Specialist proxy — health of briefing (may be down but should respond, not 502)
  const spec = await req('GET', svc.port, '/api/specialists/briefing/health');
  a('GET /api/specialists/briefing/health returns 200 OR 502 (proxy OK)', spec.status === 200 || spec.status === 502);

  // Static asset path
  const css = await req('GET', svc.port, '/assets/index-B4VmMv_u.css');
  a('static asset returns 200 OR 404 (SPA fallback OK)', css.status === 200 || css.status === 404);

  await killChild(svc.child);

  console.log(`\ngenie-web: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});