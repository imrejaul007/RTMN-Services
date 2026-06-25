import { Router } from 'express';

const r = Router();

r.get('/', (_req, res) => res.json({ items: global.store.departments || [] }));
r.get('/:id', (req, res) => {
  const item = (global.store.departments || []).find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'department not found' });
  res.json(item);
});
r.post('/', (req, res) => {
  const body = req.body || {};
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  if (!global.store.departments) global.store.departments = [];
  global.store.departments.unshift(item);
  res.status(201).json(item);
});

export default r;
