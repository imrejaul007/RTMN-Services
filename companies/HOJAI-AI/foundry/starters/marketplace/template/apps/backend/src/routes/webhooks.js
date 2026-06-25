/**
 * Webhook routes — for payment + carrier callbacks.
 * v0 accepts the events and logs them. Wire to your payment/logistics
 * providers in production.
 */

import { Router } from 'express';
import store from '../services/store.js';

const router = Router();
const events = [];

router.post('/payments', (req, r) => {
  const e = { id: `evt_${Date.now()}`, kind: 'payment', receivedAt: new Date().toISOString(), payload: req.body };
  events.push(e);
  r.status(202).json({ received: true, id: e.id });
});

router.post('/shipments', (req, r) => {
  const e = { id: `evt_${Date.now()}`, kind: 'shipment', receivedAt: new Date().toISOString(), payload: req.body };
  events.push(e);
  r.status(202).json({ received: true, id: e.id });
});

router.get('/events', (req, r) => {
  const kind = req.query.kind;
  const filtered = kind ? events.filter(e => e.kind === kind) : events;
  r.json({ items: filtered.slice(-100), total: filtered.length });
});

export default router;
