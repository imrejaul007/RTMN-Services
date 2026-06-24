/**
 * Phase 14.2 — Dependency Graph algorithm tests
 * Pure-function tests for validateDag, hasCycle, topologicalSort, parallelBatches, criticalPath, readyTasks.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateDag,
  hasCycle,
  topologicalSort,
  parallelBatches,
  criticalPath,
  readyTasks,
} = require('../../src/index');

test('validateDag: empty array -> invalid', () => {
  const r = validateDag([]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('non-empty')));
});

test('validateDag: missing id -> invalid', () => {
  const r = validateDag([{ name: 'x', dependsOn: [] }]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('id')));
});

test('validateDag: duplicate ids -> invalid', () => {
  const r = validateDag([
    { id: 't1', dependsOn: [] },
    { id: 't1', dependsOn: [] },
  ]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('duplicate')));
});

test('validateDag: self-dependency -> invalid', () => {
  const r = validateDag([{ id: 't1', dependsOn: ['t1'] }]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('itself')));
});

test('validateDag: missing dependency -> invalid', () => {
  const r = validateDag([{ id: 't1', dependsOn: ['t9'] }]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('missing')));
});

test('validateDag: valid DAG -> ok', () => {
  const r = validateDag([
    { id: 't1', dependsOn: [] },
    { id: 't2', dependsOn: ['t1'] },
    { id: 't3', dependsOn: ['t1', 't2'] },
  ]);
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test('hasCycle: direct cycle t1 -> t2 -> t1', () => {
  const tasks = [
    { id: 't1', dependsOn: ['t2'] },
    { id: 't2', dependsOn: ['t1'] },
  ];
  assert.equal(hasCycle(tasks), true);
});

test('hasCycle: 3-node cycle', () => {
  const tasks = [
    { id: 'a', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['c'] },
    { id: 'c', dependsOn: ['a'] },
  ];
  assert.equal(hasCycle(tasks), true);
});

test('hasCycle: linear DAG -> no cycle', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
  ];
  assert.equal(hasCycle(tasks), false);
});

test('hasCycle: diamond DAG -> no cycle', () => {
  const tasks = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'd', dependsOn: ['b', 'c'] },
  ];
  assert.equal(hasCycle(tasks), false);
});

test('topologicalSort: linear chain', () => {
  const order = topologicalSort([
    { id: 'c', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'a', dependsOn: [] },
  ]);
  assert.deepEqual(order, ['a', 'b', 'c']);
});

test('topologicalSort: parallel tasks come before dependents', () => {
  const order = topologicalSort([
    { id: 'd', dependsOn: ['b', 'c'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'a', dependsOn: [] },
  ]);
  assert.equal(order[0], 'a');
  assert.equal(order[order.length - 1], 'd');
  assert.ok(order.indexOf('b') < order.indexOf('d'));
  assert.ok(order.indexOf('c') < order.indexOf('d'));
});

test('parallelBatches: diamond DAG has 3 waves', () => {
  const batches = parallelBatches([
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'd', dependsOn: ['b', 'c'] },
  ]);
  assert.equal(batches.length, 3);
  assert.deepEqual(batches[0], ['a']);
  assert.deepEqual(batches[1].sort(), ['b', 'c']);
  assert.deepEqual(batches[2], ['d']);
});

test('parallelBatches: independent tasks all in wave 0', () => {
  const batches = parallelBatches([
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: [] },
    { id: 'c', dependsOn: [] },
  ]);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3);
});

test('criticalPath: longest duration path wins', () => {
  // a (10m) -> b (1m) -> d (1m) = 12m
  // a (10m) -> c (5m) -> d (1m) = 16m
  const result = criticalPath([
    { id: 'a', dependsOn: [], durationMin: 10 },
    { id: 'b', dependsOn: ['a'], durationMin: 1 },
    { id: 'c', dependsOn: ['a'], durationMin: 5 },
    { id: 'd', dependsOn: ['b', 'c'], durationMin: 1 },
  ]);
  assert.deepEqual(result.path, ['a', 'c', 'd']);
  assert.equal(result.durationMin, 16);
});

test('criticalPath: linear chain', () => {
  const result = criticalPath([
    { id: 'a', dependsOn: [], durationMin: 5 },
    { id: 'b', dependsOn: ['a'], durationMin: 10 },
    { id: 'c', dependsOn: ['b'], durationMin: 3 },
  ]);
  assert.deepEqual(result.path, ['a', 'b', 'c']);
  assert.equal(result.durationMin, 18);
});

test('readyTasks: returns tasks with all deps done', () => {
  const graph = {
    tasks: [
      { id: 'a', status: 'done', dependsOn: [] },
      { id: 'b', status: 'done', dependsOn: ['a'] },
      { id: 'c', status: 'pending', dependsOn: ['b'] },
      { id: 'd', status: 'pending', dependsOn: ['b'] },
    ],
  };
  const ready = readyTasks(graph);
  assert.deepEqual(ready.sort(), ['c', 'd']);
});

test('readyTasks: blocked task not in ready set', () => {
  const graph = {
    tasks: [
      { id: 'a', status: 'pending', dependsOn: [] },
      { id: 'b', status: 'pending', dependsOn: ['a'] },
    ],
  };
  assert.deepEqual(readyTasks(graph), ['a']);
});

test('readyTasks: failed task excluded', () => {
  const graph = {
    tasks: [
      { id: 'a', status: 'failed', dependsOn: [] },
      { id: 'b', status: 'pending', dependsOn: ['a'] },
    ],
  };
  assert.deepEqual(readyTasks(graph), []);
});