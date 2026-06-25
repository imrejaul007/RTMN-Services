/**
 * HOJAI Billing Service API
 * Port: 4460
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  createSubscription, getSubscription, getSubscriptionByUser, updateSubscription, cancelSubscription, listSubscriptions,
  createInvoice, getInvoice, updateInvoice, markInvoicePaid, listInvoices,
  createPayment, getPayment, updatePayment, listPayments,
  addPaymentMethod, listPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod,
  createStripeCustomer, createStripePaymentIntent, createRazorpayOrder,
  getStats, getPlans, PlanType
} from './store.js';

const PORT = process.env.PORT || 4460;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'billing-service', version: '1.0.0', timestamp: new Date().toISOString() });
});

// API Info
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Billing Service API',
    version: '1.0.0',
    description: 'Payments, subscriptions, and invoicing',
    endpoints: {
      plans: { 'GET /api/v1/plans': 'Get available plans' },
      subscriptions: {
        'POST /api/v1/subscriptions': 'Create subscription',
        'GET /api/v1/subscriptions': 'List subscriptions',
        'GET /api/v1/subscriptions/:id': 'Get subscription',
        'PATCH /api/v1/subscriptions/:id': 'Update subscription',
        'POST /api/v1/subscriptions/:id/cancel': 'Cancel subscription'
      },
      invoices: {
        'GET /api/v1/invoices': 'List invoices',
        'GET /api/v1/invoices/:id': 'Get invoice',
        'POST /api/v1/invoices/:id/pay': 'Mark paid'
      },
      payments: {
        'POST /api/v1/payments': 'Create payment',
        'GET /api/v1/payments': 'List payments'
      },
      paymentMethods: {
        'POST /api/v1/payment-methods': 'Add payment method',
        'GET /api/v1/payment-methods': 'List payment methods',
        'DELETE /api/v1/payment-methods/:id': 'Delete payment method',
        'POST /api/v1/payment-methods/:id/default': 'Set as default'
      },
      providers: {
        'POST /api/v1/providers/stripe/customer': 'Create Stripe customer',
        'POST /api/v1/providers/stripe/payment-intent': 'Create payment intent',
        'POST /api/v1/providers/razorpay/order': 'Create Razorpay order'
      },
      stats: { 'GET /api/v1/stats': 'Get billing stats' }
    }
  });
});

// Plans
app.get('/api/v1/plans', (req, res) => {
  res.json({ success: true, plans: getPlans() });
});

// Subscriptions
app.post('/api/v1/subscriptions', (req, res) => {
  try {
    const { userId, plan, billingCycle, stripeCustomerId } = req.body;
    if (!userId || !plan) {
      return res.status(400).json({ error: 'userId and plan are required' });
    }
    const sub = createSubscription({ userId, plan, billingCycle, stripeCustomerId });
    res.status(201).json({ success: true, subscription: sub });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/subscriptions', (req, res) => {
  const { status, userId } = req.query;
  const subs = listSubscriptions({ status, userId });
  res.json({ success: true, count: subs.length, subscriptions: subs });
});

app.get('/api/v1/subscriptions/:id', (req, res) => {
  const sub = getSubscription(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ success: true, subscription: sub });
});

app.get('/api/v1/subscriptions/user/:userId', (req, res) => {
  const sub = getSubscriptionByUser(req.params.userId);
  if (!sub) return res.status(404).json({ error: 'No subscription found' });
  res.json({ success: true, subscription: sub });
});

app.patch('/api/v1/subscriptions/:id', (req, res) => {
  const sub = updateSubscription(req.params.id, req.body);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ success: true, subscription: sub });
});

app.post('/api/v1/subscriptions/:id/cancel', (req, res) => {
  const { cancelAtPeriodEnd } = req.body;
  const sub = cancelSubscription(req.params.id, cancelAtPeriodEnd !== false);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ success: true, subscription: sub });
});

// Invoices
app.get('/api/v1/invoices', (req, res) => {
  const { userId, status } = req.query;
  const invoices = listInvoices({ userId, status });
  res.json({ success: true, count: invoices.length, invoices });
});

app.get('/api/v1/invoices/:id', (req, res) => {
  const invoice = getInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ success: true, invoice });
});

app.post('/api/v1/invoices', (req, res) => {
  try {
    const invoice = createInvoice(req.body);
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/invoices/:id/pay', (req, res) => {
  const invoice = markInvoicePaid(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ success: true, invoice });
});

// Payments
app.post('/api/v1/payments', (req, res) => {
  try {
    const payment = createPayment(req.body);
    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/payments', (req, res) => {
  const { userId, invoiceId, status } = req.query;
  const payments = listPayments({ userId, invoiceId, status });
  res.json({ success: true, count: payments.length, payments });
});

app.get('/api/v1/payments/:id', (req, res) => {
  const payment = getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ success: true, payment });
});

app.patch('/api/v1/payments/:id', (req, res) => {
  const payment = updatePayment(req.params.id, req.body);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ success: true, payment });
});

// Payment Methods
app.post('/api/v1/payment-methods', (req, res) => {
  try {
    const method = addPaymentMethod(req.body);
    res.status(201).json({ success: true, paymentMethod: method });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/payment-methods', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const methods = listPaymentMethods(userId);
  res.json({ success: true, count: methods.length, paymentMethods: methods });
});

app.delete('/api/v1/payment-methods/:id', (req, res) => {
  const deleted = deletePaymentMethod(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Payment method not found' });
  res.json({ success: true, message: 'Payment method deleted' });
});

app.post('/api/v1/payment-methods/:id/default', (req, res) => {
  const method = setDefaultPaymentMethod(req.params.id);
  if (!method) return res.status(404).json({ error: 'Payment method not found' });
  res.json({ success: true, paymentMethod: method });
});

// Provider Integration
app.post('/api/v1/providers/stripe/customer', (req, res) => {
  const customer = createStripeCustomer(req.body);
  res.status(201).json({ success: true, customer });
});

app.post('/api/v1/providers/stripe/payment-intent', (req, res) => {
  const intent = createStripePaymentIntent(req.body);
  res.status(201).json({ success: true, paymentIntent: intent });
});

app.post('/api/v1/providers/razorpay/order', (req, res) => {
  const order = createRazorpayOrder(req.body);
  res.status(201).json({ success: true, order });
});

// Stats
app.get('/api/v1/stats', (req, res) => {
  res.json({ success: true, stats: getStats() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Billing Service',
    tagline: 'Payments, subscriptions, and invoicing',
    version: '1.0.0',
    port: PORT,
    plans: Object.keys(PlanType)
  });
});

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     💳 HOJAI BILLING SERVICE — PORT ${PORT}                        ║
║                                                                  ║
║     Payments, subscriptions, and invoicing                      ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║     GET  /api/v1/plans          — Available plans             ║
║     POST /api/v1/subscriptions   — Create subscription        ║
║     GET  /api/v1/invoices       — List invoices              ║
║     POST /api/v1/payments       — Create payment             ║
║     POST /api/v1/providers/stripe/* — Stripe integration     ║
║     POST /api/v1/providers/razorpay/* — Razorpay integration ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
