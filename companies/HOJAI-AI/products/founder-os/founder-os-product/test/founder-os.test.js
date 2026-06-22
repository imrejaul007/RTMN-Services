/**
 * Founder OS Product — test suite
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hojai-founder-test-'));
process.env.HOJAI_DATA_DIR = TEST_DATA_DIR;
process.env.SERVICE_NAME = 'founder-os-test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { default: app, startServer } = await import('../src/index.js');

let server;
let baseUrl;

async function boot() {
  server = await startServer(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  await new Promise(r => setTimeout(r, 100));
}

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// ============ TESTS ============

test('GET /health', async () => {
  await boot();
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.equal(res.body.service, 'founder-os-product');
});

test('GET /ready', async () => {
  const res = await req('GET', '/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ready');
});

test('Register and login founder', async () => {
  const reg = await req('POST', '/v1/founders/register', {
    email: 'founder@example.com', name: 'Jane Founder', company: 'Acme',
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.founder.email, 'founder@example.com');

  const login = await req('POST', '/v1/founders/login', { email: 'founder@example.com' });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
});

test('Reject duplicate founder registration', async () => {
  await req('POST', '/v1/founders/register', { email: 'dup@example.com', name: 'Dup' });
  const res = await req('POST', '/v1/founders/register', { email: 'dup@example.com', name: 'Dup2' });
  assert.equal(res.status, 409);
});

test('Create and list OKR objective', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'okr@example.com', name: 'OKR' });
  const token = reg.body.token;

  const create = await req('POST', '/v1/objectives', {
    title: 'Launch v2 product',
    description: 'Ship the new version to 100 customers',
    quarter: '2026-Q3',
  }, token);
  assert.equal(create.status, 201);
  assert.equal(create.body.objective.title, 'Launch v2 product');

  const list = await req('GET', '/v1/objectives', null, token);
  assert.equal(list.status, 200);
  assert.ok(list.body.count >= 1);
});

test('Add key results to objective', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'kr@example.com', name: 'KR' });
  const token = reg.body.token;

  const obj = await req('POST', '/v1/objectives', { title: 'Grow MRR' }, token);
  const kr = await req('POST', `/v1/objectives/${obj.body.objective.id}/key-results`, {
    title: 'Reach $50k MRR', target: 50000, unit: 'USD', current: 10000,
  }, token);
  assert.equal(kr.status, 201);
  assert.equal(kr.body.keyResult.current, 10000);
});

test('Update key result progress', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'progress@example.com', name: 'P' });
  const token = reg.body.token;
  const obj = await req('POST', '/v1/objectives', { title: 'Goal' }, token);
  const kr = await req('POST', `/v1/objectives/${obj.body.objective.id}/key-results`, {
    title: 'KR', target: 100,
  }, token);

  const update = await req('PUT', `/v1/key-results/${kr.body.keyResult.id}`, { current: 75 }, token);
  assert.equal(update.status, 200);
  assert.equal(update.body.keyResult.current, 75);
});

test('Create and retrieve journal entries', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'journal@example.com', name: 'J' });
  const token = reg.body.token;

  const e1 = await req('POST', '/v1/journal', { content: 'Great day!', mood: 'great' }, token);
  assert.equal(e1.status, 201);

  const e2 = await req('POST', '/v1/journal', {
    content: 'Tough day with blockers',
    mood: 'low',
    tags: ['blockers', 'team'],
  }, token);
  assert.equal(e2.status, 201);

  const list = await req('GET', '/v1/journal', null, token);
  assert.equal(list.status, 200);
  assert.ok(list.body.count >= 2);
});

test('Filter journal by mood and tag', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'filter@example.com', name: 'F' });
  const token = reg.body.token;

  await req('POST', '/v1/journal', { content: 'happy', mood: 'great' }, token);
  await req('POST', '/v1/journal', { content: 'sad', mood: 'low', tags: ['personal'] }, token);

  const filtered = await req('GET', '/v1/journal?mood=great', null, token);
  assert.ok(filtered.body.entries.every(e => e.mood === 'great'));
});

test('Create check-in', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'checkin@example.com', name: 'CI' });
  const token = reg.body.token;

  const res = await req('POST', '/v1/check-ins', {
    status: 'Made progress on hiring',
    blockers: 'Need to close finance lead',
    wins: 'Closed eng hire #3',
    gratitude: 'Great team',
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.checkIn.status, 'Made progress on hiring');
});

test('Generate weekly review', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'weekly@example.com', name: 'W' });
  const token = reg.body.token;

  // Create some data
  await req('POST', '/v1/journal', { content: 'monday thoughts' }, token);
  await req('POST', '/v1/check-ins', { status: 'good progress' }, token);

  const review = await req('POST', '/v1/weekly-reviews', {}, token);
  assert.equal(review.status, 201);
  assert.ok(review.body.review.summary.includes('Week of'));
  assert.ok(review.body.review.checkInCount >= 1);
});

test('Dashboard composite view', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'dash@example.com', name: 'D' });
  const token = reg.body.token;

  await req('POST', '/v1/objectives', { title: 'Ship product' }, token);
  await req('POST', '/v1/journal', { content: 'Today' }, token);

  const res = await req('GET', '/v1/dashboard', null, token);
  assert.equal(res.status, 200);
  assert.ok(res.body.dashboard.objectives);
  assert.ok(res.body.dashboard.progress);
  assert.ok(res.body.dashboard.recentJournal);
});

test('Reject unauthenticated access', async () => {
  const res = await req('GET', '/v1/objectives');
  assert.equal(res.status, 401);
});

test('Reject invalid JWT', async () => {
  const res = await req('GET', '/v1/objectives', null, 'invalid-token');
  assert.equal(res.status, 401);
});

test('Reject access to other founder\'s objective', async () => {
  const owner = await req('POST', '/v1/founders/register', { email: 'owner@example.com', name: 'O' });
  const other = await req('POST', '/v1/founders/register', { email: 'other@example.com', name: 'X' });
  const obj = await req('POST', '/v1/objectives', { title: 'Private' }, owner.body.token);

  const res = await req('GET', `/v1/objectives/${obj.body.objective.id}`, null, other.body.token);
  assert.equal(res.status, 403);
});

test('Cascade delete objective removes key results', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'cascade@example.com', name: 'C' });
  const token = reg.body.token;

  const obj = await req('POST', '/v1/objectives', { title: 'Cascade test' }, token);
  await req('POST', `/v1/objectives/${obj.body.objective.id}/key-results`, {
    title: 'KR1', target: 100,
  }, token);

  const del = await req('DELETE', `/v1/objectives/${obj.body.objective.id}`, null, token);
  assert.equal(del.status, 200);
  assert.equal(del.body.keyResultsDeleted, 1);
});

test('Validation errors return 400', async () => {
  const reg = await req('POST', '/v1/founders/register', { email: 'val@example.com', name: 'V' });
  const res = await req('POST', '/v1/objectives', { description: 'no title' }, reg.body.token);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('Unknown route returns 404', async () => {
  const res = await req('GET', '/v1/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('cleanup', async () => {
  if (server) server.close();
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true }); } catch {}
});
