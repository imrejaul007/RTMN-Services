/**
 * HOJAI SiteOS Subscription Billing
 * Port: 5494
 * Plans, subscriptions, usage tracking, invoices
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5494;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/billing-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Default plans
const DEFAULT_PLANS = [
  { id: 'free', name: 'Free', price: 0, interval: 'month', features: ['5 products', '100 orders/mo', 'Basic analytics'] },
  { id: 'basic', name: 'Basic', price: 999, interval: 'month', features: ['50 products', '1000 orders/mo', 'Email support', 'Basic analytics'] },
  { id: 'pro', name: 'Professional', price: 2999, interval: 'month', features: ['500 products', '10000 orders/mo', 'Priority support', 'Advanced analytics', 'API access'] },
  { id: 'enterprise', name: 'Enterprise', price: 9999, interval: 'month', features: ['Unlimited', 'Unlimited orders', '24/7 support', 'Custom analytics', 'Dedicated account manager', 'SLA'] }
];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'subscription-billing', port: PORT });
});

// =====================
// PLANS
// =====================

app.get('/api/plans', (req, res) => {
  res.json({ plans: DEFAULT_PLANS });
});

app.get('/api/plans/:id', (req, res) => {
  const plan = DEFAULT_PLANS.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ plan });
});

app.post('/api/plans', requireAuth, (req, res) => {
  const { id, name, price, interval, features, limits } = req.body;
  if (!id || !name || price === undefined) {
    return res.status(400).json({ error: 'id, name, price required' });
  }

  const plan = { id, name, price, interval: interval || 'month', features: features || [], limits: limits || {} };
  const plans = loadData(req.companyId, 'plans');
  plans.push(plan);
  saveData(req.companyId, 'plans', plans);

  res.json({ success: true, plan });
});

// =====================
// SUBSCRIPTIONS
// =====================

app.post('/api/subscriptions', requireAuth, (req, res) => {
  const { customerId, planId, billingCycle, paymentMethod } = req.body;
  if (!customerId || !planId) {
    return res.status(400).json({ error: 'customerId and planId required' });
  }

  const plan = DEFAULT_PLANS.find(p => p.id === planId) ||
    loadData(req.companyId, 'plans').find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const subscription = {
    id: uuidv4(),
    companyId: req.companyId,
    customerId,
    planId,
    plan: plan.name,
    price: plan.price,
    billingCycle: billingCycle || plan.interval,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
    cancelAtPeriodEnd: false,
    usage: {},
    createdAt: new Date().toISOString()
  };

  const subs = loadData(req.companyId, 'subscriptions');
  subs.push(subscription);
  saveData(req.companyId, 'subscriptions', subs);

  res.json({ success: true, subscription });
});

app.get('/api/subscriptions', requireAuth, (req, res) => {
  const { customerId, status } = req.query;
  let subs = loadData(req.companyId, 'subscriptions');

  if (customerId) subs = subs.filter(s => s.customerId === customerId);
  if (status) subs = subs.filter(s => s.status === status);

  res.json({ subscriptions: subs });
});

app.get('/api/subscriptions/:id', requireAuth, (req, res) => {
  const subs = loadData(req.companyId, 'subscriptions');
  const sub = subs.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ subscription: sub });
});

// Upgrade/downgrade
app.post('/api/subscriptions/:id/change', requireAuth, (req, res) => {
  const { planId, prorate } = req.body;
  const subs = loadData(req.companyId, 'subscriptions');
  const index = subs.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Subscription not found' });

  const plan = DEFAULT_PLANS.find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  // Calculate prorated amount
  const proratedAmount = prorate ? Math.abs(plan.price - subs[index].price) / 2 : 0;

  subs[index].planId = planId;
  subs[index].plan = plan.name;
  subs[index].price = plan.price;
  subs[index].changedAt = new Date().toISOString();

  saveData(req.companyId, 'subscriptions', subs);
  res.json({ success: true, subscription: subs[index], proratedAmount });
});

// Cancel subscription
app.post('/api/subscriptions/:id/cancel', requireAuth, (req, res) => {
  const { immediate = false } = req.body;
  const subs = loadData(req.companyId, 'subscriptions');
  const index = subs.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Subscription not found' });

  if (immediate) {
    subs[index].status = 'cancelled';
    subs[index].cancelledAt = new Date().toISOString();
  } else {
    subs[index].cancelAtPeriodEnd = true;
  }

  saveData(req.companyId, 'subscriptions', subs);
  res.json({ success: true, subscription: subs[index] });
});

// =====================
// USAGE TRACKING (Metered Billing)
// =====================

app.post('/api/subscriptions/:id/usage', requireAuth, (req, res) => {
  const { metric, value } = req.body;
  if (!metric || value === undefined) {
    return res.status(400).json({ error: 'metric and value required' });
  }

  const subs = loadData(req.companyId, 'subscriptions');
  const index = subs.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Subscription not found' });

  subs[index].usage = subs[index].usage || {};
  subs[index].usage[metric] = (subs[index].usage[metric] || 0) + value;
  subs[index].usageUpdatedAt = new Date().toISOString();

  saveData(req.companyId, 'subscriptions', subs);
  res.json({ success: true, usage: subs[index].usage });
});

app.get('/api/subscriptions/:id/usage', requireAuth, (req, res) => {
  const subs = loadData(req.companyId, 'subscriptions');
  const sub = subs.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json({ usage: sub.usage || {} });
});

// =====================
// INVOICES
// =====================

app.post('/api/invoices', requireAuth, (req, res) => {
  const { subscriptionId, items, dueDate } = req.body;

  const invoice = {
    id: uuidv4(),
    companyId: req.companyId,
    number: `INV-${Date.now().toString(36).toUpperCase()}`,
    subscriptionId,
    items: items || [],
    subtotal: (items || []).reduce((sum, i) => sum + i.amount, 0),
    tax: 0,
    total: (items || []).reduce((sum, i) => sum + i.amount, 0),
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: null,
    createdAt: new Date().toISOString()
  };

  const invoices = loadData(req.companyId, 'invoices');
  invoices.push(invoice);
  saveData(req.companyId, 'invoices', invoices);

  res.json({ success: true, invoice });
});

app.get('/api/invoices', requireAuth, (req, res) => {
  const { subscriptionId, status } = req.query;
  let invoices = loadData(req.companyId, 'invoices');

  if (subscriptionId) invoices = invoices.filter(i => i.subscriptionId === subscriptionId);
  if (status) invoices = invoices.filter(i => i.status === status);

  res.json({ invoices });
});

app.get('/api/invoices/:id', requireAuth, (req, res) => {
  const invoices = loadData(req.companyId, 'invoices');
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice });
});

// Mark invoice paid
app.post('/api/invoices/:id/pay', requireAuth, (req, res) => {
  const invoices = loadData(req.companyId, 'invoices');
  const index = invoices.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Invoice not found' });

  invoices[index].status = 'paid';
  invoices[index].paidAt = new Date().toISOString();
  saveData(req.companyId, 'invoices', invoices);

  res.json({ success: true, invoice: invoices[index] });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Subscription Billing running on port ${PORT}`);
});

export default app;
