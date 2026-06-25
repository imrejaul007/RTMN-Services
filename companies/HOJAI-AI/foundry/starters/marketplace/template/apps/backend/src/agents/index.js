/**
 * SUTAR agent registry for {{PROJECT_TITLE}}.
 *
 * Each agent is a `BaseAgent` instance from our local runtime
 * (`../runtime/BaseAgent.js`). The runtime runs in two modes:
 *
 *   • **local mode** — runs the deterministic `strategy` function.
 *     This is the default and lets the marketplace boot end-to-end
 *     without any external service. It is what you see right now.
 *
 *   • **remote mode** — when `HOJAI_SUTAR_URL` and `HOJAI_API_KEY`
 *     are set in the environment, every `run()` call is forwarded
 *     to the SUTAR `merchant-agents` service. No code change needed.
 *
 * The shape returned is normalized:
 *
 *   { agent: 'Sales', output: {...}, success: true, latencyMs: 4, source: 'local' }
 *
 * To upgrade an agent to use the real `@hojai/sutar` SDK or an LLM,
 * replace its `strategy` function. The registry and HTTP routes stay
 * the same.
 */

import { BaseAgent, createAgentRegistry } from '../runtime/BaseAgent.js';

function ceoStrategy({ goal }) {
  return { agent: 'CEO', decision: goal ? `route:${goal}` : 'route:sales', confidence: 0.8, reasoning: 'No LLM in v0 — picked first matching agent.' };
}

function salesStrategy({ rfqId, productId, quantity }) {
  return { agent: 'Sales', rfqId, productId, quantity, quote: { priceInr: 1000, validFor: '7d' }, message: 'Quote generated (stub).' };
}

function procurementStrategy({ productId, quantity }) {
  return { agent: 'Procurement', productId, quantity, suppliersFound: 3, message: 'Top 3 suppliers ranked (stub).' };
}

function financeStrategy({ orderId, amountInr }) {
  return { agent: 'Finance', orderId, amountInr, invoiceStatus: 'draft', escrowRecommended: Number(amountInr || 0) > 5000 };
}

function supportStrategy({ ticket }) {
  return { agent: 'Support', ticket, status: 'received', sla: '24h', message: 'Ticket received and queued (stub).' };
}

const registry = createAgentRegistry();

registry.register(new BaseAgent({
  name: 'CEO',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Orchestrator. Routes work to other agents and tracks KPIs.',
  capabilities: ['orchestrate', 'route', 'kpi'],
  strategy: ceoStrategy
}));

registry.register(new BaseAgent({
  name: 'Sales',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Quotation. RFQ processing, quote generation, follow-up.',
  capabilities: ['rfq', 'quote', 'follow-up'],
  strategy: salesStrategy
}));

registry.register(new BaseAgent({
  name: 'Procurement',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Sourcing. Supplier discovery, RFQ broadcast, negotiation.',
  capabilities: ['sourcing', 'rfq', 'negotiation'],
  strategy: procurementStrategy
}));

registry.register(new BaseAgent({
  name: 'Finance',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Money. Invoicing, escrow, BNPL, payment reconciliation.',
  capabilities: ['invoice', 'escrow', 'reconcile'],
  strategy: financeStrategy
}));

registry.register(new BaseAgent({
  name: 'Support',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Customer service. Tickets, disputes, escalation.',
  capabilities: ['ticket', 'dispute', 'escalate'],
  strategy: supportStrategy
}));

export function listAgents() {
  return registry.list().map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  return registry.run(name, body || {});
}