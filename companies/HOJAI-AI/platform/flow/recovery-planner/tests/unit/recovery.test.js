/**
 * Phase 14.5 — Recovery Planner unit tests
 * Covers: findDownstream, findUpstream, decideRecovery.
 */
const TEST_DATA_DIR = '/tmp/recovery-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.RECOVERY_PLANNER_DATA_DIR = TEST_DATA_DIR;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { decideRecovery, findDownstream, findUpstream } = require('../../src/index');

// ---------- findDownstream ----------

test('findDownstream: linear chain collects all later tasks', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
    { id: 'd', dependsOn: ['c'] },
  ];
  const down = findDownstream('a', tasks);
  assert.deepEqual(down.sort(), ['b', 'c', 'd']);
});

test('findDownstream: diamond DAG', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'd', dependsOn: ['b', 'c'] },
  ];
  const down = findDownstream('a', tasks);
  assert.deepEqual(down.sort(), ['b', 'c', 'd']);
});

test('findDownstream: leaf has no downstream', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
  ];
  assert.deepEqual(findDownstream('b', tasks), []);
});

test('findDownstream: no cross-dependency returns empty', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: [] },
  ];
  assert.deepEqual(findDownstream('a', tasks), []);
});

// ---------- findUpstream ----------

test('findUpstream: linear chain', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
  ];
  const up = findUpstream('c', tasks);
  assert.deepEqual(up.sort(), ['a', 'b']);
});

test('findUpstream: root has no upstream', () => {
  const tasks = [{ id: 'a', dependsOn: [] }];
  assert.deepEqual(findUpstream('a', tasks), []);
});

test('findUpstream: diamond DAG', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'd', dependsOn: ['b', 'c'] },
  ];
  const up = findUpstream('d', tasks);
  assert.deepEqual(up.sort(), ['a', 'b', 'c']);
});

// ---------- decideRecovery ----------

test('decideRecovery: missing task -> abort', () => {
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'nonexistent',
    tasks: [{ id: 'a', kind: 'send' }],
  });
  assert.equal(r.strategy, 'abort');
  assert.equal(r.reason, 'failed-task-not-in-graph');
});

test('decideRecovery: alternatives provided -> branch', () => {
  const tasks = [{ id: 'a', kind: 'send' }];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    options: { alternatives: [{ taskId: 'a', subGraph: ['a2'] }] },
    tasks,
  });
  assert.equal(r.strategy, 'branch');
  assert.equal(r.branch.taskId, 'a');
  assert.equal(r.steps.length, 2);
  assert.equal(r.steps[0].type, 'mark');
  assert.equal(r.steps[0].status, 'skipped');
  assert.equal(r.steps[1].type, 'merge');
});

test('decideRecovery: rollback when history sufficient', () => {
  const tasks = [{ id: 'a', kind: 'send' }];
  const history = [
    { taskId: 'a', status: 'done', ts: '2026-06-22T10:00:00Z' },
    { taskId: 'a', status: 'done', ts: '2026-06-22T10:01:00Z' },
    { taskId: 'a', status: 'done', ts: '2026-06-22T10:02:00Z' },
  ];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    history,
    options: { rollbackDepth: 3 },
    tasks,
  });
  assert.equal(r.strategy, 'rollback');
  assert.ok(r.steps.length >= 3);
  assert.equal(r.steps[r.steps.length - 1].status, 'pending');
});

test('decideRecovery: skip for non-critical with skipNonCritical:true', () => {
  const tasks = [
    { id: 'a', kind: 'send', dependsOn: [] },
    { id: 'b', kind: 'verify', dependsOn: ['a'] },
  ];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    options: { skipNonCritical: true },
    tasks,
  });
  assert.equal(r.strategy, 'skip');
  assert.equal(r.steps[0].status, 'skipped');
  assert.ok(r.steps.some((s) => s.taskId === 'b' && s.degraded === true));
});

test('decideRecovery: abort as final fallback', () => {
  const tasks = [{ id: 'a', kind: 'send' }];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    history: [],
    options: {},
    tasks,
  });
  // No alternatives, no rollback history, no skipNonCritical
  assert.equal(r.strategy, 'abort');
  assert.ok(r.preservedTasks);
});

test('decideRecovery: rollback preferred over skip when both applicable', () => {
  // Alternatives first, then rollback, then skip, then abort.
  // With skipNonCritical:false but rollbackDepth satisfied, rollback should win.
  const tasks = [{ id: 'a', kind: 'send' }];
  const history = [
    { taskId: 'x', status: 'done' },
    { taskId: 'y', status: 'done' },
    { taskId: 'z', status: 'done' },
  ];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    history,
    options: { rollbackDepth: 3, skipNonCritical: true },
    tasks,
  });
  // rollback wins (alternatives absent, history >= depth)
  assert.equal(r.strategy, 'rollback');
});

test('decideRecovery: includes downstream/upstream tasks in plan', () => {
  const tasks = [
    { id: 'a', kind: 'send', dependsOn: [] },
    { id: 'b', kind: 'verify', dependsOn: ['a'] },
    { id: 'c', kind: 'notify', dependsOn: ['b'] },
  ];
  const r = decideRecovery({
    graphId: 'g1',
    failedTaskId: 'a',
    options: { skipNonCritical: true },
    tasks,
  });
  assert.equal(r.strategy, 'skip');
  assert.deepEqual(r.downstreamTasks.sort(), ['b', 'c']);
});

test('teardown: remove data dir', () => {
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});