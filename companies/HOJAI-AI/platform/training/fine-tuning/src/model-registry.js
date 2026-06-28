import { v4 as uuid } from 'uuid';
import { readJson, writeJson } from './store.js';

export function registerModel(data) {
  const model = {
    id: uuid(),
    jobId: data.jobId,
    name: data.name || 'Fine-tuned Model',
    baseModel: data.baseModel,
    checkpointPath: data.checkpointPath || '',
    status: data.status || 'building',
    inferenceEndpoint: data.inferenceEndpoint || '',
    createdAt: new Date().toISOString()
  };
  const models = readJson('models');
  models.push(model);
  writeJson('models', models);
  return model;
}

export function getModel(id) {
  return readJson('models').find(m => m.id === id);
}

export function getModels(filters = {}) {
  let models = readJson('models');
  if (filters.baseModel) models = models.filter(m => m.baseModel === filters.baseModel);
  if (filters.status) models = models.filter(m => m.status === filters.status);
  if (filters.jobId) models = models.filter(m => m.jobId === filters.jobId);
  return models.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function updateModel(id, updates) {
  const models = readJson('models');
  const idx = models.findIndex(m => m.id === id);
  if (idx < 0) return null;
  models[idx] = { ...models[idx], ...updates };
  writeJson('models', models);
  return models[idx];
}

export function archiveModel(id) {
  return updateModel(id, { status: 'archived' });
}

export function deployModel(id) {
  const model = getModel(id);
  if (!model || model.status !== 'ready') return null;
  return updateModel(id, { status: 'deployed', inferenceEndpoint: `/inference/${id}` });
}
