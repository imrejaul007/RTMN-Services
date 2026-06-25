import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PORT = 4298;
const BASE = `http://localhost:${PORT}`;
let proc;

async function start() {
  proc = spawn('node', ['src/index.js'], {
    env: { ...process.env, PORT: String(PORT), HOJAI_GOALOS_REQUIRE_AUTH: 'false' },
    stdio: 'pipe'
  });
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/api/v1/health`);
      if (r.ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error('goalos did not start');
}

async function stop() {
  if (proc) proc.kill('SIGTERM');
}

test('GoalOS health', async () => {
  await start();
  const r = await fetch(`${BASE}/api/v1/health`);
  const h = await r.json();
  assert.equal(h.status, 'ok');
  assert.equal(h.service, 'goalos');
  assert.equal(h.version, '0.1.0');
  await stop();
});

test('GoalOS full lifecycle', async () => {
  await start();
  try {
    // Create
    const cr = await fetch(`${BASE}/api/v1/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ship Phase E', description: 'Complete all Phase E items' })
    });
    assert.equal(cr.status, 201);
    const goal = await cr.json();
    assert.ok(goal.id.startsWith('g-'));
    assert.equal(goal.progress, 0);

    // Get
    const gr = await fetch(`${BASE}/api/v1/goals/${goal.id}`);
    assert.equal(gr.status, 200);

    // Decompose
    const dr = await fetch(`${BASE}/api/v1/goals/${goal.id}/decompose`, { method: 'POST' });
    assert.equal(dr.status, 200);
    const dec = await dr.json();
    assert.equal(dec.decomposed, true);
    assert.ok(dec.keyResults.length > 0);

    // Update KR progress
    const krId = dec.keyResults[0].id;
    const pr = await fetch(`${BASE}/api/v1/goals/${goal.id}/key-results/${krId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 75 })
    });
    assert.equal(pr.status, 200);
    const updated = await pr.json();
    assert.equal(updated.keyResults[0].value, 75);
    // Progress = (75 + 0 + ...) / N KRs. Just verify it increased.
    assert.ok(updated.progress > 0, `progress should be > 0, got ${updated.progress}`);
    assert.ok(updated.progress <= updated.keyResults[0].value, 'progress cannot exceed KR values');

    // List
    const lr = await fetch(`${BASE}/api/v1/goals`);
    const list = await lr.json();
    assert.ok(list.items.length >= 1);

    // Delete
    const del = await fetch(`${BASE}/api/v1/goals/${goal.id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);

    // 404
    const nf = await fetch(`${BASE}/api/v1/goals/${goal.id}`);
    assert.equal(nf.status, 404);
  } finally {
    await stop();
  }
});
