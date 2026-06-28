import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readJson, writeJson } from '../store.js';

const router = Router();

router.post('/datasets', (req, res) => {
  const { name, description, source, format = 'jsonl', rows = [], split = { train: 80, eval: 20 } } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!source) return res.status(400).json({ error: 'source is required' });
  const dataset = {
    id: uuid(),
    name, description: description || '', source, format,
    size: JSON.stringify(rows).length,
    rowCount: rows.length,
    prepared: false, preparedAt: null,
    split, createdAt: new Date().toISOString()
  };
  const all = readJson('datasets');
  all.push(dataset);
  writeJson('datasets', all);
  res.status(201).json(dataset);
});

router.get('/datasets', (req, res) => {
  const { name, format } = req.query;
  let datasets = readJson('datasets');
  if (name) datasets = datasets.filter(d => d.name.includes(name));
  if (format) datasets = datasets.filter(d => d.format === format);
  res.json({ datasets, total: datasets.length });
});

router.get('/datasets/:id', (req, res) => {
  const ds = readJson('datasets').find(d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: 'dataset not found' });
  res.json(ds);
});

router.delete('/datasets/:id', (req, res) => {
  const all = readJson('datasets').filter(d => d.id !== req.params.id);
  writeJson('datasets', all);
  res.json({ deleted: req.params.id });
});

router.post('/datasets/:id/prepare', (req, res) => {
  const datasets = readJson('datasets');
  const idx = datasets.findIndex(d => d.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'dataset not found' });
  datasets[idx].prepared = true;
  datasets[idx].preparedAt = new Date().toISOString();
  writeJson('datasets', datasets);
  res.json({ message: 'dataset prepared', dataset: datasets[idx] });
});

export default router;
