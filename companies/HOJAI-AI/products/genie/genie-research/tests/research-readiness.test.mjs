/**
 * genie-research — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-research-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'research-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4740', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'research-test-token';

let serverProc;

function req(method, path, body = null, expect = 200) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(`${BASE}${path}`, {
      method,
      headers: {
        'authorization': `Bearer ${TOKEN}`,
        'x-internal-token': INTERNAL_TOKEN,
        ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
      },
      timeout: 5000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try {
          const json = buf ? JSON.parse(buf) : null;
          resolve({ status: res.statusCode, body: json });
        } catch (e) { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

test('setup: boot research service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-research-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve) => {
    let buf = '';
    serverProc.stdout.on('data', (c) => {
      buf += c.toString();
      if (buf.includes('running on port')) resolve();
    });
    setTimeout(resolve, 3000);
  });
});

test('health: returns 200', async () => {
  const { status, body } = await req('GET', '/health');
  assert.equal(status, 200);
  assert.match(body.service, /Research/);
});

test('root: banner lists 7+ endpoints', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 7);
});

test('sources: list seeded (5)', async () => {
  const { status, body } = await req('GET', '/sources');
  assert.equal(status, 200);
  assert.equal(body.total, 5);
  assert.ok(body.sources.some(s => s.id === 'src-1'));
  assert.ok(body.sources.some(s => s.name === 'OpenAlex'));
  assert.ok(body.sources.some(s => s.name === 'PubMed'));
});

test('research query: returns record with summary + sources', async () => {
  const { status, body } = await req('POST', `/research/query/${USER_ID}`, {
    question: 'What is the impact of sleep deprivation on cognitive performance?',
    topic: 'sleep',
  }, 201);
  assert.equal(status, 201);
  assert.ok(body.data.id);
  assert.ok(body.data.summary.length > 50);
  assert.ok(Array.isArray(body.data.sources));
  assert.ok(body.data.sources.length > 0);
  assert.ok(['llm', 'template'].includes(body.data.source));
});

test('research query: rejects short question', async () => {
  const { status } = await req('POST', `/research/query/${USER_ID}`, { question: 'why?' }, 400);
  assert.equal(status, 400);
});

test('research query: requires question field', async () => {
  const { status } = await req('POST', `/research/query/${USER_ID}`, { topic: 'foo' }, 400);
  assert.equal(status, 400);
});

test('research list: returns past research', async () => {
  const { status, body } = await req('GET', `/research/list/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 1); // seeded
});

test('research list: filter by topic', async () => {
  const { body } = await req('GET', `/research/list/${USER_ID}?topic=intermittent`);
  assert.ok(body.research.length >= 1);
  for (const r of body.research) assert.match(r.topic, /intermittent/i);
});

test('research get: returns full record with hydrated sources', async () => {
  const { status, body } = await req('GET', '/research/get/rs-1');
  assert.equal(status, 200);
  assert.equal(body.data.topic, 'intermittent fasting');
  assert.ok(Array.isArray(body.data.sourceDetails));
  assert.ok(body.data.sourceDetails.length > 0);
  assert.ok(body.data.sourceDetails[0].name);
});

test('research get: 404 for unknown', async () => {
  const { status } = await req('GET', '/research/get/nope', null, 404);
  assert.equal(status, 404);
});

test('research save: marks as saved', async () => {
  const { status, body } = await req('POST', `/research/rs-1/save/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.data.saved, true);
  assert.ok(body.data.savedAt);
});

test('research delete: removes record', async () => {
  // create one to delete
  const c = await req('POST', `/research/query/${USER_ID}`, { question: 'Test query for deletion of record', topic: 'test' }, 201);
  const id = c.body.data.id;
  const { status, body } = await req('DELETE', `/research/delete/${id}/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.deleted, id);
  // verify gone
  const get = await req('GET', `/research/get/${id}`, null, 404);
  assert.equal(get.status, 404);
});

test('research delete: rejects wrong user', async () => {
  const c = await req('POST', `/research/query/${USER_ID}`, { question: 'Owned by user-001 only — test query', topic: 'security' }, 201);
  const id = c.body.data.id;
  const { status } = await req('DELETE', `/research/delete/${id}/user-002`, null, 403);
  assert.equal(status, 403);
});

test('research save: rejects wrong user', async () => {
  const c = await req('POST', `/research/query/${USER_ID}`, { question: 'Another test query for ownership check', topic: 'security2' }, 201);
  const id = c.body.data.id;
  const { status } = await req('POST', `/research/${id}/save/user-002`, null, 403);
  assert.equal(status, 403);
});

test('topics: aggregates topics with counts', async () => {
  const { status, body } = await req('GET', `/topics/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 1);
  assert.ok(body.topics.every(t => typeof t.count === 'number' && t.count > 0));
  // sorted desc
  for (let i = 1; i < body.topics.length; i++) {
    assert.ok(body.topics[i - 1].count >= body.topics[i].count);
  }
});

test('research list: 401 without auth', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/research/list/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    x.on('error', () => resolve({ status: 0 }));
    x.end();
  });
  assert.equal(r.status, 401);
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('teardown: shutdown server', async () => {
  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
});