/**
 * SkillOS — Training jobs service
 *
 * Submits training jobs to a backend (default: ai-intelligence on port 4881,
 * or whatever TRAINING_BACKEND_URL points to). The backend is expected to
 * expose:
 *
 *   POST /api/training/jobs
 *     body: { datasetId, baseModel, method, hyperparameters, ... }
 *     → { id, status: 'queued' }
 *
 *   GET /api/training/jobs/:id
 *     → { id, status, progress, resultAdapterId, error, ... }
 *
 *   POST /api/training/jobs/:id/cancel
 *     → { id, status: 'cancelled' }
 *
 * If the backend is unreachable, the job stays in 'queued' and can be
 * polled manually via POST /api/training/jobs/:id/sync.
 *
 * The cost numbers in this file are estimates only. Phase 4 will replace
 * them with real billing data.
 */

import { v4 as uuidv4 } from 'uuid';
import { httpPost, httpGet } from './http-client.js';

const TRAINING_BACKEND_URL = process.env.TRAINING_BACKEND_URL || process.env.AI_INTEL_URL || 'http://localhost:4881';

export const JOB_STATUSES = ['queued', 'running', 'completed', 'failed', 'cancelled'];
export const METHODS = ['lora', 'qlora', 'prefix', 'ia3', 'full'];

export const BASE_MODEL_COSTS = {
  // Per 1k examples, 3 epochs (estimates only)
  'gpt-4o': 50,
  'gpt-4o-mini': 10,
  'claude-opus-4-8': 80,
  'claude-sonnet-4-6': 30,
  'llama-3.3-70b': 5,
  'mistral-large': 4,
};

/**
 * Build a new training job record (in 'queued' state).
 */
export function buildJob(input) {
  const { datasetId, skillId, baseModel, method = 'lora', hyperparameters = {}, createdBy } = input;
  if (!datasetId) throw new Error('datasetId required');
  if (!skillId) throw new Error('skillId required');
  if (!baseModel) throw new Error('baseModel required');
  if (!METHODS.includes(method)) {
    throw new Error(`invalid method: ${method}. Must be one of: ${METHODS.join(', ')}`);
  }
  if (!createdBy) throw new Error('createdBy required');
  return {
    id: `job-${uuidv4().slice(0, 8)}`,
    datasetId,
    skillId,
    baseModel,
    method,
    hyperparameters: {
      epochs: hyperparameters.epochs || 3,
      learningRate: hyperparameters.learningRate || 0.0001,
      batchSize: hyperparameters.batchSize || 8,
      ...hyperparameters,
    },
    status: 'queued',
    progress: 0,
    resultModelAdapterId: null,
    error: null,
    createdBy,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    estimatedCost: estimateCost(baseModel, method),
    actualCost: null,
  };
}

/**
 * Rough cost estimate (USD). Real cost is set when the job completes.
 */
export function estimateCost(baseModel, method = 'lora') {
  const base = BASE_MODEL_COSTS[baseModel] || 20;
  const multipliers = { lora: 1, qlora: 0.8, prefix: 0.5, ia3: 0.5, full: 5 };
  return +(base * (multipliers[method] || 1)).toFixed(2);
}

/**
 * Submit a job to the training backend. Returns { ok, backendId, error }.
 * If the backend is unreachable, ok=false and the caller can leave the job
 * in 'queued' for a future sync.
 */
export async function submitToBackend(job) {
  try {
    const r = await httpPost(`${TRAINING_BACKEND_URL}/api/training/jobs`, {
      datasetId: job.datasetId,
      baseModel: job.baseModel,
      method: job.method,
      hyperparameters: job.hyperparameters,
      metadata: { skillId: job.skillId, createdBy: job.createdBy },
    }, { timeoutMs: 5000 });
    if (!r.ok) {
      return { ok: false, error: r.error || `HTTP ${r.status}` };
    }
    return { ok: true, backendId: r.data?.id || r.data?.jobId };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Poll the backend for job status.
 */
export async function pollBackend(backendId) {
  try {
    const r = await httpGet(`${TRAINING_BACKEND_URL}/api/training/jobs/${encodeURIComponent(backendId)}`, { timeoutMs: 3000 });
    if (!r.ok) return { ok: false, error: r.error || `HTTP ${r.status}` };
    return { ok: true, status: r.data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Update a local job record from a backend status response.
 */
export function updateFromBackend(job, backend) {
  const updated = { ...job };
  if (typeof backend.status === 'string' && JOB_STATUSES.includes(backend.status)) {
    updated.status = backend.status;
  }
  if (typeof backend.progress === 'number') {
    updated.progress = Math.max(0, Math.min(1, backend.progress));
  }
  if (backend.resultAdapterId || backend.modelAdapterId) {
    updated.resultModelAdapterId = backend.resultAdapterId || backend.modelAdapterId;
  }
  if (typeof backend.error === 'string') {
    updated.error = backend.error;
  }
  if (backend.status === 'running' && !updated.startedAt) {
    updated.startedAt = new Date().toISOString();
  }
  if ((backend.status === 'completed' || backend.status === 'failed' || backend.status === 'cancelled') && !updated.completedAt) {
    updated.completedAt = new Date().toISOString();
    if (backend.actualCost !== undefined) updated.actualCost = backend.actualCost;
  }
  return updated;
}

export const config = { TRAINING_BACKEND_URL };