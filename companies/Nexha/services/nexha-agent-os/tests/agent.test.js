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
    expect(profile.tenantId).toBe(TENANT);
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

  test('recommend returns recommendations', async () => {
    const result = await agent.act({ action: 'recommend' });
    expect(result.recommendations).toBeTruthy();
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
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
    expect(profile.role).toBe('Marketing Director');
  });

  test('createCampaign creates campaign', async () => {
    const result = await agent.act({
      action: 'create_campaign',
      campaign: {
        name: 'Summer Sale',
        type: 'promotional',
        budget: 50000,
        channels: ['email', 'social'],
      },
    });

    expect(result.campaignId).toBeTruthy();
    expect(result.name).toBe('Summer Sale');
    expect(result.status).toBe('draft');
  });

  test('analyzeAudience returns segments', async () => {
    const result = await agent.act({ action: 'analyze_audience' });
    expect(result.segments).toBeTruthy();
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.segments[0].name).toBeTruthy();
    expect(result.segments[0].size).toBeGreaterThan(0);
  });

  test('optimizeBudget reallocates', async () => {
    const result = await agent.act({
      action: 'optimize_budget',
      currentBudget: 100000,
      performance: { email: 0.8, social: 0.4, search: 0.6 },
    });

    expect(result.allocations).toBeTruthy();
    expect(result.total).toBe(100000);
  });

  test('getPerformance returns metrics', async () => {
    const result = await agent.act({ action: 'get_performance' });
    expect(result.metrics).toBeTruthy();
    expect(result.metrics.impressions).toBeTruthy();
    expect(result.metrics.conversions).toBeTruthy();
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
    expect(profile.role).toBe('CFO');
  });

  test('createInvoice creates invoice', async () => {
    const result = await agent.act({
      action: 'create_invoice',
      invoice: {
        customerId: 'CUST-001',
        items: [{ description: 'Product A', amount: 1000 }],
        dueDate: '2026-07-15',
      },
    });

    expect(result.invoiceId).toBeTruthy();
    expect(result.status).toBe('draft');
    expect(result.total).toBe(1000);
  });

  test('recordPayment updates invoice', async () => {
    const createResult = await agent.act({
      action: 'create_invoice',
      invoice: { customerId: 'CUST-001', items: [{ description: 'X', amount: 500 }], dueDate: '2026-07-01' },
    });

    const payResult = await agent.act({
      action: 'record_payment',
      invoiceId: createResult.invoiceId,
      amount: 500,
    });

    expect(payResult.status).toBe('paid');
    expect(payResult.paidAt).toBeTruthy();
  });

  test('getCashFlow returns cash data', async () => {
    const result = await agent.act({ action: 'get_cash_flow', period: 'monthly' });
    expect(result.period).toBe('monthly');
    expect(result.inflows).toBeGreaterThan(0);
    expect(result.outflows).toBeGreaterThan(0);
    expect(result.net).toBe(result.inflows - result.outflows);
  });

  test('getSummary returns financial summary', async () => {
    const result = await agent.act({ action: 'get_summary' });
    expect(result.revenue).toBeTruthy();
    expect(result.expenses).toBeTruthy();
    expect(result.profit).toBe(result.revenue - result.expenses);
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
    expect(profile.role).toBe('Head of Procurement');
  });

  test('discoverSuppliers returns suppliers', async () => {
    const result = await agent.act({
      action: 'discover_suppliers',
      category: 'food',
      location: 'India',
    });

    expect(result.suppliers).toBeTruthy();
    expect(result.suppliers.length).toBeGreaterThan(0);
    expect(result.suppliers[0].name).toBeTruthy();
    expect(result.suppliers[0].rating).toBeTruthy();
  });

  test('createRFQ creates RFQ', async () => {
    const result = await agent.act({
      action: 'create_rfq',
      rfq: {
        title: 'Q3 Rice Supply',
        items: [{ sku: 'RICE-001', qty: 5000 }],
        deadline: '2026-07-15',
      },
    });

    expect(result.rfqId).toBeTruthy();
    expect(result.status).toBe('open');
  });

  test('getSpendAnalytics returns analytics', async () => {
    const result = await agent.act({ action: 'get_spend_analytics', period: 'quarterly' });
    expect(result.period).toBe('quarterly');
    expect(result.totalSpend).toBeGreaterThan(0);
    expect(result.categoryBreakdown).toBeTruthy();
    expect(result.topSuppliers).toBeTruthy();
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
    expect(profile.role).toBe('Head of Customer Success');
  });

  test('createTicket creates support ticket', async () => {
    const result = await agent.act({
      action: 'create_ticket',
      ticket: {
        customerId: 'CUST-001',
        subject: 'Order not delivered',
        priority: 'high',
        channel: 'email',
      },
    });

    expect(result.ticketId).toBeTruthy();
    expect(result.status).toBe('open');
    expect(result.priority).toBe('high');
  });

  test('analyzeSentiment returns sentiment score', async () => {
    const result = await agent.act({
      action: 'analyze_sentiment',
      feedback: 'I am extremely happy with your service!',
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.label).toMatch(/positive|neutral|negative/);
  });

  test('escalateTicket escalates ticket', async () => {
    const createResult = await agent.act({
      action: 'create_ticket',
      ticket: { customerId: 'CUST-001', subject: 'Critical issue', priority: 'low', channel: 'chat' },
    });

    const escalateResult = await agent.act({
      action: 'escalate_ticket',
      ticketId: createResult.ticketId,
      reason: 'Customer threatened legal action',
    });

    expect(escalateResult.status).toBe('escalated');
    expect(escalateResult.escalatedAt).toBeTruthy();
  });

  test('getSLAStatus returns SLA metrics', async () => {
    const result = await agent.act({ action: 'get_sla_status' });
    expect(result.responseTime).toBeTruthy();
    expect(result.resolutionTime).toBeTruthy();
    expect(result.firstResponseRate).toBeGreaterThanOrEqual(0);
    expect(result.firstResponseRate).toBeLessThanOrEqual(1);
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
