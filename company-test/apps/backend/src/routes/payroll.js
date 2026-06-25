import { Router } from 'express';
import { runPayroll, listPayrolls } from '../services/workforce.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listPayrolls() }));
r.post('/', (req, res) => {
  try { res.status(201).json(runPayroll(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
