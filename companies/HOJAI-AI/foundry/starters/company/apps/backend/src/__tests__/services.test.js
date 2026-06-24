/**
 * Service-level tests for the company-starter.
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as hr from '../services/hr.service.js';
import * as sales from '../services/sales.service.js';
import * as crm from '../services/crm.service.js';
import * as finance from '../services/finance.service.js';
import store from '../services/store.js';
import { listAgents, runAgent, agentDepartments } from '../agents/index.js';

// ─── HR ─────────────────────────────────────────────────────────────

test('HR: createEmployee assigns id + status active', () => {
  const e = hr.createEmployee({ name: 'Alice', email: 'alice@example.com', role: 'Engineer', hireDate: '2026-07-01' });
  assert.ok(e.id);
  assert.equal(e.status, 'active');
  assert.equal(e.role, 'Engineer');
});

test('HR: requestLeave computes days + defaults status pending', () => {
  hr.createEmployee({ name: 'Bob', email: 'b@x.com', role: 'PM', hireDate: '2026-01-01' });
  const all = hr.listEmployees();
  const bob = all[all.length - 1];
  const leave = hr.requestLeave({ employeeId: bob.id, type: 'vacation', from: '2026-08-01', to: '2026-08-04', reason: 'trip' });
  assert.ok(leave.days >= 3);
  assert.equal(leave.status, 'pending');
});

test('HR: listDepartments returns at least the seeded Engineering dept', () => {
  const depts = hr.listDepartments();
  assert.ok(depts.find(d => d.id === 'dept-eng'));
});

// ─── Sales ──────────────────────────────────────────────────────────

test('Sales: createLead + qualifyLead + createDeal flow', () => {
  const lead = sales.createLead({ name: 'Maya Collective', email: 'm@x.com', source: 'web' });
  assert.equal(lead.status, 'new');
  const qualified = sales.qualifyLead(lead.id, { score: 87 });
  assert.equal(qualified.status, 'qualified');
  assert.equal(qualified.score, 87);
  const deal = sales.createDeal({ name: 'Maya × 1000 units', leadId: lead.id, value: 50000 });
  assert.equal(deal.stage, 'prospecting');
  const advanced = sales.advanceDealStage(deal.id, 'proposal');
  assert.equal(advanced.stage, 'proposal');
  assert.equal(advanced.probability, 75);
});

// ─── CRM ────────────────────────────────────────────────────────────

test('CRM: createCustomer + recordNpsSurvey + updateHealthScore flow', () => {
  const c = crm.createCustomer({ name: 'Acme', email: 'a@x.com', ltv: 5000 });
  assert.equal(c.healthStatus, 'healthy');
  const survey = crm.recordNpsSurvey({ customerId: c.id, score: 9, feedback: 'Love it' });
  assert.equal(survey.category, 'promoter');
  assert.equal(crm.getCustomer(c.id).npsScore, 9);
  const atRisk = crm.updateHealthScore(c.id, 25);
  assert.equal(atRisk.healthStatus, 'critical');
  assert.equal(atRisk.churnRisk, 75);
});

// ─── Finance ────────────────────────────────────────────────────────

test('Finance: createAccount + post double-entry + trial balance balances', () => {
  const cash = finance.createAccount({ code: '1000', name: 'Cash', type: 'asset' });
  const revenue = finance.createAccount({ code: '4000', name: 'Revenue', type: 'revenue' });
  finance.postLedgerEntry({ accountId: cash.id, entryType: 'debit', amount: 1000 });
  finance.postLedgerEntry({ accountId: revenue.id, entryType: 'credit', amount: 1000 });
  const tb = finance.getTrialBalance();
  assert.equal(tb.balanced, true, `Trial balance not balanced: ${JSON.stringify(tb.totals)}`);
  assert.equal(tb.totals.debit, 1000);
  assert.equal(tb.totals.credit, 1000);
});

// ─── SUTAR agents ──────────────────────────────────────────────────

test('SUTAR: all 7 agents are registered (CEO + 6 departments)', () => {
  const names = listAgents().map(a => a.name).sort();
  assert.deepEqual(names, ['CEO', 'CXO', 'Finance', 'HR', 'Marketing', 'Operations', 'Sales']);
});

test('SUTAR: each agent is mapped to its department', () => {
  const map = agentDepartments();
  assert.equal(map.CEO, 'orchestration');
  assert.equal(map.Sales, 'sales');
  assert.equal(map.Marketing, 'marketing');
  assert.equal(map.HR, 'workforce');
  assert.equal(map.Finance, 'finance');
  assert.equal(map.Operations, 'operations');
  assert.equal(map.CXO, 'cxo');
});

test('SUTAR: CEO routes goal by keywords', async () => {
  const hire = await runAgent('CEO', { goal: 'hire a senior engineer' });
  assert.equal(hire.decision, 'route:hr');
  const invoice = await runAgent('CEO', { goal: 'create an invoice for $5000' });
  assert.equal(invoice.decision, 'route:finance');
  const launch = await runAgent('CEO', { goal: 'launch a marketing campaign' });
  assert.equal(launch.decision, 'route:marketing');
});

test('SUTAR: department agents return deterministic stubs', async () => {
  const salesReply = await runAgent('Sales', { intent: 'qualify-lead', leadId: 'l-1' });
  assert.equal(salesReply.agent, 'Sales');
  assert.equal(salesReply.status, 'qualified');

  const financeReply = await runAgent('Finance', { intent: 'transfer', amount: 500, fromAccount: 'cash', toAccount: 'revenue' });
  assert.equal(financeReply.agent, 'Finance');
  assert.equal(financeReply.status, 'completed');
  assert.equal(financeReply.amount, 500);

  const cxoReply = await runAgent('CXO', { intent: 'kpi-dashboard' });
  assert.equal(cxoReply.agent, 'CXO');
  assert.ok(Array.isArray(cxoReply.kpis));
  assert.ok(cxoReply.kpis.length >= 4);
});

test('SUTAR: runAgent throws for unknown agents', async () => {
  await assert.rejects(() => runAgent('Ghost', {}), /unknown agent/);
});

// ─── Cleanup between tests ─────────────────────────────────────────

test('store.activity captures the events from this whole run', () => {
  // Just a smoke check — previous tests should have logged things.
  assert.ok(store.activity.length > 0, 'expected activity log to be non-empty');
});
