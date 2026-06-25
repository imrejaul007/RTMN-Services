/**
 * genie-creator-agent — Phase A readiness tests.
 *
 * Tests content creation workspace: templates, drafts, calendar, stats.
 * - 6 seeded templates
 * - 4 seeded drafts
 * - 3 seeded calendar entries
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-creator-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'creator-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4743', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'creator-test-token';

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

test('setup: boot creator service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-creator-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
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
  assert.match(body.service, /Creator/);
});

test('root: banner', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 10);
});

test('templates: list seeded (6)', async () => {
  const { status, body } = await req('GET', '/templates');
  assert.equal(status, 200);
  assert.equal(body.total, 6);
  assert.ok(body.templates.some(t => t.id === 'tpl-blog'));
  assert.ok(body.templates.some(t => t.id === 'tpl-twitter'));
  assert.ok(body.templates.some(t => t.id === 'tpl-newsletter'));
});

test('templates: detail by id', async () => {
  const { status, body } = await req('GET', '/templates/tpl-blog');
  assert.equal(status, 200);
  assert.equal(body.data.id, 'tpl-blog');
  assert.ok(Array.isArray(body.data.structure));
  assert.ok(body.data.structure.length >= 3);
});

test('templates: 404 unknown', async () => {
  const { status } = await req('GET', '/templates/tpl-nope');
  assert.equal(status, 404);
});

test('drafts: list by user (4 seeded)', async () => {
  const { status, body } = await req('GET', `/drafts/by-user/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.total, 4);
  assert.ok(body.drafts.some(d => d.id === 'dr-1'));
  assert.ok(body.drafts.some(d => d.id === 'dr-4'));
});

test('drafts: list empty for unknown user', async () => {
  const { body } = await req('GET', '/drafts/by-user/user-zzz');
  assert.equal(body.total, 0);
});

test('drafts: create new', async () => {
  const { status, body } = await req('POST', `/drafts/by-user/${USER_ID}`, {
    title: 'My new blog post',
    templateId: 'tpl-blog',
    body: 'This is a draft with several words to test word counting.',
    tags: ['test'],
  }, 201);
  assert.equal(status, 201);
  assert.match(body.data.id, /^dr-/);
  assert.equal(body.data.status, 'draft');
  assert.ok(body.data.wordCount > 0);
});

test('drafts: rejects missing title', async () => {
  const { status } = await req('POST', `/drafts/by-user/${USER_ID}`, { body: 'x' }, 400);
  assert.equal(status, 400);
});

test('drafts: rejects unknown template', async () => {
  const { status } = await req('POST', `/drafts/by-user/${USER_ID}`, { title: 'Test', templateId: 'tpl-bogus' }, 400);
  assert.equal(status, 400);
});

test('drafts: get by id', async () => {
  const { status, body } = await req('GET', '/drafts/dr-1');
  assert.equal(status, 200);
  assert.equal(body.data.id, 'dr-1');
  assert.equal(body.data.title, 'Why founders should learn to code');
});

test('drafts: 404 unknown', async () => {
  const { status } = await req('GET', '/drafts/dr-nope');
  assert.equal(status, 404);
});

test('drafts: patch (update body + status)', async () => {
  const r = await req('PATCH', '/drafts/dr-1', { body: 'Updated body with more words here', status: 'in-review' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'in-review');
  assert.ok(r.body.data.wordCount >= 5);
  assert.ok(r.body.data.updatedAt > r.body.data.createdAt);
});

test('drafts: patch rejects invalid status', async () => {
  const { status } = await req('PATCH', '/drafts/dr-1', { status: 'bad' }, 400);
  assert.equal(status, 400);
});

test('drafts: publish flow', async () => {
  const r = await req('POST', '/drafts/dr-2/publish');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'published');
  assert.ok(r.body.data.publishedAt);
});

test('drafts: delete', async () => {
  const c = await req('POST', `/drafts/by-user/${USER_ID}`, { title: 'To delete' }, 201);
  const id = c.body.data.id;
  const { status, body } = await req('DELETE', `/drafts/${id}`);
  assert.equal(status, 200);
  assert.equal(body.deleted, id);
});

test('calendar: list by user (3 seeded)', async () => {
  const { status, body } = await req('GET', `/calendar/by-user/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.total, 3);
});

test('calendar: schedule new', async () => {
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  const { status, body } = await req('POST', `/calendar/by-user/${USER_ID}`, {
    title: 'New blog post',
    type: 'publish',
    channel: 'blog',
    date: future,
  }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.channel, 'blog');
  assert.equal(body.data.status, 'scheduled');
});

test('calendar: rejects missing required', async () => {
  const { status } = await req('POST', `/calendar/by-user/${USER_ID}`, { title: 'incomplete' }, 400);
  assert.equal(status, 400);
});

test('calendar: rejects invalid channel', async () => {
  const { status } = await req('POST', `/calendar/by-user/${USER_ID}`, {
    title: 'X', channel: 'myspace', date: new Date().toISOString(),
  }, 400);
  assert.equal(status, 400);
});

test('stats: returns counts', async () => {
  const { status, body } = await req('GET', `/stats/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.totalDrafts >= 4);
  assert.ok(body.data.byStatus);
  assert.ok(body.data.byStatus.draft >= 0);
  assert.ok(typeof body.data.totalWords === 'number');
  assert.ok(body.data.byChannel);
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/drafts/by-user/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
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
