/**
 * CRM service — customers, NPS surveys, health scores.
 *
 * Mirrors `@hojai/department.customerSuccess` surface.
 */

import { randomUUID } from 'node:crypto';
import store from './store.js';

export function listCustomers(filter = {}) {
  return [...store.customers.values()].filter(c => {
    if (filter.healthStatus && c.healthStatus !== filter.healthStatus) return false;
    return true;
  });
}

export function getCustomer(id) {
  return store.customers.get(id) || null;
}

export function createCustomer({ name, email, company, ltv, currency }) {
  if (!name) throw new Error('name required');
  const id = randomUUID();
  const customer = {
    id, name, email: email || null, company: company || null,
    tenureDays: 0,
    healthScore: 80, // start optimistic
    healthStatus: 'healthy',
    churnRisk: 10,
    lifetimeValue: { amount: ltv || 0, currency: currency || 'USD' },
    npsScore: null,
    lastCheckInAt: null,
    createdAt: new Date().toISOString()
  };
  store.customers.set(id, customer);
  store.log('crm', 'customer.created', { id, name });
  return customer;
}

export function recordNpsSurvey({ customerId, score, feedback }) {
  if (!customerId || score == null) throw new Error('customerId and score required');
  if (score < 0 || score > 10) throw new Error('score must be 0-10');
  const id = randomUUID();
  const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
  const survey = {
    id, customerId, score, category,
    feedback: feedback || '',
    sentAt: new Date().toISOString(),
    respondedAt: new Date().toISOString()
  };
  store.npsSurveys.set(id, survey);
  // Update customer's NPS score
  const c = store.customers.get(customerId);
  if (c) {
    store.customers.set(customerId, { ...c, npsScore: score, lastCheckInAt: new Date().toISOString() });
  }
  store.log('crm', 'nps.recorded', { id, customerId, score, category });
  return survey;
}

export function listNpsSurveys(filter = {}) {
  return [...store.npsSurveys.values()].filter(s => {
    if (filter.customerId && s.customerId !== filter.customerId) return false;
    if (filter.category && s.category !== filter.category) return false;
    return true;
  });
}

/** Update a customer's health score (0-100). Adjusts churn risk inversely. */
export function updateHealthScore(customerId, score) {
  const c = store.customers.get(customerId);
  if (!c) return null;
  const clamped = Math.max(0, Math.min(100, score));
  const status = clamped >= 70 ? 'healthy' : clamped >= 40 ? 'at-risk' : 'critical';
  const churnRisk = Math.max(0, 100 - clamped);
  const updated = { ...c, healthScore: clamped, healthStatus: status, churnRisk, lastCheckInAt: new Date().toISOString() };
  store.customers.set(customerId, updated);
  store.log('crm', 'health.updated', { customerId, score: clamped, status });
  return updated;
}
