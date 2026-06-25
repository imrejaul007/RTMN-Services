import { Router } from 'express';
import { createQuote, listQuotes } from '../services/order.service.js';

const r = Router();

r.post('/', (req, res) => {
  try { res.status(201).json(createQuote(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.get('/:rfqId', (req, res) => res.json({ items: listQuotes(req.params.rfqId) }));

export default r;
