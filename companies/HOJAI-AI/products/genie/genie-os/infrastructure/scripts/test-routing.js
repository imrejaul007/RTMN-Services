#!/usr/bin/env node
/**
 * End-to-end routing test for the genie-os web super-app.
 *
 * Verifies that requests to the web (port 3000) reach the right backends
 * through the thin clients. This catches bugs like:
 *   - Web → thin client URL not forwarded (e.g. req.url vs req.originalUrl)
 *   - Web route registration order (catch-all intercepts specific paths)
 *   - Thin client → upstream URL not appended correctly
 *
 * Run only when the full stack is up:
 *   1. node infrastructure/scripts/start-all.js
 *   2. cd ../do-app/backend && npx tsx src/index.ts
 *   3. cd ../Nexha/commerce-identity && node dist/index.js
 *   4. cd ../HOJAI-AI/salar && node src/index.js
 *   5. node infrastructure/scripts/test-routing.js
 */

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function check(label, fn) {
  process.stdout.write(`  ${label.padEnd(45)} `);
  try {
    const result = await fn();
    if (result === true) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log(`❌ FAIL: ${result}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n🌐 E2E routing test (web :3000 → thin clients → backends)\n');

  // 1. Web health endpoint must NOT be caught by /api/ catch-all.
  //    (It used to return "Cannot GET /api/health" because the catch-all
  //    was registered before the explicit route.)
  await check('GET /api/health returns JSON (not HTML)', async () => {
    const r = await fetch(`${WEB_URL}/api/health`);
    const text = await r.text();
    if (text.startsWith('<!DOCTYPE')) return `got HTML, expected JSON: ${text.slice(0, 80)}`;
    const d = JSON.parse(text);
    if (!d.success) return `success=false: ${text}`;
    const svcs = Object.keys(d.data.services);
    if (!svcs.includes('genie-os (runtime)')) return `missing runtime in services: ${svcs}`;
    return true;
  });

  // 2. Web → do-client → DO app signup (validates /api/<product>/... stripping)
  await check('POST /api/do/auth/signup reaches DO app', async () => {
    const r = await fetch(`${WEB_URL}/api/do/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `routing-test-${Date.now()}@x.com`,
        name: 'Routing Test',
        password: 'password123',
      }),
    });
    const d = await r.json();
    if (d.success) return true;
    // DO app returns 400 for missing password etc — that still means the request reached it
    if (d.error?.code === 'VALIDATION_ERROR') return true;
    if (d.error?.code === 'CONFLICT') return true;
    return `unexpected: ${JSON.stringify(d).slice(0, 120)}`;
  });

  // 3. Web → nexha-client → Nexha /api/suppliers
  //    (Nexha's actual route is /api/suppliers; web must strip the /api/nexha prefix)
  await check('GET /api/nexha/suppliers reaches Nexha', async () => {
    const r = await fetch(`${WEB_URL}/api/nexha/suppliers`);
    const d = await r.json();
    if (!d.success) return `success=false: ${JSON.stringify(d).slice(0, 120)}`;
    if (!Array.isArray(d.data)) return `expected data to be array, got ${typeof d.data}`;
    return true;
  });

  // 4. Web → salar-client → Salar /api/listings
  await check('GET /api/salar/listings reaches Salar', async () => {
    const r = await fetch(`${WEB_URL}/api/salar/listings?limit=5`);
    const d = await r.json();
    if (!d.success) return `success=false: ${JSON.stringify(d).slice(0, 120)}`;
    if (!d.data?.items) return `expected data.items, got ${JSON.stringify(d.data).slice(0, 100)}`;
    return true;
  });

  // 5. Web → genie (catch-all) — genie has /health, /api/auth/signup, /api/ask
  await check('POST /api/auth/signup reaches genie (catch-all)', async () => {
    const r = await fetch(`${WEB_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `routing-genie-${Date.now()}@x.com`,
        name: 'Routing Genie',
        password: 'password123',
      }),
    });
    const d = await r.json();
    if (d.success && d.data?.token) return true;
    if (d.error?.code === 'CONFLICT') return true; // already exists
    return `unexpected: ${JSON.stringify(d).slice(0, 120)}`;
  });

  // 6. Web → genie ask with token (full auth + intent delegation)
  let token = null;
  await check('POST /api/ask with auth works (intent delegation)', async () => {
    // Signup to get a token
    const su = await fetch(`${WEB_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `routing-ask-${Date.now()}@x.com`,
        name: 'Routing Ask',
        password: 'password123',
      }),
    });
    const sd = await su.json();
    if (!sd.success && sd.error?.code !== 'CONFLICT') {
      return `signup failed: ${JSON.stringify(sd).slice(0, 100)}`;
    }
    // If conflict, login instead
    if (!sd.success) {
      const li = await fetch(`${WEB_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `routing-ask-${Date.now()}@x.com`,
          password: 'password123',
        }),
      });
      const ld = await li.json();
      if (!ld.success) return `login also failed: ${JSON.stringify(ld).slice(0, 100)}`;
      token = ld.data.token;
    } else {
      token = sd.data.token;
    }

    const r = await fetch(`${WEB_URL}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: 'hello genie' }),
    });
    const d = await r.json();
    if (!d.success) return `ask failed: ${JSON.stringify(d).slice(0, 120)}`;
    if (!d.data?.answer) return `no answer: ${JSON.stringify(d).slice(0, 100)}`;
    return true;
  });

  // 7. Web → thin client readiness (each client has its own /health on its own port).
  //    The web forwards /api/<product>/<path> → <client>/api/<product>/<path>
  //    but the clients' own /health is at /health (no /api prefix).
  //    So we hit each client directly via web's aggregated /api/health.
  await check('All 4 internal services healthy via /api/health', async () => {
    const r = await fetch(`${WEB_URL}/api/health`);
    const d = await r.json();
    const svcs = d.data?.services || {};
    for (const name of ['genie-os (runtime)', 'do-client', 'nexha-client', 'salar-client']) {
      if (!svcs[name]) return `missing ${name} in health response`;
      if (svcs[name].status === 'down') return `${name} is down`;
    }
    return true;
  });

  console.log(`\n📊 ${passed}/${passed + failed} routing checks passed${failed > 0 ? `, ${failed} failed` : ''}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
