/**
 * RTMN Live Support OS (port 4868)
 *
 * Human-in-the-loop escalation layer for AI agents.
 *
 * When an AI agent's confidence is too low, the customer is angry, the
 * question is sensitive, or the user explicitly asks for a human — this
 * service decides:
 *   1) should we escalate?
 *   2) which queue?
 *   3) which available agent (skill-matched)?
 *   4) build a handoff package with full context?
 *
 * No external provider needed. Pure routing logic.
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4868;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ----------------------------- Storage -----------------------------

const sessions = new PersistentMap('sessions', { serviceName: 'live-support-os' });      // sessionId -> { id, customerId, channel, status, aiConfidence, category, sentiment, language, region, escalationReason, assignedAgentId, queueId, history[], createdAt }
const queues = new PersistentMap('queues', { serviceName: 'live-support-os' });        // queueId -> { id, name, skills[], priority, slaMinutes }
const agents = new PersistentMap('agents', { serviceName: 'live-support-os' });        // agentId -> { id, name, skills[], status, activeSessionId, maxConcurrent }
const policies = new PersistentMap('policies', { serviceName: 'live-support-os' });      // policyId -> { id, name, rules[] }
const handoffs = new PersistentMap('handoffs', { serviceName: 'live-support-os' });      // handoffId -> { sessionId, agentId, context, createdAt }

// ----------------------------- Seeded data -----------------------------

const seedQueues = [
  { id: 'q-billing', name: 'Billing Support', skills: ['billing', 'invoices', 'refunds'], priority: 'P2', slaMinutes: 30 },
  { id: 'q-tech', name: 'Technical Support', skills: ['bugs', 'errors', 'integrations', 'api'], priority: 'P1', slaMinutes: 15 },
  { id: 'q-vip', name: 'VIP / Enterprise', skills: ['enterprise', 'vip', 'sla'], priority: 'P0', slaMinutes: 5 },
  { id: 'q-general', name: 'General Support', skills: ['general'], priority: 'P3', slaMinutes: 60 },
];
seedQueues.forEach(q => queues.set(q.id, q));

const seedAgents = [
  { id: 'a-001', name: 'Priya Sharma', skills: ['billing', 'invoices', 'refunds', 'hindi'], status: 'available', activeSessionId: null, maxConcurrent: 3 },
  { id: 'a-002', name: 'Marcus Lee', skills: ['bugs', 'errors', 'api', 'integrations'], status: 'available', activeSessionId: null, maxConcurrent: 2 },
  { id: 'a-003', name: 'Sofia Garcia', skills: ['enterprise', 'vip', 'sla', 'spanish'], status: 'available', activeSessionId: null, maxConcurrent: 2 },
  { id: 'a-004', name: 'Kenji Tanaka', skills: ['general', 'japanese'], status: 'available', activeSessionId: null, maxConcurrent: 4 },
  { id: 'a-005', name: 'Amira Hassan', skills: ['billing', 'invoices', 'refunds', 'arabic'], status: 'available', activeSessionId: null, maxConcurrent: 3 },
];
seedAgents.forEach(a => agents.set(a.id, a));

// Default escalation policy: lower aiConfidence or negative sentiment or explicit human → escalate
const defaultPolicy = {
  id: 'pol-default',
  name: 'Default escalation policy',
  rules: [
    { when: 'aiConfidence < 0.55', action: 'escalate', reason: 'low_ai_confidence' },
    { when: 'sentiment === negative', action: 'escalate', reason: 'negative_sentiment' },
    { when: 'priority === P0', action: 'escalate_immediate', reason: 'urgent_priority' },
    { when: 'userRequestedHuman === true', action: 'escalate', reason: 'user_request' },
    { when: 'category === sensitive', action: 'escalate', reason: 'sensitive_category' },
  ],
  defaultAction: 'queue_for_ai_continuation',
  aiConfidenceThreshold: 0.55,
};
policies.set(defaultPolicy.id, defaultPolicy);

// Sensitive categories that should always go to a human
const SENSITIVE_CATEGORIES = ['legal', 'medical', 'fraud', 'account_takeover', 'data_export', 'cancel'];

// ----------------------------- Decision engine -----------------------------

const decide = ({ aiConfidence, sentiment, priority, userRequestedHuman, category }) => {
  const decision = { shouldEscalate: false, reason: null, queueHint: null, urgency: 'normal' };

  if (priority === 'P0') {
    decision.shouldEscalate = true;
    decision.reason = 'urgent_priority';
    decision.queueHint = 'q-vip';
    decision.urgency = 'immediate';
    return decision;
  }

  if (userRequestedHuman) {
    decision.shouldEscalate = true;
    decision.reason = 'user_request';
    decision.queueHint = 'q-general';
    decision.urgency = 'normal';
    return decision;
  }

  if (sentiment === 'negative' && aiConfidence < 0.7) {
    decision.shouldEscalate = true;
    decision.reason = 'negative_sentiment';
    decision.queueHint = 'q-general';
    decision.urgency = 'high';
    return decision;
  }

  if (SENSITIVE_CATEGORIES.includes(category)) {
    decision.shouldEscalate = true;
    decision.reason = 'sensitive_category';
    decision.queueHint = category === 'billing' || category === 'fraud' ? 'q-billing' : 'q-general';
    decision.urgency = 'high';
    return decision;
  }

  if (typeof aiConfidence === 'number' && aiConfidence < defaultPolicy.aiConfidenceThreshold) {
    decision.shouldEscalate = true;
    decision.reason = 'low_ai_confidence';
    decision.queueHint = 'q-general';
    decision.urgency = 'normal';
    return decision;
  }

  decision.reason = 'ai_can_continue';
  decision.queueHint = null;
  return decision;
};

// ----------------------------- Agent matcher -----------------------------

const pickAgent = (queueSkills, languageHint) => {
  const candidates = [...agents.values()].filter(a => a.status === 'available');
  if (!candidates.length) return null;
  // Score: +3 per matching skill, +5 language match (strong preference),
  // -2 per active session (load matters), tiebreak by free capacity.
  const scored = candidates.map(a => {
    const skillMatch = (a.skills || []).filter(s => queueSkills.includes(s)).length * 3;
    const langMatch = languageHint && (a.skills || []).includes(languageHint) ? 5 : 0;
    const activeLoads = a.activeSessionId ? 1 : 0;
    const loadPenalty = activeLoads * 2;
    const capacityHeadroom = a.maxConcurrent - activeLoads;
    return { agent: a, score: skillMatch + langMatch - loadPenalty, capacityHeadroom, skillMatch, langMatch };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.capacityHeadroom - a.capacityHeadroom; // tiebreaker
  });
  return scored[0]?.agent || null;
};

// ----------------------------- Handoff builder -----------------------------

const buildHandoff = (session) => ({
  customerId: session.customerId,
  channel: session.channel,
  language: session.language,
  category: session.category,
  priority: session.priority,
  sentiment: session.sentiment,
  aiConfidence: session.aiConfidence,
  reason: session.escalationReason,
  history: session.history || [],
  recommendedNextActions: [
    'Acknowledge customer frustration if sentiment is negative',
    `Confirm customer identity via ${session.channel === 'email' ? 'account email' : 'phone OTP'}`,
    `Use ${session.language || 'en'} for response`,
  ],
  contextPayloadSize: JSON.stringify(session.history || []).length,
});

// ----------------------------- Routes -----------------------------

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy', service: 'live-support-os', version: '1.0.0', port: PORT,
    counts: {
      sessions: sessions.size,
      queues: queues.size,
      agents: agents.size,
      policies: policies.size,
      handoffs: handoffs.size,
    },
    timestamp: new Date().toISOString(),
  });
});

// ----- Queues -----
app.get('/api/queues', (_req, res) => res.json({ queues: [...queues.values()], count: queues.size }));

app.post('/api/queues',requireAuth,  (req, res) => {
  const { name, skills = [], priority = 'P3', slaMinutes = 60 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const id = `q-${uuidv4().slice(0, 8)}`;
  const q = { id, name, skills, priority, slaMinutes, createdAt: new Date().toISOString() };
  queues.set(id, q);
  res.status(201).json(q);
});

// ----- Agents -----
app.get('/api/agents', (_req, res) => {
  res.json({ agents: [...agents.values()], count: agents.size });
});

app.get('/api/agents/available', (req, res) => {
  const { skill } = req.query;
  let out = [...agents.values()].filter(a => a.status === 'available');
  if (skill) out = out.filter(a => a.skills.includes(skill));
  res.json({ agents: out, count: out.length });
});

app.patch('/api/agents/:id/status',requireAuth,  (req, res) => {
  const a = agents.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found' });
  const { status } = req.body || {};
  if (!['available', 'busy', 'offline', 'break'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
  a.status = status;
  if (status !== 'available') a.activeSessionId = null;
  res.json(a);
});

// ----- Policies -----
app.get('/api/policies', (_req, res) => res.json({ policies: [...policies.values()], count: policies.size }));

app.post('/api/policies',requireAuth,  (req, res) => {
  const { name, rules, aiConfidenceThreshold } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const id = `pol-${uuidv4().slice(0, 8)}`;
  const p = { id, name, rules: rules || [], aiConfidenceThreshold: aiConfidenceThreshold || 0.55, createdAt: new Date().toISOString() };
  policies.set(id, p);
  res.status(201).json(p);
});

// ----- Sessions (the core) -----
app.post('/api/sessions',requireAuth,  (req, res) => {
  const { customerId, channel, category, priority, sentiment, aiConfidence, language, region, history = [], userRequestedHuman = false } = req.body || {};
  if (!customerId || !channel) return res.status(400).json({ error: 'customerId_and_channel_required' });

  const decision = decide({ aiConfidence, sentiment, priority, userRequestedHuman, category });

  const id = `ses-${uuidv4().slice(0, 12)}`;
  const session = {
    id,
    customerId,
    channel, // chat / email / whatsapp / voice
    category: category || 'general',
    priority: priority || 'P3',
    sentiment: sentiment || 'neutral',
    aiConfidence: typeof aiConfidence === 'number' ? aiConfidence : null,
    language: language || 'en',
    region: region || null,
    userRequestedHuman,
    history,
    status: decision.shouldEscalate ? 'escalated' : 'ai_active',
    escalationReason: decision.shouldEscalate ? decision.reason : null,
    queueId: decision.shouldEscalate ? decision.queueHint : null,
    assignedAgentId: null,
    handoffId: null,
    decision,
    createdAt: new Date().toISOString(),
  };
  sessions.set(id, session);

  // If escalation needed: try to assign immediately
  let assignedAgent = null;
  let handoffId = null;
  if (decision.shouldEscalate) {
    const queue = queues.get(decision.queueHint);
    if (queue) {
      assignedAgent = pickAgent(queue.skills, session.language);
      if (assignedAgent) {
        session.assignedAgentId = assignedAgent.id;
        session.status = decision.urgency === 'immediate' ? 'assigned_urgent' : 'assigned';
        assignedAgent.activeSessionId = id;
        const handoff = { id: `hof-${uuidv4().slice(0, 8)}`, sessionId: id, agentId: assignedAgent.id, context: buildHandoff(session), createdAt: new Date().toISOString() };
        handoffs.set(handoff.id, handoff);
        session.handoffId = handoff.id;
        handoffId = handoff.id;
      } else {
        session.status = 'queued_no_agent';
      }
    }
    sessions.set(id, session);
  }

  res.status(201).json({ session, decision, assignedAgent, handoffId });
});

app.get('/api/sessions', (req, res) => {
  const { status, queueId, agentId } = req.query;
  let out = [...sessions.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (status) out = out.filter(s => s.status === status);
  if (queueId) out = out.filter(s => s.queueId === queueId);
  if (agentId) out = out.filter(s => s.assignedAgentId === agentId);
  res.json({ sessions: out, count: out.length });
});

app.get('/api/sessions/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  res.json(s);
});

app.post('/api/sessions/:id/close',requireAuth,  (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  s.status = 'closed';
  s.closedAt = new Date().toISOString();
  if (s.assignedAgentId) {
    const a = agents.get(s.assignedAgentId);
    if (a) { a.activeSessionId = null; a.status = 'available'; }
  }
  res.json(s);
});

// ----- Handoffs -----
app.get('/api/handoffs/:id', (req, res) => {
  const h = handoffs.get(req.params.id);
  if (!h) return res.status(404).json({ error: 'not_found' });
  res.json(h);
});

// ----- 404 -----
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[live-support-os] listening on ${PORT}`);
});
installGracefulShutdown(server);
