'use strict';

const http = require('http');
const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');

// Set env BEFORE requiring the app
process.env.NODE_ENV = 'test';
process.env.EXECUTION_OS_REQUIRE_AUTH = 'true';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.PORT = '4296';

const app = require('../../src/index.js');

let server;
let baseUrl;

before(() => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }
const hdrs = () => ({ 'Content-Type': 'application/json', 'x-internal-token': 'dev-token' });

describe('ExecutionOS — Health & Readiness', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'ok');
  });

  it('GET /ready → 200', async () => {
    const r = await fetch(url('/ready'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ready, true);
  });
});

describe('ExecutionOS — Auth', () => {
  it('POST /api/executions without token → 401', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', steps: [] }),
    });
    assert.equal(r.status, 401);
  });

  it('POST /api/executions with x-internal-token → 201', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({
        name: 'Test Execution',
        steps: [{ kind: 'noop', payload: {} }],
      }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
    const j = JSON.parse(text);
    assert.ok(j.id);
    assert.equal(j.name, 'Test Execution');
    assert.equal(j.status, 'pending');
  });

  it('POST /api/executions with wrong token → 401', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': 'wrong-token' },
      body: JSON.stringify({ name: 'test', steps: [] }),
    });
    assert.equal(r.status, 401);
  });
});

describe('ExecutionOS — Execution CRUD', () => {
  let execId;

  it('POST /api/executions → 201', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({
        name: 'CRUD Test',
        missionId: 'mission-1',
        taskId: 'task-1',
        steps: [
          { kind: 'noop', payload: { message: 'step 1' } },
          { kind: 'wait', payload: { ms: 10 } },
        ],
        maxRetries: 2,
        timeoutMs: 5000,
      }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
    const j = JSON.parse(text);
    assert.ok(j.id);
    assert.equal(j.name, 'CRUD Test');
    assert.equal(j.missionId, 'mission-1');
    assert.equal(j.taskId, 'task-1');
    assert.equal(j.status, 'pending');
    assert.equal(j.steps.length, 2);
    execId = j.id;
  });

  it('GET /api/executions → 200', async () => {
    const r = await fetch(url('/api/executions'), { headers: hdrs() });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.executions));
    assert.ok(j.count >= 1);
  });

  it('GET /api/executions/:id → 200', async () => {
    const r = await fetch(url('/api/executions/' + execId), { headers: hdrs() });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.id, execId);
    assert.equal(j.name, 'CRUD Test');
  });

  it('POST /api/executions/:id/cancel → 200', async () => {
    const r = await fetch(url('/api/executions/' + execId + '/cancel'), {
      method: 'POST',
      headers: hdrs(),
    });
    const text = await r.text();
    assert.equal(r.status, 200, text);
    const j = JSON.parse(text);
    assert.equal(j.status, 'cancelled');
  });

  it('DELETE /api/executions/:id → 204', async () => {
    const r = await fetch(url('/api/executions/' + execId), {
      method: 'DELETE',
      headers: hdrs(),
    });
    assert.equal(r.status, 204);
  });

  it('GET /api/executions/:id after delete → 404', async () => {
    const r = await fetch(url('/api/executions/' + execId), { headers: hdrs() });
    assert.equal(r.status, 404);
  });
});

describe('ExecutionOS — Execution Validation', () => {
  it('POST /api/executions without name → 400', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ steps: [{ kind: 'noop' }] }),
    });
    assert.equal(r.status, 400);
  });

  it('POST /api/executions without steps → 400', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ name: 'test' }),
    });
    assert.equal(r.status, 400);
  });

  it('POST /api/executions with empty steps → 400', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ name: 'test', steps: [] }),
    });
    assert.equal(r.status, 400);
  });

  it('POST /api/executions with invalid step kind → 400', async () => {
    const r = await fetch(url('/api/executions'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ name: 'test', steps: [{ kind: 'invalid-kind' }] }),
    });
    assert.equal(r.status, 400);
  });
});

describe('ExecutionOS — Filtering', () => {
  it('GET /api/executions?status=pending → 200', async () => {
    const r = await fetch(url('/api/executions?status=pending'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/executions?missionId=mission-1 → 200', async () => {
    const r = await fetch(url('/api/executions?missionId=mission-1'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/executions/audit → 200', async () => {
    const r = await fetch(url('/api/executions/audit'), { headers: hdrs() });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.events));
  });
});

describe('ExecutionOS — 404', () => {
  it('GET /unknown → 404', async () => {
    const r = await fetch(url('/unknown'));
    assert.equal(r.status, 404);
  });
});

after(() => { server?.close(); });