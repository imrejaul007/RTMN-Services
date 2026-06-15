// Billing: Stripe + RABTUL wallet fallback.
// In dev mode (no real Stripe key), we simulate the checkout flow.
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import store from '../utils/store.js';
import logger from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { findService, priceFor } from '../utils/catalog.js';
import { checkoutSchema } from '../validators/schemas.js';

const router = express.Router();
const STRIPE_ENABLED = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('replace_me');

// Lazy import Stripe only if configured (avoids error in dev)
let stripe = null;
if (STRIPE_ENABLED) {
  try {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    logger.warn('Stripe import failed; running in mock mode', err.message);
  }
}

// POST /v1/billing/checkout
router.post('/checkout', authMiddleware, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

  const { serviceId, plan } = parsed.data;
  const svc = findService(serviceId);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  const pricing = priceFor(serviceId, plan);
  if (!pricing) return res.status(400).json({ error: 'Invalid plan' });

  if (pricing.custom) {
    // Custom pricing flow (e.g. Government) - record lead only
    return res.json({
      ok: true,
      mode: 'custom-quote',
      message: 'Contact sales for pricing on this service.',
      contactEmail: process.env.EMAIL_REPLY_TO || 'sales@rtmn.io'
    });
  }

  if (pricing.monthly === 0) {
    // Free plan - activate immediately
    return activateService({ req, res, serviceId, plan, paymentId: 'free', mode: 'free' });
  }

  const paymentId = uuidv4();

  if (STRIPE_ENABLED && stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: req.client.email,
        line_items: [{
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: { name: `${svc.name} - ${plan}` },
            unit_amount: pricing.monthly * 100
          },
          quantity: 1
        }],
        metadata: { clientId: req.client.id, serviceId, plan, paymentId },
        success_url: `${process.env.PUBLIC_URL}/dashboard?checkout=success&payment=${paymentId}`,
        cancel_url: `${process.env.PUBLIC_URL}/services/${serviceId}?checkout=cancel`
      });

      await store.recordPayment({
        id: paymentId,
        clientId: req.client.id,
        serviceId, plan,
        amount: pricing.monthly,
        currency: 'USD',
        status: 'pending',
        provider: 'stripe',
        providerSessionId: session.id,
        checkoutUrl: session.url,
        createdAt: new Date().toISOString()
      });

      return res.json({ ok: true, mode: 'stripe', paymentId, checkoutUrl: session.url });
    } catch (err) {
      logger.error('Stripe checkout failed', err);
      return res.status(502).json({ error: 'Payment provider error', message: err.message });
    }
  }

  // Mock mode (no Stripe key)
  await store.recordPayment({
    id: paymentId,
    clientId: req.client.id,
    serviceId, plan,
    amount: pricing.monthly,
    currency: 'USD',
    status: 'pending',
    provider: 'mock',
    createdAt: new Date().toISOString()
  });

  res.json({
    ok: true,
    mode: 'mock',
    paymentId,
    message: 'No Stripe key configured. Use POST /v1/billing/mock-confirm to simulate payment success.',
    mockConfirmUrl: `/v1/billing/mock-confirm/${paymentId}`
  });
});

// POST /v1/billing/mock-confirm/:paymentId  (DEV ONLY)
router.post('/mock-confirm/:paymentId', authMiddleware, async (req, res) => {
  if (STRIPE_ENABLED) return res.status(403).json({ error: 'Mock mode disabled when Stripe is configured' });

  const payment = await store.getPayment(req.params.paymentId);
  if (!payment || payment.clientId !== req.client.id) return res.status(404).json({ error: 'Payment not found' });

  payment.status = 'succeeded';
  payment.confirmedAt = new Date().toISOString();

  return activateService({ req, res, serviceId: payment.serviceId, plan: payment.plan, paymentId: payment.id, mode: 'mock' });
});

// POST /v1/billing/webhook  (Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!STRIPE_ENABLED || !stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature failed', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
    const obj = event.data.object;
    const paymentId = obj.metadata?.paymentId;
    if (paymentId) {
      const payment = await store.getPayment(paymentId);
      if (payment) {
        payment.status = 'succeeded';
        payment.confirmedAt = new Date().toISOString();
        // Activate
        const c = await store.getClientById(payment.clientId);
        const selection = c?.services.find(s => s.serviceId === payment.serviceId && s.status === 'pending_payment');
        if (selection) selection.status = 'active';
        logger.info(`Stripe webhook activated service: ${paymentId}`);
      }
    }
  }

  res.json({ received: true });
});

// GET /v1/billing/payments
router.get('/payments', authMiddleware, async (req, res) => {
  const payments = await store.listPaymentsForClient(req.client.id);
  res.json({ items: payments });
});

async function activateService({ req, res, serviceId, plan, paymentId, mode }) {
  const c = await store.getClientById(req.client.id);
  const selection = c?.services.find(s => s.serviceId === serviceId);
  if (selection) {
    selection.status = 'active';
    selection.activatedAt = new Date().toISOString();
    selection.paymentId = paymentId;
  }
  logger.info(`Service activated: client=${req.client.id} service=${serviceId} mode=${mode}`);
  res.json({
    ok: true,
    mode,
    paymentId,
    service: selection,
    message: 'Service activated. You can now call the industry OS.',
    proxyHint: `/v1/proxy/${serviceId}/health`
  });
}

export default router;
