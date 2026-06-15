import express from 'express';
import { SERVICES, PLANS, findService, priceFor } from '../utils/catalog.js';
import store from '../utils/store.js';
import { selectServiceSchema } from '../validators/schemas.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /v1/services
router.get('/', (req, res) => {
  const items = SERVICES.map(s => ({
    ...s,
    plans: PLANS.map(p => ({ id: p.id, name: p.name, monthly: s.price[p.id] }))
  }));
  res.json({ count: items.length, items });
});

// GET /v1/services/:id
router.get('/:id', (req, res) => {
  const svc = findService(req.params.id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });
  res.json({
    ...svc,
    plans: PLANS.map(p => ({ id: p.id, name: p.name, monthly: svc.price[p.id] }))
  });
});

// POST /v1/services/select
router.post('/select', authMiddleware, async (req, res) => {
  const parsed = selectServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { serviceId, plan } = parsed.data;
  const svc = findService(serviceId);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  const pricing = priceFor(serviceId, plan);
  if (!pricing) return res.status(400).json({ error: 'Invalid plan' });

  // Already provisioned?
  if (req.client.services.some(s => s.serviceId === serviceId)) {
    return res.status(409).json({ error: 'Service already provisioned' });
  }

  const selection = {
    serviceId,
    plan,
    port: svc.port,
    status: 'pending_payment',  // becomes 'active' after webhook
    provisionedAt: new Date().toISOString(),
    pricing
  };

  await store.addServiceToClient(req.client.id, selection);
  logger.info(`Service selected: client=${req.client.id} service=${serviceId} plan=${plan}`);

  res.status(201).json({
    ok: true,
    selection,
    next: 'POST /v1/billing/checkout to activate'
  });
});

export default router;
