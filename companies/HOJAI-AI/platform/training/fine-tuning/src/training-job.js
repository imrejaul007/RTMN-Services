import { v4 as uuid } from 'uuid';
import { readJson, writeJson } from './store.js';

export function createJob(data) {
  const job = {
    id: uuid(),
    name: data.name || 'Untitled Job',
    datasetId: data.datasetId,
    baseModel: data.baseModel || 'llama-3-8b',
    config: {
      epochs: data.config?.epochs || 3,
      batchSize: data.config?.batchSize || 4,
      learningRate: data.config?.learningRate || 0.0002,
      maxSeqLength: data.config?.maxSeqLength || 2048,
      loraRank: data.config?.loraRank || 16,
      quantization: data.config?.quantization || '4bit',
    },
    status: 'draft',
    startedAt: null,
    completedAt: null,
    bestCheckpoint: null,
    finalMetrics: null,
    cost: 0,
    createdAt: new Date().toISOString()
  };
  const jobs = readJson('jobs');
  jobs.push(job);
  writeJson('jobs', jobs);
  return job;
}

export function getJob(id) {
  return readJson('jobs').find(j => j.id === id);
}

export function getJobs(filters = {}) {
  let jobs = readJson('jobs');
  if (filters.baseModel) jobs = jobs.filter(j => j.baseModel === filters.baseModel);
  if (filters.status) jobs = jobs.filter(j => j.status === filters.status);
  if (filters.datasetId) jobs = jobs.filter(j => j.datasetId === filters.datasetId);
  return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function updateJob(id, updates) {
  const jobs = readJson('jobs');
  const idx = jobs.findIndex(j => j.id === id);
  if (idx < 0) return null;
  jobs[idx] = { ...jobs[idx], ...updates };
  writeJson('jobs', jobs);
  return jobs[idx];
}

export function startJob(id) {
  const job = getJob(id);
  if (!job) return null;
  if (job.status !== 'draft' && job.status !== 'queued') return null;

  const started = updateJob(id, {
    status: 'training',
    startedAt: new Date().toISOString()
  });

  // Simulate training completion after a delay (mock)
  const duration = 500 + Math.random() * 500;
  setTimeout(() => {
    const metrics = {
      evalLoss: parseFloat((Math.random() * 2 + 0.5).toFixed(4)),
      evalAccuracy: parseFloat((0.7 + Math.random() * 0.25).toFixed(4)),
      perplexity: parseFloat((Math.random() * 10 + 1).toFixed(2))
    };
    updateJob(id, {
      status: 'done',
      completedAt: new Date().toISOString(),
      bestCheckpoint: `checkpoint-step-${Math.floor(Math.random() * 1000)}`,
      finalMetrics: metrics,
      cost: parseFloat((Math.random() * 100 + 10).toFixed(2))
    });
  }, duration);

  return started;
}

export function cancelJob(id) {
  const job = getJob(id);
  if (!job) return null;
  if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') return null;
  return updateJob(id, { status: 'cancelled', completedAt: new Date().toISOString() });
}

export function queueJob(id) {
  const job = getJob(id);
  if (!job) return null;
  if (job.status !== 'draft') return null;
  return updateJob(id, { status: 'queued' });
}
