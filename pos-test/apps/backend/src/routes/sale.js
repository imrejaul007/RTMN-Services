import { Router } from 'express';
import { createSale, listSales } from '../services/sales.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listSales() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createSale(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
