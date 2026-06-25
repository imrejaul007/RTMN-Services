'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEvolution } from '../src/index.js';

// ---------------------------------------------------------------------------
// runEvolution tests
// ---------------------------------------------------------------------------

test('runEvolution returns valid evolution job', () => {
  const blueprint = {
    config: { name: 'test-company', type: 'b2b' },
    agents: [{ name: 'Sales', role: 'sales', capabilities: ['negotiation'] }]
  };

  const job = runEvolution(blueprint);

  assert.ok(job.id.startsWith('evo_'));
  assert.equal(job.status, 'done');
  assert.ok(Array.isArray(job.improvements));
  assert.ok(job.createdAt);
});

test('runEvolution generates improvements', () => {
  const blueprint = {
    config: { name: 'tradeflow', type: 'b2b' },
    agents: [{ name: 'CEO', role: 'leadership', capabilities: ['strategy'] }]
  };

  const job = runEvolution(blueprint, {});

  assert.ok(job.improvements.length > 0, 'Should generate improvements');
});

test('runEvolution includes integration recommendations', () => {
  const blueprint = {
    config: { name: 'test', type: 'b2b' },
    agents: [{ name: 'Sales', role: 'sales' }],
    integrations: []
  };

  const job = runEvolution(blueprint, {});

  const integrationImprovements = job.improvements.filter(i => i.type === 'integration');
  assert.ok(integrationImprovements.length > 0, 'Should recommend integrations');
});

test('runEvolution handles missing blueprint gracefully', () => {
  const job = runEvolution({}, {});

  assert.equal(job.status, 'done');
  assert.ok(Array.isArray(job.improvements));
});

test('runEvolution includes priority levels', () => {
  const blueprint = {
    config: { name: 'test', type: 'b2b' },
    agents: []
  };

  const job = runEvolution(blueprint, {});

  const priorities = new Set(job.improvements.map(i => i.priority));
  assert.ok(priorities.has('high') || priorities.has('medium') || priorities.has('low'));
});

test('runEvolution includes confidence scores', () => {
  const blueprint = {
    config: { name: 'test', type: 'saas' },
    agents: [{ name: 'Support', role: 'support' }]
  };

  const job = runEvolution(blueprint, {});

  for (const improvement of job.improvements) {
    assert.ok(typeof improvement.confidence === 'number');
    assert.ok(improvement.confidence >= 0 && improvement.confidence <= 1);
  }
});

test('runEvolution generates capability recommendations', () => {
  const blueprint = {
    config: { name: 'test', type: 'saas' },
    agents: [{ name: 'Sales', role: 'sales', capabilities: [] }]
  };

  const job = runEvolution(blueprint, {});

  const capImprovements = job.improvements.filter(i => i.type === 'capability');
  assert.ok(capImprovements.length > 0, 'Should recommend capabilities');
});

test('runEvolution respects minConfidence config', () => {
  const blueprint = {
    config: { name: 'test', type: 'b2b' },
    agents: []
  };

  const job = runEvolution(blueprint, {}, { minConfidence: 0.95 });

  for (const improvement of job.improvements) {
    assert.ok(improvement.confidence >= 0.95);
  }
});

test('runEvolution includes reasons for improvements', () => {
  const blueprint = {
    config: { name: 'test', type: 'marketplace' },
    agents: [{ name: 'Ops', role: 'operations' }]
  };

  const job = runEvolution(blueprint, {});

  for (const improvement of job.improvements) {
    assert.ok(Array.isArray(improvement.reasons));
    assert.ok(improvement.reasons.length > 0);
  }
});

test('runEvolution generates workflow recommendations', () => {
  const blueprint = {
    config: { name: 'test', type: 'saas' },
    agents: [],
    workflows: []
  };

  const job = runEvolution(blueprint, {});

  const workflowImprovements = job.improvements.filter(i => i.type === 'workflow');
  assert.ok(workflowImprovements.length > 0, 'Should recommend workflows');
});
