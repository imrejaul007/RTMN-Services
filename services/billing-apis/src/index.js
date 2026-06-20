// Billing APIs (4111)
// Customer-facing billing: usage, invoices, subscriptions with mock Stripe.
// Foundation for monetization, self-service billing, and revenue analytics.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4111;
const SERVICE = 'billing-apis';

// ---------- In-memory stores ----------
const customers = new Map();   // customerId -> { id, name, email, stripe_id, plan, balance, created }
const plans = new Map();      // planId -> { id, name, price_monthly, included_units, overage_rate }
const usage = new Map();      // usageId -> { id, customer_id, metric, quantity, ts }
const invoices = new Map();   // invoiceId -> { id, customer_id, amount, status, line_items, due_date }
const subscriptions = new Map(); // subId -> { id, customer_id, plan_id, status, current_period_start/end }
const payments = new Map();   // paymentId -> { id, customer_id, invoice_id, amount, status, stripe_charge_id }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// ---------- Seed ----------
function seed() {
  // Plans
  const planSeeds = [
    { name: 'Free', price_monthly: 0, included_units: 1000, overage_rate: 0 },
    { name: 'Starter', price_monthly: 49, included_units: 50000, overage_rate: 0.001 },
    { name: 'Pro', price_monthly: 499, included_units: 1000000, overage_rate: 0.0005 },
    { name: 'Enterprise', price_monthly: 4999, included_units: 50000000, overage_rate: 0.0001 }
  ];
  planSeeds.forEach(p => {
    const id = uuid();
    plans.set(id, { id, ...p, metric: 'api_calls' });
  });

  // Customers
  const customerSeeds = [
    { name: 'Acme Corp', email: 'billing@acme.test', plan: 'Pro' },
    { name: 'Globex Inc', email: 'ap@globex.test', plan: 'Starter' },
    { name: 'Initech', email: 'finance@initech.test', plan: 'Enterprise' }
  ];
  customerSeeds.forEach(c => {
    const id = uuid();
    const planEntry = [...plans.values()].find(p => p.name === c.plan);
    customers.set(id, {
      id, ...c,
      stripe_id: 'cus_mock_' + uuid().slice(0, 8),
      plan_id: planEntry?.id,
      balance: 0,
      created: new Date().toISOString()
    });
  });

  // Usage samples
  [...customers.values()].forEach(c => {
    ['api_calls', 'ai_tokens', 'storage_gb'].forEach(metric => {
      const qty = metric === 'api_calls' ? Math.floor(Math.random() * 50000)
                : metric === 'ai_tokens' ? Math.floor(Math.random() * 1000000)
                : Math.floor(Math.random() * 100);
      const id = uuid();
      usage.set(id, { id, customer_id: c.id, metric, quantity: qty, ts: new Date().toISOString() });
    });
  });

  // Subscriptions (active for all seeded customers)
  customers.forEach(c => {
    const id = uuid();
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    subscriptions.set(id, {
      id, customer_id: c.id, plan_id: c.plan_id, status: 'active',
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString()
    });
  });

  // Invoices (one paid, one open per customer)
  customers.forEach(c => {
    const plan = plans.get(c.plan_id);
    const id1 = uuid();
    const id2 = uuid();
    const past = new Date();
    past.setMonth(past.getMonth() - 1);
    invoices.set(id1, {
      id: id1, customer_id: c.id, amount: plan.price_monthly, status: 'paid',
      line_items: [{ description: `${plan.name} plan - monthly`, amount: plan.price_monthly }],
      issued: past.toISOString(), due_date: past.toISOString()
    });
    invoices.set(id2, {
      id: id2, customer_id: c.id, amount: plan.price_monthly, status: 'open',
      line_items: [{ description: `${plan.name} plan - monthly`, amount: plan.price_monthly }],
      issued: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString()
    });
  });
}

// ---------- Routes ----------

// Health & metadata
app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({ service: SERVICE, endpoints: [
  '/api/plans', '/api/customers', '/api/customers/:id/usage', '/api/customers/:id/invoices',
  '/api/customers/:id/subscriptions', '/api/customers/:id/billing-portal',
  '/api/invoices', '/api/invoices/:id/pay', '/api/usage/record',
  '/api/payments', '/api/webhooks/stripe'
] })));

// Plans
app.get('/api/plans', (_req, res) => res.json(ok({ plans: [...plans.values()] })));
app.get('/api/plans/:id', (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json(fail('plan not found'));
  res.json(ok({ plan }));
});
app.post('/api/plans', (req, res) => {
  const { name, price_monthly, included_units, overage_rate = 0, metric = 'api_calls' } = req.body || {};
  if (!name || price_monthly === undefined) return res.status(400).json(fail('name + price_monthly required'));
  const id = uuid();
  const plan = { id, name, price_monthly, included_units, overage_rate, metric };
  plans.set(id, plan);
  res.status(201).json(ok({ plan }));
});

// Customers
app.get('/api/customers', (_req, res) => res.json(ok({ customers: [...customers.values()] })));
app.get('/api/customers/:id', (req, res) => {
  const c = customers.get(req.params.id);
  if (!c) return res.status(404).json(fail('customer not found'));
  res.json(ok({ customer: c }));
});
app.post('/api/customers', (req, res) => {
  const { name, email, plan } = req.body || {};
  if (!name || !email) return res.status(400).json(fail('name + email required'));
  const planEntry = [...plans.values()].find(p => p.name === plan);
  const id = uuid();
  const customer = {
    id, name, email,
    stripe_id: 'cus_mock_' + uuid().slice(0, 8),
    plan_id: planEntry?.id,
    plan: plan || 'Free',
    balance: 0,
    created: new Date().toISOString()
  };
  customers.set(id, customer);
  res.status(201).json(ok({ customer }));
});

// Usage
app.post('/api/usage/record', (req, res) => {
  const { customer_id, metric, quantity } = req.body || {};
  if (!customer_id || !metric || quantity === undefined) {
    return res.status(400).json(fail('customer_id + metric + quantity required'));
  }
  if (!customers.has(customer_id)) return res.status(404).json(fail('customer not found'));
  const id = uuid();
  const entry = { id, customer_id, metric, quantity, ts: new Date().toISOString() };
  usage.set(id, entry);
  res.status(201).json(ok({ usage: entry }));
});

app.get('/api/customers/:id/usage', (req, res) => {
  if (!customers.has(req.params.id)) return res.status(404).json(fail('customer not found'));
  const entries = [...usage.values()].filter(u => u.customer_id === req.params.id);
  // Aggregate by metric
  const byMetric = {};
  entries.forEach(e => {
    if (!byMetric[e.metric]) byMetric[e.metric] = 0;
    byMetric[e.metric] += e.quantity;
  });
  res.json(ok({ customer_id: req.params.id, total_entries: entries.length, by_metric: byMetric, entries }));
});

// Invoices
app.get('/api/invoices', (_req, res) => res.json(ok({ invoices: [...invoices.values()] })));
app.get('/api/customers/:id/invoices', (req, res) => {
  if (!customers.has(req.params.id)) return res.status(404).json(fail('customer not found'));
  const list = [...invoices.values()].filter(i => i.customer_id === req.params.id);
  res.json(ok({ customer_id: req.params.id, invoices: list }));
});
app.post('/api/customers/:id/invoices/generate', (req, res) => {
  const c = customers.get(req.params.id);
  if (!c) return res.status(404).json(fail('customer not found'));
  const plan = plans.get(c.plan_id);
  const id = uuid();
  const inv = {
    id, customer_id: c.id, amount: plan.price_monthly, status: 'open',
    line_items: [{ description: `${plan.name} plan - monthly`, amount: plan.price_monthly }],
    issued: new Date().toISOString(),
    due_date: new Date(Date.now() + 14 * 86400000).toISOString()
  };
  invoices.set(id, inv);
  res.status(201).json(ok({ invoice: inv }));
});

app.post('/api/invoices/:id/pay', (req, res) => {
  const inv = invoices.get(req.params.id);
  if (!inv) return res.status(404).json(fail('invoice not found'));
  if (inv.status === 'paid') return res.status(400).json(fail('already paid'));
  inv.status = 'paid';
  invoices.set(inv.id, inv);
  const paymentId = uuid();
  payments.set(paymentId, {
    id: paymentId, customer_id: inv.customer_id, invoice_id: inv.id,
    amount: inv.amount, status: 'succeeded',
    stripe_charge_id: 'ch_mock_' + uuid().slice(0, 8),
    created: new Date().toISOString()
  });
  res.json(ok({ invoice: inv, payment_id: paymentId }));
});

// Subscriptions
app.get('/api/customers/:id/subscriptions', (req, res) => {
  if (!customers.has(req.params.id)) return res.status(404).json(fail('customer not found'));
  const subs = [...subscriptions.values()].filter(s => s.customer_id === req.params.id);
  res.json(ok({ subscriptions: subs }));
});
app.post('/api/customers/:id/subscriptions', (req, res) => {
  const { plan_id } = req.body || {};
  if (!customers.has(req.params.id)) return res.status(404).json(fail('customer not found'));
  if (!plans.has(plan_id)) return res.status(404).json(fail('plan not found'));
  const id = uuid();
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const sub = {
    id, customer_id: req.params.id, plan_id, status: 'active',
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString()
  };
  subscriptions.set(id, sub);
  res.status(201).json(ok({ subscription: sub }));
});

// Billing portal (returns a stub URL)
app.get('/api/customers/:id/billing-portal', (req, res) => {
  if (!customers.has(req.params.id)) return res.status(404).json(fail('customer not found'));
  res.json(ok({
    customer_id: req.params.id,
    portal_url: `https://billing.hojai.ai/mock-portal/${req.params.id}`,
    return_url: 'https://app.hojai.ai/billing',
    expires_at: new Date(Date.now() + 3600000).toISOString()
  }));
});

// Payments
app.get('/api/payments', (_req, res) => res.json(ok({ payments: [...payments.values()] })));

// Stripe webhook (mock - accepts any payload)
app.post('/api/webhooks/stripe', (req, res) => {
  const event = req.body;
  // Log the event - in real impl this would trigger invoice.paid, customer.updated, etc.
  res.json(ok({ received: true, event_type: event?.type || 'unknown', processed: true }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));