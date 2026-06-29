/**
 * LoopOS Fleet Manager
 * AI employee organization management
 * Port: 4725
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4725;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Autonomy levels
const AUTONOMY_LEVELS = {
  RESTRICTED: 1,     // Needs approval for everything
  ASSISTED: 2,       // Routine tasks auto, complex need approval
  SUPERVISED: 3,     // Can handle most, escalation for edge cases
  DELEGATED: 4,      // Full autonomy with reporting
  FULLY_AUTONOMOUS: 5 // Complete autonomy
};

// Agent health states
const HEALTH_STATES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  OFFLINE: 'offline',
  ERROR: 'error'
};

// In-memory stores
const fleets = new Map();
const agents = new Map();
const capabilities = new Map();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'fleet-os',
  version: '1.0.0',
  port: PORT,
  fleets: fleets.size,
  agents: agents.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Fleet CRUD ─────────────────────────────────────────

/**
 * Create fleet
 * POST /api/fleets
 */
app.post('/api/fleets', requireAuth, (req, res) => {
  const {
    name,
    parentFleetId,
    ownerTwinId,
    description,
    department
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `fleet-${randomUUID().slice(0, 8)}`;
  const fleet = {
    id,
    name,
    parentFleetId: parentFleetId || null,
    ownerTwinId: ownerTwinId || null,
    description: description || '',
    department: department || 'general',
    trustLevel: 50,
    autonomyLevel: AUTONOMY_LEVELS.SUPERVISED,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  fleets.set(id, fleet);
  logger.info(`Fleet created: ${id} (${name})`);
  res.status(201).json(fleet);
});

/**
 * List fleets
 * GET /api/fleets
 */
app.get('/api/fleets', (req, res) => {
  const { parentId, department, status } = req.query;
  let items = [...fleets.values()];

  if (parentId !== undefined) items = items.filter(f => f.parentFleetId === parentId);
  if (department) items = items.filter(f => f.department === department);
  if (status) items = items.filter(f => f.status === status);

  res.json({ count: items.length, fleets: items });
});

/**
 * Get fleet
 * GET /api/fleets/:id
 */
app.get('/api/fleets/:id', (req, res) => {
  const fleet = fleets.get(req.params.id);
  if (!fleet) return res.status(404).json({ error: 'fleet not found' });

  // Add health and agent counts
  const fleetAgents = [...agents.values()].filter(a => a.fleetId === req.params.id);
  const health = calculateFleetHealth(fleetAgents);

  res.json({ ...fleet, health, agentCount: fleetAgents.length });
});

/**
 * Update fleet
 * PUT /api/fleets/:id
 */
app.put('/api/fleets/:id', requireAuth, (req, res) => {
  const fleet = fleets.get(req.params.id);
  if (!fleet) return res.status(404).json({ error: 'fleet not found' });

  const updates = req.body || {};
  const allowed = ['name', 'description', 'department', 'trustLevel', 'autonomyLevel', 'status'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fleet[key] = updates[key];
    }
  }
  fleet.updatedAt = new Date().toISOString();

  logger.info(`Fleet updated: ${fleet.id}`);
  res.json(fleet);
});

/**
 * Delete fleet
 * DELETE /api/fleets/:id
 */
app.delete('/api/fleets/:id', requireAuth, (req, res) => {
  if (!fleets.has(req.params.id)) return res.status(404).json({ error: 'fleet not found' });

  // Remove agents from fleet
  for (const [agentId, agent] of agents) {
    if (agent.fleetId === req.params.id) {
      agent.fleetId = null;
    }
  }

  fleets.delete(req.params.id);
  logger.info(`Fleet deleted: ${req.params.id}`);
  res.json({ deleted: true, id: req.params.id });
});

// ── Agent Management ───────────────────────────────────

/**
 * Add agent to fleet
 * POST /api/fleets/:id/agents
 */
app.post('/api/fleets/:id/agents', requireAuth, (req, res) => {
  const fleet = fleets.get(req.params.id);
  if (!fleet) return res.status(404).json({ error: 'fleet not found' });

  const {
    twinId,
    role,
    capabilities: agentCapabilities = [],
    reportsTo = null,
    initialTrustScore = 50
  } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });

  const id = `agent-${randomUUID().slice(0, 8)}`;
  const agent = {
    id,
    twinId,
    fleetId: fleet.id,
    role: role || 'worker',
    capabilities: agentCapabilities,
    reportsTo: reportsTo || null,
    trustScore: initialTrustScore,
    autonomyLevel: initialTrustScore > 80 ? AUTONOMY_LEVELS.DELEGATED :
                   initialTrustScore > 50 ? AUTONOMY_LEVELS.SUPERVISED :
                   AUTONOMY_LEVELS.RESTRICTED,
    health: HEALTH_STATES.HEALTHY,
    status: 'active',
    stats: {
      tasksCompleted: 0,
      tasksFailed: 0,
      approvalsNeeded: 0,
      totalCost: 0,
      totalTokens: 0
    },
    lastHeartbeat: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  agents.set(id, agent);
  logger.info(`Agent added to fleet: ${id} (${twinId})`);
  res.status(201).json(agent);
});

/**
 * List agents in fleet
 * GET /api/fleets/:id/agents
 */
app.get('/api/fleets/:id/agents', (req, res) => {
  const fleet = fleets.get(req.params.id);
  if (!fleet) return res.status(404).json({ error: 'fleet not found' });

  const fleetAgents = [...agents.values()].filter(a => a.fleetId === req.params.id);
  res.json({ count: fleetAgents.length, agents: fleetAgents });
});

/**
 * Get agent
 * GET /api/agents/:id
 */
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  res.json(agent);
});

/**
 * Update agent
 * PUT /api/agents/:id
 */
app.put('/api/agents/:id', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  const updates = req.body || {};
  const allowed = ['role', 'capabilities', 'reportsTo', 'trustScore', 'autonomyLevel', 'health', 'status'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      agent[key] = updates[key];
    }
  }
  agent.updatedAt = new Date().toISOString();

  logger.info(`Agent updated: ${agent.id}`);
  res.json(agent);
});

/**
 * Remove agent from fleet
 * DELETE /api/agents/:id
 */
app.delete('/api/agents/:id', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  agent.fleetId = null;
  agent.status = 'removed';
  agent.updatedAt = new Date().toISOString();

  res.json({ removed: true, id: req.params.id });
});

/**
 * Agent heartbeat
 * POST /api/agents/:id/heartbeat
 */
app.post('/api/agents/:id/heartbeat', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  agent.lastHeartbeat = new Date().toISOString();
  agent.health = req.body?.health || agent.health;

  res.json({ ok: true, heartbeat: agent.lastHeartbeat });
});

/**
 * Update agent stats
 * POST /api/agents/:id/stats
 */
app.post('/api/agents/:id/stats', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  const { tasksCompleted, tasksFailed, cost, tokens } = req.body || {};

  if (tasksCompleted != null) agent.stats.tasksCompleted += tasksCompleted;
  if (tasksFailed != null) agent.stats.tasksFailed += tasksFailed;
  if (cost != null) agent.stats.totalCost += cost;
  if (tokens != null) agent.stats.totalTokens += tokens;

  agent.updatedAt = new Date().toISOString();
  res.json(agent);
});

// ── Fleet Health ───────────────────────────────────────

/**
 * Get fleet health dashboard
 * GET /api/fleets/:id/health
 */
app.get('/api/fleets/:id/health', (req, res) => {
  const fleet = fleets.get(req.params.id);
  if (!fleet) return res.status(404).json({ error: 'fleet not found' });

  const fleetAgents = [...agents.values()].filter(a => a.fleetId === req.params.id);
  const health = calculateFleetHealth(fleetAgents);

  // Calculate health by autonomy level
  const byAutonomy = {};
  for (const level of Object.keys(AUTONOMY_LEVELS)) {
    const levelAgents = fleetAgents.filter(a => a.autonomyLevel === AUTONOMY_LEVELS[level]);
    if (levelAgents.length > 0) {
      byAutonomy[level] = {
        count: levelAgents.length,
        healthy: levelAgents.filter(a => a.health === HEALTH_STATES.HEALTHY).length
      };
    }
  }

  res.json({
    fleetId: fleet.id,
    fleetName: fleet.name,
    ...health,
    byAutonomy,
    timestamp: new Date().toISOString()
  });
});

function calculateFleetHealth(fleetAgents) {
  if (fleetAgents.length === 0) {
    return {
      totalAgents: 0,
      healthyAgents: 0,
      degradedAgents: 0,
      offlineAgents: 0,
      errorAgents: 0,
      avgTrustScore: 0,
      avgAutonomyLevel: 0,
      totalCost: 0,
      totalTokens: 0
    };
  }

  const now = Date.now();
  const offlineThreshold = 5 * 60 * 1000; // 5 minutes

  let healthy = 0, degraded = 0, offline = 0, error = 0;
  let totalTrust = 0, totalAutonomy = 0, totalCost = 0, totalTokens = 0;

  for (const agent of fleetAgents) {
    totalTrust += agent.trustScore;
    totalAutonomy += agent.autonomyLevel;
    totalCost += agent.stats.totalCost;
    totalTokens += agent.stats.totalTokens;

    const lastBeat = new Date(agent.lastHeartbeat).getTime();
    if (agent.health === HEALTH_STATES.ERROR) {
      error++;
    } else if (now - lastBeat > offlineThreshold) {
      offline++;
    } else if (agent.health === HEALTH_STATES.DEGRADED) {
      degraded++;
    } else {
      healthy++;
    }
  }

  return {
    totalAgents: fleetAgents.length,
    healthyAgents: healthy,
    degradedAgents: degraded,
    offlineAgents: offline,
    errorAgents: error,
    avgTrustScore: Math.round(totalTrust / fleetAgents.length),
    avgAutonomyLevel: Math.round((totalAutonomy / fleetAgents.length) * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens
  };
}

// ── Escalation ─────────────────────────────────────────

/**
 * Escalate issue
 * POST /api/fleets/:id/escalate
 */
app.post('/api/fleets/:id/escalate', requireAuth, (req, res) => {
  const { agentId, issue, severity = 'medium' } = req.body || {};

  if (!agentId || !issue) {
    return res.status(400).json({ error: 'agentId and issue are required' });
  }

  const agent = agents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  // Find manager/parent
  let escalatedTo = null;
  if (agent.reportsTo) {
    const manager = agents.get(agent.reportsTo);
    if (manager) escalatedTo = { id: manager.id, twinId: manager.twinId, role: manager.role };
  } else {
    // Escalate to fleet owner
    const fleet = fleets.get(agent.fleetId);
    if (fleet?.ownerTwinId) {
      escalatedTo = { twinId: fleet.ownerTwinId };
    }
  }

  const escalation = {
    id: `esc-${randomUUID().slice(0, 8)}`,
    fleetId: req.params.id,
    agentId,
    agentTwinId: agent.twinId,
    issue,
    severity,
    status: 'open',
    escalatedTo,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null
  };

  // Update agent health
  if (severity === 'high' || severity === 'critical') {
    agent.health = HEALTH_STATES.ERROR;
    agent.status = 'escalated';
  } else {
    agent.health = HEALTH_STATES.DEGRADED;
  }
  agent.updatedAt = new Date().toISOString();

  logger.warn(`Escalation created: ${escalation.id} for agent ${agentId}`);
  res.status(201).json(escalation);
});

/**
 * Resolve escalation
 * POST /api/escalations/:id/resolve
 */
app.post('/api/escalations/:id/resolve', requireAuth, (req, res) => {
  const { resolution } = req.body || {};

  // Find escalation (simplified - in production use proper storage)
  let foundEscalation = null;
  let foundAgent = null;

  for (const [, agent] of agents) {
    if (agent.lastEscalation?.id === req.params.id) {
      foundEscalation = agent.lastEscalation;
      foundAgent = agent;
      break;
    }
  }

  if (!foundEscalation) return res.status(404).json({ error: 'escalation not found' });

  foundEscalation.status = 'resolved';
  foundEscalation.resolvedAt = new Date().toISOString();
  foundEscalation.resolution = resolution || 'Resolved';

  if (foundAgent) {
    foundAgent.health = HEALTH_STATES.HEALTHY;
    foundAgent.status = 'active';
    foundAgent.updatedAt = new Date().toISOString();
  }

  logger.info(`Escalation resolved: ${req.params.id}`);
  res.json(foundEscalation);
});

/**
 * Get open escalations
 * GET /api/escalations
 */
app.get('/api/escalations', (req, res) => {
  const { fleetId, status = 'open' } = req.query;
  const allEscalations = [];

  for (const [, agent] of agents) {
    if (agent.lastEscalation) {
      if (fleetId && agent.fleetId !== fleetId) continue;
      if (status === 'open' && agent.lastEscalation.status !== 'open') continue;
      allEscalations.push(agent.lastEscalation);
    }
  }

  res.json({ count: allEscalations.length, escalations: allEscalations });
});

// ── Capabilities ────────────────────────────────────────

/**
 * Register capability
 * POST /api/capabilities
 */
app.post('/api/capabilities', requireAuth, (req, res) => {
  const { agentId, capability, proficiency = 0.8 } = req.body || {};

  if (!agentId || !capability) {
    return res.status(400).json({ error: 'agentId and capability are required' });
  }

  const agent = agents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  // Add capability to agent
  if (!agent.capabilities.find(c => c.name === capability)) {
    agent.capabilities.push({ name: capability, proficiency });
  }

  // Also register globally
  const capKey = capability.toLowerCase();
  if (!capabilities.has(capKey)) {
    capabilities.set(capKey, []);
  }
  capabilities.get(capKey).push({ agentId: agent.id, twinId: agent.twinId, proficiency });

  agent.updatedAt = new Date().toISOString();
  logger.info(`Capability ${capability} added to agent ${agentId}`);
  res.json({ added: true, agentId, capability, proficiency });
});

/**
 * Find agents with capability
 * GET /api/capabilities/:capability/agents
 */
app.get('/api/capabilities/:capability/agents', (req, res) => {
  const capKey = req.params.capability.toLowerCase();
  const agentList = capabilities.get(capKey) || [];

  const fullAgents = agentList
    .map(a => agents.get(a.agentId))
    .filter(Boolean)
    .map(a => ({ id: a.id, twinId: a.twinId, role: a.role, fleetId: a.fleetId, health: a.health }));

  res.json({ capability: capKey, count: fullAgents.length, agents: fullAgents });
});

/**
 * List all capabilities
 * GET /api/capabilities
 */
app.get('/api/capabilities', (req, res) => {
  const allCaps = [];
  for (const [name, agentList] of capabilities) {
    allCaps.push({
      name,
      agentCount: agentList.length,
      avgProficiency: agentList.reduce((sum, a) => sum + a.proficiency, 0) / agentList.length
    });
  }
  res.json({ count: allCaps.length, capabilities: allCaps });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Fleet Manager listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
