/**
 * GoalOS unit tests — node --test
 *
 * Auth: Bearer token matching HOJAI_API_KEY env var.
 * GET routes are unauthenticated; POST/PATCH/DELETE need Bearer token.
 */

process.env.NODE_ENV = 'test';
process.env.HOJAI_GOALOS_REQUIRE_AUTH = 'true';
process.env.HOJAI_API_KEY = 'dev-key';
process.env.PORT = '4297';

import http from 'node:http';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

await import('../src/index.js');
const { default: app } = await import('../src/index.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }
const hdrs = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer dev-key', ...extra });

describe('GoalOS — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
  });
});

describe('GoalOS — Auth', () => {
  it('POST /api/v1/goals without token → 401', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    });
    assert.equal(r.status, 401);
  });

  it('POST /api/v1/goals with Bearer token → 201', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ title: 'Test Goal', owner: 'user-1', type: 'goal', progress: 0 }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
    const j = JSON.parse(text);
    assert.ok(j.id || j.goal?.id, 'should return created goal');
  });

  it('POST /api/v1/goals with wrong token → 401', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-key' },
      body: JSON.stringify({ title: 'test' }),
    });
    assert.equal(r.status, 401);
  });
});

describe('GoalOS — Goal CRUD', () => {
  let goalId;

  it('POST /api/v1/goals → 201', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({
        title: 'Q4 Revenue Target',
        owner: 'user-1',
        type: 'goal',
        progress: 0,
        keyResults: [],
      }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
    const j = JSON.parse(text);
    goalId = j.id || j.goal?.id;
    assert.ok(goalId);
    assert.equal(j.title, 'Q4 Revenue Target');
  });

  it('GET /api/v1/goals → 200', async () => {
    const r = await fetch(url('/api/v1/goals'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.goals) || Array.isArray(j));
  });

  it('GET /api/v1/goals/:id → 200', async () => {
    const r = await fetch(url('/api/v1/goals/' + goalId));
    const text = await r.text();
    assert.equal(r.status, 200, text);
    const j = JSON.parse(text);
    assert.equal(j.title, 'Q4 Revenue Target');
  });

  it('PATCH /api/v1/goals/:id → 200', async () => {
    const r = await fetch(url('/api/v1/goals/' + goalId), {
      method: 'PATCH',
      headers: hdrs(),
      body: JSON.stringify({ title: 'Q4 Revenue Target - Updated' }),
    });
    const text = await r.text();
    assert.equal(r.status, 200, text);
    const j = JSON.parse(text);
    assert.ok(j.title === 'Q4 Revenue Target - Updated' || j.goal?.title === 'Q4 Revenue Target - Updated');
  });

  it('DELETE /api/v1/goals/:id → 200', async () => {
    const r = await fetch(url('/api/v1/goals/' + goalId), {
      method: 'DELETE',
      headers: hdrs(),
    });
    assert.equal(r.status, 200);
  });

  it('GET /api/v1/goals/:id after delete → 404', async () => {
    const r = await fetch(url('/api/v1/goals/' + goalId));
    assert.equal(r.status, 404);
  });
});

describe('GoalOS — Validation', () => {
  it('POST /api/v1/goals without title → 400', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ owner: 'user-1' }),
    });
    assert.equal(r.status, 400);
  });

  it('POST /api/v1/goals without owner → 400', async () => {
    const r = await fetch(url('/api/v1/goals'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ title: 'Test Goal' }),
    });
    assert.equal(r.status, 400);
  });
});

describe('GoalOS — 404', () => {
  it('GET /unknown → 404', async () => {
    const r = await fetch(url('/unknown'));
    assert.equal(r.status, 404);
  });
});

after(() => { server?.close(); });