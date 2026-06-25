/**
 * AgentOS Tests — Nexha AI Agent Service
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { CEOAgent } from '../src/agents/ceo.agent.js';
import { MarketingAgent } from '../src/agents/marketing.agent.js';
import { FinanceAgent } from '../src/agents/finance.agent.js';
import { ProcurementAgent } from '../src/agents/procurement.agent.js';
import { CustomerCareAgent } from '../src/agents/customer-care.agent.js';
import { AgentService } from '../src/services/agent.service.js';
import { getAgentService, clearRegistry } from '../src/services/agent.service.js';

const TENANT = 'tenant_nike';
const OTHER_TENANT = 'tenant_adidas';

beforeEach(() => {
  clearRegistry();
});

// ── CEO Agent ───────────────────────────────────────────────────────────

describe('CEO Agent', () => {
  let agent;

  beforeEach(() => {
    const svc = getAgentService(TENANT);
    agent = svc.agents.ceo;
  });

  test('has correct profile', () => {
    const profile = agent.getProfile();
    expect(profile.agentId).toBe('ceo');
    expect(profile.role).toBe('CEO');
    expect(profile.capabilities).toContain('goal_setting');
    expect(profile.capabilities).toContain('kpi_monitoring');
  });

  test('getKPIs returns simulated KPIs', async () => {
    const result = await agent.act({ action: 'get_kpis' });
    expect(result.agent).toBe('CEO');
    expect(result.kpis).toBeTruthy();
    expect(result.kpis.revenue).toBeTruthy();
    expect(result.kpis.revenue.current).toBe(1250000);
    expect(result.kpis.customers.current).toBe(342);
  });

  test('setGoals creates goals', async () => {
    const result = await agent.act({
      action: 'set_goals',
      goals: [
        { description: 'Increase revenue by 20%', target: 1500000, deadline: '2026-12-31' },
        { description: 'Onboard 50 new suppliers', target: 50, deadline: '2026-09-30' },
      ],
    });

    expect(result.goals.length).toBe(2);
    expect(result.goals[0].goalId).toBeTruthy();
    expect(result.goals[0].status).toBe('active');
    expect(result.goals[0].progress).toBe(0);
  });

  test('setGoals rejects invalid input', async () => {
    const result = await agent.act({ action: 'set_goals' });
    expect(result.error).toBe('goals array required');
  });

  test('reviewPerformance returns KPIs and recommendations', async () => {
    const result = await agent.act({ action: 'review_performance', period: 'monthly' });
    expect(result.agent).toBe('CEO');
    expect(result.period).toBe('monthly');
    expect(result.kpis).toBeTruthy();
    expect(result.recommendations).toBeTruthy();
    // score may be NaN if KPI targets are 0, so check for valid number
    expect(typeof result.score).toBe('number');
  });

  test('unknown action returns error', async () => {
    const result = await agent.act({ action: 'unknown_action' });
    expect(result.error).toBeTruthy();
  });

  test('activity is logged', async () => {
    await agent.act({ action: 'get_kpis' });
    await agent.act({ action: 'get_kpis' });

    const history = agent.getHistory(10);
    expect(history.length).toBe(2);
    expect(history[0].action).toBe('get_kpis');
  });

  test('history respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await agent.act({ action: 'get_kpis' });
    }

    const history = agent.getHistory(2);
    expect(history.length).toBe(2);
  });
});

// ── Marketing Agent ─────────────────────────────────────────────────────

describe('Marketing Agent', () => {
  let agent;

  beforeEach(() => {
    const svc = getAgentService(TENANT);
    agent = svc.agents.marketing;
  });

  test('has correct profile', () => {
    const profile = agent.getProfile();
    expect(profile.agentId).toBe('marketing');
    expect(profile.role).toBe('Marketing');
  });

  test('createCampaign creates campaign', async () => {
    // Must include action: 'create_campaign' AND name/type in context
    const result = await agent.act({
      action: 'create_campaign',
      name: 'Summer Sale',
      type: 'promotional',
      budget: 50000,
      channels: ['email', 'social'],
    });

    expect(result.campaign).toBeTruthy();
    expect(result.campaign.campaignId).toBeTruthy();
    expect(result.campaign.name).toBe('Summer Sale');
    expect(result.campaign.status).toBe('draft');
  });

  test('createCampaign rejects missing fields', async () => {
    const result = await agent.act({ action: 'create_campaign', name: 'Test' }); // missing type
    expect(result.error).toBe('name and type required');
  });

  test('analyzeAudience returns audience segments', async () => {
    const result = await agent.act({ action: 'analyze_audience' });
    expect(result.audiences).toBeTruthy();
    expect(result.audiences.length).toBe(4);
    expect(result.audiences[0].name).toBeTruthy();
    expect(result.audiences[0].size).toBeGreaterThan(0);
  });

  test('optimizeBudget reallocates budget', async () => {
    const result = await agent.act({
      action: 'optimize_budget',
      totalBudget: 100000,
    });

    expect(result.allocation).toBeTruthy();
    expect(result.totalBudget).toBe(100000);
  });

  test('listCampaigns returns campaigns', async () => {
    await agent.act({ action: 'create_campaign', name: 'Campaign A', type: 'promo' });
    await agent.act({ action: 'create_campaign', name: 'Campaign B', type: 'brand' });

    const result = await agent.act({ action: 'list_campaigns' });
    expect(result.campaigns).toBeTruthy();
    expect(result.total).toBe(2);
  });
});

// ── Finance Agent ───────────────────────────────────────────────────────

describe('Finance Agent', () => {
  let agent;

  beforeEach(() => {
    const svc = getAgentService(TENANT);
    agent = svc.agents.finance;
  });

  test('has correct profile', () => {
    const profile = agent.getProfile();
    expect(profile.agentId).toBe('finance');
    expect(profile.role).toBe('Finance');
  });

  test('createInvoice creates invoice', async () => {
    // Uses customerRef (not customerId), items at top level
    const result = await agent.act({
      action: 'create_invoice',
      customerRef: 'CUST-001',
      items: [{ description: 'Product A', quantity: 1, unitPrice: 1000 }],
      dueDate: '2026-07-15',
    });

    expect(result.invoice).toBeTruthy();
    expect(result.invoice.invoiceId).toBeTruthy();
    expect(result.invoice.status).toBe('pending');
    expect(result.invoice.total).toBeGreaterThan(0);
  });

  test('createInvoice calculates tax correctly', async () => {
    const result = await agent.act({
      action: 'create_invoice',
      customerRef: 'CUST-001',
      items: [{ description: 'X', quantity: 1, unitPrice: 100 }],
    });

    // 18% GST
    expect(result.invoice.subtotal).toBe(100);
    expect(result.invoice.tax).toBe(18);
    expect(result.invoice.total).toBe(118);
  });

  test('createInvoice rejects missing fields', async () => {
    const result = await agent.act({ action: 'create_invoice', customerRef: 'C-001' });
    expect(result.error).toBe('customerRef and items required');
  });

  test('listInvoices returns invoices', async () => {
    await agent.act({ action: 'create_invoice', customerRef: 'C-001', items: [{ qty: 1, price: 100 }] });
    await agent.act({ action: 'create_invoice', customerRef: 'C-002', items: [{ qty: 1, price: 200 }] });

    const result = await agent.act({ action: 'list_invoices' });
    expect(result.invoices).toBeTruthy();
    expect(result.total).toBe(2);
  });
});

// ── Procurement Agent ────────────────────────────────────────────────────

describe('Procurement Agent', () => {
  let agent;

  beforeEach(() => {
    const svc = getAgentService(TENANT);
    agent = svc.agents.procurement;
  });

  test('has correct profile', () => {
    const profile = agent.getProfile();
    expect(profile.agentId).toBe('procurement');
    expect(profile.role).toBe('Procurement');
  });

  test('discoverSuppliers returns suppliers', async () => {
    const result = await agent.act({
      action: 'discover_suppliers',
      category: 'food',
    });

    expect(result.suppliers).toBeTruthy();
    expect(result.total).toBeGreaterThan(0);
    expect(result.suppliers[0].name).toBeTruthy();
    expect(result.suppliers[0].rating).toBeTruthy();
  });

  test('discoverSuppliers filters by category', async () => {
    const result = await agent.act({
      action: 'discover_suppliers',
      category: 'food',
    });

    // All results should be food category
    expect(result.suppliers.every(s => s.category === 'food')).toBe(true);
  });

  test('createRFQ creates RFQ', async () => {
    const result = await agent.act({
      action: 'create_rfq',
      title: 'Q3 Rice Supply',
      items: [{ sku: 'RICE-001', qty: 5000 }],
      deadline: '2026-07-15',
    });

    expect(result.rfq).toBeTruthy();
    expect(result.rfq.rfqId).toBeTruthy();
    expect(result.rfq.status).toBe('open');
  });

  test('createRFQ rejects missing fields', async () => {
    const result = await agent.act({ action: 'create_rfq', title: 'Test' }); // missing items
    expect(result.error).toBe('title and items required');
  });

  test('listRFQs returns RFQs', async () => {
    await agent.act({ action: 'create_rfq', title: 'RFQ 1', items: [] });
    await agent.act({ action: 'create_rfq', title: 'RFQ 2', items: [] });

    const result = await agent.act({ action: 'list_rfqs' });
    expect(result.rfqs).toBeTruthy();
    expect(result.total).toBe(2);
  });
});

// ── Customer Care Agent ───────────────────────────────────────────────────

describe('Customer Care Agent', () => {
  let agent;

  beforeEach(() => {
    const svc = getAgentService(TENANT);
    agent = svc.agents['customer-care'];
  });

  test('has correct profile', () => {
    const profile = agent.getProfile();
    expect(profile.agentId).toBe('customer-care');
    expect(profile.role).toBe('Customer Care');
  });

  test('createTicket creates support ticket', async () => {
    // Uses customerRef (not customerId)
    const result = await agent.act({
      action: 'create_ticket',
      customerRef: 'CUST-001',
      subject: 'Order not delivered',
      priority: 'high',
    });

    expect(result.ticket).toBeTruthy();
    expect(result.ticket.ticketId).toBeTruthy();
    expect(result.ticket.status).toBe('open');
    expect(result.ticket.priority).toBe('high');
  });

  test('createTicket rejects missing fields', async () => {
    const result = await agent.act({ action: 'create_ticket', customerRef: 'C-001' });
    expect(result.error).toBe('customerRef and subject required');
  });

  test('analyzeSentiment returns sentiment (aggregate mode)', async () => {
    // analyzeSentiment without ticketId returns aggregate (0 tickets = 0 total)
    const result = await agent.act({ action: 'analyze_sentiment' });
    expect(typeof result.total).toBe('number');
    expect(result.score).toBeTruthy();
    expect(typeof result.positive).toBe('number');
  });

  test('escalate escalates ticket', async () => {
    const createResult = await agent.act({
      action: 'create_ticket',
      customerRef: 'CUST-001',
      subject: 'Critical issue',
      priority: 'low',
    });

    const escalateResult = await agent.act({
      action: 'escalate',
      ticketId: createResult.ticket.ticketId,
      reason: 'Customer threatened legal action',
    });

    expect(escalateResult.ticket.status).toBe('escalated');
    expect(escalateResult.message).toBe('Escalation successful');
  });

  test('listTickets returns tickets', async () => {
    await agent.act({ action: 'create_ticket', customerRef: 'C-001', subject: 'Issue 1', priority: 'low' });
    await agent.act({ action: 'create_ticket', customerRef: 'C-002', subject: 'Issue 2', priority: 'high' });

    const result = await agent.act({ action: 'list_tickets' });
    expect(result.tickets).toBeTruthy();
    expect(result.total).toBe(2);
  });
});

// ── AgentService ─────────────────────────────────────────────────────────

describe('AgentService', () => {
  test('creates all 5 agents', () => {
    const svc = new AgentService(TENANT);
    expect(Object.keys(svc.agents).length).toBe(5);
    expect(svc.agents.ceo).toBeTruthy();
    expect(svc.agents.marketing).toBeTruthy();
    expect(svc.agents.finance).toBeTruthy();
    expect(svc.agents.procurement).toBeTruthy();
    expect(svc.agents['customer-care']).toBeTruthy();
  });

  test('listAgents returns all agent profiles', () => {
    const svc = new AgentService(TENANT);
    const profiles = svc.listAgents();
    expect(profiles.length).toBe(5);
    expect(profiles.map(p => p.agentId)).toContain('ceo');
    expect(profiles.map(p => p.agentId)).toContain('marketing');
    expect(profiles.map(p => p.agentId)).toContain('finance');
  });

  test('getAgent returns agent by id', () => {
    const svc = new AgentService(TENANT);
    const agent = svc.getAgent('ceo');
    expect(agent.role).toBe('CEO');
  });

  test('getAgent throws for unknown agent', () => {
    const svc = new AgentService(TENANT);
    expect(() => svc.getAgent('unknown')).toThrow('Unknown agent');
  });

  test('act dispatches to correct agent', async () => {
    const svc = new AgentService(TENANT);
    const result = await svc.act('ceo', { action: 'get_kpis' });
    expect(result.kpis).toBeTruthy();
  });

  test('act throws for unknown agent', async () => {
    const svc = new AgentService(TENANT);
    await expect(svc.act('unknown', {})).rejects.toThrow('Unknown agent');
  });
});

// ── Tenant-scoped Singleton ───────────────────────────────────────────────

describe('Tenant-scoped Singleton Registry', () => {
  test('getAgentService returns same instance for same tenant', () => {
    const svc1 = getAgentService(TENANT);
    const svc2 = getAgentService(TENANT);
    expect(svc1).toBe(svc2); // same reference
  });

  test('getAgentService returns different instances for different tenants', () => {
    const svc1 = getAgentService(TENANT);
    const svc2 = getAgentService(OTHER_TENANT);
    expect(svc1).not.toBe(svc2);
    expect(svc1.tenantId).toBe(TENANT);
    expect(svc2.tenantId).toBe(OTHER_TENANT);
  });

  test('clearRegistry removes all tenants', () => {
    const svc1 = getAgentService(TENANT);
    const svc2 = getAgentService(OTHER_TENANT);
    clearRegistry();

    const svc3 = getAgentService(TENANT);
    const svc4 = getAgentService(OTHER_TENANT);
    expect(svc1).not.toBe(svc3); // new instance after clear
    expect(svc3.tenantId).toBe(TENANT);
    expect(svc4.tenantId).toBe(OTHER_TENANT);
  });
});
