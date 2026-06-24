/**
 * /api/marketing/* — Marketing routes
 *
 * Smaller surface in v0 — just enough to wire up campaigns + audiences.
 * Full Marketing OS surface lives in `@hojai/department.marketing`.
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import store from '../services/store.js';

const router = express.Router();

router.use(express.json());

router.get('/campaigns', (_req, res) => res.json({ campaigns: [...store.campaigns.values()] }));

router.post('/campaigns', (req, res) => {
  const { name, channel, budget } = req.body || {};
  if (!name || !channel) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name and channel required' } });
  const id = randomUUID();
  const c = { id, name, channel, budget: budget || 0, status: 'draft', createdAt: new Date().toISOString() };
  store.campaigns.set(id, c);
  store.log('marketing', 'campaign.created', { id, name, channel });
  res.status(201).json(c);
});

router.post('/campaigns/:id/launch', (req, res) => {
  const c = store.campaigns.get(req.params.id);
  if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'campaign not found' } });
  c.status = 'running';
  c.launchedAt = new Date().toISOString();
  store.campaigns.set(c.id, c);
  res.json(c);
});

router.get('/audiences', (_req, res) => res.json({ audiences: [...store.audiences.values()] }));

router.post('/audiences', (req, res) => {
  const { name, filters } = req.body || {};
  if (!name) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name required' } });
  const id = randomUUID();
  const a = { id, name, filters: filters || {}, size: 0, createdAt: new Date().toISOString() };
  store.audiences.set(id, a);
  res.status(201).json(a);
});

export default router;
