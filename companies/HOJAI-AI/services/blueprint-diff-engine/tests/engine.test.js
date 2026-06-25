'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDiff, applyDiff, areBlueprintsEqual, getDiffSummary } from '../src/index.js';

// ---------------------------------------------------------------------------
// computeDiff tests
// ---------------------------------------------------------------------------

test('computeDiff returns valid diff result for identical blueprints', () => {
  const oldBp = {
    config: { name: 'test-company', type: 'b2b' },
    agents: []
  };
  const newBp = {
    config: { name: 'test-company', type: 'b2b' },
    agents: []
  };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.id.startsWith('diff_'));
  assert.equal(diff.changeCount, 0);
  assert.equal(diff.mode, 'patch');
  assert.ok(diff.generatedAt);
});

test('computeDiff detects added fields', () => {
  const oldBp = { config: { name: 'test' } };
  const newBp = { config: { name: 'test', type: 'b2b' } };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.changeCount > 0);
  assert.ok(diff.changes.length > 0);
});

test('computeDiff generates patches', () => {
  const oldBp = {
    config: { name: 'test', type: 'b2b' },
    agents: []
  };
  const newBp = {
    config: { name: 'test', type: 'b2c' },
    agents: [{ name: 'CEO' }]
  };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(Array.isArray(diff.patches));
  assert.ok(diff.patches.length > 0);
});

test('computeDiff has summary', () => {
  const oldBp = { config: { name: 'test', type: 'b2b' } };
  const newBp = { config: { name: 'test', type: 'saas' } };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(typeof diff.summary === 'string');
  assert.ok(diff.summary.length > 0);
});

// ---------------------------------------------------------------------------
// applyDiff tests
// ---------------------------------------------------------------------------

test('applyDiff returns updated blueprint', () => {
  const oldBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'CEO' }]
  };
  const newBp = {
    config: { name: 'test', type: 'saas' },
    agents: [{ name: 'CEO' }, { name: 'CTO' }]
  };

  const diff = computeDiff(oldBp, newBp);
  const applied = applyDiff(oldBp, diff);

  assert.ok(applied);
  assert.ok(applied.config);
});

// ---------------------------------------------------------------------------
// areBlueprintsEqual tests
// ---------------------------------------------------------------------------

test('areBlueprintsEqual returns true for identical blueprints', () => {
  const bp = { config: { name: 'test', type: 'b2b' }, agents: [] };
  assert.equal(areBlueprintsEqual(bp, bp), true);
});

test('areBlueprintsEqual returns true for equal blueprints', () => {
  const bpA = { config: { name: 'test' }, agents: [] };
  const bpB = { config: { name: 'test' }, agents: [] };
  assert.equal(areBlueprintsEqual(bpA, bpB), true);
});

test('areBlueprintsEqual returns false for different blueprints', () => {
  const bpA = { config: { name: 'a' } };
  const bpB = { config: { name: 'b' } };
  assert.equal(areBlueprintsEqual(bpA, bpB), false);
});

// ---------------------------------------------------------------------------
// getDiffSummary tests
// ---------------------------------------------------------------------------

test('getDiffSummary returns summary object', () => {
  const oldBp = { config: { name: 'test', type: 'b2b' } };
  const newBp = { config: { name: 'test', type: 'saas' } };

  const diff = computeDiff(oldBp, newBp);
  const summary = getDiffSummary(diff);

  assert.ok(summary.id.startsWith('diff_'));
  assert.equal(summary.changeCount, diff.changeCount);
  assert.ok(typeof summary.summary === 'string');
});

// ---------------------------------------------------------------------------
// Real-world scenario tests
// ---------------------------------------------------------------------------

test('Adding a new agent generates diff with changes', () => {
  const oldBp = {
    config: { name: 'tradeflow', type: 'b2b' },
    agents: [
      { name: 'CEO', role: 'leadership' }
    ]
  };

  const newBp = {
    config: { name: 'tradeflow', type: 'b2b' },
    agents: [
      { name: 'CEO', role: 'leadership' },
      { name: 'Sales', role: 'sales' }
    ]
  };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.changeCount > 0);
  assert.ok(diff.changes.length > 0);
});

test('Blueprint diff captures all section changes', () => {
  const oldBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [],
    integrations: []
  };

  const newBp = {
    config: { name: 'test', type: 'saas' },
    agents: [{ name: 'CEO' }],
    integrations: ['payment']
  };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.changeCount > 0);
  assert.ok(diff.mode === 'patch' || diff.mode === 'regenerate');
});

test('Diff includes patches for applying changes', () => {
  const oldBp = {
    config: { name: 'company', type: 'startup' },
    agents: [{ name: 'Founder' }]
  };

  const newBp = {
    config: { name: 'company', type: 'startup' },
    agents: [{ name: 'Founder' }, { name: 'Engineer' }]
  };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.patches);
  assert.ok(Array.isArray(diff.patches));
});
