/**
 * SkillOS — Datasets + training unit tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDataset, buildDatasetVersion, finalizeDataset, addExamples,
  normalizeExamples, computeStats, buildModelAdapter, DATASET_STATUSES,
} from '../../src/services/datasets.js';
import {
  buildJob, estimateCost, JOB_STATUSES, METHODS as TRAINING_METHODS, updateFromBackend,
} from '../../src/services/training.js';

test('skill-os datasets — buildDataset', async (t) => {
  await t.test('creates a draft dataset with examples', () => {
    const ds = buildDataset({
      name: 'Test', ownerId: 'user-1', skillId: 'sk-1',
      examples: [
        { input: { q: 'hi' }, output: { a: 'hello' }, score: 0.9 },
      ],
    });
    assert.equal(ds.status, 'draft');
    assert.equal(ds.version, 1);
    assert.equal(ds.examples.length, 1);
    assert.equal(ds.stats.exampleCount, 1);
    assert.equal(ds.stats.avgScore, 0.9);
  });

  await t.test('requires name, ownerId, skillId', () => {
    assert.throws(() => buildDataset({}), /name required/);
    assert.throws(() => buildDataset({ name: 'x' }), /ownerId required/);
    assert.throws(() => buildDataset({ name: 'x', ownerId: 'y' }), /skillId required/);
  });

  await t.test('rejects invalid example scores', () => {
    assert.throws(() => buildDataset({
      name: 'x', ownerId: 'y', skillId: 'z',
      examples: [{ input: {}, output: {}, score: 1.5 }],
    }), /score must be 0\.\.1/);
  });
});

test('skill-os datasets — versioning', async (t) => {
  await t.test('cannot version a draft', () => {
    const ds = buildDataset({ name: 'T', ownerId: 'u', skillId: 's' });
    assert.throws(() => buildDatasetVersion(ds), /can only version/);
  });

  await t.test('versioning a finalized dataset bumps the version', () => {
    const parent = finalizeDataset(buildDataset({ name: 'T', ownerId: 'u', skillId: 's' }));
    const v2 = buildDatasetVersion(parent);
    assert.equal(v2.version, 2);
    assert.equal(v2.parentVersionId, parent.id);
    assert.equal(v2.status, 'draft');
  });
});

test('skill-os datasets — finalize + addExamples', async (t) => {
  await t.test('finalize is idempotent', () => {
    const ds = buildDataset({ name: 'T', ownerId: 'u', skillId: 's' });
    const f = finalizeDataset(ds);
    const f2 = finalizeDataset(f);
    assert.equal(f2.status, 'finalized');
    assert.equal(f2.finalizedAt, f.finalizedAt);
  });

  await t.test('cannot add examples to a finalized dataset', () => {
    const ds = finalizeDataset(buildDataset({ name: 'T', ownerId: 'u', skillId: 's' }));
    assert.throws(() => addExamples(ds, [{ input: {}, output: {} }]), /cannot add examples to finalized/);
  });

  await t.test('DATASET_STATUSES has 3 values', () => {
    assert.equal(DATASET_STATUSES.length, 3);
  });
});

test('skill-os datasets — computeStats', async (t) => {
  await t.test('computes example count, avg score, tags', () => {
    const stats = computeStats([
      { input: {}, output: {}, score: 0.5, tags: ['a'] },
      { input: {}, output: {}, score: 0.7, tags: ['a', 'b'] },
      { input: {}, output: {}, score: null, tags: [] },
    ]);
    assert.equal(stats.exampleCount, 3);
    assert.equal(stats.scoredCount, 2);
    assert.equal(stats.avgScore, 0.6);
    assert.deepEqual(stats.tags.sort(), ['a', 'b']);
  });
});

test('skill-os datasets — buildModelAdapter', async (t) => {
  await t.test('builds an adapter record', () => {
    const a = buildModelAdapter({
      name: 'Test Adapter', skillId: 'sk-1', ownerId: 'u-1',
      baseModel: 'gpt-4o', method: 'lora', datasetId: 'ds-1', jobId: 'job-1',
    });
    assert.equal(a.baseModel, 'gpt-4o');
    assert.equal(a.method, 'lora');
    assert.equal(a.status, 'active');
    assert.equal(a.metrics.examplesUsed, 0);
  });
});

test('skill-os training — buildJob', async (t) => {
  await t.test('builds a queued job with cost estimate', () => {
    const j = buildJob({
      datasetId: 'ds-1', skillId: 'sk-1', baseModel: 'gpt-4o', method: 'lora', createdBy: 'u-1',
    });
    assert.equal(j.status, 'queued');
    assert.equal(j.progress, 0);
    assert.equal(j.estimatedCost, 50); // gpt-4o base
    assert.equal(j.hyperparameters.epochs, 3);
  });

  await t.test('rejects invalid method', () => {
    assert.throws(() => buildJob({
      datasetId: 'd', skillId: 's', baseModel: 'b', method: 'full-frontal', createdBy: 'u',
    }), /invalid method/);
  });

  await t.test('estimateCost is per-base-model', () => {
    assert.equal(estimateCost('gpt-4o', 'lora'), 50);
    assert.equal(estimateCost('gpt-4o-mini', 'lora'), 10);
    assert.equal(estimateCost('gpt-4o', 'full'), 250);
  });

  await t.test('JOB_STATUSES has 5 values', () => {
    assert.equal(JOB_STATUSES.length, 5);
  });

  await t.test('updateFromBackend applies status', () => {
    const j = buildJob({ datasetId: 'd', skillId: 's', baseModel: 'b', createdBy: 'u' });
    const u = updateFromBackend(j, { status: 'running', progress: 0.5 });
    assert.equal(u.status, 'running');
    assert.equal(u.progress, 0.5);
    assert.ok(u.startedAt);
  });
});
