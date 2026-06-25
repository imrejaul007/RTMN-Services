'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { computeDiff, applyDiff, areBlueprintsEqual, getDiffSummary } = require('../src/index.js');

// ---------------------------------------------------------------------------
// computeDiff tests
// ---------------------------------------------------------------------------

test('computeDiff returns valid diff result', () => {
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
  assert.ok(diff.changes.some(c => c.type === 'added'));
});

test('computeDiff detects removed fields', () => {
  const oldBp = { config: { name: 'test', type: 'b2b' } };
  const newBp = { config: { name: 'test' } };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.changeCount > 0);
  assert.ok(diff.changes.some(c => c.type === 'removed'));
});

test('computeDiff detects changed fields', () => {
  const oldBp = { config: { name: 'old-name' } };
  const newBp = { config: { name: 'new-name' } };

  const diff = computeDiff(oldBp, newBp);

  assert.ok(diff.changeCount > 0);
  assert.ok(diff.changes.some(c => c.type === 'changed'));
  assert.equal(diff.changes[0].oldValue, 'old-name');
  assert.equal(diff.changes[0].newValue, 'new-name');
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

test('computeDiff detects structural changes (regenerate mode)', () => {
  const oldBp = {
    config: { name: 'company-a', type: 'b2b' },
    agents: []
  };
  const newBp = {
    config: { name: 'company-b', type: 'saas' },
    agents: []
  };

  const diff = computeDiff(oldBp, newBp);

  // Changing config.name triggers regenerate mode
  assert.equal(diff.mode, 'regenerate');
});

test('computeDiff validates blueprints', () => {
  assert.throws(
    () => computeDiff(null, { config: { name: 'test' } }),
    /Invalid old blueprint/
  );
  assert.throws(
    () => computeDiff({ config: { name: 'test' } }, null),
    /Invalid new blueprint/
  );
});

// ---------------------------------------------------------------------------
// applyDiff tests
// ---------------------------------------------------------------------------

test('applyDiff applies patches correctly', () => {
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

  assert.equal(applied.config.type, 'saas');
  assert.equal(applied.agents.length, 2);
});

test('applyDiff adds new agents', () => {
  const oldBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'CEO' }]
  };
  const newBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'CEO' }, { name: 'CTO' }]
  };

  const diff = computeDiff(oldBp, newBp);
  const applied = applyDiff(oldBp, diff);

  assert.ok(applied.agents.find(a => a.name === 'CTO'));
});

test('applyDiff removes agents', () => {
  const oldBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'CEO' }, { name: 'CTO' }]
  };
  const newBp = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'CEO' }]
  };

  const diff = computeDiff(oldBp, newBp);
  const applied = applyDiff(oldBp, diff);

  assert.equal(applied.agents.length, 1);
  assert.equal(applied.agents[0].name, 'CEO');
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

test('Adding a new agent generates minimal patch', () => {
  const oldBp = {
    config: { name: 'tradeflow', type: 'b2b' },
    agents: [
      { name: 'CEO', role: 'leadership', capabilities: ['strategy'] },
      { name: 'Sales', role: 'sales', capabilities: ['negotiation', 'rfq'] }
    ],
    integrations: ['payment-gateway']
  };

  const newBp = {
    config: { name: 'tradeflow', type: 'b2b' },
    agents: [
      { name: 'CEO', role: 'leadership', capabilities: ['strategy'] },
      { name: 'Sales', role: 'sales', capabilities: ['negotiation', 'rfq'] },
      { name: 'Logistics', role: 'operations', capabilities: ['shipping', 'tracking'] }
    ],
    integrations: ['payment-gateway']
  };

  const diff = computeDiff(oldBp, newBp);

  // Should use patch mode, not regenerate
  assert.equal(diff.mode, 'patch');
  // Should have one agent addition
  assert.ok(diff.changes.some(c => c.type === 'added' && c.path.includes('Logistics')));
});

test('Changing company type triggers regeneration', () => {
  const oldBp = {
    config: { name: 'company', type: 'b2b' },
    agents: []
  };
  const newBp = {
    config: { name: 'company', type: 'marketplace' },
    agents: []
  };

  const diff = computeDiff(oldBp, newBp);

  // Marketplace is a structural change
  assert.equal(diff.mode, 'regenerate');
});

test('Updating agent capabilities is a surgical patch', () => {
  const oldBp = {
    config: { name: 'test', type: 'saas' },
    agents: [
      { name: 'Support', capabilities: ['tickets', 'chat'] }
    ]
  };
  const newBp = {
    config: { name: 'test', type: 'saas' },
    agents: [
      { name: 'Support', capabilities: ['tickets', 'chat', 'voice'] }
    ]
  };

  const diff = computeDiff(oldBp, newBp);

  assert.equal(diff.mode, 'patch');
  assert.ok(diff.changeCount > 0);
});
