#!/usr/bin/env node
/**
 * Tests for morning-briefing-v2 service
 *
 * Run: node platform/intelligence/morning-briefing-v2/tests/briefing.test.cjs
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
  assert.strictEqual(health.body.data.service, 'morning-briefing-v2');
  assert.strictEqual(health.body.data.version, '2.0.0');
  console.log('  ✓ Health endpoint correct');

  // === Test 2: Ready ===
  console.log('Test 2: Ready endpoint...');
  const ready = await fetch('/ready');
  assert.strictEqual(ready.status, 200);
  assert.strictEqual(ready.body.data.ready, true);
  console.log('  ✓ Ready endpoint correct');

  // === Test 3: Generate morning briefing (with all downstreams offline, should still work) ===
  console.log('Test 3: Generate morning briefing (graceful degradation)...');
  const b = await fetch('/api/briefing/morning', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'test-user-123' },
  });
  assert.strictEqual(b.status, 200);
  assert(b.body.data.id, 'should return briefing id');
  assert(b.body.data.message, 'should return composed message');
  assert(b.body.data.sections, 'should return sections');
  assert(b.body.data.sections.calendar, 'calendar section should exist');
  assert(b.body.data.sections.goals, 'goals section should exist');
  assert.strictEqual(b.body.data.sections.calendar.available, false, 'calendar should be marked unavailable when downstream is down');
  console.log('  ✓ Briefing generated with graceful degradation');

  // === Test 4: History (should now have 1 entry) ===
  console.log('Test 4: Get history...');
  const hist = await fetch('/api/briefing/history/test-user-123', {
    headers: { 'x-internal-token': 'test-internal-token' },
  });
  assert.strictEqual(hist.status, 200);
  assert(hist.body.data.count >= 1, 'should have at least 1 briefing in history');
  console.log('  ✓ History retrievable, count:', hist.body.data.count);

  // === Test 5: Expand a section ===
  console.log('Test 5: Expand a section...');
  const expand = await fetch('/api/briefing/morning/expand', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'test-user-123', section: 'calendar' },
  });
  assert.strictEqual(expand.status, 200);
  assert.strictEqual(expand.body.data.section, 'calendar');
  assert(expand.body.data.expansion, 'should return expansion text');
  console.log('  ✓ Section expansion works');

  // === Test 6: Expand with no briefing found ===
  console.log('Test 6: Expand with no briefing...');
  const noBriefing = await fetch('/api/briefing/morning/expand', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: { userId: 'never-onboarded-user', section: 'calendar' },
  });
  assert.strictEqual(noBriefing.status, 404);
  console.log('  ✓ No briefing returns 404');

  // === Test 7: Auth enforcement ===
  console.log('Test 7: Auth enforcement...');
  const noAuth = await fetch('/api/briefing/morning', { method: 'POST', body: { userId: 'x' } });
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ Protected routes require auth');

  // === Test 8: Validation rejects missing userId ===
  console.log('Test 8: Validation...');
  const noUserId = await fetch('/api/briefing/morning', {
    method: 'POST',
    headers: { 'x-internal-token': 'test-internal-token' },
    body: {},
  });
  assert.strictEqual(noUserId.status, 400);
  console.log('  ✓ Missing userId rejected');

  // === Test 9: Briefing has date + greeting ===
  console.log('Test 9: Briefing structure...');
  assert(b.body.data.date, 'should have date');
  assert(b.body.data.greeting, 'should have greeting');
  assert(b.body.data.personalNote, 'should have personal note');
  assert(b.body.data.generatedAt, 'should have generatedAt timestamp');
  console.log('  ✓ Briefing has all expected fields');

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
