import { Router } from 'express';
import { createBooking, listBookings, checkout } from '../services/bookings.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listBookings() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createBooking(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/checkout', (req, res) => {
  try { res.json(checkout(req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
