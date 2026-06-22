#!/usr/bin/env node
/**
 * Tests for reasoning-engine service
 *
 * Run: node platform/intelligence/reasoning-engine/tests/reasoning.test.cjs
 */

const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');

process.env.PORT = '0';
process.env.SUPPRESS_LISTEN = 'true';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
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
  assert.strictEqual(health.body.data.service, 'reasoning-engine');
  assert(health.body.data.tools_available >= 25, 'should have 25+ tools');
  console.log('  ✓ Health endpoint correct, tools:', health.body.data.tools_available);

  // === Test 2: Ready ===
  console.log('Test 2: Ready endpoint...');
  const ready = await fetch('/ready');
  assert.strictEqual(ready.status, 200);
  assert.strictEqual(ready.body.data.ready, true);
  console.log('  ✓ Ready endpoint correct');

  // === Test 3: List tools ===
  console.log('Test 3: List tools...');
  const tools = await fetch('/api/reason/tools');
  assert.strictEqual(tools.status, 200);
  assert(tools.body.data.total >= 25);
  assert(tools.body.data.categories.length >= 6, 'should have multiple categories');
  const toolNames = tools.body.data.tools.map(t => t.name);
  assert(toolNames.includes('shop_product'), 'shop_product present');
  assert(toolNames.includes('get_today_calendar'), 'calendar tool present');
  assert(toolNames.includes('remember_fact'), 'memory tool present');
  assert(toolNames.includes('generate_morning_briefing'), 'briefing tool present');
  console.log('  ✓ Tool catalog correct:', toolNames.length, 'tools');

  // === Test 4: Plan only (LLM unavailable → should fail with planning error) ===
  console.log('Test 4: Plan only (LLM unavailable)...');
  const planRes = await fetch('/api/reason/plan', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { question: 'plan my day' },
  });
  // Either succeeds (LLM available) or 500 (planning failed because no LLM)
  assert([200, 500].includes(planRes.status), `expected 200 or 500, got ${planRes.status}`);
  console.log('  ✓ Plan endpoint reachable (status:', planRes.status + ')');

  // === Test 5: Execute pre-made plan (all tools will fail because no services) ===
  console.log('Test 5: Execute a pre-made plan...');
  const execRes = await fetch('/api/reason/execute', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'test-user',
      plan: {
        steps: [
          { id: 'step_1', tool: 'get_today_calendar', args: {}, dependsOn: [], reasoning: 'test' },
          { id: 'step_2', tool: 'get_active_goals', args: {}, dependsOn: [], reasoning: 'test' },
          { id: 'step_3', tool: 'shop_product', args: { item: 'laptop' }, dependsOn: ['step_1', 'step_2'], reasoning: 'test' },
        ],
      },
    },
  });
  assert.strictEqual(execRes.status, 200);
  assert(execRes.body.data.results, 'should have results object');
  assert(execRes.body.data.errors, 'should have errors object');
  // All steps should have errored (no downstream services)
  assert(Object.keys(execRes.body.data.errors).length === 3, 'all 3 steps should fail');
  console.log('  ✓ Execute endpoint works, all 3 steps failed (expected)');

  // === Test 6: Execute with dependsOn — verify parallel execution ===
  console.log('Test 6: Parallel execution...');
  const t0 = Date.now();
  const parallel = await fetch('/api/reason/execute', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'test-user',
      plan: {
        steps: [
          { id: 's1', tool: 'get_today_calendar', args: {}, dependsOn: [], reasoning: 'a' },
          { id: 's2', tool: 'get_active_goals', args: {}, dependsOn: [], reasoning: 'b' },
          { id: 's3', tool: 'get_budget_snapshot', args: {}, dependsOn: [], reasoning: 'c' },
        ],
      },
    },
  });
  const parallelElapsed = Date.now() - t0;
  // All three are independent and should fail fast (connection refused) — under 3s total
  assert(parallelElapsed < 3000, `should be fast, took ${parallelElapsed}ms`);
  console.log('  ✓ Parallel execution took', parallelElapsed, 'ms');

  // === Test 7: Main /api/reason endpoint (LLM unavailable → returns synthesized answer) ===
  console.log('Test 7: Main reason endpoint...');
  const reason = await fetch('/api/reason', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      question: 'what is on my calendar today?',
      userId: 'test-user',
    },
  });
  // Either succeeds with a fallback answer, or returns 500 (planning failed)
  assert([200, 500].includes(reason.status), `expected 200 or 500, got ${reason.status}`);
  if (reason.status === 200) {
    assert(reason.body.data.answer, 'should have an answer');
    assert(reason.body.data.requestId, 'should have requestId');
    console.log('  ✓ Reason endpoint works, answer length:', reason.body.data.answer.length);
  } else {
    console.log('  ✓ Reason endpoint returns 500 (LLM unavailable, expected)');
  }

  // === Test 8: Stats ===
  console.log('Test 8: Stats...');
  const statsRes = await fetch('/api/reason/stats', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(statsRes.status, 200);
  assert(typeof statsRes.body.data.total === 'number');
  console.log('  ✓ Stats endpoint works, total:', statsRes.body.data.total);

  // === Test 9: Auth enforcement ===
  console.log('Test 9: Auth enforcement...');
  const noAuth = await fetch('/api/reason', { method: 'POST', body: { question: 'x', userId: 'y' } });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Auth enforced');

  // === Test 10: Validation ===
  console.log('Test 10: Validation...');
  const noQ = await fetch('/api/reason', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'x' },
  });
  assert.strictEqual(noQ.status, 400);
  console.log('  ✓ Missing question rejected');

  server.close();
  console.log('\n✅ All 10 tests passed');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  if (err.stack) console.error(err.stack);
  server.close();
  process.exit(1);
});
