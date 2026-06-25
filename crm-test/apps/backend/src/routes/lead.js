import { Router } from 'express';

const r = Router();

r.get('/', (_req, res) => res.json({ items: global.store.leads || [] }));
r.get('/:id', (req, res) => {
  const item = (global.store.leads || []).find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'lead not found' });
  res.json(item);
});
r.post('/', (req, res) => {
  const body = req.body || {};
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  if (!global.store.leads) global.store.leads = [];
  global.store.leads.unshift(item);
  res.status(201).json(item);
});

export default r;
