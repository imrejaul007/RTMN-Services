import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import axios from 'axios';

const PORT = parseInt(process.env.SUTAR_PORT || '7200', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:7001';
const POLICYOS_URL = process.env.POLICYOS_URL || 'http://localhost:7005';
const FLOWOS_URL = process.env.FLOWOS_URL || 'http://localhost:7007';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const err = (res, s, c, m) => res.status(s).json({ success: false, error: { code: c, message: m }, meta: { timestamp: new Date().toISOString() } });

const BusinessSchema = new mongoose.Schema({
  businessId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['restaurant', 'hotel', 'retail', 'manufacturer', 'distributor', 'service'], required: true },
  status: { type: String, enum: ['active', 'paused', 'closed'], default: 'active' },
  capabilities: { type: mongoose.Schema.Types.Mixed, default: {} },
  metrics: {
    totalTransactions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
  },
}, { timestamps: true });
const Business = mongoose.model('Business', BusinessSchema);

const AgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true, index: true },
  businessId: { type: String, required: true, index: true },
  type: { type: String, enum: ['merchant', 'procurement', 'sales', 'support', 'inventory', 'finance'], required: true },
  name: String,
  config: mongoose.Schema.Types.Mixed,
  state: { type: String, enum: ['active', 'busy', 'paused', 'error'], default: 'active' },
  decisions: { type: Number, default: 0 },
  lastDecisionAt: Date,
}, { timestamps: true });
const Agent = mongoose.model('Agent', AgentSchema);

const DecisionSchema = new mongoose.Schema({
  decisionId: { type: String, required: true, unique: true, index: true },
  businessId: String,
  agentId: String,
  type: String,
  action: String,
  context: mongoose.Schema.Types.Mixed,
  decision: String,
  confidence: Number,
  reasoning: String,
  outcome: { type: String, enum: ['pending', 'success', 'failure'], default: 'pending' },
}, { timestamps: true });
const Decision = mongoose.model('Decision', DecisionSchema);

const registerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['restaurant', 'hotel', 'retail', 'manufacturer', 'distributor', 'service']),
  ownerName: z.string().min(1),
  email: z.string().email(),
  capabilities: z.record(z.unknown()).optional(),
});

const agentSchema = z.object({
  businessId: z.string().min(1),
  type: z.enum(['merchant', 'procurement', 'sales', 'support', 'inventory', 'finance']),
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

const decisionSchema = z.object({
  businessId: z.string().min(1),
  agentId: z.string().optional(),
  type: z.string().min(1),
  action: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

async function callInternal(url, method, body) {
  try {
    const res = await axios({ method, url, data: body, headers: { 'x-internal-token': INTERNAL_TOKEN }, timeout: 5000 });
    return res.data;
  } catch (e) { return null; }
}

app.get('/health', (req, res) => send(res, 200, { service: 'sutar', status: 'healthy', version: '1.0.0' }));

app.post('/api/businesses',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const corpRes = await callInternal(`${CORPID_URL}/api/identity/issue`, 'POST', { type: 'organization', name: data.name });
    const businessId = `BIZ-${Date.now().toString(36).toUpperCase()}`;
    const biz = await Business.create({ ...data, businessId, corpId: corpRes?.data?.corpId });
    res.status(201).json({ success: true, data: { businessId, corpId: biz.corpId, name: biz.name, type: biz.type, status: biz.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/businesses/:businessId', reqI, async (req, res, next) => {
  try {
    const biz = await Business.findOne({ businessId: req.params.businessId });
    if (!biz) return err(res, 404, 'NOT_FOUND', 'Business not found');
    const agents = await Agent.find({ businessId: biz.businessId });
    res.json({ success: true, data: { businessId: biz.businessId, name: biz.name, type: biz.type, status: biz.status, capabilities: biz.capabilities, metrics: biz.metrics, agents: agents.length }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/businesses', reqI, async (req, res, next) => {
  try {
    const { type, limit = 50 } = req.query;
    const filter = { status: 'active' };
    if (type) filter.type = type;
    const items = await Business.find(filter).limit(parseInt(limit));
    res.json({ success: true, data: { count: items.length, items: items.map(b => ({ businessId: b.businessId, name: b.name, type: b.type, metrics: b.metrics })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/agents',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = agentSchema.parse(req.body);
    const agentId = `AGT-${data.type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    const a = await Agent.create({ ...data, agentId });
    res.status(201).json({ success: true, data: { agentId, businessId: a.businessId, type: a.type, state: a.state }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/agents/:businessId', reqI, async (req, res, next) => {
  try {
    const items = await Agent.find({ businessId: req.params.businessId });
    res.json({ success: true, data: { count: items.length, items: items.map(a => ({ agentId: a.agentId, type: a.type, name: a.name, state: a.state, decisions: a.decisions, lastDecisionAt: a.lastDecisionAt })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/agents/:agentId/decide',requireAuth,  reqI, async (req, res, next) => {
  try {
    const { businessId, type, action, context = {} } = decisionSchema.parse(req.body);
    const agent = await Agent.findOne({ agentId: req.params.agentId });
    if (!agent) return err(res, 404, 'NOT_FOUND', 'Agent not found');
    const policy = await callInternal(`${POLICYOS_URL}/api/policies/evaluate`, 'POST', { action, corpId: businessId, context });
    if (policy && !policy.data?.allowed) {
      return res.json({ success: true, data: { allowed: false, reason: policy.data.reason, decisionId: null }, meta: { timestamp: new Date().toISOString() } });
    }
    const decisionId = `DEC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const confidence = 0.7 + Math.random() * 0.3;
    const decision = decide(agent, action, context);
    const reasoning = explain(agent, action, context, decision);
    await Decision.create({ decisionId, businessId, agentId: agent.agentId, type, action, context, decision, confidence, reasoning });
    agent.decisions += 1;
    agent.lastDecisionAt = new Date();
    await agent.save();
    res.json({ success: true, data: { decisionId, allowed: true, decision, confidence, reasoning }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/decisions/:businessId', reqI, async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const items = await Decision.find({ businessId: req.params.businessId }).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: { count: items.length, items: items.map(d => ({ decisionId: d.decisionId, agentId: d.agentId, action: d.action, decision: d.decision, confidence: d.confidence, reasoning: d.reasoning, createdAt: d.createdAt })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

function decide(agent, action, context) {
  // Rule-based decisions per agent type
  switch (agent.type) {
    case 'merchant':
      if (action === 'accept_order') return context.inStock ? 'accept' : 'reject_out_of_stock';
      if (action === 'set_price') return `Set price to ${context.suggestedPrice || context.cost * 1.3}`;
      return 'approve';
    case 'procurement':
      if (action === 'reorder') return context.stockLevel < context.threshold ? 'reorder_now' : 'wait';
      if (action === 'select_supplier') return context.cheapest?.id || 'unknown';
      return 'proceed';
    case 'sales':
      if (action === 'discount') return context.discountPct > 20 ? 'cap_20_percent' : 'approve';
      return 'approve';
    case 'inventory':
      if (action === 'rebalance') return `Move ${context.quantity} from ${context.from} to ${context.to}`;
      return 'no_action';
    default:
      return 'approved';
  }
}

function explain(agent, action, context, decision) {
  return `Agent type ${agent.type} evaluated action "${action}" with context ${JSON.stringify(context).slice(0, 100)} → decided: ${decision}`;
}

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[sutar] MongoDB connected`); }
  catch (err) { console.error(`[sutar] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[sutar] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
