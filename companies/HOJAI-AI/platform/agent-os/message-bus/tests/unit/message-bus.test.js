'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateTopic, validateMessage, validateSubscription,
  normalizeTopic, normalizeMessage, normalizeSubscription,
  patternMatches, matchTopic, findMatchingTopics,
  loadTopics, saveTopics, loadSubscriptions, saveSubscriptions,
  appendMessage, readMessages, clearMessages,
  summarizeTopic, findTopic, findSubscription, listAll,
  app, SERVICE_NAME, PORT, VERSION,
} = idx;

// ---------------------------------------------------------------------------
// Validation: validateTopic
// ---------------------------------------------------------------------------

test('validateTopic accepts a minimal valid topic', () => {
  const errs = validateTopic({ name: 'agent.events' });
  assert.deepEqual(errs, []);
});

test('validateTopic accepts topic with description', () => {
  const errs = validateTopic({ name: 'foo', description: 'a topic' });
  assert.deepEqual(errs, []);
});

test('validateTopic rejects missing name', () => {
  const errs = validateTopic({ description: 'no name' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateTopic rejects empty name', () => {
  const errs = validateTopic({ name: '' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateTopic rejects invalid characters in name', () => {
  const errs = validateTopic({ name: 'bad topic!' });
  assert.ok(errs.some((e) => e.includes('only contain')));
});

test('validateTopic rejects non-string description', () => {
  const errs = validateTopic({ name: 'ok', description: 123 });
  assert.ok(errs.some((e) => e.includes('description')));
});

test('validateTopic handles null', () => {
  const errs = validateTopic(null);
  assert.ok(errs.length > 0);
});

// ---------------------------------------------------------------------------
// validateMessage
// ---------------------------------------------------------------------------

test('validateMessage accepts minimal message with payload', () => {
  const errs = validateMessage({ payload: { hello: 'world' } });
  assert.deepEqual(errs, []);
});

test('validateMessage accepts payload of any JSON type', () => {
  assert.deepEqual(validateMessage({ payload: 'string' }), []);
  assert.deepEqual(validateMessage({ payload: 42 }), []);
  assert.deepEqual(validateMessage({ payload: null }), []);
  assert.deepEqual(validateMessage({ payload: [1, 2, 3] }), []);
});

test('validateMessage rejects missing payload', () => {
  const errs = validateMessage({});
  assert.ok(errs.some((e) => e.includes('payload')));
});

test('validateMessage rejects non-object headers', () => {
  const errs = validateMessage({ payload: 'x', headers: 'bad' });
  assert.ok(errs.some((e) => e.includes('headers')));
});

test('validateMessage rejects array headers', () => {
  const errs = validateMessage({ payload: 'x', headers: [1, 2] });
  assert.ok(errs.some((e) => e.includes('headers')));
});

test('validateMessage handles null', () => {
  const errs = validateMessage(null);
  assert.ok(errs.length > 0);
});

// ---------------------------------------------------------------------------
// validateSubscription
// ---------------------------------------------------------------------------

test('validateSubscription accepts valid subscription', () => {
  const errs = validateSubscription({ pattern: 'agent.*', subscriber: 'agt_1' });
  assert.deepEqual(errs, []);
});

test('validateSubscription rejects missing pattern', () => {
  const errs = validateSubscription({ subscriber: 'agt_1' });
  assert.ok(errs.some((e) => e.includes('pattern')));
});

test('validateSubscription rejects missing subscriber', () => {
  const errs = validateSubscription({ pattern: '*' });
  assert.ok(errs.some((e) => e.includes('subscriber')));
});

test('validateSubscription handles null', () => {
  const errs = validateSubscription(null);
  assert.ok(errs.length > 0);
});

// ---------------------------------------------------------------------------
// normalizeTopic / normalizeMessage / normalizeSubscription
// ---------------------------------------------------------------------------

test('normalizeTopic assigns default values', () => {
  const t = normalizeTopic({ name: 'foo' }, null);
  assert.equal(t.name, 'foo');
  assert.equal(t.messageCount, 0);
  assert.equal(t.subscriberCount, 0);
  assert.ok(t.createdAt);
});

test('normalizeTopic preserves existing fields', () => {
  const existing = { name: 'foo', description: 'd', messageCount: 5, subscriberCount: 2, createdAt: '2020' };
  const t = normalizeTopic({ name: 'foo' }, existing);
  assert.equal(t.messageCount, 5);
  assert.equal(t.subscriberCount, 2);
  assert.equal(t.createdAt, '2020');
});

test('normalizeMessage assigns id with msg_ prefix and default headers', () => {
  const m = normalizeMessage({ payload: { x: 1 } }, 'topic.a', 'agt_1');
  assert.ok(m.id && m.id.startsWith('msg_'));
  assert.equal(m.topic, 'topic.a');
  assert.equal(m.publisher, 'agt_1');
  assert.deepEqual(m.payload, { x: 1 });
  assert.deepEqual(m.headers, {});
  assert.ok(m.timestamp);
});

test('normalizeMessage defaults publisher to anonymous', () => {
  const m = normalizeMessage({ payload: 'x' }, 't', '');
  assert.equal(m.publisher, 'anonymous');
});

test('normalizeSubscription assigns id with sub_ prefix and active=true', () => {
  const s = normalizeSubscription({ pattern: 'a.*', subscriber: 'agt_1' }, null);
  assert.ok(s.id && s.id.startsWith('sub_'));
  assert.equal(s.active, true);
  assert.equal(s.lastDeliveredId, null);
  assert.ok(s.createdAt);
});

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

test('patternMatches: * matches everything', () => {
  assert.equal(patternMatches('*', 'foo'), true);
  assert.equal(patternMatches('*', 'a.b.c'), true);
  assert.equal(patternMatches('*', 'agent.events.completed'), true);
});

test('patternMatches: agent.* matches one segment after agent.', () => {
  assert.equal(patternMatches('agent.*', 'agent.events'), true);
  assert.equal(patternMatches('agent.*', 'agent.foo'), true);
  assert.equal(patternMatches('agent.*', 'agent.a.b'), false); // two segments after
  assert.equal(patternMatches('agent.*', 'other.events'), false);
});

test('patternMatches: *.events matches one segment before .events', () => {
  assert.equal(patternMatches('*.events', 'foo.events'), true);
  assert.equal(patternMatches('*.events', 'agent.events'), true);
  assert.equal(patternMatches('*.events', 'a.b.events'), false); // two segments before
  assert.equal(patternMatches('*.events', 'events'), false);
});

test('patternMatches: exact multi-segment match', () => {
  assert.equal(patternMatches('a.b.c', 'a.b.c'), true);
  assert.equal(patternMatches('a.b.c', 'a.b.x'), false);
  assert.equal(patternMatches('a.b.c', 'a.b'), false);
});

test('matchTopic is an alias for patternMatches', () => {
  assert.equal(matchTopic('a.*', 'a.b'), true);
  assert.equal(matchTopic('a.*', 'x.b'), false);
});

test('findMatchingTopics returns matching topics', () => {
  const topics = [{ name: 'agent.events' }, { name: 'agent.logs' }, { name: 'other.events' }];
  const r = findMatchingTopics('agent.*', topics);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((t) => t.name).sort(), ['agent.events', 'agent.logs']);
});

test('findMatchingTopics handles non-array', () => {
  assert.deepEqual(findMatchingTopics('*', null), []);
});

// ---------------------------------------------------------------------------
// Storage helpers (in-memory-ish)
// ---------------------------------------------------------------------------

test('listAll returns input or empty for non-array', () => {
  assert.deepEqual(listAll([1, 2]), [1, 2]);
  assert.deepEqual(listAll(null), []);
  assert.deepEqual(listAll(undefined), []);
});

test('findTopic / findSubscription find by id or return null', () => {
  const topics = [{ name: 'a' }, { name: 'b' }];
  assert.equal(findTopic(topics, 'a').name, 'a');
  assert.equal(findTopic(topics, 'nope'), null);
  assert.equal(findTopic(null, 'a'), null);

  const subs = [{ id: 'sub_1' }];
  assert.equal(findSubscription(subs, 'sub_1').id, 'sub_1');
  assert.equal(findSubscription(subs, 'nope'), null);
  assert.equal(findSubscription(null, 'x'), null);
});

test('summarizeTopic returns null for invalid input', () => {
  assert.equal(summarizeTopic(null), null);
  assert.equal(summarizeTopic(undefined), null);
});

test('summarizeTopic produces canonical shape', () => {
  const s = summarizeTopic({ name: 'a', description: 'd', createdAt: 'c', messageCount: 5, subscriberCount: 2 });
  assert.equal(s.name, 'a');
  assert.equal(s.messageCount, 5);
  assert.equal(s.subscriberCount, 2);
});

// ---------------------------------------------------------------------------
// appendMessage / readMessages / clearMessages
// ---------------------------------------------------------------------------

test('appendMessage + readMessages round-trip preserves payload', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-test-'));
  process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  i2.appendMessage('test.topic', { id: 'msg_1', topic: 'test.topic', payload: { hello: 'world' }, headers: {}, publisher: 'a', timestamp: '2020-01-01T00:00:00.000Z' });
  const msgs = i2.readMessages('test.topic');
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].id, 'msg_1');
  assert.deepEqual(msgs[0].payload, { hello: 'world' });
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test('readMessages respects since filter', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-test-'));
  process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  i2.appendMessage('t', { id: 'msg_a', topic: 't', payload: 1, headers: {}, publisher: 'a', timestamp: '2020-01-01T00:00:00.000Z' });
  i2.appendMessage('t', { id: 'msg_b', topic: 't', payload: 2, headers: {}, publisher: 'a', timestamp: '2020-01-02T00:00:00.000Z' });
  i2.appendMessage('t', { id: 'msg_c', topic: 't', payload: 3, headers: {}, publisher: 'a', timestamp: '2020-01-03T00:00:00.000Z' });
  const r = i2.readMessages('t', { since: '2020-01-01T12:00:00.000Z' });
  assert.equal(r.length, 2);
  assert.equal(r[0].id, 'msg_b');
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test('readMessages respects limit and offset', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-test-'));
  process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  for (let i = 0; i < 5; i += 1) {
    i2.appendMessage('t', { id: `msg_${i}`, topic: 't', payload: i, headers: {}, publisher: 'a', timestamp: '2020-01-01T00:00:00.000Z' });
  }
  assert.equal(i2.readMessages('t', { limit: 2 }).length, 2);
  assert.equal(i2.readMessages('t', { offset: 1, limit: 2 })[0].id, 'msg_1');
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test('clearMessages removes the JSONL file', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-test-'));
  process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  i2.appendMessage('t', { id: 'msg_1', topic: 't', payload: 1, headers: {}, publisher: 'a', timestamp: '2020-01-01T00:00:00.000Z' });
  i2.clearMessages('t');
  assert.equal(i2.readMessages('t').length, 0);
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test('readMessages returns [] for non-existent topic', () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-test-'));
  process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  assert.deepEqual(i2.readMessages('never.existed'), []);
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// HTTP integration
// ---------------------------------------------------------------------------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'message-bus-test-'));
    process.env.MESSAGE_BUS_DATA_DIR = testDataDir;
    delete require.cache[require.resolve('../../src/index')];
    const idx2 = require('../../src/index');
    const srv = idx2.app.listen(0, () => resolve({ srv, port: srv.address().port, dataDir: testDataDir, idx: idx2 }));
  });
}

test('HTTP: GET /health works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'message-bus');
  assert.equal(body.port, 4807);
  assert.equal(body.status, 'ok');
  srv.close();
});

test('HTTP: GET /ready works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  srv.close();
});

test('HTTP: POST /api/topics creates a topic', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'agent.events', description: 'agent events' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.name, 'agent.events');
  assert.equal(body.description, 'agent events');
  assert.equal(body.messageCount, 0);
  srv.close();
});

test('HTTP: POST /api/topics rejects duplicate with 409', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'dup.topic' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'dup.topic' }),
  });
  assert.equal(res.status, 409);
  srv.close();
});

test('HTTP: POST /api/topics validates invalid name (400)', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'has spaces!' }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/topics/:name/stats comes before /:name route', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'stats.topic' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/stats.topic/stats`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.name, 'stats.topic');
  assert.equal(body.messageCount, 0);
  assert.equal(body.subscriberCount, 0);
  assert.equal(body.lastPublishedAt, null);
  srv.close();
});

test('HTTP: GET /api/topics/:name/messages/latest comes before /messages route', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'latest.topic' }),
  });
  // Publish 3 messages
  for (let i = 0; i < 3; i += 1) {
    await fetch(`http://localhost:${port}/api/topics/latest.topic/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Id': 'publisher' },
      body: JSON.stringify({ payload: { i } }),
    });
  }
  const res = await fetch(`http://localhost:${port}/api/topics/latest.topic/messages/latest?limit=2`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 2);
  srv.close();
});

test('HTTP: POST /api/topics/:name/messages publishes with X-Agent-Id header', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'pub.topic' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/pub.topic/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Agent-Id': 'agt_publisher' },
    body: JSON.stringify({ payload: { hello: 'world' }, headers: { trace: 'abc' } }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.publisher, 'agt_publisher');
  assert.deepEqual(body.payload, { hello: 'world' });
  assert.equal(body.headers.trace, 'abc');
  srv.close();
});

test('HTTP: POST /api/topics/:name/messages defaults publisher to anonymous', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'anon.topic' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/anon.topic/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: 'x' }),
  });
  const body = await res.json();
  assert.equal(body.publisher, 'anonymous');
  srv.close();
});

test('HTTP: GET /api/topics/:name/messages replays with since/limit/offset', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'replay.topic' }),
  });
  for (let i = 0; i < 5; i += 1) {
    await fetch(`http://localhost:${port}/api/topics/replay.topic/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: i }),
    });
    // tiny sleep to ensure distinct timestamps
    await new Promise((r) => setTimeout(r, 5));
  }
  const res = await fetch(`http://localhost:${port}/api/topics/replay.topic/messages?limit=2&offset=1`);
  const body = await res.json();
  assert.equal(body.count, 2);
  assert.equal(body.messages[0].payload, 1);
  assert.equal(body.messages[1].payload, 2);
  srv.close();
});

test('HTTP: DELETE /api/topics/:name/messages clears all messages', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'clear.topic' }),
  });
  await fetch(`http://localhost:${port}/api/topics/clear.topic/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: 'x' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/clear.topic/messages`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const stats = await (await fetch(`http://localhost:${port}/api/topics/clear.topic/stats`)).json();
  assert.equal(stats.messageCount, 0);
  srv.close();
});

test('HTTP: GET /api/topics/:name returns topic', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'get.topic' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/get.topic`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.name, 'get.topic');
  srv.close();
});

test('HTTP: DELETE /api/topics/:name removes topic and matching subscriptions', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'del.topic' }),
  });
  await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'del.*', subscriber: 'agt_x' }),
  });
  const res = await fetch(`http://localhost:${port}/api/topics/del.topic`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const subs = await (await fetch(`http://localhost:${port}/api/subscriptions`)).json();
  assert.equal(subs.count, 0);
  srv.close();
});

test('HTTP: POST /api/subscriptions creates a subscription', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'agent.*', subscriber: 'agt_sub' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id.startsWith('sub_'));
  assert.equal(body.pattern, 'agent.*');
  assert.equal(body.subscriber, 'agt_sub');
  assert.equal(body.active, true);
  srv.close();
});

test('HTTP: POST /api/subscriptions validates missing fields (400)', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: '*' }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/subscriptions lists with subscriber filter', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'a.*', subscriber: 'agt_1' }),
  });
  await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'b.*', subscriber: 'agt_2' }),
  });
  const res = await fetch(`http://localhost:${port}/api/subscriptions?subscriber=agt_1`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.subscriptions[0].subscriber, 'agt_1');
  srv.close();
});

test('HTTP: POST /api/subscriptions/:id/pull returns NEW messages and advances lastDeliveredId', async () => {
  const { srv, port } = await startTestServer();
  // Create two topics
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'agent.alpha' }),
  });
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'agent.beta' }),
  });
  // Subscribe to agent.*
  const subRes = await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'agent.*', subscriber: 'agt_consumer' }),
  });
  const sub = await subRes.json();
  // Publish 3 messages across topics
  for (let i = 0; i < 3; i += 1) {
    const topic = i % 2 === 0 ? 'agent.alpha' : 'agent.beta';
    await fetch(`http://localhost:${port}/api/topics/${topic}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { i } }),
    });
  }
  // First pull - should return 3
  const pull1 = await (await fetch(`http://localhost:${port}/api/subscriptions/${sub.id}/pull`, { method: 'POST' })).json();
  assert.equal(pull1.count, 3);
  // Second pull - should return 0 (advances lastDeliveredId)
  const pull2 = await (await fetch(`http://localhost:${port}/api/subscriptions/${sub.id}/pull`, { method: 'POST' })).json();
  assert.equal(pull2.count, 0);
  // Publish one more
  await fetch(`http://localhost:${port}/api/topics/agent.alpha/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: { i: 99 } }),
  });
  // Third pull - should return 1
  const pull3 = await (await fetch(`http://localhost:${port}/api/subscriptions/${sub.id}/pull`, { method: 'POST' })).json();
  assert.equal(pull3.count, 1);
  assert.equal(pull3.messages[0].payload.i, 99);
  srv.close();
});

test('HTTP: GET /api/subscriptions/:id returns 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/subscriptions/sub_nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: DELETE /api/subscriptions/:id removes subscription', async () => {
  const { srv, port } = await startTestServer();
  const subRes = await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'x.*', subscriber: 'agt_x' }),
  });
  const sub = await subRes.json();
  const del = await fetch(`http://localhost:${port}/api/subscriptions/${sub.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const after = await fetch(`http://localhost:${port}/api/subscriptions/${sub.id}`);
  assert.equal(after.status, 404);
  srv.close();
});

test('HTTP: GET /api/topics/:name/stats updates subscriberCount after subscription', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'sub.count' }),
  });
  await fetch(`http://localhost:${port}/api/subscriptions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'sub.*', subscriber: 'agt_s' }),
  });
  const stats = await (await fetch(`http://localhost:${port}/api/topics/sub.count/stats`)).json();
  assert.equal(stats.subscriberCount, 1);
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});
