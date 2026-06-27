/**
 * PolicyOS — Agent Trust (Phase 5)
 *
 * Endpoints:
 *  - POST /api/agents/register       — register an agent
 *  - GET  /api/agents                — list agents
 *  - GET  /api/agents/:id            — get one agent
 *  - PATCH /api/agents/:id           — update agent
 *  - POST /api/agents/:id/score      — submit score
 *  - GET  /api/agents/:id/trust      — get trust score
 *  - POST /api/agents/:id/trust/bridge — bridge to external Trust Engine
 *  - GET  /api/trust/leaderboard     — agent leaderboard
 */

// ── Agent Identity Registry ───────────────────────────────────────────────────

const agentRegistry = new Map();
let agentIdCounter = 0;

export const AGENT_TYPES = {
  GENIE: 'genie',
  MERCHANT: 'merchant',
  SYSTEM: 'system',
  PARTNER: 'partner',
  HYBRID: 'hybrid',
};

export const AGENT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  PENDING: 'pending',
};

export const TRUST_LEVELS = {
  PLATINUM: { name: 'Platinum', min: 90 },
  GOLD: { name: 'Gold', min: 80 },
  SILVER: { name: 'Silver', min: 70 },
  BRONZE: { name: 'Bronze', min: 50 },
  IRON: { name: 'Iron', min: 30 },
  RESTRICTED: { name: 'Restricted', min: 0 },
};

export const SCORE_DIMENSIONS = {
  RELIABILITY: 'reliability',
  SAFETY: 'safety',
  ACCURACY: 'accuracy',
  TRANSPARENCY: 'transparency',
  PERFORMANCE: 'performance',
  COMPLIANCE: 'compliance',
};

// ── Multi-dimensional Trust Scoring ──────────────────────────────────────────

export function computeTrustLevel(score) {
  if (score >= TRUST_LEVELS.PLATINUM.min) return TRUST_LEVELS.PLATINUM;
  if (score >= TRUST_LEVELS.GOLD.min) return TRUST_LEVELS.GOLD;
  if (score >= TRUST_LEVELS.SILVER.min) return TRUST_LEVELS.SILVER;
  if (score >= TRUST_LEVELS.BRONZE.min) return TRUST_LEVELS.BRONZE;
  if (score >= TRUST_LEVELS.IRON.min) return TRUST_LEVELS.IRON;
  return TRUST_LEVELS.RESTRICTED;
}

export function computeWeightedScore(dimensions) {
  const weights = {
    [SCORE_DIMENSIONS.RELIABILITY]: 0.25,
    [SCORE_DIMENSIONS.SAFETY]: 0.25,
    [SCORE_DIMENSIONS.ACCURACY]: 0.20,
    [SCORE_DIMENSIONS.TRANSPARENCY]: 0.15,
    [SCORE_DIMENSIONS.PERFORMANCE]: 0.10,
    [SCORE_DIMENSIONS.COMPLIANCE]: 0.05,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [dim, score] of Object.entries(dimensions)) {
    const w = weights[dim] || 0.1;
    weightedSum += score * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

export function computeAgentTrust(agentId) {
  const agent = agentRegistry.get(agentId);
  if (!agent) return null;

  const scores = agent.scores || {};
  const dimensions = {};
  let hasScores = false;

  for (const dim of Object.values(SCORE_DIMENSIONS)) {
    if (scores[dim] !== undefined) {
      dimensions[dim] = scores[dim];
      hasScores = true;
    }
  }

  if (!hasScores) {
    // Default trust for new agents
    return {
      overall: 75,
      dimensions: {},
      level: TRUST_LEVELS.BRONZE,
      history: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const overall = computeWeightedScore(dimensions);
  const level = computeTrustLevel(overall);

  return {
    overall,
    dimensions,
    level,
    history: agent.scoreHistory || [],
    transactionCount: agent.transactionCount || 0,
    lastUpdated: new Date().toISOString(),
  };
}

export function scoreAgent(agentId, { dimension, score, evidence, scoredBy }) {
  const agent = agentRegistry.get(agentId);
  if (!agent) return null;

  if (score < 0 || score > 100) return null;

  if (!agent.scores) agent.scores = {};
  if (!agent.scoreHistory) agent.scoreHistory = [];

  // Update dimension score (weighted moving average)
  const prev = agent.scores[dimension] ?? 75;
  agent.scores[dimension] = Math.round(prev * 0.7 + score * 0.3);

  // Record in history
  agent.scoreHistory.push({
    dimension,
    score,
    previousScore: prev,
    evidence: evidence || null,
    scoredBy: scoredBy || 'system',
    timestamp: new Date().toISOString(),
  });

  // Trim history to last 100 entries
  if (agent.scoreHistory.length > 100) {
    agent.scoreHistory = agent.scoreHistory.slice(-100);
  }

  // Update transaction count
  agent.transactionCount = (agent.transactionCount || 0) + 1;

  return computeAgentTrust(agentId);
}

// ── Trust Engine Bridge ───────────────────────────────────────────────────────

export async function bridgeToTrustEngine(agentId, externalTrustEngineUrl) {
  const agent = agentRegistry.get(agentId);
  if (!agent) return { success: false, error: 'Agent not found' };

  const trust = computeAgentTrust(agentId);
  if (!trust) return { success: false, error: 'Could not compute trust' };

  // In production, this would call the external Trust Engine
  // For now, simulate the bridge
  try {
    return {
      success: true,
      agentId,
      externalScore: trust.overall,
      syncedAt: new Date().toISOString(),
      note: `Would sync to ${externalTrustEngineUrl || 'configured Trust Engine'}`,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Route Registration ───────────────────────────────────────────────────────

export function registerAgentTrustRoutes(app, { auditLog, customAuth }) {

  // POST /api/agents/register — register an agent
  app.post('/api/agents/register', customAuth, (req, res) => {
    const { name, type, capabilities, metadata } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!type || !Object.values(AGENT_TYPES).includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${Object.values(AGENT_TYPES).join(', ')}` });
    }

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `agent-${++agentIdCounter}-${Date.now()}`;
    const agent = {
      id,
      name,
      type,
      capabilities: capabilities || [],
      metadata: metadata || {},
      status: AGENT_STATUS.ACTIVE,
      registeredAt: new Date().toISOString(),
      registeredBy: req.auth?.sub,
      tenantId,
      scores: {},
      scoreHistory: [],
      transactionCount: 0,
    };

    agentRegistry.set(id, agent);

    if (auditLog) {
      auditLog.write({ event: 'agent.register', userId: req.auth?.sub, tenantId, data: { id, name, type }, timestamp: agent.registeredAt });
    }

    res.status(201).json({ ok: true, agent });
  });

  // GET /api/agents — list agents
  app.get('/api/agents', customAuth, (req, res) => {
    const { type, status, limit = 50, offset = 0 } = req.query;
    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    let agents = [...agentRegistry.values()].filter(a => a.tenantId === tenantId);
    if (type) agents = agents.filter(a => a.type === type);
    if (status) agents = agents.filter(a => a.status === status);

    const total = agents.length;
    agents = agents.slice(parseInt(offset) || 0, parseInt(offset) + parseInt(limit));

    res.json({ count: agents.length, total, agents });
  });

  // GET /api/agents/:id — get one agent
  app.get('/api/agents/:id', customAuth, (req, res) => {
    const agent = agentRegistry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    res.json({ agent });
  });

  // PATCH /api/agents/:id — update agent
  app.patch('/api/agents/:id', customAuth, (req, res) => {
    const agent = agentRegistry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });

    const { status, capabilities, metadata } = req.body;
    if (status && Object.values(AGENT_STATUS).includes(status)) agent.status = status;
    if (capabilities) agent.capabilities = capabilities;
    if (metadata) agent.metadata = { ...agent.metadata, ...metadata };
    agent.updatedAt = new Date().toISOString();

    res.json({ ok: true, agent });
  });

  // POST /api/agents/:id/score — submit a score
  app.post('/api/agents/:id/score', customAuth, (req, res) => {
    const { dimension, score, evidence } = req.body;

    if (!dimension || !Object.values(SCORE_DIMENSIONS).includes(dimension)) {
      return res.status(400).json({ error: `dimension must be one of: ${Object.values(SCORE_DIMENSIONS).join(', ')}` });
    }
    if (score === undefined || typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ error: 'score must be a number between 0 and 100' });
    }

    const agent = agentRegistry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });

    const result = scoreAgent(req.params.id, {
      dimension,
      score,
      evidence,
      scoredBy: req.auth?.sub,
    });

    if (!result) return res.status(400).json({ error: 'Failed to score agent' });

    if (auditLog) {
      auditLog.write({ event: 'agent.score', userId: req.auth?.sub, tenantId: req.auth?.tenantId, data: { agentId: req.params.id, dimension, score }, timestamp: new Date().toISOString() });
    }

    res.json({ ok: true, ...result });
  });

  // GET /api/agents/:id/trust — get trust score
  app.get('/api/agents/:id/trust', customAuth, (req, res) => {
    const trust = computeAgentTrust(req.params.id);
    if (!trust) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    res.json({ agentId: req.params.id, trust });
  });

  // POST /api/agents/:id/trust/bridge — bridge to external Trust Engine
  app.post('/api/agents/:id/trust/bridge', customAuth, async (req, res) => {
    const { trustEngineUrl } = req.body;
    const result = await bridgeToTrustEngine(req.params.id, trustEngineUrl);
    res.json({ ok: result.success, ...result });
  });

  // GET /api/trust/leaderboard — agent leaderboard
  app.get('/api/trust/leaderboard', customAuth, (req, res) => {
    const { type, limit = 20, offset = 0 } = req.query;
    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    let agents = [...agentRegistry.values()].filter(a => a.tenantId === tenantId && a.status === AGENT_STATUS.ACTIVE);
    if (type) agents = agents.filter(a => a.type === type);

    // Compute trust for each and sort
    const withTrust = agents.map(a => ({
      ...a,
      trust: computeAgentTrust(a.id),
    })).filter(a => a.trust).sort((a, b) => b.trust.overall - a.trust.overall);

    res.json({
      count: withTrust.length,
      leaders: withTrust.slice(parseInt(offset) || 0, parseInt(offset) + parseInt(limit)),
    });
  });

  // GET /api/agents/:id/history — get score history
  app.get('/api/agents/:id/history', customAuth, (req, res) => {
    const { dimension, limit = 50 } = req.query;
    const agent = agentRegistry.get(req.params.id);
    if (!agent) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });

    let history = agent.scoreHistory || [];
    if (dimension) history = history.filter(h => h.dimension === dimension);
    history = history.slice(-(parseInt(limit) || 50));

    res.json({ agentId: req.params.id, dimension: dimension || null, count: history.length, history });
  });
}