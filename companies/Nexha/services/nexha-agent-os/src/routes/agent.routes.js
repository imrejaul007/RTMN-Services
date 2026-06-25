/**
 * Agent Routes — HTTP endpoints for Nexha AgentOS.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import express from 'express';
import { getAgentService, AgentError } from '../services/agent.service.js';

const router = express.Router();

function getTenantId(req) {
  return req.headers['x-tenant-id'] || req.user?.tenantId || req.query?.tenantId || null;
}

function requireTenant(req, res, next) {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(401).json({ success: false, error: 'x-tenant-id header required' });
  req.tenantId = tenantId;
  next();
}

function ok(res, data) { res.json({ success: true, data }); }
function err(res, e) { res.status(e instanceof AgentError ? e.statusCode : 500).json({ success: false, error: e.message }); }

router.use(requireTenant);

// ── Health ──────────────────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-agent-os', version: '1.0.0' });
});

// ── Agent list ────────────────────────────────────────────────────────────────

router.get('/agents', (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, { agents: svc.listAgents() });
  } catch (e) { err(res, e); }
});

router.get('/agents/:id', (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    const agent = svc.getAgent(req.params.id);
    ok(res, agent.getProfile());
  } catch (e) { err(res, e); }
});

// ── Agent act ────────────────────────────────────────────────────────────────

router.post('/agents/:id/act', (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    const result = await svc.act(req.params.id, { ...req.body, tenantId: req.tenantId });
    ok(res, result);
  } catch (e) { err(res, e); }
});

router.get('/agents/:id/history', (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    const limit = parseInt(req.query.limit) || 20;
    ok(res, { history: svc.getHistory(req.params.id, limit) });
  } catch (e) { err(res, e); }
});

// ── CEO Agent ────────────────────────────────────────────────────────────────

router.get('/agents/ceo/kpis', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('ceo', { action: 'get_kpis' }));
  } catch (e) { err(res, e); }
});

router.post('/agents/ceo/goals', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('ceo', { action: 'set_goals', goals: req.body.goals }));
  } catch (e) { err(res, e); }
});

router.post('/agents/ceo/review', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('ceo', { action: 'review_performance', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/ceo/recommend', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('ceo', { action: 'recommend', type: req.query.type || 'strategy' }));
  } catch (e) { err(res, e); }
});

// ── Marketing Agent ────────────────────────────────────────────────────────

router.post('/agents/marketing/campaigns', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('marketing', { action: 'create_campaign', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/marketing/campaigns', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('marketing', { action: 'list_campaigns', ...req.query }));
  } catch (e) { err(res, e); }
});

router.get('/agents/marketing/audiences', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('marketing', { action: 'analyze_audience', ...req.query }));
  } catch (e) { err(res, e); }
});

router.post('/agents/marketing/budget', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('marketing', { action: 'optimize_budget', ...req.body }));
  } catch (e) { err(res, e); }
});

// ── Finance Agent ──────────────────────────────────────────────────────────

router.post('/agents/finance/invoices', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('finance', { action: 'create_invoice', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/finance/invoices', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('finance', { action: 'list_invoices', ...req.query }));
  } catch (e) { err(res, e); }
});

router.post('/agents/finance/payments', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('finance', { action: 'record_payment', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/finance/cashflow', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('finance', { action: 'get_cash_flow', ...req.query }));
  } catch (e) { err(res, e); }
});

router.get('/agents/finance/summary', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('finance', { action: 'get_summary', ...req.query }));
  } catch (e) { err(res, e); }
});

// ── Procurement Agent ─────────────────────────────────────────────────────

router.get('/agents/procurement/suppliers', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('procurement', { action: 'discover_suppliers', ...req.query }));
  } catch (e) { err(res, e); }
});

router.post('/agents/procurement/rfqs', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('procurement', { action: 'create_rfq', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/procurement/rfqs', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('procurement', { action: 'list_rfqs', ...req.query }));
  } catch (e) { err(res, e); }
});

router.post('/agents/procurement/rfqs/award', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('procurement', { action: 'award_rfq', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/procurement/spend', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('procurement', { action: 'get_spend', ...req.query }));
  } catch (e) { err(res, e); }
});

// ── Customer Care Agent ─────────────────────────────────────────────────────

router.post('/agents/support/tickets', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'create_ticket', ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/support/tickets', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'list_tickets', ...req.query }));
  } catch (e) { err(res, e); }
});

router.put('/agents/support/tickets/:ticketId', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'update_ticket', ticketId: req.params.ticketId, ...req.body }));
  } catch (e) { err(res, e); }
});

router.post('/agents/support/tickets/:ticketId/escalate', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'escalate', ticketId: req.params.ticketId, ...req.body }));
  } catch (e) { err(res, e); }
});

router.get('/agents/support/sla', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'get_sla_status', ...req.query }));
  } catch (e) { err(res, e); }
});

router.get('/agents/support/sentiment', async (req, res) => {
  try {
    const svc = getAgentService(req.tenantId);
    ok(res, await svc.act('customer-care', { action: 'analyze_sentiment', ...req.query }));
  } catch (e) { err(res, e); }
});

export default router;
