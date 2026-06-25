import { Router } from 'express';
import { createDeal, listDeals, advanceStage } from '../services/deals.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listDeals() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createDeal(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/advance', (req, res) => {
  try { res.json(advanceStage(req.params.id, req.body.stage)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
