import { readJson, writeJson } from './store.js';

export function addMetrics(jobId, step, epoch, trainLoss, evalLoss, lr) {
  const metrics = readJson('training_metrics');
  metrics.push({
    jobId,
    step,
    epoch,
    trainLoss,
    evalLoss,
    learningRate: lr,
    timestamp: new Date().toISOString()
  });
  writeJson('training_metrics', metrics);
  return metrics[metrics.length - 1];
}

export function getJobMetrics(jobId, limit = 100) {
  return readJson('training_metrics')
    .filter(m => m.jobId === jobId)
    .sort((a, b) => a.step - b.step)
    .slice(-limit);
}

export function getLatestMetrics(jobId) {
  const all = readJson('training_metrics').filter(m => m.jobId === jobId);
  if (!all.length) return null;
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
}

export function getMetricsTrend(jobId, limit = 50) {
  return readJson('training_metrics')
    .filter(m => m.jobId === jobId)
    .sort((a, b) => a.step - b.step)
    .slice(-limit)
    .map(m => ({
      step: m.step,
      epoch: m.epoch,
      trainLoss: m.trainLoss,
      evalLoss: m.evalLoss,
      learningRate: m.learningRate,
      timestamp: m.timestamp
    }));
}

export function seedMockMetrics(jobId, steps = 100, epochs = 3) {
  const metrics = [];
  let step = 0;
  for (let e = 1; e <= epochs; e++) {
    for (let i = 0; i < Math.floor(steps / epochs); i++) {
      step++;
      metrics.push({
        jobId,
        step,
        epoch: e,
        trainLoss: parseFloat((3.5 - (step / steps) * 2.5 + (Math.random() - 0.5) * 0.1).toFixed(4)),
        evalLoss: parseFloat((3.0 - (step / steps) * 2.0 + (Math.random() - 0.5) * 0.1).toFixed(4)),
        learningRate: parseFloat((0.0002 * Math.pow(0.99, step)).toFixed(6)),
        timestamp: new Date(Date.now() + step * 1000).toISOString()
      });
    }
  }
  const all = readJson('training_metrics').filter(m => m.jobId !== jobId);
  all.push(...metrics);
  writeJson('training_metrics', all);
  return metrics;
}
