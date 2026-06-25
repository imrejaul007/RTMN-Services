'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepEqual, deepDiff, changedKeys, categorizeChanges, countChanges } from '../src/diff.js';

// ---------------------------------------------------------------------------
// deepEqual tests
// ---------------------------------------------------------------------------

test('deepEqual returns true for identical primitives', () => {
  assert.equal(deepEqual(1, 1), true);
  assert.equal(deepEqual('hello', 'hello'), true);
  assert.equal(deepEqual(true, true), true);
  assert.equal(deepEqual(null, null), true);
});

test('deepEqual returns false for different primitives', () => {
  assert.equal(deepEqual(1, 2), false);
  assert.equal(deepEqual('hello', 'world'), false);
  assert.equal(deepEqual(true, false), false);
  assert.equal(deepEqual(null, undefined), false);
});

test('deepEqual returns true for identical arrays', () => {
  assert.equal(deepEqual([1, 2, 3], [1, 2, 3]), true);
  assert.equal(deepEqual([], []), true);
  assert.equal(deepEqual(['a', 'b'], ['a', 'b']), true);
});

test('deepEqual returns false for different arrays', () => {
  assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
  assert.equal(deepEqual([1, 2], [2, 1]), false);
});

test('deepEqual returns true for identical objects', () => {
  assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
  assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
  assert.equal(deepEqual({}, {}), true);
});

test('deepEqual returns false for different objects', () => {
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(deepEqual({ a: 1 }, { b: 1 }), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
});

test('deepEqual handles nested structures', () => {
  const objA = { a: { b: { c: 1 } }, arr: [1, 2] };
  const objB = { a: { b: { c: 1 } }, arr: [1, 2] };
  assert.equal(deepEqual(objA, objB), true);
});

// ---------------------------------------------------------------------------
// deepDiff tests
// ---------------------------------------------------------------------------

test('deepDiff returns empty array for identical objects', () => {
  const changes = deepDiff({ a: 1 }, { a: 1 });
  assert.equal(changes.length, 0);
});

test('deepDiff detects added fields', () => {
  const changes = deepDiff({ a: 1 }, { a: 1, b: 2 });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'added');
  assert.equal(changes[0].path, 'b');
  assert.equal(changes[0].newValue, 2);
});

test('deepDiff detects removed fields', () => {
  const changes = deepDiff({ a: 1, b: 2 }, { a: 1 });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'removed');
  assert.equal(changes[0].path, 'b');
  assert.equal(changes[0].oldValue, 2);
});

test('deepDiff detects changed fields', () => {
  const changes = deepDiff({ a: 1 }, { a: 2 });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'changed');
  assert.equal(changes[0].path, 'a');
  assert.equal(changes[0].oldValue, 1);
  assert.equal(changes[0].newValue, 2);
});

test('deepDiff handles array changes', () => {
  const changes = deepDiff({ arr: [1, 2] }, { arr: [1, 2, 3] });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, 'added');
  assert.ok(changes[0].path.includes('[2]'));
});

test('deepDiff handles nested objects', () => {
  const changes = deepDiff(
    { config: { name: 'old' } },
    { config: { name: 'new' } }
  );
  assert.equal(changes.length, 1);
  assert.equal(changes[0].path, 'config.name');
  assert.equal(changes[0].oldValue, 'old');
  assert.equal(changes[0].newValue, 'new');
});

test('deepDiff detects multiple changes', () => {
  const changes = deepDiff(
    { a: 1, b: 2, c: 3 },
    { a: 10, b: 2, d: 4 }
  );
  assert.equal(changes.length, 3);
});

// ---------------------------------------------------------------------------
// changedKeys tests
// ---------------------------------------------------------------------------

test('changedKeys returns array of paths', () => {
  const changes = deepDiff({ a: 1 }, { a: 2, b: 3 });
  const keys = changedKeys(changes);
  assert.equal(keys.length, 2);
  assert.ok(keys.includes('a'));
  assert.ok(keys.includes('b'));
});

// ---------------------------------------------------------------------------
// categorizeChanges tests
// ---------------------------------------------------------------------------

test('categorizeChanges groups by path prefix', () => {
  const changes = [
    { path: 'config.name', type: 'changed', oldValue: 'old', newValue: 'new' },
    { path: 'agents.0.name', type: 'changed', oldValue: 'a', newValue: 'b' },
    { path: 'integrations.0', type: 'added', oldValue: undefined, newValue: {} },
  ];
  const categorized = categorizeChanges(changes);
  assert.equal(categorized.config.length, 1);
  assert.equal(categorized.agents.length, 1);
  assert.equal(categorized.integrations.length, 1);
});

// ---------------------------------------------------------------------------
// countChanges tests
// ---------------------------------------------------------------------------

test('countChanges returns correct counts', () => {
  const changes = [
    { path: 'a', type: 'added' },
    { path: 'b', type: 'changed' },
    { path: 'c', type: 'removed' },
    { path: 'd', type: 'changed' },
  ];
  const counts = countChanges(changes);
  assert.equal(counts.added, 1);
  assert.equal(counts.removed, 1);
  assert.equal(counts.changed, 2);
  assert.equal(counts.total, 4);
});

// ---------------------------------------------------------------------------
// Blueprint-specific tests
// ---------------------------------------------------------------------------

test('deepDiff works with blueprint structures', () => {
  const oldBlueprint = {
    config: { name: 'my-company', type: 'b2b' },
    agents: [{ name: 'CEO' }, { name: 'Sales' }],
    integrations: ['payment']
  };
  const newBlueprint = {
    config: { name: 'my-company', type: 'b2b' },
    agents: [{ name: 'CEO' }, { name: 'Sales' }, { name: 'Marketing' }],
    integrations: ['payment', 'crm']
  };
  const changes = deepDiff(oldBlueprint, newBlueprint);
  assert.ok(changes.length >= 2);
});

test('deepDiff detects agent capability changes', () => {
  const oldAgent = { name: 'Sales', capabilities: ['cold-call', 'email'] };
  const newAgent = { name: 'Sales', capabilities: ['cold-call', 'email', 'demo'] };
  const changes = deepDiff(oldAgent, newAgent);
  assert.ok(changes.some(c => c.type === 'added'));
});
