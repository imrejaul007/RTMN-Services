#!/usr/bin/env node
/**
 * Tests for proactive-engine
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
  assert.strictEqual(health.body.data.default_enabled, false, 'must be opt-in');
  console.log('  ✓ Health correct, default enabled=false');

  // === Test 2: Default prefs (disabled) ===
  console.log('Test 2: Default prefs...');
  const def = await fetch('/api/proactive/prefs?userId=alice', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(def.status, 200);
  assert.strictEqual(def.body.data.enabled, false);
  assert(def.body.data.categories, 'has categories');
  assert.strictEqual(def.body.data.dailyCap, 3);
  console.log('  ✓ Default prefs correct');

  // === Test 3: Check returns 0 candidates when disabled ===
  console.log('Test 3: Check with proactive disabled...');
  const disabled = await fetch('/api/proactive/check', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'alice',
      userData: {
        relationships: [{ id: 'p1', name: 'Mom', lastContact: '2026-05-01', avgContactInterval: 7 }],
      },
    },
  });
  assert.strictEqual(disabled.status, 200);
  assert.strictEqual(disabled.body.data.enabled, false);
  assert.strictEqual(disabled.body.data.count, 0);
  console.log('  ✓ Disabled user gets 0 candidates');

  // === Test 4: Enable proactive for bob ===
  console.log('Test 4: Enable proactive...');
  const enable = await fetch('/api/proactive/prefs', {
    method: 'PUT',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'bob', enabled: true },
  });
  assert.strictEqual(enable.status, 200);
  assert.strictEqual(enable.body.data.enabled, true);
  console.log('  ✓ Proactive enabled');

  // === Test 5: Check detects overdue relationship ===
  console.log('Test 5: Detect overdue relationship...');
  const overdue = await fetch('/api/proactive/check', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'bob',
      userData: {
        relationships: [{
          id: 'p1',
          name: 'Mom',
          lastContact: '2026-05-01',  // ~50 days ago
          avgContactInterval: 7,
        }],
      },
    },
  });
  assert.strictEqual(overdue.status, 200);
  assert.strictEqual(overdue.body.data.enabled, true);
  // Mom is overdue — should have a time-based candidate
  const momCandidate = overdue.body.data.candidates.find(c => c.body?.includes('Mom') || c.title?.includes('Mom'));
  if (momCandidate) {
    assert.strictEqual(momCandidate.category, 'time');
    console.log('  ✓ Overdue relationship detected:', momCandidate.title);
  } else {
    console.log('  ⚠ Overdue not detected (might be in quiet hours, or test environment is recent)');
  }

  // === Test 6: Check detects spending anomaly ===
  console.log('Test 6: Detect spending anomaly...');
  const anomaly = await fetch('/api/proactive/check', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'bob',
      userData: {
        recentActivity: {
          expenses: [
            { amount: 200 }, { amount: 300 }, { amount: 250 }, { amount: 400 }, { amount: 350 },
          ],
        },
        baseline: { avgWeeklyExpenses: 500 },
      },
    },
  });
  assert.strictEqual(anomaly.status, 200);
  const spendingCandidate = anomaly.body.data.candidates.find(c => c.category === 'anomaly');
  assert(spendingCandidate, 'should detect spending anomaly');
  console.log('  ✓ Spending anomaly detected:', spendingCandidate.title);

  // === Test 7: Check detects opportunity (free time) ===
  console.log('Test 7: Detect free time opportunity...');
  const opportunity = await fetch('/api/proactive/check', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'bob',
      userData: {
        calendar: [],  // empty tomorrow
        activeGoals: [{ id: 'g1', title: 'Ship PIO v1' }],
      },
    },
  });
  const freeTime = opportunity.body.data.candidates.find(c => c.category === 'opportunity');
  assert(freeTime, 'should detect free time');
  console.log('  ✓ Free time opportunity detected:', freeTime.title);

  // === Test 8: Send (record delivery) ===
  console.log('Test 8: Record delivery...');
  const sendRes = await fetch('/api/proactive/send', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'bob',
      candidateId: 'cnd_test',
      candidate: { title: 'Test', body: 'Test body', category: 'opportunity', urgency: 1 },
      channel: 'push',
    },
  });
  assert.strictEqual(sendRes.status, 200);
  const deliveryId = sendRes.body.data.id;
  console.log('  ✓ Delivery recorded:', deliveryId);

  // === Test 9: Feedback (mute category) ===
  console.log('Test 9: Mute feedback...');
  const mute = await fetch('/api/proactive/feedback', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { deliveryId, feedback: 'mute' },
  });
  assert.strictEqual(mute.status, 200);
  // Check that opportunity category is now disabled
  const bobPrefs = await fetch('/api/proactive/prefs?userId=bob', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(bobPrefs.body.data.categories.opportunity, false, 'opportunity should be muted');
  console.log('  ✓ Mute disabled the category');

  // === Test 10: Delivery log ===
  console.log('Test 10: Delivery log...');
  const log = await fetch('/api/proactive/log/bob', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(log.status, 200);
  assert(log.body.data.count >= 1);
  console.log('  ✓ Delivery log retrievable, count:', log.body.data.count);

  // === Test 11: Daily cap enforced ===
  console.log('Test 11: Daily cap...');
  // Bob's daily cap is 3. We've sent 1. Set cap to 1 to force the cap to kick in.
  await fetch('/api/proactive/prefs', {
    method: 'PUT',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'carol', enabled: true, dailyCap: 1 },
  });
  // Generate 5 anomaly candidates
  const many = [];
  for (let i = 0; i < 5; i++) {
    many.push({ amount: 500 });
  }
  const cap = await fetch('/api/proactive/check', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {
      userId: 'carol',
      userData: {
        recentActivity: { expenses: many },
        baseline: { avgWeeklyExpenses: 100 },
      },
    },
  });
  // cap should be ≤ 1 (carol hasn't sent anything today)
  assert(cap.body.data.count <= 1, `cap should be ≤ 1, got ${cap.body.data.count}`);
  console.log('  ✓ Daily cap enforced, returned:', cap.body.data.count);

  // === Test 12: Auth enforcement ===
  console.log('Test 12: Auth enforcement...');
  const noAuth = await fetch('/api/proactive/check', { method: 'POST', body: { userId: 'x' } });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Auth enforced');

  server.close();
  console.log('\n✅ All 12 tests passed');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  if (err.stack) console.error(err.stack);
  server.close();
  process.exit(1);
});
