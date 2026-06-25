/**
 * Admin routes — overview metrics for the dashboard.
 */

import { Router } from 'express';
import store from '../services/store.js';

const router = Router();

router.get('/overview', (_q, r) => {
  r.json({
    counts: {
      products:  store.products.size,
      rfqs:      store.rfqs.size,
      quotes:    store.quotes.size,
      orders:    store.orders.size,
      shipments: store.shipments.size,
      invoices:  store.invoices.size
    },
    generatedAt: new Date().toISOString()
  });
});

router.post('/reset', (_q, r) => { store.reset(); r.json({ ok: true }); });

export default router;
