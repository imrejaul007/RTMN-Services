import { Router } from 'express';
import { getModel, getModels, updateModel, archiveModel, deployModel } from '../model-registry.js';

const router = Router();

router.get('/models', (req, res) => {
  const { baseModel, status, jobId } = req.query;
  const models = getModels({ baseModel, status, jobId });
  res.json({ models, total: models.length });
});

router.get('/models/:id', (req, res) => {
  const model = getModel(req.params.id);
  if (!model) return res.status(404).json({ error: 'model not found' });
  res.json(model);
});

router.post('/models/:id/archive', (req, res) => {
  const model = archiveModel(req.params.id);
  if (!model) return res.status(404).json({ error: 'model not found' });
  res.json({ message: 'model archived', model });
});

router.post('/models/:id/deploy', (req, res) => {
  const model = deployModel(req.params.id);
  if (!model) return res.status(400).json({ error: 'cannot deploy (not ready)' });
  res.json({ message: 'model deployed', model });
});

export default router;
