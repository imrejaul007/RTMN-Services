import { Router } from 'express';
import { createOrder, listOrders, closeOrder } from '../services/kitchen.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listOrders() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createOrder(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/close', (req, res) => {
  try { res.json(closeOrder(req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
