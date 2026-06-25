import { Router } from 'express';
import { createRfq, listRfqs, createQuote, createOrder, listQuotes, listOrders } from '../services/order.service.js';

const r = Router();

r.get('/', (req, res) => res.json({ items: listRfqs({ buyerId: req.query.buyerId, status: req.query.status }) }));
r.post('/', (req, res) => {
  try { res.status(201).json(createRfq(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
