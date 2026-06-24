/**
 * Phase 14.6 — Dynamic Replanner unit tests
 * Covers: topoByPriority, identifyOptionalTasks, planReplan.
 */
const TEST_DATA_DIR = '/tmp/replan-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.DYNAMIC_REPLANNER_DATA_DIR = TEST_DATA_DIR;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { planReplan, topoByPriority, identifyOptionalTasks } = require('../../src/index');

// ---------- topoByPriority ----------

test('topoByPriority: respects deps, orders by priority within wave', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'normal' },
    { id: 'b', dependsOn: ['a'], priority: 'low' },
    { id: 'c', dependsOn: ['a'], priority: 'high' },
    { id: 'd', dependsOn: ['a'], priority: 'normal' },
  ];
  const order = topoByPriority(tasks);
  // 'a' first; then in wave 2: c (high), then a/d (normal), then b (low)
  assert.equal(order[0], 'a');
  assert.equal(order[1], 'c');
  assert.equal(order[order.length - 1], 'b');
});

test('topoByPriority: linear chain', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'low' },
    { id: 'b', dependsOn: ['a'], priority: 'high' },
    { id: 'c', dependsOn: ['b'], priority: 'normal' },
  ];
  assert.deepEqual(topoByPriority(tasks), ['a', 'b', 'c']);
});

// ---------- identifyOptionalTasks ----------

test('identifyOptionalTasks: low-priority non-critical is optional', () => {
  // 'b' is short (5m) and not on the critical path; 'c' is the critical tail.
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'high', durationMin: 50 },
    { id: 'b', dependsOn: ['a'], priority: 'low', durationMin: 5 },
    { id: 'c', dependsOn: ['a'], priority: 'high', durationMin: 30 },
  ];
  // Critical path: a (50) → c (30) = 80; a → b → c is 50+5+30 = 85 actually
  // So critical is a→b→c. Let me use a chain that makes 'b' clearly off-critical.
  const tasks2 = [
    { id: 'a', dependsOn: [], priority: 'high', durationMin: 5 },
    { id: 'b', dependsOn: ['a'], priority: 'low', durationMin: 1 },
    { id: 'c', dependsOn: ['a'], priority: 'high', durationMin: 50 },
  ];
  // Critical = a (5) → c (50) = 55; b (off-critical)
  const r = identifyOptionalTasks(tasks2, 0.5);
  assert.deepEqual(r.optional, ['b']);
  assert.deepEqual(r.criticalPath.sort(), ['a', 'c']);
});

test('identifyOptionalTasks: high pressure includes normal tasks', () => {
  // Critical = a→d (60m). b (normal, 1m) and c (low, 1m) are off-critical.
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'high', durationMin: 30 },
    { id: 'b', dependsOn: ['a'], priority: 'normal', durationMin: 1 },
    { id: 'c', dependsOn: ['a'], priority: 'low', durationMin: 1 },
    { id: 'd', dependsOn: ['a'], priority: 'high', durationMin: 30 },
  ];
  const r1 = identifyOptionalTasks(tasks, 0.3);
  assert.ok(r1.optional.includes('c'));
  assert.equal(r1.optional.includes('b'), false);
  const r2 = identifyOptionalTasks(tasks, 0.6);
  assert.ok(r2.optional.includes('b'));
  assert.ok(r2.optional.includes('c'));
});

test('identifyOptionalTasks: critical-path tasks are not optional', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'low', durationMin: 50 }, // critical (longest)
    { id: 'b', dependsOn: ['a'], priority: 'low', durationMin: 1 },
  ];
  const r = identifyOptionalTasks(tasks, 1.0);
  assert.equal(r.optional.includes('a'), false);
});

// ---------- planReplan ----------

test('planReplan: empty tasks returns no actions', () => {
  const r = planReplan({ tasks: [], signal: { type: 'budget_tightened' } });
  assert.deepEqual(r.actions, []);
  assert.equal(r.reason, 'no-tasks');
});

test('planReplan: default signal returns baseline', () => {
  const tasks = [{ id: 'a', dependsOn: [], priority: 'normal' }];
  const r = planReplan({ tasks, signal: {} });
  assert.equal(r.reason, 'baseline-replan');
});

test('planReplan: budget_tightened skips low-priority', () => {
  // b and c both depend on a. Critical = a→c (60m). b is off-critical + low priority.
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'high', durationMin: 30 },
    { id: 'b', dependsOn: ['a'], priority: 'low', durationMin: 5 },
    { id: 'c', dependsOn: ['a'], priority: 'high', durationMin: 30 },
  ];
  const r = planReplan({ tasks, signal: { type: 'budget_tightened', budgetPressure: 0.5 } });
  const skip = r.actions.find((a) => a.type === 'skip');
  assert.ok(skip);
  assert.deepEqual(skip.taskIds, ['b']);
});

test('planReplan: deadline_approaching drops tasks to fit', () => {
  // a→d (60m critical). b (low, 5m) and c (low, 5m) are off-critical.
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'high', durationMin: 30 },
    { id: 'b', dependsOn: ['a'], priority: 'low', durationMin: 5 },
    { id: 'c', dependsOn: ['a'], priority: 'low', durationMin: 5 },
    { id: 'd', dependsOn: ['a'], priority: 'high', durationMin: 30 },
  ];
  // Total = 70m. Tight deadline (62m) means we need to drop both b and c.
  const r = planReplan({
    tasks,
    signal: { type: 'deadline_approaching', deadlineMin: 62 },
  });
  const skip = r.actions.find((a) => a.type === 'skip');
  assert.ok(skip);
  // Both b and c are dropped; projected ≤ 60 (just critical path)
  assert.ok(skip.taskIds.includes('b'));
  assert.ok(skip.taskIds.includes('c'));
  assert.ok(skip.projectedDuration <= 62);
});

test('planReplan: priority_changed reorders', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'low' },
    { id: 'b', dependsOn: [], priority: 'high' },
  ];
  const r = planReplan({
    tasks,
    signal: { type: 'priority_changed', priorities: { a: 'high', b: 'low' } },
  });
  const rep = r.actions.find((a) => a.type === 'reprioritize' && a.updates);
  assert.ok(rep);
  assert.deepEqual(rep.updates, [
    { taskId: 'a', oldPriority: 'low', newPriority: 'high' },
    { taskId: 'b', oldPriority: 'high', newPriority: 'low' },
  ]);
});

test('planReplan: task_failed marks downstream best-effort', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'normal' },
    { id: 'b', dependsOn: ['a'], priority: 'normal' },
    { id: 'c', dependsOn: ['b'], priority: 'normal' },
  ];
  const r = planReplan({ tasks, signal: { type: 'task_failed', taskId: 'a' } });
  const relax = r.actions.find((a) => a.type === 'relax_constraint');
  assert.ok(relax);
  assert.deepEqual(relax.taskIds.sort(), ['b', 'c']);
  assert.equal(relax.bestEffort, true);
});

test('planReplan: includes reprioritize action when order changes', () => {
  const tasks = [
    { id: 'a', dependsOn: [], priority: 'normal' },
    { id: 'b', dependsOn: [], priority: 'high' },
  ];
  const r = planReplan({ tasks, signal: { type: 'budget_tightened' } });
  // baseline reprioritize should appear because order differs from insertion order
  assert.ok(r.actions.some((a) => a.type === 'reprioritize'));
});

test('teardown: remove data dir', () => {
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});