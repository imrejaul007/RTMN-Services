#!/usr/bin/env node
/**
 * Tests for reflection-engine
 */

const assert = require('node:assert');
const http = require('node:http');

process.env.PORT = '0';
process.env.SUPPRESS_LISTEN = 'true';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
delete process.env.ANTHROPIC_API_KEY;

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
  assert.strictEqual(health.body.data.service, 'reflection-engine');
  console.log('  ✓ Health endpoint correct');

  // === Test 2: Ready ===
  console.log('Test 2: Ready endpoint...');
  const ready = await fetch('/ready');
  assert.strictEqual(ready.status, 200);
  console.log('  ✓ Ready endpoint correct');

  // === Test 3: Generate weekly reflection (LLM unavailable → fallback) ===
  console.log('Test 3: Generate weekly reflection (LLM fallback)...');
  const r = await fetch('/api/reflection/weekly', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'test-user' },
  });
  assert.strictEqual(r.status, 200);
  assert(r.body.data.id, 'should have id');
  assert(r.body.data.weekOf, 'should have weekOf');
  assert(r.body.data.summary, 'should have summary');
  assert(Array.isArray(r.body.data.insights), 'should have insights array');
  assert(r.body.data.insights.length > 0, 'should have at least 1 insight');
  assert(Array.isArray(r.body.data.questions), 'should have questions array');
  assert(r.body.data.questions.length > 0, 'should have at least 1 question');
  assert(r.body.data.nextWeekFocus, 'should have nextWeekFocus');
  console.log('  ✓ Reflection generated (fallback path), insights:', r.body.data.insights.length);

  const reflectionId = r.body.data.id;
  const insightCount = r.body.data.insights.length;

  // === Test 4: Get latest reflection ===
  console.log('Test 4: Get latest reflection...');
  const get = await fetch('/api/reflection/test-user', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(get.status, 200);
  assert.strictEqual(get.body.data.id, reflectionId, 'should return the same reflection');
  console.log('  ✓ Latest reflection retrievable');

  // === Test 5: Get history ===
  console.log('Test 5: Get history...');
  const hist = await fetch('/api/reflection/test-user/history', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(hist.status, 200);
  assert(hist.body.data.weeks >= 1, 'should have at least 1 week');
  console.log('  ✓ History retrievable, weeks:', hist.body.data.weeks);

  // === Test 6: Log feedback ===
  console.log('Test 6: Log insight feedback...');
  const fb = await fetch('/api/reflection/insight', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'test-user', reflectionId, insightIndex: 0, feedback: 'useful' },
  });
  assert.strictEqual(fb.status, 200);
  assert.strictEqual(fb.body.data.feedback, 'useful');
  console.log('  ✓ Feedback logged');

  // === Test 7: Invalid feedback rejected ===
  console.log('Test 7: Invalid feedback rejected...');
  const badFb = await fetch('/api/reflection/insight', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'test-user', reflectionId, insightIndex: 0, feedback: 'meh' },
  });
  assert.strictEqual(badFb.status, 400);
  console.log('  ✓ Invalid feedback rejected');

  // === Test 8: Auth enforcement ===
  console.log('Test 8: Auth enforcement...');
  const noAuth = await fetch('/api/reflection/weekly', { method: 'POST', body: { userId: 'x' } });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Auth enforced');

  // === Test 9: Missing userId ===
  console.log('Test 9: Missing userId...');
  const noUser = await fetch('/api/reflection/weekly', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {},
  });
  assert.strictEqual(noUser.status, 400);
  console.log('  ✓ Missing userId rejected');

  // === Test 10: 404 for user with no reflections ===
  console.log('Test 10: 404 for unknown user...');
  const notFound = await fetch('/api/reflection/never-existed-user', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(notFound.status, 404);
  console.log('  ✓ Unknown user returns 404');

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
