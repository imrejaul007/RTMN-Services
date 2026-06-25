/**
 * genie-planner-agent — Phase A readiness tests.
 *
 * Tests daily planning: todos, habits, time-blocks, daily snapshot, stats.
 * - 6 seeded todos
 * - 4 seeded habits + 14 habit logs
 * - 4 seeded time blocks
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-planner-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'planner-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4744', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'planner-test-token';

let serverProc;

function req(method, path, body = null) {
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

test('setup: boot planner service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-planner-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
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
  assert.match(body.service, /Planner/);
});

test('root: banner', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 12);
});

test('todos: list by user (6 seeded)', async () => {
  const { status, body } = await req('GET', `/todos/by-user/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.total, 6);
  // Sorted by priority high-first
  assert.equal(body.todos[0].priority, 'high');
});

test('todos: filter by status=pending', async () => {
  const { body } = await req('GET', `/todos/by-user/${USER_ID}?status=pending`);
  for (const t of body.todos) assert.equal(t.status, 'pending');
  assert.ok(body.total >= 4);
});

test('todos: filter by priority=high', async () => {
  const { body } = await req('GET', `/todos/by-user/${USER_ID}?priority=high`);
  for (const t of body.todos) assert.equal(t.priority, 'high');
});

test('todos: filter by date=today', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { body } = await req('GET', `/todos/by-user/${USER_ID}?date=${today}`);
  for (const t of body.todos) assert.equal(t.due, today);
});

test('todos: create new', async () => {
  const { status, body } = await req('POST', `/todos/by-user/${USER_ID}`, {
    title: 'Write unit tests',
    priority: 'high',
    due: new Date().toISOString().slice(0, 10),
    tags: ['work'],
  }, 201);
  assert.equal(status, 201);
  assert.match(body.data.id, /^td-/);
  assert.equal(body.data.status, 'pending');
});

test('todos: rejects missing title', async () => {
  const { status } = await req('POST', `/todos/by-user/${USER_ID}`, { priority: 'low' }, 400);
  assert.equal(status, 400);
});

test('todos: rejects invalid priority', async () => {
  const { status } = await req('POST', `/todos/by-user/${USER_ID}`, { title: 'X', priority: 'urgent' }, 400);
  assert.equal(status, 400);
});

test('todos: patch update', async () => {
  const r = await req('PATCH', '/todos/td-1', { priority: 'low' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.priority, 'low');
});

test('todos: patch rejects invalid status', async () => {
  const { status } = await req('PATCH', '/todos/td-1', { status: 'deleted' }, 400);
  assert.equal(status, 400);
});

test('todos: complete flow', async () => {
  const r = await req('POST', '/todos/td-2/complete');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'completed');
  assert.ok(r.body.data.completedAt);
});

test('todos: delete', async () => {
  const c = await req('POST', `/todos/by-user/${USER_ID}`, { title: 'to delete' }, 201);
  const id = c.body.data.id;
  const { status, body } = await req('DELETE', `/todos/${id}`);
  assert.equal(status, 200);
  assert.equal(body.deleted, id);
});

test('habits: list by user (4 + status)', async () => {
  const { status, body } = await req('GET', `/habits/by-user/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.total, 4);
  assert.ok(body.habits.every((h) => typeof h.currentStreak === 'number'));
  assert.ok(body.habits.every((h) => typeof h.todayDone === 'boolean'));
});

test('habits: create new', async () => {
  const { status, body } = await req('POST', `/habits/by-user/${USER_ID}`, {
    title: 'Drink 8 glasses of water',
    icon: '💧',
  }, 201);
  assert.equal(status, 201);
  assert.match(body.data.id, /^hb-/);
});

test('habits: log today', async () => {
  // Use hb-4 which has fewer logs; or create a fresh habit first
  const fresh = await req('POST', '/habits/by-user/user-001', { title: 'Fresh habit for logging' }, 201);
  const r = await req('POST', `/habits/${fresh.body.data.id}/log`);
  // Returns 201 for new log, 200 if already logged today
  assert.ok([200, 201].includes(r.status));
  assert.ok(r.body.data.date);
});

test('habits: log is idempotent', async () => {
  // Logging hb-1 again for today should return same record
  const r = await req('POST', '/habits/hb-1/log');
  assert.equal(r.status, 200);
  assert.equal(r.body.alreadyLogged, true);
});

test('habits: log specific date', async () => {
  const r = await req('POST', '/habits/hb-2/log', { date: '2024-01-01' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.date, '2024-01-01');
});

test('habits: log 404 unknown', async () => {
  const { status } = await req('POST', '/habits/hb-nope/log', {}, 404);
  assert.equal(status, 404);
});

test('habits: delete cascades to logs', async () => {
  const c = await req('POST', `/habits/by-user/${USER_ID}`, { title: 'Tmp' }, 201);
  const habitId = c.body.data.id;
  await req('POST', `/habits/${habitId}/log`);
  const { status, body } = await req('DELETE', `/habits/${habitId}`);
  assert.equal(status, 200);
  assert.ok(body.logsDeleted >= 1);
});

test('blocks: list today (4 seeded)', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { status, body } = await req('GET', `/blocks/by-user/${USER_ID}?date=${today}`);
  assert.equal(status, 200);
  assert.equal(body.total, 4);
  // sorted by start
  assert.ok(body.blocks[0].start <= body.blocks[1].start);
});

test('blocks: create new', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { status, body } = await req('POST', `/blocks/by-user/${USER_ID}`, {
    title: 'Coffee with Alex',
    start: `${today}T11:00:00.000Z`,
    end: `${today}T11:30:00.000Z`,
    type: 'meeting',
  }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.type, 'meeting');
});

test('blocks: rejects missing required', async () => {
  const { status } = await req('POST', `/blocks/by-user/${USER_ID}`, { title: 'incomplete' }, 400);
  assert.equal(status, 400);
});

test('blocks: rejects invalid type', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { status } = await req('POST', `/blocks/by-user/${USER_ID}`, {
    title: 'X', start: `${today}T11:00:00.000Z`, end: `${today}T11:30:00.000Z`, type: 'party',
  }, 400);
  assert.equal(status, 400);
});

test('blocks: rejects end before start', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { status } = await req('POST', `/blocks/by-user/${USER_ID}`, {
    title: 'X', start: `${today}T11:00:00.000Z`, end: `${today}T10:00:00.000Z`, type: 'focus',
  }, 400);
  assert.equal(status, 400);
});

test('blocks: delete', async () => {
  const c = await req('POST', `/blocks/by-user/${USER_ID}`, {
    title: 'Tmp block', start: '2030-01-01T10:00:00.000Z', end: '2030-01-01T11:00:00.000Z',
  }, 201);
  const id = c.body.data.id;
  const { status } = await req('DELETE', `/blocks/${id}`);
  assert.equal(status, 200);
});

test('today: snapshot', async () => {
  const { status, body } = await req('GET', `/today/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.date);
  assert.ok(body.data.todos);
  assert.ok(body.data.habits);
  assert.ok(body.data.blocks);
  assert.ok(typeof body.data.todos.count === 'number');
  assert.ok(body.data.habits.total >= 4);
});

test('stats: returns counts', async () => {
  const { status, body } = await req('GET', `/stats/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.totalTodos >= 6);
  assert.ok(body.data.todosByStatus);
  assert.ok(body.data.totalHabits >= 4);
  assert.ok(typeof body.data.habitCompletion7d === 'number');
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/todos/by-user/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
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
