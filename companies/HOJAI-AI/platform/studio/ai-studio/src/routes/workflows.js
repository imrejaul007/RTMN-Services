import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readJson, writeJson, upsert } from '../store.js';
const writeFile = (name, data) => writeJson(name, data);

const router = Router();

// POST /api/workflows
router.post('/workflows', (req, res) => {
  const { name, description, nodes = [], edges = [], variables = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const workflow = {
    id: uuid(),
    name,
    description: description || '',
    version: '1.0.0',
    nodes,
    edges,
    variables,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  upsert('workflows', workflow);
  res.status(201).json(workflow);
});

// GET /api/workflows
router.get('/workflows', (req, res) => {
  const { name } = req.query;
  let workflows = readJson('workflows');
  if (name) workflows = workflows.filter(w => w.name.includes(name));
  res.json({ workflows, total: workflows.length });
});

// GET /api/workflows/:id
router.get('/workflows/:id', (req, res) => {
  const wf = readJson('workflows').find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'workflow not found' });
  res.json(wf);
});

// PUT /api/workflows/:id
router.put('/workflows/:id', (req, res) => {
  const workflows = readJson('workflows');
  const idx = workflows.findIndex(w => w.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'workflow not found' });
  const updated = { ...workflows[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  workflows[idx] = updated;
  writeFile('workflows', workflows);
  res.json(updated);
});

// DELETE /api/workflows/:id
router.delete('/workflows/:id', (req, res) => {
  const workflows = readJson('workflows').filter(w => w.id !== req.params.id);
  writeFile('workflows', workflows);
  res.json({ deleted: req.params.id });
});

// POST /api/workflows/:id/versions
router.post('/workflows/:id/versions', (req, res) => {
  const workflows = readJson('workflows');
  const wf = workflows.find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'workflow not found' });
  const newVersion = req.body.version || incrementVersion(wf.version);
  const versionSnap = { ...wf, version: newVersion, savedAt: new Date().toISOString() };
  const versions = readJson('workflow_versions');
  versions.push(versionSnap);
  writeFile('workflow_versions', versions);
  res.status(201).json({ workflow: wf, version: newVersion, savedAt: versionSnap.savedAt });
});

function incrementVersion(v) {
  const [major, minor, patch] = v.split('.').map(Number);
  return `${major}.${minor}.${(patch || 0) + 1}`;
}

export default router;
