/**
 * LoopOS Escalation Chain Manager
 * Human escalation with approval workflows
 * Port: 4749
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4749;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Escalation levels
const LEVELS = {
  INFO: 'info',           // Inform only
  WARNING: 'warning',      // Notify manager
  URGENT: 'urgent',      // Escalate to manager
  CRITICAL: 'critical',   // Escalate to director
  EMERGENCY: 'emergency'  // Escalate to C-level
};

// Status
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled'
};

// In-memory stores
const chains = new Map();         // chainId -> EscalationChain
const requests = new Map();       // requestId -> EscalationRequest
const approvers = new Map();       // approverId -> ApproverConfig
const escalations = new Map();     // escalationId -> Escalation

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-escalation-manager',
  version: '1.0.0',
  port: PORT,
  chains: chains.size,
  pendingRequests: [...requests.values()].filter(r => r.status === STATUS.PENDING).length
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Approver Configuration ──────────────────────────────

/**
 * Create approver
 * POST /api/approvers
 */
app.post('/api/approvers', requireAuth, (req, res) => {
  const {
    id,
    name,
    email,
    level,
    department,
    roles = [],
    delegation = null,
    maxAmount,
    maxRiskLevel
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const approverId = id || `approver-${randomUUID().slice(0, 8)}`;

  const approver = {
    id: approverId,
    name,
    email: email || `${name.toLowerCase().replace(/\s/g, '.')}@company.com`,
    level: level || LEVELS.INFO,
    department: department || 'general',
    roles,
    delegation,
    maxAmount: maxAmount || Infinity,
    maxRiskLevel: maxRiskLevel || LEVELS.INFO,
    status: 'active',
    stats: { approved: 0, rejected: 0, delegated: 0 },
    createdAt: new Date().toISOString()
  };

  approvers.set(approverId, approver);
  logger.info(`Approver created: ${approverId} (${name})`);
  res.status(201).json(approver);
});

/**
 * Get approver
 * GET /api/approvers/:id
 */
app.get('/api/approvers/:id', (req, res) => {
  const approver = approvers.get(req.params.id);
  if (!approver) return res.status(404).json({ error: 'approver not found' });
  res.json(approver);
});

/**
 * List approvers
 * GET /api/approvers
 */
app.get('/api/approvers', (req, res) => {
  const { level, department, status } = req.query;
  let items = [...approvers.values()];

  if (level) items = items.filter(a => a.level === level);
  if (department) items = items.filter(a => a.department === department);
  if (status) items = items.filter(a => a.status === status);

  res.json({ count: items.length, approvers: items });
});

/**
 * Update approver
 * PUT /api/approvers/:id
 */
app.put('/api/approvers/:id', requireAuth, (req, res) => {
  const approver = approvers.get(req.params.id);
  if (!approver) return res.status(404).json({ error: 'approver not found' });

  const updates = req.body || {};
  Object.assign(approver, updates);

  res.json(approver);
});

// ── Escalation Chains ──────────────────────────────────

/**
 * Create escalation chain
 * POST /api/chains
 */
app.post('/api/chains', requireAuth, (req, res) => {
  const {
    name,
    description,
    levels = [],
    timeoutMinutes = 60,
    autoEscalate = true,
    fallbackApprover
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `chain-${randomUUID().slice(0, 8)}`;

  const chain = {
    id,
    name,
    description: description || '',
    levels: levels.map((l, i) => ({
      order: i + 1,
      level: l.level || Object.values(LEVELS)[i],
      approverId: l.approverId,
      approverName: l.approverName || 'TBD',
      timeoutMinutes: l.timeoutMinutes || timeoutMinutes,
      canDelegate: l.canDelegate !== false
    })),
    timeoutMinutes,
    autoEscalate,
    fallbackApprover,
    stats: { total: 0, approved: 0, rejected: 0, escalated: 0 },
    createdAt: new Date().toISOString()
  };

  chains.set(id, chain);
  logger.info(`Escalation chain created: ${id} (${name})`);
  res.status(201).json(chain);
});

/**
 * Get chain
 * GET /api/chains/:id
 */
app.get('/api/chains/:id', (req, res) => {
  const chain = chains.get(req.params.id);
  if (!chain) return res.status(404).json({ error: 'chain not found' });
  res.json(chain);
});

/**
 * List chains
 * GET /api/chains
 */
app.get('/api/chains', (req, res) => {
  const items = [...chains.values()];
  res.json({ count: items.length, chains: items });
});

/**
 * Delete chain
 * DELETE /api/chains/:id
 */
app.delete('/api/chains/:id', requireAuth, (req, res) => {
  if (!chains.has(req.params.id)) return res.status(404).json({ error: 'chain not found' });
  chains.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Escalation Requests ────────────────────────────────

/**
 * Create escalation request
 * POST /api/requests
 */
app.post('/api/requests', requireAuth, async (req, res) => {
  const {
    chainId,
    agentId,
    requester,
    type,
    title,
    description,
    amount,
    riskLevel = LEVELS.WARNING,
    metadata = {},
    context = {}
  } = req.body || {};

  if (!chainId) return res.status(400).json({ error: 'chainId is required' });

  const chain = chains.get(chainId);
  if (!chain) return res.status(404).json({ error: 'chain not found' });

  const id = `esc-${randomUUID().slice(0, 8)}`;

  // Determine initial level based on risk
  const levelIndex = Object.values(LEVELS).indexOf(riskLevel);
  const currentLevel = chain.levels[Math.min(levelIndex, chain.levels.length - 1)];

  const request = {
    id,
    chainId,
    chainName: chain.name,
    agentId,
    requester,
    type,
    title,
    description,
    amount,
    riskLevel,
    metadata,
    context,
    status: STATUS.PENDING,
    currentLevelIndex: 0,
    currentLevel: currentLevel.order,
    history: [{
      level: currentLevel.order,
      approverId: currentLevel.approverId,
      status: STATUS.PENDING,
      timestamp: new Date().toISOString(),
      action: 'created'
    }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (currentLevel.timeoutMinutes || chain.timeoutMinutes) * 60 * 1000).toISOString()
  };

  requests.set(id, request);

  // Update chain stats
  chain.stats.total++;

  logger.info(`Escalation request created: ${id} (${title})`);
  res.status(201).json(request);
});

/**
 * Get request
 * GET /api/requests/:id
 */
app.get('/api/requests/:id', (req, res) => {
  const request = requests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  res.json(request);
});

/**
 * List requests
 * GET /api/requests
 */
app.get('/api/requests', (req, res) => {
  const { status, approverId, chainId, agentId, limit = 50 } = req.query;
  let items = [...requests.values()];

  if (status) items = items.filter(r => r.status === status);
  if (chainId) items = items.filter(r => r.chainId === chainId);
  if (agentId) items = items.filter(r => r.agentId === agentId);
  if (approverId) {
    items = items.filter(r =>
      r.history.some(h => h.approverId === approverId && h.status === STATUS.PENDING)
    );
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, requests: items });
});

/**
 * Get pending requests for approver
 * GET /api/approvers/:id/pending
 */
app.get('/api/approvers/:id/pending', (req, res) => {
  const pending = [...requests.values()].filter(r =>
    r.status === STATUS.PENDING &&
    r.history.some(h =>
      h.approverId === req.params.id && h.status === STATUS.PENDING
    )
  );

  res.json({ count: pending.length, requests: pending });
});

// ── Approval Actions ──────────────────────────────────

/**
 * Approve request
 * POST /api/requests/:id/approve
 */
app.post('/api/requests/:id/approve', requireAuth, (req, res) => {
  const { approverId, comment, conditions = [] } = req.body || {};

  const request = requests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });

  if (request.status !== STATUS.PENDING) {
    return res.status(400).json({ error: 'Request is not pending' });
  }

  // Update current level history
  const currentHistory = request.history[request.history.length - 1];
  currentHistory.status = STATUS.APPROVED;
  currentHistory.comment = comment;
  currentHistory.approvedAt = new Date().toISOString();

  // Update request status
  request.status = STATUS.APPROVED;
  request.resolvedAt = new Date().toISOString();
  request.resolvedBy = approverId;

  // Update chain stats
  const chain = chains.get(request.chainId);
  if (chain) {
    chain.stats.approved++;
  }

  // Update approver stats
  if (approverId) {
    const approver = approvers.get(approverId);
    if (approver) approver.stats.approved++;
  }

  logger.info(`Request ${request.id} approved by ${approverId}`);
  res.json(request);
});

/**
 * Reject request
 * POST /api/requests/:id/reject
 */
app.post('/api/requests/:id/reject', requireAuth, (req, res) => {
  const { approverId, reason, requeue = false } = req.body || {};

  const request = requests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });

  if (request.status !== STATUS.PENDING) {
    return res.status(400).json({ error: 'Request is not pending' });
  }

  // Update current level history
  const currentHistory = request.history[request.history.length - 1];
  currentHistory.status = STATUS.REJECTED;
  currentHistory.reason = reason;
  currentHistory.rejectedAt = new Date().toISOString();

  if (requeue) {
    // Escalate to next level
    const chain = chains.get(request.chainId);
    const nextLevelIndex = request.currentLevelIndex + 1;

    if (nextLevelIndex < chain.levels.length) {
      request.currentLevelIndex = nextLevelIndex;
      request.currentLevel = chain.levels[nextLevelIndex].order;
      request.status = STATUS.ESCALATED;

      const nextLevel = chain.levels[nextLevelIndex];
      request.history.push({
        level: nextLevel.order,
        approverId: nextLevel.approverId,
        status: STATUS.PENDING,
        timestamp: new Date().toISOString(),
        action: 'escalated'
      });

      chain.stats.escalated++;
      logger.info(`Request ${request.id} escalated to level ${nextLevel.order}`);
    }
  } else {
    request.status = STATUS.REJECTED;
    request.resolvedAt = new Date().toISOString();
  }

  // Update approver stats
  if (approverId) {
    const approver = approvers.get(approverId);
    if (approver) approver.stats.rejected++;
  }

  // Update chain stats
  const chain = chains.get(request.chainId);
  if (chain && !requeue) {
    chain.stats.rejected++;
  }

  logger.info(`Request ${request.id} rejected by ${approverId}${requeue ? ' and requeued' : ''}`);
  res.json(request);
});

/**
 * Delegate request
 * POST /api/requests/:id/delegate
 */
app.post('/api/requests/:id/delegate', requireAuth, (req, res) => {
  const { approverId, toApproverId, reason } = req.body || {};

  const request = requests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });

  if (request.status !== STATUS.PENDING) {
    return res.status(400).json({ error: 'Request is not pending' });
  }

  const chain = chains.get(request.chainId);
  const currentLevel = chain.levels[request.currentLevelIndex];

  if (!currentLevel.canDelegate) {
    return res.status(400).json({ error: 'This level does not allow delegation' });
  }

  // Update history
  const currentHistory = request.history[request.history.length - 1];
  currentHistory.status = STATUS.PENDING;
  currentHistory.delegatedTo = toApproverId;
  currentHistory.delegationReason = reason;

  request.history.push({
    level: currentLevel.order,
    approverId: toApproverId,
    status: STATUS.PENDING,
    timestamp: new Date().toISOString(),
    action: 'delegated',
    fromApprover: approverId
  });

  // Update approver stats
  const approver = approvers.get(approverId);
  if (approver) approver.stats.delegated++;

  logger.info(`Request ${request.id} delegated from ${approverId} to ${toApproverId}`);
  res.json(request);
});

/**
 * Cancel request
 * POST /api/requests/:id/cancel
 */
app.post('/api/requests/:id/cancel', requireAuth, (req, res) => {
  const { agentId, reason } = req.body || {};

  const request = requests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });

  if (request.status !== STATUS.PENDING) {
    return res.status(400).json({ error: 'Can only cancel pending requests' });
  }

  request.status = STATUS.CANCELLED;
  request.resolvedAt = new Date().toISOString();
  request.cancelReason = reason;
  request.cancelledBy = agentId;

  const currentHistory = request.history[request.history.length - 1];
  currentHistory.status = STATUS.CANCELLED;
  currentHistory.action = 'cancelled';

  logger.info(`Request ${request.id} cancelled by ${agentId}`);
  res.json(request);
});

// ── Quick Escalation (Direct) ──────────────────────────

/**
 * Quick escalation (bypass chain definition)
 * POST /api/escalate
 */
app.post('/api/escalate', requireAuth, (req, res) => {
  const {
    agentId,
    type,
    title,
    description,
    amount,
    riskLevel = LEVELS.WARNING,
    targetApproverId
  } = req.body || {};

  if (!title) return res.status(400).json({ error: 'title is required' });

  const id = `esc-${randomUUID().slice(0, 8)}`;

  const request = {
    id,
    chainId: 'direct',
    agentId,
    type,
    title,
    description,
    amount,
    riskLevel,
    status: STATUS.PENDING,
    currentLevel: 1,
    history: [{
      level: 1,
      approverId: targetApproverId,
      status: STATUS.PENDING,
      timestamp: new Date().toISOString(),
      action: 'direct_escalation'
    }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };

  requests.set(id, request);

  logger.info(`Direct escalation: ${id} (${title})`);
  res.status(201).json(request);
});

// ── Analytics ────────────────────────────────────────

/**
 * Get escalation analytics
 * GET /api/analytics
 */
app.get('/api/analytics', (req, res) => {
  const { chainId, period } = req.query;

  let items = [...requests.values()];

  if (chainId) items = items.filter(r => r.chainId === chainId);

  // Filter by period
  if (period) {
    const now = new Date();
    const periodMs = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[period] || 7 * 24 * 60 * 60 * 1000;

    items = items.filter(r => new Date(r.createdAt).getTime() > now.getTime() - periodMs);
  }

  const total = items.length;
  const approved = items.filter(r => r.status === STATUS.APPROVED).length;
  const rejected = items.filter(r => r.status === STATUS.REJECTED).length;
  const pending = items.filter(r => r.status === STATUS.PENDING).length;
  const escalated = items.filter(r => r.status === STATUS.ESCALATED).length;

  // By risk level
  const byRiskLevel = {};
  for (const level of Object.values(LEVELS)) {
    byRiskLevel[level] = items.filter(r => r.riskLevel === level).length;
  }

  // Average resolution time
  const resolved = items.filter(r => r.resolvedAt);
  const avgResolutionTime = resolved.length > 0
    ? resolved.reduce((sum, r) => sum + (new Date(r.resolvedAt) - new Date(r.createdAt)), 0) / resolved.length / 60000
    : 0;

  res.json({
    period: period || 'all',
    total,
    approved,
    rejected,
    pending,
    escalated,
    approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    byRiskLevel,
    avgResolutionMinutes: Math.round(avgResolutionTime),
    timestamp: new Date().toISOString()
  });
});

/**
 * Get approver stats
 * GET /api/approvers/:id/stats
 */
app.get('/api/approvers/:id/stats', (req, res) => {
  const approver = approvers.get(req.params.id);
  if (!approver) return res.status(404).json({ error: 'approver not found' });

  const pending = [...requests.values()].filter(r =>
    r.status === STATUS.PENDING &&
    r.history.some(h => h.approverId === req.params.id && h.status === STATUS.PENDING)
  );

  const resolved = [...requests.values()].filter(r =>
    r.resolvedBy === req.params.id
  );

  res.json({
    approverId: req.params.id,
    name: approver.name,
    level: approver.level,
    pendingCount: pending.length,
    totalResolved: resolved.length,
    approved: approver.stats.approved,
    rejected: approver.stats.rejected,
    delegated: approver.stats.delegated,
    approvalRate: approver.stats.approved + approver.stats.rejected > 0
      ? Math.round((approver.stats.approved / (approver.stats.approved + approver.stats.rejected)) * 100)
      : 0
  });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Escalation Chain Manager listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
