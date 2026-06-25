import { store } from './store.js';

export function listLeads() { return store.leads; }
export function getLead(id) { return store.leads.find(l => l.id === id) || null; }

export function createLead({ name, company, email, stage, value }) {
  if (!name || !email) throw new Error('name and email required');
  const lead = { id: crypto.randomUUID(), name, company: company || '', email, stage: stage || 'new', value: Number(value) || 0, createdAt: new Date().toISOString() };
  store.leads.unshift(lead);
  return lead;
}

export function advanceStage(leadId, newStage) {
  const lead = store.leads.find(l => l.id === leadId);
  if (!lead) throw new Error('lead not found');
  lead.stage = newStage;
  return lead;
}

export function createDeal({ leadId, amountInr, closeDate }) {
  const lead = store.leads.find(l => l.id === leadId);
  if (!lead) throw new Error('lead not found');
  const deal = { id: crypto.randomUUID(), leadId, customerId: lead.id, amountInr: Number(amountInr) || lead.value, closeDate: closeDate || null, status: 'open', createdAt: new Date().toISOString() };
  store.deals.unshift(deal);
  lead.stage = 'won';
  return deal;
}

export function listDeals() { return store.deals; }
