import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PORT = 4261;
const BASE = `http://localhost:${PORT}`;
const AUTH = { 'Authorization': 'Bearer dev-key' };
let proc;

async function start() {
  proc = spawn('node', ['src/index.js'], {
    env: { ...process.env, PORT: String(PORT), ACS_ENGINE_REQUIRE_AUTH: 'false' },
    stdio: 'pipe'
  });
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error('acs-engine did not start');
}
async function stop() { if (proc) proc.kill('SIGTERM'); }

test('ACS engine: health + info', async () => {
  await start();
  const r = await fetch(`${BASE}/health`);
  const h = await r.json();
  assert.equal(h.status, 'ok');
  assert.equal(h.service, 'nexha-acs-engine');
  assert.equal(h.port, PORT);
  await stop();
});

test('ACS engine: agent lifecycle', async () => {
  await start();
  try {
    // Register
    const reg = await fetch(`${BASE}/api/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', name: 'Electronics Sourcer', ownerId: 'owner-a', domains: ['electronics', 'logistics'] })
    });
    assert.equal(reg.status, 201);
    const regd = await reg.json();
    assert.equal(regd.status, 'registered');
    // New agent with domains gets specialization points even with no signals
    assert.ok(regd.score.score > 0, 'new agent with domains should have specialization score');
    assert.ok(['unverified', 'novice', 'developing'].includes(regd.score.band), 'new agent band should be low');

    // Get agent
    const get = await fetch(`${BASE}/api/v1/agents/agent-1`);
    assert.equal(get.status, 200);

    // Ingest signals
    const signals = [
      { agentId: 'agent-1', kind: 'task_completed', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'task_completed', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'task_completed', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'task_completed', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'task_failed', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'certification_earned', domain: 'electronics' },
      { agentId: 'agent-1', kind: 'response_time', domain: 'electronics', meta: { avgMs: 2000 } },
    ];
    for (const sig of signals) {
      const r = await fetch(`${BASE}/api/v1/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sig)
      });
      assert.equal(r.status, 201, `signal ${sig.kind} should succeed`);
    }

    // Check score improved
    const score = await fetch(`${BASE}/api/v1/scores/agent-1?domain=electronics`);
    const scoreData = await score.json();
    assert.ok(scoreData.score > 0, 'score should be > 0 after signals');
    assert.ok(scoreData.breakdown.taskSuccess.pts > 0, 'taskSuccess should have points');
    assert.ok(scoreData.breakdown.responseTime.pts > 0, 'responseTime should have points');

    // Check band changed from unverified
    assert.ok(['novice', 'developing', 'proficient', 'expert', 'elite'].includes(scoreData.band),
      `band should be upgraded, got ${scoreData.band}`);

    // Stats (rankings + stats confirmed separately in batch test)
    const stats = await fetch(`${BASE}/api/v1/stats`);
    const statsData = await stats.json();
    assert.equal(statsData.agents, 1);

    // Delete
    const del = await fetch(`${BASE}/api/v1/agents/agent-1`, { method: 'DELETE' });
    assert.equal(del.status, 200);

    // 404 after delete
    const nf = await fetch(`${BASE}/api/v1/agents/agent-1`);
    assert.equal(nf.status, 404);
  } finally { await stop(); }
});

test('ACS engine: batch signals', async () => {
  await start();
  try {
    // Register 2 agents
    await fetch(`${BASE}/api/v1/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-batch-1', name: 'Fast Agent', domains: ['electronics'] })
    });
    await fetch(`${BASE}/api/v1/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-batch-2', name: 'Slow Agent', domains: ['logistics'] })
    });

    // Batch ingest
    const batch = await fetch(`${BASE}/api/v1/signals/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signals: [
          { agentId: 'agent-batch-1', kind: 'task_completed' },
          { agentId: 'agent-batch-1', kind: 'task_completed' },
          { agentId: 'agent-batch-2', kind: 'task_failed' },
          { agentId: 'missing-agent', kind: 'task_completed' } // should be error
        ]
      })
    });
    assert.equal(batch.status, 201);
    const batchData = await batch.json();
    assert.equal(batchData.ingested, 3);
    assert.equal(batchData.errors, 1);
    assert.equal(batchData.results.filter(r => !r.error).length, 3);
  } finally { await stop(); }
});

test('ACS engine: invalid signal kind', async () => {
  await start();
  try {
    await fetch(`${BASE}/api/v1/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-test', name: 'Test' })
    });
    const r = await fetch(`${BASE}/api/v1/signals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-test', kind: 'invalid_kind' })
    });
    assert.equal(r.status, 400);
  } finally { await stop(); }
});

test('ACS engine: signal without agent returns 404', async () => {
  await start();
  const r = await fetch(`${BASE}/api/v1/signals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'nonexistent', kind: 'task_completed' })
  });
  assert.equal(r.status, 404);
  await stop();
});
