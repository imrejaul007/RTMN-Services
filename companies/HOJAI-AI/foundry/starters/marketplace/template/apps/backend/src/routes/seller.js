/**
 * Seller-facing routes.
 */

import { Router } from 'express';
import { listProducts, getProduct, createProduct } from '../services/catalog.service.js';
import { createQuote, listRfqs } from '../services/order.service.js';

const router = Router();

router.get('/catalog', (req, r) => r.json({ items: listProducts({ q: req.query.q, limit: req.query.limit }) }));
router.get('/catalog/:id', (req, r) => {
  const p = getProduct(req.params.id);
  if (!p) return r.status(404).json({ error: 'not found' });
  r.json(p);
});
router.post('/catalog', (req, r) => {
  try { r.status(201).json(createProduct(req.body || {})); }
  catch (e) { r.status(400).json({ error: e.message }); }
});
router.get('/rfqs', (_q, r) => r.json({ items: listRfqs({ status: 'open' }) }));
router.post('/quotes', (req, r) => {
  try { r.status(201).json(createQuote(req.body || {})); }
  catch (e) { r.status(400).json({ error: e.message }); }
});

export default router;
