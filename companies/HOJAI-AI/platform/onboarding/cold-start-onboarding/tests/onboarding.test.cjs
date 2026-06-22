#!/usr/bin/env node
/**
 * Tests for cold-start-onboarding service
 *
 * Run: node platform/onboarding/cold-start-onboarding/tests/onboarding.test.cjs
 */

const assert = require('node:assert');
const http = require('node:http');

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
  assert.strictEqual(health.body.data.questions, 12);
  console.log('  ✓ Health endpoint correct, 12 questions loaded');

  // === Test 2: Ready ===
  console.log('Test 2: Ready endpoint...');
  const ready = await fetch('/ready');
  assert.strictEqual(ready.status, 200);
  assert.strictEqual(ready.body.data.ready, true);
  console.log('  ✓ Ready endpoint correct');

  // === Test 3: List questions ===
  console.log('Test 3: List questions...');
  const q = await fetch('/api/onboarding/questions');
  assert.strictEqual(q.status, 200);
  assert.strictEqual(q.body.data.questions.length, 12);
  assert.strictEqual(q.body.data.totalCount, 12);
  assert(q.body.data.estimatedMinutes >= 1, 'should estimate a few minutes');
  console.log('  ✓ Questions list correct');

  // === Test 4: Start session ===
  console.log('Test 4: Start session...');
  const start = await fetch('/api/onboarding/start', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {},
  });
  assert.strictEqual(start.status, 200);
  assert(start.body.data.sessionId, 'should return sessionId');
  assert.strictEqual(start.body.data.currentQuestion.id, 'name', 'first question should be name');
  assert.strictEqual(start.body.data.progress.current, 1);
  assert.strictEqual(start.body.data.progress.total, 12);
  console.log('  ✓ Session started, first question:', start.body.data.currentQuestion.id);

  const sessionId = start.body.data.sessionId;

  // === Test 5: Submit answers through the flow ===
  console.log('Test 5: Submit answers...');
  const fakeAnswers = [
    "Reza",
    "I run an AI platform company. I love the strategy, hate the ops grind.",
    "Dubai, GST timezone",
    "Wife Sarah, daughter Maya (4), dog Bruno",
    "Family, building things that last, honest conversations",
    "Ship the Personal Intelligence OS to 1000 users",
    "Endless meetings, context switching",
    "Deep work, walks with Bruno, time with Maya",
    "Casual and brief — bullet points over essays",
    "Don't bring up crypto. Period.",
    "Sarah's birthday March 14, call mom every Sunday",
    "I overthink. Remind me to ship, not perfect.",
  ];

  for (let i = 0; i < fakeAnswers.length; i++) {
    const r = await fetch('/api/onboarding/answer', {
      method: 'POST',
      headers: { 'x-internal-token': 'test-internal-token' },
      body: { sessionId, answer: fakeAnswers[i] },
    });
    assert.strictEqual(r.status, 200, `Answer ${i+1} should succeed`);
    if (i < fakeAnswers.length - 1) {
      assert.strictEqual(r.body.data.done, false, `Should not be done at Q${i+1}`);
      assert(r.body.data.currentQuestion, `Should return next question at Q${i+1}`);
    } else {
      assert.strictEqual(r.body.data.done, true, 'Should be done after last question');
    }
  }
  console.log('  ✓ All 12 answers submitted, session complete');

  // === Test 6: Session state ===
  console.log('Test 6: Get session state...');
  const state = await fetch(`/api/onboarding/session/${sessionId}`, {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(state.status, 200);
  assert.strictEqual(state.body.data.answersCount, 12);
  console.log('  ✓ Session state retrievable');

  // === Test 7: Complete onboarding ===
  console.log('Test 7: Complete onboarding...');
  const complete = await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { sessionId },
  });
  assert.strictEqual(complete.status, 200);
  assert(complete.body.data.summary, 'should return summary');
  assert(complete.body.data.intelligenceScoreV0, 'should return Personal Intelligence Score v0');
  assert.strictEqual(complete.body.data.intelligenceScoreV0.overall, 0, 'v0 score starts at 0');
  assert(complete.body.data.summary.factsExtracted > 0, 'should have extracted facts');
  console.log('  ✓ Onboarding complete, score v0 generated');

  // === Test 8: Auth enforcement ===
  console.log('Test 8: Auth enforcement...');
  const noAuth = await fetch('/api/onboarding/start', { method: 'POST', body: {} });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Protected routes require auth');

  // === Test 9: Invalid session rejected ===
  console.log('Test 9: Invalid session...');
  const bad = await fetch('/api/onboarding/answer', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { sessionId: 'nonexistent', answer: 'hello' },
  });
  assert.strictEqual(bad.status, 404);
  console.log('  ✓ Invalid session rejected');

  server.close();
  console.log('\n✅ All 9 tests passed');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  if (err.stack) console.error(err.stack);
  server.close();
  process.exit(1);
});
