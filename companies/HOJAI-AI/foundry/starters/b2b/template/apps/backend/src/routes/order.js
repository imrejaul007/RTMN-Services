import { Router } from 'express';
import { createOrder, listOrders } from '../services/order.service.js';

const r = Router();

r.post('/', (req, res) => {
  try { res.status(201).json(createOrder(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.get('/', (req, res) => res.json({ items: listOrders({ buyerId: req.query.buyerId }) }));

export default r;
