/**
 * BillingOS - Revenue & Subscription Management
 *
 * Handles:
 * - Subscription billing (monthly/annual)
 * - Usage-based billing (AI tokens)
 * - Marketplace revenue split
 * - Partner payouts
 * - Invoicing and receipts
 * - Credits and coupons
 * - Trials and free tiers
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
app.use(cors(), express.json());
const PORT = process.env.BILLING_OS_PORT || 4595;

// In-memory stores
const subscriptions = new Map();     // subId -> subscription
const invoices = new Map();         // invoiceId -> invoice
const payments = new Map();          // paymentId -> payment
const credits = new Map();          // creditId -> credit
const coupons = new Map();         // couponCode -> coupon
const usageRecords = new Map();     // recordId -> usage record
const payouts = new Map();          // payoutId -> payout

// Pricing plans
const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 499,
    annualPrice: 4990,
    currency: 'USD',
    features: [
      '1 AI Worker',
      '1,000 AI requests/month',
      'Basic templates',
      'Email support',
      '1 user'
    ],
    limits: {
      aiRequests: 1000,
      users: 1,
      templates: 5,
      integrations: 3
    }
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 1499,
    annualPrice: 14990,
    currency: 'USD',
    features: [
      '5 AI Workers',
      '10,000 AI requests/month',
      'All templates',
      'Priority support',
      '10 users',
      'Basic integrations',
      'Analytics'
    ],
    limits: {
      aiRequests: 10000,
      users: 10,
      templates: -1, // unlimited
      integrations: 15
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 4999,
    annualPrice: 49990,
    currency: 'USD',
    features: [
      '20 AI Workers',
      '50,000 AI requests/month',
      'Custom templates',
      '24/7 support',
      '50 users',
      'All integrations',
      'Advanced analytics',
      'API access',
      'Custom domain'
    ],
    limits: {
      aiRequests: 50000,
      users: 50,
      templates: -1,
      integrations: -1
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 14999,
    annualPrice: 149990,
    currency: 'USD',
    features: [
      'Unlimited AI Workers',
      'Unlimited AI requests',
      'Custom templates',
      'Dedicated support',
      'Unlimited users',
      'All integrations',
      'Custom analytics',
      'Full API access',
      'Custom domain',
      'SLA guarantee',
      'SSO/SAML',
      'Custom contracts'
    ],
    limits: {
      aiRequests: -1,
      users: -1,
      templates: -1,
      integrations: -1
    }
  }
};

// Subscription statuses
const SUB_STATUS = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  TRIALING: 'trialing',
  PAUSED: 'paused'
};

// Payment statuses
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
};

/**
 * PLANS
 */

// GET /api/plans - List all plans
app.get('/api/plans', (req, res) => {
  const { period = 'monthly' } = req.query;

  const plansList = Object.values(PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    price: period === 'annual' ? plan.annualPrice : plan.monthlyPrice,
    period: period === 'annual' ? 'year' : 'month',
    currency: plan.currency,
    features: plan.features,
    limits: plan.limits,
    savings: period === 'annual' ? Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100) : 0
  }));

  res.json({
    success: true,
    period,
    plans: plansList
  });
});

// GET /api/plans/:id - Get plan details
app.get('/api/plans/:id', (req, res) => {
  const plan = PLANS[req.params.id];
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  res.json({
    success: true,
    plan: {
      ...plan,
      pricing: {
        monthly: plan.monthlyPrice,
        annual: plan.annualPrice,
        currency: plan.currency
      }
    }
  });
});

/**
 * SUBSCRIPTIONS
 */

// POST /api/subscriptions - Create subscription
app.post('/api/subscriptions', requireInternal, (req, res) => {
  const { customerId, planId, period, paymentMethod, trialDays, metadata } = req.body;

  if (!customerId || !planId) {
    return res.status(400).json({ error: 'customerId and planId required' });
  }

  const plan = PLANS[planId];
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const subId = uuidv4();
  const now = new Date();
  const periodMs = period === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  const subscription = {
    id: subId,
    customerId,
    planId,
    plan: plan,
    status: trialDays > 0 ? SUB_STATUS.TRIALING : SUB_STATUS.ACTIVE,
    period,
    price: period === 'annual' ? plan.annualPrice : plan.monthlyPrice,
    trialEnds: trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString() : null,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: new Date(now.getTime() + periodMs).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    paymentMethod,
    metadata: metadata || {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  subscriptions.set(subId, subscription);

  res.status(201).json({
    success: true,
    subscription: {
      id: subId,
      status: subscription.status,
      planId,
      period,
      price: subscription.price,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnds: subscription.trialEnds
    }
  });
});

// GET /api/subscriptions - List subscriptions
app.get('/api/subscriptions', (req, res) => {
  const { customerId, status } = req.query;

  let subs = Array.from(subscriptions.values());

  if (customerId) {
    subs = subs.filter(s => s.customerId === customerId);
  }
  if (status) {
    subs = subs.filter(s => s.status === status);
  }

  res.json({
    success: true,
    count: subs.length,
    subscriptions: subs.map(s => ({
      id: s.id,
      customerId: s.customerId,
      planId: s.planId,
      planName: s.plan.name,
      status: s.status,
      price: s.price,
      currentPeriodEnd: s.currentPeriodEnd
    }))
  });
});

// GET /api/subscriptions/:id - Get subscription
app.get('/api/subscriptions/:id', (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  res.json({ success: true, subscription: sub });
});

// POST /api/subscriptions/:id/cancel - Cancel subscription
app.post('/api/subscriptions/:id/cancel', requireInternal, (req, res) => {
  const { immediate = false } = req.body;
  const sub = subscriptions.get(req.params.id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (immediate) {
    sub.status = SUB_STATUS.CANCELED;
    sub.canceledAt = new Date().toISOString();
  } else {
    sub.cancelAtPeriodEnd = true;
  }

  sub.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    subscription: sub
  });
});

// POST /api/subscriptions/:id/pause - Pause subscription
app.post('/api/subscriptions/:id/pause', requireInternal, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  sub.status = SUB_STATUS.PAUSED;
  sub.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    subscription: sub
  });
});

// POST /api/subscriptions/:id/resume - Resume subscription
app.post('/api/subscriptions/:id/resume', requireInternal, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  sub.status = SUB_STATUS.ACTIVE;
  sub.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    subscription: sub
  });
});

// POST /api/subscriptions/:id/change - Change plan
app.post('/api/subscriptions/:id/change', requireInternal, (req, res) => {
  const { newPlanId, immediate = false } = req.body;
  const sub = subscriptions.get(req.params.id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const newPlan = PLANS[newPlanId];
  if (!newPlan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  // Calculate proration
  const daysRemaining = Math.ceil((new Date(sub.currentPeriodEnd) - new Date()) / (24 * 60 * 60 * 1000));
  const totalDays = sub.period === 'annual' ? 365 : 30;
  const proration = (daysRemaining / totalDays) * (newPlan.monthlyPrice - sub.plan.monthlyPrice);

  sub.planId = newPlanId;
  sub.plan = newPlan;
  sub.price = sub.period === 'annual' ? newPlan.annualPrice : newPlan.monthlyPrice;
  sub.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    subscription: sub,
    proration: {
      amount: Math.round(proration * 100) / 100,
      direction: proration > 0 ? 'charge' : 'credit',
      appliedTo: immediate ? 'next_invoice' : 'current_period'
    }
  });
});

/**
 * INVOICES
 */

// GET /api/invoices - List invoices
app.get('/api/invoices', (req, res) => {
  const { customerId, status, limit = 20 } = req.query;

  let invs = Array.from(invoices.values());

  if (customerId) {
    invs = invs.filter(i => i.customerId === customerId);
  }
  if (status) {
    invs = invs.filter(i => i.status === status);
  }

  invs = invs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, parseInt(limit));

  res.json({
    success: true,
    count: invs.length,
    invoices: invs
  });
});

// GET /api/invoices/:id - Get invoice
app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ success: true, invoice });
});

// POST /api/invoices - Create invoice
app.post('/api/invoices', requireInternal, (req, res) => {
  const { customerId, subscriptionId, items, dueDate, metadata } = req.body;

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'customerId and items required' });
  }

  const invoiceId = uuidv4();
  const now = new Date();

  const subtotal = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
  const total = subtotal + tax;

  const invoice = {
    id: invoiceId,
    customerId,
    subscriptionId,
    number: `INV-${now.getFullYear()}-${String(invoices.size + 1).padStart(6, '0')}`,
    status: 'draft',
    items: items.map((item, idx) => ({
      id: uuidv4(),
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.amount,
      amount: item.amount * (item.quantity || 1),
      taxes: [{ name: 'GST', rate: 18, amount: Math.round(item.amount * (item.quantity || 1) * 0.18 * 100) / 100 }]
    })),
    subtotal,
    tax,
    total,
    currency: 'USD',
    dueDate: dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: metadata || {},
    createdAt: now.toISOString()
  };

  invoices.set(invoiceId, invoice);

  res.status(201).json({
    success: true,
    invoice
  });
});

// POST /api/invoices/:id/send - Send invoice
app.post('/api/invoices/:id/send', requireInternal, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  invoice.status = 'sent';
  invoice.sentAt = new Date().toISOString();

  res.json({
    success: true,
    invoice
  });
});

// POST /api/invoices/:id/void - Void invoice
app.post('/api/invoices/:id/void', requireInternal, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  invoice.status = 'void';
  invoice.voidedAt = new Date().toISOString();

  res.json({
    success: true,
    invoice
  });
});

/**
 * PAYMENTS
 */

// POST /api/payments - Process payment
app.post('/api/payments', requireInternal, (req, res) => {
  const { customerId, invoiceId, amount, currency, paymentMethod, metadata } = req.body;

  if (!customerId || !amount) {
    return res.status(400).json({ error: 'customerId and amount required' });
  }

  const paymentId = uuidv4();
  const now = new Date();

  // Simulate payment processing
  const payment = {
    id: paymentId,
    customerId,
    invoiceId,
    amount,
    currency: currency || 'USD',
    status: PAYMENT_STATUS.PROCESSING,
    paymentMethod,
    metadata: metadata || {},
    createdAt: now.toISOString()
  };

  payments.set(paymentId, payment);

  // Simulate async payment success
  setTimeout(() => {
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.processedAt = new Date().toISOString();

    if (invoiceId) {
      const invoice = invoices.get(invoiceId);
      if (invoice) {
        invoice.status = 'paid';
        invoice.paidAt = new Date().toISOString();
        invoice.paymentId = paymentId;
      }
    }
  }, 100);

  res.status(201).json({
    success: true,
    payment: {
      id: paymentId,
      status: PAYMENT_STATUS.PROCESSING,
      amount,
      currency: payment.currency
    }
  });
});

// GET /api/payments - List payments
app.get('/api/payments', (req, res) => {
  const { customerId, status } = req.query;

  let payms = Array.from(payments.values());

  if (customerId) {
    payms = payms.filter(p => p.customerId === customerId);
  }
  if (status) {
    payms = payms.filter(p => p.status === status);
  }

  res.json({
    success: true,
    count: payms.length,
    payments: payms
  });
});

// GET /api/payments/:id - Get payment
app.get('/api/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json({ success: true, payment });
});

// POST /api/payments/:id/refund - Refund payment
app.post('/api/payments/:id/refund', requireInternal, (req, res) => {
  const { amount, reason } = req.body;
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
    return res.status(400).json({ error: 'Can only refund succeeded payments' });
  }

  const refundAmount = amount || payment.amount;

  payment.status = refundAmount < payment.amount ? PAYMENT_STATUS.PARTIALLY_REFUNDED : PAYMENT_STATUS.REFUNDED;
  payment.refundedAmount = refundAmount;
  payment.refundedAt = new Date().toISOString();
  payment.refundReason = reason;

  res.json({
    success: true,
    payment
  });
});

/**
 * USAGE BILLING
 */

// POST /api/usage/record - Record usage
app.post('/api/usage/record', requireInternal, (req, res) => {
  const { customerId, subscriptionId, metric, quantity, timestamp } = req.body;

  if (!customerId || !metric || quantity === undefined) {
    return res.status(400).json({ error: 'customerId, metric, and quantity required' });
  }

  const recordId = uuidv4();

  const record = {
    id: recordId,
    customerId,
    subscriptionId,
    metric,
    quantity,
    timestamp: timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  usageRecords.set(recordId, record);

  // Update subscription usage
  if (subscriptionId) {
    const sub = subscriptions.get(subscriptionId);
    if (sub) {
      sub.usage = sub.usage || {};
      sub.usage[metric] = (sub.usage[metric] || 0) + quantity;
    }
  }

  res.status(201).json({
    success: true,
    record: {
      id: recordId,
      metric,
      quantity
    }
  });
});

// GET /api/usage/:customerId - Get usage
app.get('/api/usage/:customerId', (req, res) => {
  const { customerId } = req.params;
  const { period = 'current', metric } = req.query;

  let records = Array.from(usageRecords.values())
    .filter(r => r.customerId === customerId);

  if (metric) {
    records = records.filter(r => r.metric === metric);
  }

  // Aggregate by metric
  const usage = {};
  for (const record of records) {
    usage[record.metric] = (usage[record.metric] || 0) + record.quantity;
  }

  res.json({
    success: true,
    customerId,
    period,
    usage,
    records: records.length
  });
});

/**
 * CREDITS
 */

// POST /api/credits - Add credits
app.post('/api/credits', requireInternal, (req, res) => {
  const { customerId, amount, reason, expiresAt } = req.body;

  if (!customerId || !amount) {
    return res.status(400).json({ error: 'customerId and amount required' });
  }

  const creditId = uuidv4();

  const credit = {
    id: creditId,
    customerId,
    amount,
    balance: amount,
    reason: reason || 'Manual credit',
    status: 'active',
    expiresAt,
    createdAt: new Date().toISOString()
  };

  credits.set(creditId, credit);

  res.status(201).json({
    success: true,
    credit
  });
});

// GET /api/credits/:customerId - Get customer credits
app.get('/api/credits/:customerId', (req, res) => {
  const { customerId } = req.params;

  const customerCredits = Array.from(credits.values())
    .filter(c => c.customerId === customerId && c.status === 'active');

  const totalBalance = customerCredits.reduce((sum, c) => sum + c.balance, 0);

  res.json({
    success: true,
    customerId,
    totalBalance,
    credits: customerCredits
  });
});

/**
 * COUPONS
 */

// POST /api/coupons - Create coupon
app.post('/api/coupons', requireInternal, (req, res) => {
  const { code, type, value, currency, maxRedemptions, expiresAt, appliesTo, metadata } = req.body;

  if (!code || !type || !value) {
    return res.status(400).json({ error: 'code, type, and value required' });
  }

  const coupon = {
    id: uuidv4(),
    code: code.toUpperCase(),
    type, // 'percentage' | 'fixed'
    value,
    currency: currency || 'USD',
    maxRedemptions: maxRedemptions || -1,
    redeemedCount: 0,
    expiresAt,
    appliesTo: appliesTo || 'all', // 'all' | 'plan' | 'product'
    applicablePlans: appliesTo === 'plan' ? metadata?.plans : null,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  coupons.set(coupon.code, coupon);

  res.status(201).json({
    success: true,
    coupon
  });
});

// GET /api/coupons/:code - Validate coupon
app.get('/api/coupons/:code', (req, res) => {
  const coupon = coupons.get(req.params.code.toUpperCase());

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  if (coupon.status !== 'active') {
    return res.status(400).json({ error: 'Coupon is no longer valid' });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Coupon has expired' });
  }

  if (coupon.maxRedemptions > 0 && coupon.redeemedCount >= coupon.maxRedemptions) {
    return res.status(400).json({ error: 'Coupon has been fully redeemed' });
  }

  res.json({
    success: true,
    valid: true,
    coupon
  });
});

// POST /api/coupons/:code/redeem - Redeem coupon
app.post('/api/coupons/:code/redeem', requireInternal, (req, res) => {
  const { customerId, subscriptionId } = req.body;
  const coupon = coupons.get(req.params.code.toUpperCase());

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  coupon.redeemedCount++;

  // Apply discount
  const discount = {
    id: uuidv4(),
    customerId,
    subscriptionId,
    couponCode: coupon.code,
    type: coupon.type,
    value: coupon.value,
    appliedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    discount,
    message: coupon.type === 'percentage'
      ? `${coupon.value}% discount applied`
      : `$${coupon.value} discount applied`
  });
});

/**
 * MARKETPLACE & PARTNER PAYOUTS
 */

// POST /api/payouts - Create payout
app.post('/api/payouts', requireInternal, (req, res) => {
  const { partnerId, amount, currency, method, metadata } = req.body;

  if (!partnerId || !amount) {
    return res.status(400).json({ error: 'partnerId and amount required' });
  }

  const payoutId = uuidv4();

  const payout = {
    id: payoutId,
    partnerId,
    amount,
    currency: currency || 'USD',
    method: method || 'bank_transfer',
    status: 'pending',
    metadata: metadata || {},
    createdAt: new Date().toISOString()
  };

  payouts.set(payoutId, payout);

  // Simulate payout processing
  setTimeout(() => {
    payout.status = 'processing';
  }, 100);

  setTimeout(() => {
    payout.status = 'completed';
    payout.completedAt = new Date().toISOString();
  }, 200);

  res.status(201).json({
    success: true,
    payout: {
      id: payoutId,
      status: 'pending',
      amount,
      currency: payout.currency
    }
  });
});

// GET /api/payouts - List payouts
app.get('/api/payouts', (req, res) => {
  const { partnerId, status } = req.query;

  let pyo = Array.from(payouts.values());

  if (partnerId) {
    pyo = pyo.filter(p => p.partnerId === partnerId);
  }
  if (status) {
    pyo = pyo.filter(p => p.status === status);
  }

  res.json({
    success: true,
    count: pyo.length,
    payouts: pyo
  });
});

/**
 * ANALYTICS
 */

// GET /api/analytics - Revenue analytics
app.get('/api/analytics', (req, res) => {
  const { period = '30d' } = req.query;

  const now = new Date();
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Calculate MRR
  const activeSubs = Array.from(subscriptions.values())
    .filter(s => s.status === SUB_STATUS.ACTIVE || s.status === SUB_STATUS.TRIALING);

  const mrr = activeSubs.reduce((sum, s) => {
    const monthly = s.period === 'annual' ? s.price / 12 : s.price;
    return sum + monthly;
  }, 0);

  // Calculate ARR
  const arr = mrr * 12;

  // Revenue by plan
  const revenueByPlan = {};
  for (const sub of activeSubs) {
    revenueByPlan[sub.planId] = (revenueByPlan[sub.planId] || 0) + (sub.period === 'annual' ? sub.price / 12 : sub.price);
  }

  // Payment metrics
  const recentPayments = Array.from(payments.values())
    .filter(p => new Date(p.createdAt) >= startDate);

  const successfulPayments = recentPayments.filter(p => p.status === PAYMENT_STATUS.SUCCEEDED);
  const failedPayments = recentPayments.filter(p => p.status === PAYMENT_STATUS.FAILED);

  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const paymentSuccessRate = recentPayments.length > 0
    ? Math.round((successfulPayments.length / recentPayments.length) * 100)
    : 100;

  res.json({
    success: true,
    period,
    metrics: {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      activeSubscriptions: activeSubs.length,
      totalCustomers: new Set(activeSubs.map(s => s.customerId)).size,
      revenueByPlan,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paymentSuccessRate,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length
    }
  });
});

/**
 * WEBHOOKS
 */

// POST /api/webhooks - Register webhook
// POST /api/webhooks/:id/retry - Retry webhook

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'billing-os',
    status: 'healthy',
    stats: {
      subscriptions: subscriptions.size,
      invoices: invoices.size,
      payments: payments.size,
      coupons: coupons.size,
      usageRecords: usageRecords.size,
      payouts: payouts.size
    },
    plans: Object.keys(PLANS).length
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  BillingOS — PORT ${PORT}                            ║
║  Revenue & Subscription Management                 ║
╠══════════════════════════════════════════════════════╣
║  Plans: ${Object.keys(PLANS).length.toString().padEnd(42)}║
║  Subscriptions: ${subscriptions.size.toString().padEnd(36)}║
║  Invoices: ${invoices.size.toString().padEnd(42)}║
║  Payments: ${payments.size.toString().padEnd(40)}║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
