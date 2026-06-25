/**
 * Billing Service - In-memory store for billing
 */

import { v4 as uuidv4 } from 'uuid';

// Plan types
export const PlanType = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// Plan pricing
export const PLANS = {
  [PlanType.FREE]: {
    name: 'Free',
    price: 0,
    features: ['3 deployments', '100K AI calls/month', '1GB storage', 'Community support']
  },
  [PlanType.STARTER]: {
    name: 'Starter',
    price: 49,
    interval: 'month',
    features: ['10 deployments', '1M AI calls/month', '10GB storage', 'Email support']
  },
  [PlanType.PROFESSIONAL]: {
    name: 'Professional',
    price: 199,
    interval: 'month',
    features: ['50 deployments', '10M AI calls/month', '100GB storage', 'Priority support']
  },
  [PlanType.ENTERPRISE]: {
    name: 'Enterprise',
    price: 999,
    interval: 'month',
    features: ['Unlimited deployments', '100M AI calls/month', '1TB storage', 'Dedicated support', 'Custom SLA']
  }
};

// In-memory stores
const subscriptions = new Map();
const invoices = new Map();
const payments = new Map();
const paymentMethods = new Map();

// ── Subscriptions ──────────────────────────────────────────────────────────

export function createSubscription({ userId, plan, billingCycle = 'monthly', stripeCustomerId }) {
  const id = uuidv4();
  const subscription = {
    id,
    userId,
    plan,
    status: 'active', // active, canceled, past_due, trialing
    billingCycle,
    stripeCustomerId,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: getNextBillingDate(billingCycle).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  subscriptions.set(id, subscription);
  return subscription;
}

export function getSubscription(id) {
  return subscriptions.get(id) || null;
}

export function getSubscriptionByUser(userId) {
  for (const sub of subscriptions.values()) {
    if (sub.userId === userId) return sub;
  }
  return null;
}

export function updateSubscription(id, updates) {
  const sub = subscriptions.get(id);
  if (!sub) return null;

  const updated = { ...sub, ...updates, updatedAt: new Date().toISOString() };
  subscriptions.set(id, updated);
  return updated;
}

export function cancelSubscription(id, cancelAtPeriodEnd = true) {
  const sub = subscriptions.get(id);
  if (!sub) return null;

  sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
  if (!cancelAtPeriodEnd) {
    sub.status = 'canceled';
  }
  sub.updatedAt = new Date().toISOString();
  subscriptions.set(id, sub);
  return sub;
}

export function listSubscriptions({ status, userId } = {}) {
  let results = Array.from(subscriptions.values());
  if (status) results = results.filter(s => s.status === status);
  if (userId) results = results.filter(s => s.userId === userId);
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getNextBillingDate(cycle) {
  const date = new Date();
  if (cycle === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (cycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return date;
}

// ── Invoices ───────────────────────────────────────────────────────────

export function createInvoice({ subscriptionId, userId, amount, currency = 'USD', items }) {
  const id = uuidv4();
  const invoice = {
    id,
    subscriptionId,
    userId,
    amount,
    currency,
    status: 'draft', // draft, pending, paid, failed, void
    items: items || [{ description: 'Subscription', amount }],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: null,
    createdAt: new Date().toISOString()
  };

  invoices.set(id, invoice);
  return invoice;
}

export function getInvoice(id) {
  return invoices.get(id) || null;
}

export function updateInvoice(id, updates) {
  const invoice = invoices.get(id);
  if (!invoice) return null;

  const updated = { ...invoice, ...updates };
  invoices.set(id, updated);
  return updated;
}

export function markInvoicePaid(id) {
  const invoice = invoices.get(id);
  if (!invoice) return null;

  invoice.status = 'paid';
  invoice.paidAt = new Date().toISOString();
  invoices.set(id, invoice);
  return invoice;
}

export function listInvoices({ userId, status } = {}) {
  let results = Array.from(invoices.values());
  if (userId) results = results.filter(i => i.userId === userId);
  if (status) results = results.filter(i => i.status === status);
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Payments ────────────────────────────────────────────────────────────

export function createPayment({ invoiceId, userId, amount, method, provider, providerTransactionId, status = 'pending' }) {
  const id = uuidv4();
  const payment = {
    id,
    invoiceId,
    userId,
    amount,
    currency: 'USD',
    method, // card, bank_transfer, wallet
    provider, // stripe, razorpay
    providerTransactionId,
    status, // pending, completed, failed, refunded
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  payments.set(id, payment);
  return payment;
}

export function getPayment(id) {
  return payments.get(id) || null;
}

export function updatePayment(id, updates) {
  const payment = payments.get(id);
  if (!payment) return null;

  const updated = { ...payment, ...updates };
  if (updates.status === 'completed') {
    updated.completedAt = new Date().toISOString();
  }
  payments.set(id, updated);
  return updated;
}

export function listPayments({ userId, invoiceId, status } = {}) {
  let results = Array.from(payments.values());
  if (userId) results = results.filter(p => p.userId === userId);
  if (invoiceId) results = results.filter(p => p.invoiceId === invoiceId);
  if (status) results = results.filter(p => p.status === status);
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Payment Methods ─────────────────────────────────────────────────────

export function addPaymentMethod({ userId, type, provider, last4, brand, token }) {
  const id = uuidv4();
  const method = {
    id,
    userId,
    type, // card, bank_account, wallet
    provider, // stripe, razorpay
    last4,
    brand,
    token,
    isDefault: paymentMethods.size === 0,
    createdAt: new Date().toISOString()
  };

  paymentMethods.set(id, method);
  return method;
}

export function getPaymentMethod(id) {
  return paymentMethods.get(id) || null;
}

export function listPaymentMethods(userId) {
  return Array.from(paymentMethods.values()).filter(m => m.userId === userId);
}

export function deletePaymentMethod(id) {
  return paymentMethods.delete(id);
}

export function setDefaultPaymentMethod(id) {
  const method = paymentMethods.get(id);
  if (!method) return null;

  // Unset all others as default
  for (const m of paymentMethods.values()) {
    if (m.userId === method.userId) {
      m.isDefault = false;
    }
  }

  method.isDefault = true;
  paymentMethods.set(id, method);
  return method;
}

// ── Stripe Integration (Simulated) ──────────────────────────────────────

export function createStripeCustomer({ email, name, metadata }) {
  // In production, this calls Stripe API
  return {
    id: `cus_${uuidv4().slice(0, 14)}`,
    email,
    name,
    metadata,
    created: Date.now()
  };
}

export function createStripePaymentIntent({ amount, currency = 'usd', customerId, metadata }) {
  // In production, this calls Stripe API
  return {
    id: `pi_${uuidv4().slice(0, 24)}`,
    amount,
    currency,
    customer: customerId,
    status: 'requires_payment_method',
    client_secret: `pi_${uuidv4().slice(0, 24)}_secret_${uuidv4().slice(0, 24)}`,
    metadata
  };
}

export function createRazorpayOrder({ amount, currency = 'INR', receipt }) {
  // In production, this calls Razorpay API
  return {
    id: `order_${uuidv4().slice(0, 14)}`,
    amount,
    currency,
    receipt,
    status: 'created'
  };
}

// ── Stats ──────────────────────────────────────────────────────────────

export function getStats() {
  const subs = Array.from(subscriptions.values());
  const invs = Array.from(invoices.values());
  const pymts = Array.from(payments.values());

  const mrr = subs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (PLANS[s.plan]?.price || 0), 0);

  return {
    totalSubscriptions: subs.length,
    activeSubscriptions: subs.filter(s => s.status === 'active').length,
    totalRevenue: pymts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    mrr,
    pendingInvoices: invs.filter(i => i.status === 'pending').length,
    failedPayments: pymts.filter(p => p.status === 'failed').length
  };
}

export function getPlans() {
  return PLANS;
}
