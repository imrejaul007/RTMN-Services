import { Router } from 'express';

const r = Router();

r.get('/', (_req, res) => res.json({ items: global.store.items || [] }));
r.get('/:id', (req, res) => {
  const item = (global.store.items || []).find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'item not found' });
  res.json(item);
});
r.post('/', (req, res) => {
  const body = req.body || {};
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  if (!global.store.items) global.store.items = [];
  global.store.items.unshift(item);
  res.status(201).json(item);
});

export default r;
