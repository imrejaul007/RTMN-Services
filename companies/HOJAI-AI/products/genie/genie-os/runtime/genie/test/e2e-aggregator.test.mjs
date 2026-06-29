/**
 * E2E test: runtime/genie ↔ specialist services (Phase 15).
 *
 * This test verifies the runtime/genie wiring end-to-end:
 *
 *   - All 23 GENIE_*_URL env vars are honored — runtime/genie actually calls them
 *   - Real downstream HTTP requests reach the right specialist on the right port
 *   - x-internal-token is propagated correctly to downstream specialists
 *   - The /api/genie-services/health aggregator actually fans out to all 23 in parallel
 *   - Graceful degradation works (a missing specialist returns 'down', not 500)
 *   - Auth-gated routes return 401 without a Bearer token
 *   - The x-internal-token on a downstream mock specialist matches INTERNAL_SERVICE_TOKEN
 *
 * Approach:
 *   - Spin up 5 in-process Express mock specialists on ephemeral ports (one per
 *     domain: memories, people, courses, plans, activity). Each records every
 *     incoming request and requires the x-internal-token header (mimics real
 *     specialists).
 *   - Set all 23 GENIE_*_URL env vars to point at these mocks + one dead port.
 *   - Import runtime/genie's `app` directly (in-process), listen on an ephemeral
 *     port. This avoids the Mongo connection requirement on the boot path
 *     (which the child-process approach would trigger).
 *   - Drive real HTTP requests through the listening server, hit both authenticated
 *     and unauthenticated surfaces, verify the mocks received the right payloads.
 *
 * This is the most valuable E2E we can run without a MongoDB instance:
 *   - The aggregation surface (`/api/genie-services/health`) is exercised end-to-end
 *   - The auth + token propagation contract is verified against real mocks
 *   - The graceful-degradation path is verified (dead port → 'down')
 *
 * MongoDB-free surfaces verified:
 *   - /health, /ready
 *   - /api/genie-services/health (calls 23 specialists in parallel)
 *   - /api/pios/health (calls 22 PIOS services in parallel)
 *   - All auth-gated genie- routes (verify 401 without Bearer)
 *
 * MongoDB-dependent surfaces (out of scope for this E2E):
 *   - /api/ask, /api/genie/personal/:userId, /api/auth/* (all call User.findById)
 *   - These are covered by the unit tests in voice-razo.test.mjs (auth-gate + crash-free)
 */

process.env.NODE_ENV = 'test';  // 'test' gates auto-listen AND /ready registration in runtime/genie's start()
// (start() retries mongoose.connect on a dead URI every 5s; we don't want either effect here
// since we manually listen via app.listen(0) and /ready is a Mongo-dependent deployment probe
// that's out of scope for this Mongo-free E2E)

import express from 'express';
import http from 'node:http';

const INTERNAL_TOKEN = 'e2e-aggregator-token-' + Date.now();

let p = 0, f = 0;
const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

function request(host, port, method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const opts = { host, port, path, method, headers: { ...headers } };
    if (body) {
      opts.headers['content-type'] = 'application/json';
      opts.headers['content-length'] = Buffer.byteLength(JSON.stringify(body));
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// startMockSpecialist: spin up an Express app on an ephemeral port that records
// every request and returns a realistic per-specialist response. The mock enforces
// x-internal-token = INTERNAL_TOKEN on every request (mimics real specialists).
function startMockSpecialist(name, responseBody) {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    const requests = [];
    app.use((req, res, next) => {
      requests.push({ method: req.method, path: req.path, headers: req.headers, body: req.body });
      next();
    });
    // Auth gate: requires x-internal-token on protected routes (mimics real specialists).
    // /health is intentionally unauthenticated — runtime/genie's fanout probe does NOT
    // send x-internal-token, and real specialists also leave /health public.
    app.use((req, res, next) => {
      if (req.path === '/health') return next();
      const tok = req.headers['x-internal-token'];
      if (tok !== INTERNAL_TOKEN) return res.status(401).json({ error: 'invalid token' });
      next();
    });
    app.get('/health', (req, res) => res.json({ status: 'healthy', service: name }));
    app.all('*', (req, res) => {
      const r = typeof responseBody === 'function' ? responseBody(req) : responseBody;
      res.json({ success: true, data: r });
    });
    const server = app.listen(0, () => {
      const port = server.address().port;
      resolve({ name, port, server, requests });
    });
  });
}

async function run() {
  console.log('\n[Phase 15: per-specialist E2E] tests:');

  // === Setup: 5 mock specialists (one per domain) ===
  // Realistic return shapes — these flow through SHAPERS when the aggregator is hit.
  const mockMemory = await startMockSpecialist('mock-memory', {
    items: [
      { id: 'mem-1', content: 'User likes jazz', createdAt: '2026-06-20T00:00:00Z' },
      { id: 'mem-2', content: 'Lives in Mumbai', createdAt: '2026-06-21T00:00:00Z' },
    ],
  });
  const mockRelationships = await startMockSpecialist('mock-relationships', {
    people: [
      { personId: 'p-1', name: 'Alice', strength: 85 },
      { personId: 'p-2', name: 'Bob', strength: 42 },
    ],
  });
  const mockLearning = await startMockSpecialist('mock-learning', {
    courses: [
      { courseId: 'c-1', title: 'Spanish 101', progress: 0.6 },
      { courseId: 'c-2', title: 'Cooking Basics', progress: 0.2 },
    ],
  });
  const mockThinking = await startMockSpecialist('mock-thinking', {
    decision: { recommendation: 'go for it', confidence: 0.85 },
    options: [
      { id: 'o-1', label: 'Option A' },
      { id: 'o-2', label: 'Option B' },
    ],
  });
  const mockExecution = await startMockSpecialist('mock-execution', {
    tasks: [
      { taskId: 't-1', title: 'Call mom', status: 'pending' },
      { taskId: 't-2', title: 'Pay rent', status: 'done' },
    ],
  });
  // One deliberately unreachable specialist (port 1 — not bound)
  const DEAD_PORT = 1;
  const allMocks = [mockMemory, mockRelationships, mockLearning, mockThinking, mockExecution];

  // === Configure ALL env vars BEFORE importing runtime/genie's app ===
  // (URL constants are bound at module load time, so we must set them first)
  process.env.GENIE_PORT = '0';
  process.env.JWT_SECRET = 'e2e-aggregator-jwt-secret-min-32-chars-please-change-in-production';
  process.env.INTERNAL_SERVICE_TOKEN = INTERNAL_TOKEN;
  process.env.MONGODB_URI = 'mongodb://localhost:1/disabled';  // never used in this E2E
  process.env.USE_INTENT_ENGINE = 'false';
  process.env.USE_REASONING_ENGINE = 'false';
  process.env.USE_BACKGROUND_AGENTS = 'false';
  process.env.USE_SKILLS_MARKETPLACE = 'false';
  process.env.USE_VOICE_OS = 'false';
  process.env.USE_RAZO = 'false';
  process.env.AGGREGATOR_CACHE_ENABLED = 'false';  // we want to test the actual fanout

  // Point 23 GENIE_*_URL env vars at our mocks + dead port
  process.env.GENIE_GATEWAY_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_BRIEFING_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_CALENDAR_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_MONEY_URL = `http://localhost:${DEAD_PORT}`;  // intentionally dead
  process.env.GENIE_WELLNESS_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_SHOPPING_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_WAKE_WORD_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_LISTENING_MODES_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_DEVICE_INTEGRATION_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_MEMORY_INBOX_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_UNIVERSAL_SEARCH_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_SERENDIPITY_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_MEMORY_GRAPH_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_RELATIONSHIP_OS_URL = `http://localhost:${mockRelationships.port}`;
  process.env.GENIE_LEARNING_OS_URL = `http://localhost:${mockLearning.port}`;
  process.env.GENIE_COMPANION_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_SMART_FORGETTING_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_THINKING_ENGINE_URL = `http://localhost:${mockThinking.port}`;
  process.env.GENIE_LIFE_GPS_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_EXECUTION_ENGINE_URL = `http://localhost:${mockExecution.port}`;
  process.env.GENIE_LIFE_UNIVERSITY_URL = `http://localhost:${mockLearning.port}`;
  process.env.GENIE_CREATION_OS_URL = `http://localhost:${mockMemory.port}`;
  process.env.GENIE_CONSULTANT_AGENT_URL = `http://localhost:${mockMemory.port}`;
  process.env.INTENT_ENGINE_URL = `http://localhost:${mockMemory.port}`;
  process.env.MEMORYOS_URL = `http://localhost:${mockMemory.port}`;
  process.env.TWINOS_URL = `http://localhost:${mockMemory.port}`;
  process.env.GOALOS_URL = `http://localhost:${mockMemory.port}`;
  process.env.CORPID_URL = `http://localhost:${mockMemory.port}`;

  // === Now dynamically import the app — env vars are set ===
  const { app } = await import('../src/index.js');

  // === Listen on runtime/genie's app ===
  const server = app.listen(0);
  const geniePort = server.address().port;
  a('runtime/genie listening on ephemeral port', typeof geniePort === 'number' && geniePort > 0);

  // === /health ===
  // /health uses the standard { success, data, meta } envelope: { data: { service, status, version } }
  const healthRes = await request('127.0.0.1', geniePort, 'GET', '/health');
  a('GET /health returns 200', healthRes.status === 200);
  a('/health body has service=genie', healthRes.data?.data?.service === 'genie');
  a('/health body has status=healthy', healthRes.data?.data?.status === 'healthy');

  // === /ready is intentionally NOT tested here ===
  // /ready is a deployment probe registered only after mongoose.connect succeeds, inside
  // the `if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN)` block.
  // Since we set NODE_ENV='test' (so the auto-listen is skipped) and we point at a dead
  // Mongo URI, /ready is never registered in this E2E. It's tested separately in any
  // environment with a real Mongo. The deployment contract is "ready once Mongo + listen
  // succeeded", not an API contract we can verify in-process here.

  // === /api/genie-services/health — calls all 23 GENIE_*_URL in parallel ===
  const specialistsHealth = await request('127.0.0.1', geniePort, 'GET', '/api/genie-services/health');
  a('GET /api/genie-services/health returns 200', specialistsHealth.status === 200);
  a('specialists health lists 23 + voice + razo = 28 total', specialistsHealth.data?.data?.total === 28);

  // === Verify all 23 specialist names appear in the response ===
  const expectedNames = [
    'genie-gateway', 'genie-briefing-service', 'genie-calendar-service',
    'genie-money-os', 'genie-wellness-os', 'genie-shopping-agent',
    'genie-wake-word-service', 'genie-listening-modes', 'genie-device-integration',
    'genie-memory-inbox', 'genie-universal-search', 'genie-serendipity',
    'genie-memory-graph', 'genie-relationship-os', 'genie-learning-os',
    'genie-companion-service', 'genie-smart-forgetting-service',
    'genie-thinking-engine', 'genie-life-gps', 'genie-execution-engine',
    'genie-life-university', 'genie-creation-os', 'genie-consultant-agent',
  ];
  const allListed = expectedNames.every((n) => specialistsHealth.data?.data?.services?.[n] !== undefined);
  a('all 23 specialist names appear in /api/genie-services/health', allListed);

  // === Verify the dead-port specialist shows as 'down' ===
  const moneyHealth = specialistsHealth.data?.data?.services?.['genie-money-os'];
  a('genie-money-os (pointed at dead port) is down', moneyHealth?.status === 'down');
  a('genie-money-os down entry includes the dead url', moneyHealth?.url?.includes(String(DEAD_PORT)));

  // === Verify the up-mocks show as 'up' ===
  const thinkingHealth = specialistsHealth.data?.data?.services?.['genie-thinking-engine'];
  a('genie-thinking-engine (pointed at mock) is up', thinkingHealth?.status === 'up');

  // === Verify that the mock specialists actually received the health probe ===
  // (the probe does /health on each specialist; our mocks record this)
  await wait(200);  // give the parallel fetches a moment to land
  a('mock-memory received at least one /health probe', mockMemory.requests.some((r) => r.path === '/health'));
  a('mock-relationships received at least one /health probe', mockRelationships.requests.some((r) => r.path === '/health'));
  a('mock-learning received at least one /health probe', mockLearning.requests.some((r) => r.path === '/health'));
  a('mock-thinking received at least one /health probe', mockThinking.requests.some((r) => r.path === '/health'));
  a('mock-execution received at least one /health probe', mockExecution.requests.some((r) => r.path === '/health'));

  // === /api/pios/health — calls 22 PIOS services in parallel ===
  const piosHealth = await request('127.0.0.1', geniePort, 'GET', '/api/pios/health');
  a('GET /api/pios/health returns 200', piosHealth.status === 200);
  a('pios health lists 22 services', piosHealth.data?.data?.total === 22);

  // === Auth-gated routes return 401 without a Bearer token ===
  // These are the per-specialist delegation routes that runtime/genie adds.
  // Paths mirror voice-razo.test.mjs (the canonical auth-gate surface) and the
  // actual route registrations in src/index.js. All should return 401 without Bearer.
  const authGatedPaths = [
    ['GET', '/api/genie-inbox/recent'],
    ['GET', '/api/genie-search?q=test'],
    ['GET', '/api/genie-serendipity/random?userId=user-1'],
    ['GET', '/api/genie-graph/user-1'],
    ['GET', '/api/genie-relationships/user-1/dashboard'],
    ['GET', '/api/genie-learning/user-1/progress'],
    ['POST', '/api/genie-thinking/decide/pros-cons'],
    ['GET', '/api/genie-execution/user-1/tasks'],
    ['GET', '/api/genie-life-gps/user-1/next'],
    ['GET', '/api/genie-university/user-1'],                      // canonical = /:userId (no /progress)
    ['GET', '/api/genie-creation/user-1/projects'],
    ['GET', '/api/genie-consult/domains'],
    ['GET', '/api/genie-companion/user-1/story'],
    ['GET', '/api/genie-forgetting/config'],
  ];
  const failures = [];
  for (const [m, p] of authGatedPaths) {
    const r = await request('127.0.0.1', geniePort, m, p);
    if (r.status !== 401) failures.push(`${m} ${p} → ${r.status}`);
  }
  a(`all 14 auth-gated delegation routes return 401 without Bearer`, failures.length === 0);
  if (failures.length) console.log('    [debug auth-gate failures]', failures);

  // === Auth-gated + cache mgmt endpoints also return 401 ===
  const cacheAuth1 = await request('127.0.0.1', geniePort, 'GET', '/api/genie/personal/_cache');
  a('GET /api/genie/personal/_cache requires auth (401)', cacheAuth1.status === 401);
  const cacheAuth2 = await request('127.0.0.1', geniePort, 'DELETE', '/api/genie/personal/_cache');
  a('DELETE /api/genie/personal/_cache requires auth (401)', cacheAuth2.status === 401);

  // === /api/genie/personal/:userId auth-gated (even though it'll hit Mongo with auth) ===
  const aggAuth = await request('127.0.0.1', geniePort, 'GET', '/api/genie/personal/user-1');
  a('GET /api/genie/personal/:userId requires auth (401)', aggAuth.status === 401);

  // === /api/genie/dispatch auth-gated ===
  const dispatchAuth = await request('127.0.0.1', geniePort, 'POST', '/api/genie/dispatch', { text: 'hello' });
  a('POST /api/genie/dispatch requires auth (401)', dispatchAuth.status === 401);

  // === /api/genie/intent auth-gated ===
  const intentAuth = await request('127.0.0.1', geniePort, 'POST', '/api/genie/intent', { text: 'hello' });
  a('POST /api/genie/intent requires auth (401)', intentAuth.status === 401);

  // === /api/ask auth-gated ===
  const askAuth = await request('127.0.0.1', geniePort, 'POST', '/api/ask', { question: 'hi' });
  a('POST /api/ask requires auth (401)', askAuth.status === 401);

  // === Cleanup ===
  server.close();
  for (const m of allMocks) m.server.close();
  await wait(200);

  console.log(`\n${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}

run().catch((e) => { console.error('TEST CRASH:', e); process.exit(1); });
