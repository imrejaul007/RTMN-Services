/**
 * Buyer-facing routes.
 */

import { Router } from 'express';
import { listProducts, getProduct } from '../services/catalog.service.js';
import { createRfq, listRfqs, listQuotes, createOrder, listOrders } from '../services/order.service.js';

const router = Router();

router.get('/products', (req, r) => r.json({ items: listProducts({ category: req.query.category, q: req.query.q, limit: req.query.limit }) }));
router.get('/products/:id', (req, r) => {
  const p = getProduct(req.params.id);
  if (!p) return r.status(404).json({ error: 'not found' });
  r.json(p);
});
router.post('/rfqs', (req, r) => {
  try { r.status(201).json(createRfq(req.body || {})); }
  catch (e) { r.status(400).json({ error: e.message }); }
});
router.get('/rfqs', (req, r) => r.json({ items: listRfqs({ buyerId: req.query.buyerId, status: req.query.status }) }));
router.get('/rfqs/:id/quotes', (req, r) => r.json({ items: listQuotes(req.params.id) }));
router.post('/orders', (req, r) => r.status(201).json(createOrder(req.body || {})));
router.get('/orders', (req, r) => r.json({ items: listOrders({ buyerId: req.query.buyerId }) }));

export default router;
