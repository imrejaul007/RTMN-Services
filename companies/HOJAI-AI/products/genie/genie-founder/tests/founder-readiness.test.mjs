/**
 * genie-founder — Phase A readiness tests.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-founder-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'founder-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4738', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'founder-test-token';

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

test('setup: boot founder service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-founder-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
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

test('health: returns 200 without auth', async () => {
  const { status, body } = await req('GET', '/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'healthy');
  assert.match(body.service, /Founder/);
});

test('root: service banner', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.match(body.tagline, /AI Co-founder/i);
  assert.ok(Array.isArray(body.endpoints));
  assert.ok(body.endpoints.length > 10);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/founder/get/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    x.on('error', () => resolve({ status: 0 }));
    x.end();
  });
  assert.equal(r.status, 401);
});

test('founder profile: get seeded', async () => {
  const { status, body } = await req('GET', `/founder/get/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.id, USER_ID);
  assert.equal(body.data.companyName, 'Acme AI');
  assert.equal(body.data.stage, 'seed');
});

test('founder profile: update', async () => {
  const { status, body } = await req('PUT', `/founder/update/${USER_ID}`, { arr: 15000, customers: 12 });
  assert.equal(status, 200);
  assert.equal(body.data.arr, 15000);
  assert.equal(body.data.customers, 12);
});

test('founder profile: rejects invalid stage', async () => {
  const { status } = await req('PUT', `/founder/update/${USER_ID}`, { stage: 'unicorn' }, 400);
  assert.equal(status, 400);
});

test('dashboard: aggregates KPIs', async () => {
  const { status, body } = await req('GET', `/founder/dashboard/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.data.kpis);
  assert.ok(body.data.milestones);
  assert.ok(body.data.okrs);
  assert.ok(body.data.team);
  assert.ok(body.data.kpis.arr >= 0);
  assert.ok(['done', 'inProgress', 'todo'].every(k => k in body.data.milestones));
});

test('briefing: returns weekly structure', async () => {
  const { status, body } = await req('GET', `/founder/briefing/${USER_ID}?type=weekly`);
  assert.equal(status, 200);
  assert.equal(body.data.type, 'weekly');
  assert.ok(body.data.structured);
  assert.ok(Array.isArray(body.data.structured.wins));
  assert.ok(Array.isArray(body.data.structured.next7Days));
  assert.ok(body.data.structured.next7Days.length >= 3);
});

test('milestones: list seeded', async () => {
  const { status, body } = await req('GET', `/founder/milestones/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 6);
  assert.ok(body.milestones.some(m => m.title === 'Ship MVP'));
});

test('milestones: add new', async () => {
  const { status, body } = await req('POST', `/founder/milestones/add/${USER_ID}`, { title: 'Test milestone C6', status: 'todo' }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.title, 'Test milestone C6');
  assert.equal(body.data.status, 'todo');
});

test('milestones: rejects empty title', async () => {
  const { status } = await req('POST', `/founder/milestones/add/${USER_ID}`, { title: 'x' }, 400);
  assert.equal(status, 400);
});

test('milestones: rejects invalid status', async () => {
  const { status } = await req('POST', `/founder/milestones/add/${USER_ID}`, { title: 'Valid title', status: 'maybe' }, 400);
  assert.equal(status, 400);
});

test('milestones: complete a milestone', async () => {
  // first add a milestone
  const add = await req('POST', `/founder/milestones/add/${USER_ID}`, { title: 'To be completed', status: 'todo' }, 201);
  const id = add.body.data.id;
  const { status, body } = await req('POST', `/founder/milestones/complete/${id}/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.data.status, 'done');
  assert.ok(body.data.completedAt);
});

test('milestones: complete rejects wrong user', async () => {
  const add = await req('POST', `/founder/milestones/add/${USER_ID}`, { title: 'Other user test', status: 'todo' }, 201);
  const id = add.body.data.id;
  const { status } = await req('POST', `/founder/milestones/complete/${id}/user-002`, null, 403);
  assert.equal(status, 403);
});

test('okrs: list seeded', async () => {
  const { status, body } = await req('GET', `/founder/okrs/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 2);
  assert.ok(body.okrs.some(o => o.objective.startsWith('Reach $10K')));
});

test('okrs: add new with KRs', async () => {
  const { status, body } = await req('POST', `/founder/okrs/add/${USER_ID}`, {
    objective: 'Launch v2 by Q1',
    quarter: 'Q1 2027',
    keyResults: [{ text: 'Ship beta', progress: 0 }, { text: 'Get 5 design partners', progress: 0 }],
  }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.keyResults.length, 2);
  assert.equal(body.data.keyResults[0].text, 'Ship beta');
});

test('okrs: rejects empty KRs', async () => {
  const { status } = await req('POST', `/founder/okrs/add/${USER_ID}`, { objective: 'Test', keyResults: [] }, 400);
  assert.equal(status, 400);
});

test('team: list seeded', async () => {
  const { status, body } = await req('GET', `/founder/team/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 3);
  assert.ok(body.totalEquity > 0);
  assert.ok(body.team.some(m => m.name.startsWith('You')));
});

test('team: add new member', async () => {
  const { status, body } = await req('POST', `/founder/team/add/${USER_ID}`, { name: 'Alex', role: 'Designer', equity: 1 }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.name, 'Alex');
  assert.equal(body.data.equity, 1);
});

test('team: rejects equity > 100', async () => {
  const { status } = await req('POST', `/founder/team/add/${USER_ID}`, { name: 'X', role: 'Y', equity: 150 }, 400);
  assert.equal(status, 400);
});

test('team: rejects missing role', async () => {
  const { status } = await req('POST', `/founder/team/add/${USER_ID}`, { name: 'X' }, 400);
  assert.equal(status, 400);
});

test('board: list all 4 personas', async () => {
  const { status, body } = await req('GET', `/founder/board/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.board.length, 4);
  const ids = body.board.map(p => p.id);
  assert.ok(ids.includes('vc'));
  assert.ok(ids.includes('operator'));
  assert.ok(ids.includes('customer'));
  assert.ok(ids.includes('mentor'));
});

test('board: each persona has name/icon/color/lens', async () => {
  const { body } = await req('GET', `/founder/board/${USER_ID}`);
  for (const p of body.board) {
    assert.ok(p.name);
    assert.ok(p.icon);
    assert.ok(p.color);
    assert.ok(p.lens);
    assert.ok(p.context.includes('Acme AI'));
  }
});

test('board: ask returns advice with persona + source', async () => {
  const { status, body } = await req('POST', `/founder/board/ask/${USER_ID}`, {
    question: 'Should I raise a seed round now or wait?',
    persona: 'vc',
  }, 201);
  assert.equal(status, 201);
  assert.equal(body.data.persona, 'vc');
  assert.ok(body.data.advice.length > 50);
  assert.ok(['llm', 'template'].includes(body.data.source));
});

test('board: ask falls back to operator persona if unknown', async () => {
  const { status, body } = await req('POST', `/founder/board/ask/${USER_ID}`, {
    question: 'How do I ship faster?',
    persona: 'unknown_persona',
  }, 201);
  assert.equal(body.data.persona, 'operator');
});

test('board: rejects short question', async () => {
  const { status } = await req('POST', `/founder/board/ask/${USER_ID}`, { question: 'hi' }, 400);
  assert.equal(status, 400);
});

test('board: history persists', async () => {
  await req('POST', `/founder/board/ask/${USER_ID}`, { question: 'What should I focus on this week?', persona: 'mentor' }, 201);
  const { status, body } = await req('GET', `/founder/board/history/${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.total >= 1);
  assert.ok(body.advice.length >= 1);
  assert.ok(body.advice[0].question);
});

test('readiness: reports healthy stores', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('llm-health: returns ok or stub', async () => {
  const { status } = await req('GET', '/api/llm-health');
  assert.equal(status, 200);
});

test('founder profile: 404 for unknown user', async () => {
  const { status } = await req('GET', '/founder/get/unknown-user', null, 404);
  assert.equal(status, 404);
});

test('dashboard: 404 for unknown user', async () => {
  const { status } = await req('GET', '/founder/dashboard/unknown-user', null, 404);
  assert.equal(status, 404);
});

test('teardown: shutdown server', async () => {
  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
});