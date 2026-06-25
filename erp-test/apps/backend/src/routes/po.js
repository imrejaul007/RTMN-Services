import { Router } from 'express';
import { createPO, listPOs, createLedgerEntry } from '../services/procurement.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listPOs() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createPO(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/ledger', (req, res) => {
  try { res.status(201).json(createLedgerEntry(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
