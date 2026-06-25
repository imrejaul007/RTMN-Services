/**
 * Agent Service — Orchestrates the 5 AI agents per tenant.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { CEOAgent } from '../agents/ceo.agent.js';
import { MarketingAgent } from '../agents/marketing.agent.js';
import { FinanceAgent } from '../agents/finance.agent.js';
import { ProcurementAgent } from '../agents/procurement.agent.js';
import { CustomerCareAgent } from '../agents/customer-care.agent.js';

const AGENT_MAP = { ceo: CEOAgent, marketing: MarketingAgent, finance: FinanceAgent, procurement: ProcurementAgent, 'customer-care': CustomerCareAgent };

export class AgentError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AgentError';
    this.statusCode = statusCode;
  }
}

export class AgentService {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.agents = {};
    for (const [id, AgentClass] of Object.entries(AGENT_MAP)) {
      this.agents[id] = new AgentClass(tenantId);
    }
  }

  async act(agentId, context = {}) {
    const agent = this.agents[agentId];
    if (!agent) throw new AgentError(`Unknown agent: ${agentId}`, 400);
    return agent.act(context);
  }

  listAgents() {
    return Object.entries(this.agents).map(([id, agent]) => agent.getProfile());
  }

  getAgent(agentId) {
    const agent = this.agents[agentId];
    if (!agent) throw new AgentError(`Unknown agent: ${agentId}`, 400);
    return agent;
  }

  getHistory(agentId, limit = 20) {
    const agent = this.getAgent(agentId);
    return agent.getHistory(limit);
  }
}

// ── Tenant-scoped singleton registry ─────────────────────────────────────────

const registry = new Map();

export function getAgentService(tenantId) {
  if (!registry.has(tenantId)) {
    registry.set(tenantId, new AgentService(tenantId));
  }
  return registry.get(tenantId);
}

export function clearRegistry() { registry.clear(); }
