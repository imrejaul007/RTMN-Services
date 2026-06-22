#!/usr/bin/env node
/**
 * Tests for intent-engine service
 *
 * Run: node platform/intelligence/intent-engine/tests/intent.test.cjs
 *
 * Tests:
 *  1. Health endpoint
 *  2. Specialists list contains all 10 specialists
 *  3. Auth enforcement on intent routes
 *  4. Intent extract returns fallback when LLM is unavailable (no API key)
 *  5. Route returns proper structure
 */

const assert = require('node:assert');
const http = require('node:http');

// Boot the service WITHOUT an LLM API key (force fallback path)
process.env.PORT = '0';
process.env.SUPPRESS_LISTEN = 'true';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
// Ensure no real API key is set so LLM calls fail predictably
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.GOOGLE_API_KEY;

const app = require('../src/index.js').default;
const server = app.listen(0);
const port = server.address().port;
const baseUrl = `http://localhost:${port}`;

function fetch(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
    const req = http.request(`${baseUrl}${path}`, { ...options, headers }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  // === Test 1: Health ===
  console.log('Test 1: Health endpoint...');
  const health = await fetch('/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.body.data.status, 'healthy');
  assert.strictEqual(health.body.data.service, 'intent-engine');
  assert(health.body.data.specialists >= 10, 'should have at least 10 specialists registered');
  console.log('  ✓ Health endpoint correct, specialists:', health.body.data.specialists);

  // === Test 2: Ready ===
  console.log('Test 2: Ready endpoint...');
  const ready = await fetch('/ready');
  assert.strictEqual(ready.status, 200);
  assert.strictEqual(ready.body.data.ready, true);
  console.log('  ✓ Ready endpoint correct');

  // === Test 3: Specialists list ===
  console.log('Test 3: Specialists list...');
  const specs = await fetch('/api/intent/specialists');
  assert.strictEqual(specs.status, 200);
  assert(specs.body.data.specialists.length >= 10);
  const ids = specs.body.data.specialists.map(s => s.id);
  assert(ids.includes('genie-shopping-agent'), 'shopping specialist present');
  assert(ids.includes('genie-calendar-service'), 'calendar specialist present');
  assert(ids.includes('genie-money-os'), 'money specialist present');
  assert(ids.includes('memory-substrate'), 'memory specialist present');
  console.log('  ✓ All key specialists present');

  // === Test 4: Auth required ===
  console.log('Test 4: Auth enforcement...');
  const noAuth = await fetch('/api/intent/extract', {
    method: 'POST',
    body: { message: 'hello' },
  });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Protected routes require auth');

  // === Test 5: Intent extract with internal token (LLM will fail → fallback) ===
  console.log('Test 5: Intent extract with internal token (LLM fallback)...');
  const extract = await fetch('/api/intent/extract', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { message: 'what should I buy for dinner tonight?' },
  });
  // Either succeeds (LLM available in env) OR falls back to conversation
  assert.strictEqual(extract.status, 200);
  assert(extract.body.data.targetSpecialist, 'should return a target specialist');
  assert(extract.body.data.confidence !== undefined, 'should return confidence');
  console.log('  ✓ Intent extracted:', extract.body.data.targetSpecialist, '(confidence:', extract.body.data.confidence + ')');

  // === Test 6: Route plan structure ===
  console.log('Test 6: Full routing plan...');
  const route = await fetch('/api/intent/route', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { message: 'remind me to call mom tomorrow', userId: 'test-user' },
  });
  assert.strictEqual(route.status, 200);
  assert(route.body.data.routing, 'should return routing plan');
  assert(route.body.data.routing.targetSpecialist, 'routing should have specialist');
  assert(typeof route.body.data.routing.confidence === 'number', 'routing should have confidence');
  assert(typeof route.body.data.routing.shouldCall === 'boolean', 'routing should have shouldCall');
  console.log('  ✓ Routing plan correct');

  // === Test 7: Validation rejects empty message ===
  console.log('Test 7: Empty message validation...');
  const empty = await fetch('/api/intent/extract', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {},
  });
  assert.strictEqual(empty.status, 400);
  console.log('  ✓ Empty message rejected');

  server.close();
  console.log('\n✅ All 7 tests passed');
  // Force exit (server.close() doesn't always release the port cleanly)
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  server.close();
  process.exit(1);
});
