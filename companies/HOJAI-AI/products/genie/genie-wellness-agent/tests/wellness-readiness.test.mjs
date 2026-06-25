/**
 * genie-wellness-agent — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-wellness-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'wellness-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4741', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'wellness-test-token';

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

test('setup: boot wellness service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-wellness-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
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
  assert.match(body.service, /Wellness/);
});

test('root: banner', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 12);
});

test('metrics: list seeded (42 = 7 days × 6 types)', async () => {
  const { status, body } = await req('GET', `/metrics/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 42);
});

test('metrics: filter by type', async () => {
  const { body } = await req('GET', `/metrics/${USER_ID}?type=weight`);
  assert.equal(body.total, 7); // 7 days
  for (const m of body.metrics) assert.equal(m.type, 'weight');
});

test('metrics: filter by date range', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const { body } = await req('GET', `/metrics/${USER_ID}?from=${threeDaysAgo}&to=${today}`);
  for (const m of body.metrics) {
    assert.ok(m.date >= threeDaysAgo && m.date <= today);
  }
});

test('metrics: log new entry', async () => {
  const { status, body } = await req('POST', `/metrics/${USER_ID}`, { type: 'sleep', value: 7.5, unit: 'h' }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.type, 'sleep');
  assert.equal(body.data.value, 7.5);
});

test('metrics: rejects invalid type', async () => {
  const { status } = await req('POST', `/metrics/${USER_ID}`, { type: 'bogus', value: 1 }, 400);
  assert.equal(status, 400);
});

test('metrics: rejects non-numeric value', async () => {
  const { status } = await req('POST', `/metrics/${USER_ID}`, { type: 'sleep', value: 'abc' }, 400);
  assert.equal(status, 400);
});

test('metrics: delete entry', async () => {
  const c = await req('POST', `/metrics/${USER_ID}`, { type: 'water', value: 2.0, unit: 'L' }, 201);
  const id = c.body.data.id;
  const { status, body } = await req('DELETE', `/metrics/${id}/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.deleted, id);
});

test('metrics: delete rejects wrong user', async () => {
  const c = await req('POST', `/metrics/${USER_ID}`, { type: 'water', value: 1.0, unit: 'L' }, 201);
  const { status } = await req('DELETE', `/metrics/${c.body.data.id}/user-002`, null, 403);
  assert.equal(status, 403);
});

test('workouts: list seeded (3)', async () => {
  const { body } = await req('GET', `/workouts/${USER_ID}`);
  assert.equal(body.total, 3);
  assert.ok(body.workouts.some(w => w.title === 'Morning run'));
});

test('workouts: log new', async () => {
  const { status, body } = await req('POST', `/workouts/${USER_ID}`, { type: 'cycling', title: 'Evening bike', duration: 40, calories: 350 }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.type, 'cycling');
});

test('workouts: rejects invalid type', async () => {
  const { status } = await req('POST', `/workouts/${USER_ID}`, { type: 'nonsense', title: 'X', duration: 30 }, 400);
  assert.equal(status, 400);
});

test('meals: list seeded', async () => {
  const { body } = await req('GET', `/meals/${USER_ID}`);
  assert.ok(body.total >= 5);
});

test('meals: filter by day', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { body } = await req('GET', `/meals/${USER_ID}?day=${today}`);
  assert.ok(body.total >= 4);
});

test('meals: log new', async () => {
  const { status, body } = await req('POST', `/meals/${USER_ID}`, { name: 'Quinoa bowl', calories: 450, protein: 18, carbs: 60, fat: 15, meal: 'lunch' }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.meal, 'lunch');
});

test('meals: rejects invalid meal type', async () => {
  const { status } = await req('POST', `/meals/${USER_ID}`, { name: 'X', calories: 100, meal: 'midnight_snack' }, 400);
  assert.equal(status, 400);
});

test('goals: list seeded (4)', async () => {
  const { body } = await req('GET', `/goals/${USER_ID}`);
  assert.equal(body.total, 4);
});

test('goals: add new', async () => {
  const { status, body } = await req('POST', `/goals/${USER_ID}`, { title: 'Read 30min/day', metric: 'reading', target: 30, unit: 'min', period: 'daily' }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.title, 'Read 30min/day');
});

test('goals: progress bump', async () => {
  const { status, body } = await req('POST', `/goals/gl-1/progress/${USER_ID}?amount=0.5`);
  assert.equal(status, 200);
  assert.equal(body.data.progress, 0.5);
});

test('goals: progress bump negative amount', async () => {
  const r1 = await req('POST', `/goals/gl-1/progress/${USER_ID}?amount=0.5`);
  const start = r1.body.data.progress;
  const r2 = await req('POST', `/goals/gl-1/progress/${USER_ID}?amount=-10`);
  assert.equal(r2.body.data.progress, Math.max(0, start - 10));
});

test('goals: rejects non-positive target', async () => {
  const { status } = await req('POST', `/goals/${USER_ID}`, { title: 'Bad goal', target: 0 }, 400);
  assert.equal(status, 400);
});

test('insights: returns weekly summary + tips', async () => {
  const { status, body } = await req('GET', `/insights/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.period);
  assert.ok(body.data.metrics);
  assert.ok(body.data.metrics.steps);
  assert.ok(Array.isArray(body.data.tips));
  assert.ok(body.data.tips.length >= 1);
  assert.ok(['llm', 'template'].includes(body.data.source));
});

test('dashboard: today snapshot', async () => {
  const { status, body } = await req('GET', `/dashboard/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.date);
  assert.ok(body.data.metrics);
  assert.ok(body.data.meals);
  assert.ok(body.data.workouts);
  assert.ok(typeof body.data.netCalories === 'number');
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/metrics/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    x.on('error', () => resolve({ status: 0 }));
    x.end();
  });
  assert.equal(r.status, 401);
});

test('teardown: shutdown server', async () => {
  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
});