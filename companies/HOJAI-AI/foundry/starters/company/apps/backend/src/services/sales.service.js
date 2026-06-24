/**
 * Sales service — leads, deals, accounts.
 *
 * Mirrors the surface of `@hojai/department.sales` so swapping in the
 * real SDK is a one-import change.
 */

import { randomUUID } from 'node:crypto';
import store from './store.js';

export function listLeads(filter = {}) {
  return [...store.leads.values()].filter(l => {
    if (filter.status && l.status !== filter.status) return false;
    if (filter.source && l.source !== filter.source) return false;
    return true;
  });
}

export function getLead(id) {
  return store.leads.get(id) || null;
}

export function createLead({ name, email, phone, company, source, notes }) {
  if (!name || !source) throw new Error('name and source required');
  const id = randomUUID();
  const lead = {
    id, name, email: email || null, phone: phone || null, company: company || null,
    source, notes: notes || '', status: 'new', score: null,
    createdAt: new Date().toISOString()
  };
  store.leads.set(id, lead);
  store.log('sales', 'lead.created', { id, name, source });
  return lead;
}

export function qualifyLead(id, input = {}) {
  const l = store.leads.get(id);
  if (!l) return null;
  const updated = {
    ...l,
    status: input.status || 'qualified',
    score: typeof input.score === 'number' ? input.score : l.score,
    notes: input.notes || l.notes,
    qualifiedAt: new Date().toISOString()
  };
  store.leads.set(id, updated);
  store.log('sales', 'lead.qualified', { id, score: updated.score });
  return updated;
}

export function listDeals(filter = {}) {
  return [...store.deals.values()].filter(d => {
    if (filter.stage && d.stage !== filter.stage) return false;
    if (filter.leadId && d.leadId !== filter.leadId) return false;
    return true;
  });
}

export function createDeal({ name, leadId, value, currency, stage }) {
  if (!name || value == null) throw new Error('name and value required');
  const id = randomUUID();
  const deal = {
    id, name, leadId: leadId || null,
    value: typeof value === 'number' ? value : Number(value) || 0,
    currency: currency || 'USD',
    stage: stage || 'prospecting',
    probability: 25,
    createdAt: new Date().toISOString()
  };
  store.deals.set(id, deal);
  store.log('sales', 'deal.created', { id, name, value: deal.value });
  return deal;
}

export function advanceDealStage(id, stage) {
  const d = store.deals.get(id);
  if (!d) return null;
  const probability = { prospecting: 25, qualification: 50, proposal: 75, negotiation: 90, 'closed-won': 100, 'closed-lost': 0 }[stage] ?? d.probability;
  const updated = { ...d, stage, probability, updatedAt: new Date().toISOString() };
  store.deals.set(id, updated);
  store.log('sales', 'deal.stage', { id, stage });
  return updated;
}
