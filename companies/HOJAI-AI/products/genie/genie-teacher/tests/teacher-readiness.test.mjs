/**
 * genie-teacher — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-teacher-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'teacher-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4739', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'teacher-test-token';

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

test('setup: boot teacher service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-teacher-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
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
  assert.match(body.service, /Teacher/);
});

test('root: banner lists 9+ endpoints', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 9);
});

test('courses: list seeded (3+)', async () => {
  const { status, body } = await req('GET', '/courses');
  assert.equal(status, 200);
  assert.ok(body.total >= 3);
  assert.ok(body.courses.some(c => c.id === 'cr-spanish-101'));
  assert.ok(body.courses.some(c => c.id === 'cr-negotiation'));
  assert.ok(body.courses.some(c => c.id === 'cr-python-intro'));
});

test('courses: filter by category', async () => {
  const { body } = await req('GET', '/courses?category=language');
  assert.equal(body.total, 1);
  assert.equal(body.courses[0].id, 'cr-spanish-101');
});

test('courses: filter by level', async () => {
  const { body } = await req('GET', '/courses?level=beginner');
  assert.ok(body.total >= 2);
  for (const c of body.courses) assert.equal(c.level, 'beginner');
});

test('courses: get with lessons sorted by order', async () => {
  const { status, body } = await req('GET', '/courses/cr-spanish-101');
  assert.equal(status, 200);
  assert.equal(body.data.id, 'cr-spanish-101');
  assert.equal(body.data.lessons.length, 3);
  assert.equal(body.data.lessons[0].order, 1);
  assert.equal(body.data.lessons[2].order, 3);
});

test('courses: 404 for unknown', async () => {
  const { status } = await req('GET', '/courses/nope', null, 404);
  assert.equal(status, 404);
});

test('courses: create new', async () => {
  const { status, body } = await req('POST', '/courses', {
    title: 'French Basics', category: 'language', level: 'beginner', duration: '3 weeks', description: 'Bonjour!',
  }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.title, 'French Basics');
  assert.equal(body.data.category, 'language');
});

test('courses: rejects invalid category', async () => {
  const { status } = await req('POST', '/courses', { title: 'Test', category: 'madeup' }, 400);
  assert.equal(status, 400);
});

test('courses: rejects short title', async () => {
  const { status } = await req('POST', '/courses', { title: 'ab', category: 'language' }, 400);
  assert.equal(status, 400);
});

test('lessons: list for course', async () => {
  const { status, body } = await req('GET', '/courses/cr-python-intro/lessons');
  assert.equal(status, 200);
  assert.equal(body.total, 3);
});

test('lessons: get one with quiz', async () => {
  const { status, body } = await req('GET', '/lessons/ls-sp-1');
  assert.equal(status, 200);
  assert.equal(body.data.title, 'Greetings & basics');
  assert.ok(Array.isArray(body.data.quiz));
  assert.equal(body.data.quiz[0].q, 'How do you say "good morning"?');
  assert.equal(body.data.quiz[0].answer, 1);
});

test('lessons: 404 for unknown', async () => {
  const { status } = await req('GET', '/lessons/nope', null, 404);
  assert.equal(status, 404);
});

test('lessons: complete with score', async () => {
  const { status, body } = await req('POST', `/lessons/ls-sp-2/complete/${USER_ID}?score=85`, {}, 201);
  assert.equal(status, 201);
  assert.equal(body.data.score, 85);
  assert.equal(body.data.lessonId, 'ls-sp-2');
});

test('lessons: complete with no score defaults 0', async () => {
  const { status, body } = await req('POST', `/lessons/ls-sp-3/complete/${USER_ID}`, {}, 201);
  assert.equal(body.data.score, 0);
});

test('enroll: new enrollment', async () => {
  const { status, body } = await req('POST', `/courses/cr-negotiation/enroll/${USER_ID}`, {}, 201);
  assert.equal(status, 201);
  assert.equal(body.data.courseId, 'cr-negotiation');
  assert.ok(!body.alreadyEnrolled);
});

test('enroll: idempotent (returns alreadyEnrolled=true)', async () => {
  const { status, body } = await req('POST', `/courses/cr-spanish-101/enroll/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.alreadyEnrolled, true);
});

test('enroll: check enrollment status', async () => {
  const { body } = await req('GET', `/courses/cr-spanish-101/enroll/${USER_ID}`);
  assert.equal(body.enrolled, true);
  assert.ok(body.enrollment);
});

test('enroll: not enrolled returns false', async () => {
  const { body } = await req('GET', `/courses/cr-python-intro/enroll/${USER_ID}`);
  assert.equal(body.enrolled, false);
});

test('enroll: 404 for unknown course', async () => {
  const { status } = await req('POST', `/courses/nope/enroll/${USER_ID}`, {}, 404);
  assert.equal(status, 404);
});

test('users: learning dashboard shows enrollments + progress', async () => {
  const { status, body } = await req('GET', `/users/${USER_ID}/learning`);
  assert.equal(status, 200);
  assert.ok(body.total >= 1);
  const spanish = body.courses.find(c => c.courseId === 'cr-spanish-101');
  assert.ok(spanish);
  assert.ok(spanish.lessonsTotal > 0);
  // we completed 2 lessons in earlier tests + 1 seeded = 3
  assert.ok(spanish.lessonsCompleted >= 2);
  assert.ok(spanish.progressPercent >= 50);
  assert.ok(spanish.averageScore > 0);
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/courses`, { method: 'GET', timeout: 3000 }, (res) => {
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