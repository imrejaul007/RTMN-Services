/**
 * SkillOS — Training dataset service
 *
 * Versioned, immutable datasets of training examples. Once a dataset is
 * finalized, its examples cannot change. To update, create a new version
 * (which copies the parent and bumps the version number).
 */

import { v4 as uuidv4 } from 'uuid';

export const DATASET_STATUSES = ['draft', 'finalized', 'archived'];

export function isValidStatus(s) {
  return DATASET_STATUSES.includes(s);
}

/**
 * Build a new dataset record (in 'draft' state — examples can still be added).
 */
export function buildDataset(input) {
  const { name, ownerId, skillId, description = '', examples = [], tags = [] } = input;
  if (!name) throw new Error('name required');
  if (!ownerId) throw new Error('ownerId required');
  if (!skillId) throw new Error('skillId required');
  return {
    id: `ds-${uuidv4().slice(0, 8)}`,
    name,
    description,
    ownerId,
    skillId,
    tags,
    examples: normalizeExamples(examples),
    stats: computeStats(examples),
    version: 1,
    parentVersionId: input.parentVersionId || null,
    status: 'draft',
    createdAt: new Date().toISOString(),
    finalizedAt: null,
    archivedAt: null,
  };
}

/**
 * Normalize and validate a list of training examples.
 * Each example: { input, output, score?, tags? }
 */
export function normalizeExamples(examples) {
  if (!Array.isArray(examples)) return [];
  return examples.map((e, i) => {
    if (typeof e !== 'object' || e === null) {
      throw new Error(`example ${i} is not an object`);
    }
    if (!('input' in e) || !('output' in e)) {
      throw new Error(`example ${i} missing input or output`);
    }
    const score = e.score !== undefined ? Number(e.score) : null;
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 1)) {
      throw new Error(`example ${i} score must be 0..1, got ${e.score}`);
    }
    return {
      input: e.input,
      output: e.output,
      score,
      tags: Array.isArray(e.tags) ? e.tags : [],
      addedAt: e.addedAt || new Date().toISOString(),
    };
  });
}

/**
 * Compute stats over a list of examples.
 */
export function computeStats(examples) {
  const arr = Array.isArray(examples) ? examples : [];
  const scored = arr.filter((e) => typeof e.score === 'number');
  const tagSet = new Set();
  for (const e of arr) {
    if (Array.isArray(e.tags)) for (const t of e.tags) tagSet.add(t);
  }
  const avgScore = scored.length > 0
    ? +(scored.reduce((s, e) => s + e.score, 0) / scored.length).toFixed(4)
    : null;
  return {
    exampleCount: arr.length,
    scoredCount: scored.length,
    avgScore,
    tags: Array.from(tagSet),
  };
}

/**
 * Build a new version of an existing dataset. Copies the parent and bumps
 * the version number. The new version starts as 'draft'.
 */
export function buildDatasetVersion(parent, input = {}) {
  if (parent.status !== 'finalized' && parent.status !== 'archived') {
    throw new Error('can only version a finalized or archived dataset');
  }
  const newDataset = buildDataset({
    name: input.name || parent.name,
    description: input.description || parent.description,
    ownerId: parent.ownerId,
    skillId: parent.skillId,
    tags: input.tags || parent.tags,
    examples: input.examples || [], // start empty; can copy from parent
    parentVersionId: parent.id,
  });
  newDataset.version = parent.version + 1;
  newDataset.inheritedExamples = parent.examples.length;
  return newDataset;
}

/**
 * Finalize a dataset. Idempotent.
 */
export function finalizeDataset(dataset, at = null) {
  if (dataset.status === 'finalized') return dataset;
  if (dataset.status === 'archived') throw new Error('cannot finalize an archived dataset');
  return {
    ...dataset,
    status: 'finalized',
    finalizedAt: at || new Date().toISOString(),
  };
}

/**
 * Add examples to a draft dataset. Throws if already finalized.
 */
export function addExamples(dataset, newExamples) {
  if (dataset.status !== 'draft') {
    throw new Error(`cannot add examples to ${dataset.status} dataset`);
  }
  const normalized = normalizeExamples(newExamples);
  const merged = [...(dataset.examples || []), ...normalized];
  return {
    ...dataset,
    examples: merged,
    stats: computeStats(merged),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build a model adapter record (what a completed training job produces).
 */
export function buildModelAdapter(input) {
  return {
    id: `ma-${uuidv4().slice(0, 8)}`,
    name: input.name,
    skillId: input.skillId,
    ownerId: input.ownerId,
    baseModel: input.baseModel,
    method: input.method || 'lora',
    datasetId: input.datasetId,
    jobId: input.jobId || null,
    endpoint: input.endpoint || null,
    status: 'active',
    metrics: input.metrics || {
      examplesUsed: 0,
      trainingLoss: null,
      evalAccuracy: null,
    },
    createdAt: new Date().toISOString(),
  };
}