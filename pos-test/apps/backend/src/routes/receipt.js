import { Router } from 'express';

const r = Router();

r.get('/', (_req, res) => res.json({ items: global.store.receipts || [] }));
r.get('/:id', (req, res) => {
  const item = (global.store.receipts || []).find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'receipt not found' });
  res.json(item);
});
r.post('/', (req, res) => {
  const body = req.body || {};
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  if (!global.store.receipts) global.store.receipts = [];
  global.store.receipts.unshift(item);
  res.status(201).json(item);
});

export default r;
