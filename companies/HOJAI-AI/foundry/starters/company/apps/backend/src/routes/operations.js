/**
 * /api/operations/* — Operations routes
 *
 * v0 has projects + incidents. Full surface in @hojai/department.operations.
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import store from '../services/store.js';

const router = express.Router();

router.use(express.json());

router.get('/projects', (_req, res) => res.json({ projects: [...store.projects.values()] }));

router.post('/projects', (req, res) => {
  const { name, owner } = req.body || {};
  if (!name) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name required' } });
  const id = randomUUID();
  const p = { id, name, owner: owner || 'unassigned', status: 'planning', progress: 0, createdAt: new Date().toISOString() };
  store.projects.set(id, p);
  store.log('operations', 'project.created', { id, name });
  res.status(201).json(p);
});

router.patch('/projects/:id', (req, res) => {
  const p = store.projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'project not found' } });
  const updated = { ...p, ...req.body, updatedAt: new Date().toISOString() };
  store.projects.set(p.id, updated);
  res.json(updated);
});

router.get('/incidents', (_req, res) => res.json({ incidents: [...store.incidents.values()] }));

router.post('/incidents', (req, res) => {
  const { title, severity, description } = req.body || {};
  if (!title || !severity) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'title and severity required' } });
  const id = randomUUID();
  const inc = { id, title, severity, description: description || '', status: 'open', createdAt: new Date().toISOString() };
  store.incidents.set(id, inc);
  store.log('operations', 'incident.reported', { id, title, severity });
  res.status(201).json(inc);
});

router.post('/incidents/:id/resolve', (req, res) => {
  const inc = store.incidents.get(req.params.id);
  if (!inc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'incident not found' } });
  inc.status = 'resolved';
  inc.resolvedAt = new Date().toISOString();
  inc.resolution = req.body?.resolution || '';
  store.incidents.set(inc.id, inc);
  res.json(inc);
});

export default router;
