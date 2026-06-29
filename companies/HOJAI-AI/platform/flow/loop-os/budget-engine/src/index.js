/**
 * LoopOS Budget Engine
 * Token, cost, and tool limits per AI agent
 * Port: 4724
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4724;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Risk levels
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Budget statuses
const BUDGET_STATUS = {
  ACTIVE: 'active',
  WARNING: 'warning',    // > 80% used
  EXCEEDED: 'exceeded',  // > 100% used
  FROZEN: 'frozen',      // Manually frozen
  DEPLETED: 'depleted'    // Fully used
};

// In-memory stores
const budgets = new Map();      // twinId -> AgentBudget
const usage = new Map();        // twinId -> { daily: [], monthly: [] }
const allocations = new Map();  // allocationId -> BudgetAllocation

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
  service: 'budget-engine',
  version: '1.0.0',
  port: PORT,
  budgets: budgets.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Budget CRUD ─────────────────────────────────────────

/**
 * Create budget for agent
 * POST /api/budgets
 */
app.post('/api/budgets', requireAuth, (req, res) => {
  const {
    twinId,
    name,
    dailyTokens = 500000,
    monthlyTokens = 15000000,
    dailySpend = 100,
    monthlySpend = 3000,
    maxToolCalls = 1000,
    maxRetries = 3,
    riskLevel = RISK_LEVELS.MEDIUM,
    approvalThreshold = 50
  } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });
  if (budgets.has(twinId)) return res.status(409).json({ error: 'budget already exists for this twin' });

  const budget = {
    twinId,
    name: name || `${twinId} budget`,
    limits: {
      dailyTokens,
      monthlyTokens,
      dailySpend,
      monthlySpend,
      maxToolCalls,
      maxRetries
    },
    riskLevel,
    approvalThreshold,
    status: BUDGET_STATUS.ACTIVE,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  budgets.set(twinId, budget);

  // Initialize usage tracking
  usage.set(twinId, {
    daily: [],
    monthly: [],
    allTime: { tokens: 0, spend: 0, toolCalls: 0 }
  });

  logger.info(`Budget created for: ${twinId}`);
  res.status(201).json(budget);
});

/**
 * Get agent budget
 * GET /api/budgets/:twinId
 */
app.get('/api/budgets/:twinId', (req, res) => {
  const budget = budgets.get(req.params.twinId);
  if (!budget) return res.status(404).json({ error: 'budget not found' });

  const usageData = getUsageSummary(req.params.twinId);
  res.json({ ...budget, usage: usageData });
});

/**
 * List all budgets
 * GET /api/budgets
 */
app.get('/api/budgets', (req, res) => {
  const { riskLevel, status } = req.query;
  let items = [...budgets.values()];

  if (riskLevel) items = items.filter(b => b.riskLevel === riskLevel);
  if (status) items = items.filter(b => getBudgetStatus(b) === status);

  // Add usage summary
  items = items.map(b => ({ ...b, usage: getUsageSummary(b.twinId) }));

  res.json({ count: items.length, budgets: items });
});

/**
 * Update budget
 * PUT /api/budgets/:twinId
 */
app.put('/api/budgets/:twinId', requireAuth, (req, res) => {
  const budget = budgets.get(req.params.twinId);
  if (!budget) return res.status(404).json({ error: 'budget not found' });

  const updates = req.body || {};
  const allowed = ['name', 'limits', 'riskLevel', 'approvalThreshold', 'enabled'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      budget[key] = updates[key];
    }
  }
  budget.updatedAt = new Date().toISOString();

  logger.info(`Budget updated for: ${req.params.twinId}`);
  res.json(budget);
});

/**
 * Delete budget
 * DELETE /api/budgets/:twinId
 */
app.delete('/api/budgets/:twinId', requireAuth, (req, res) => {
  if (!budgets.has(req.params.twinId)) return res.status(404).json({ error: 'budget not found' });

  budgets.delete(req.params.twinId);
  usage.delete(req.params.twinId);

  res.json({ deleted: true, twinId: req.params.twinId });
});

// ── Budget Checking ─────────────────────────────────────

/**
 * Check if action is allowed
 * POST /api/budgets/:twinId/check
 */
app.post('/api/budgets/:twinId/check', requireAuth, (req, res) => {
  const { tokens = 0, spend = 0, toolCalls = 1 } = req.body || {};
  const budget = budgets.get(req.params.twinId);

  if (!budget) return res.status(404).json({ error: 'budget not found' });
  if (!budget.enabled) return res.status(400).json({ allowed: false, reason: 'Budget is disabled' });

  const usageData = getUsageSummary(req.params.twinId);
  const limits = budget.limits;

  const checks = {
    tokens: {
      limit: limits.dailyTokens,
      used: usageData.daily.tokens,
      requested: tokens,
      allowed: (usageData.daily.tokens + tokens) <= limits.dailyTokens,
      remaining: Math.max(0, limits.dailyTokens - usageData.daily.tokens)
    },
    spend: {
      limit: limits.dailySpend,
      used: usageData.daily.spend,
      requested: spend,
      allowed: (usageData.daily.spend + spend) <= limits.dailySpend,
      remaining: Math.max(0, limits.dailySpend - usageData.daily.spend)
    },
    toolCalls: {
      limit: limits.maxToolCalls,
      used: usageData.daily.toolCalls,
      requested: toolCalls,
      allowed: (usageData.daily.toolCalls + toolCalls) <= limits.maxToolCalls,
      remaining: Math.max(0, limits.maxToolCalls - usageData.daily.toolCalls)
    }
  };

  const overallAllowed = checks.tokens.allowed && checks.spend.allowed && checks.toolCalls.allowed;
  const riskLevel = determineRisk(checks, budget);

  res.json({
    allowed: overallAllowed,
    twinId: req.params.twinId,
    checks,
    riskLevel,
    requiresApproval: riskLevel === 'high' || riskLevel === 'critical',
    approvalThreshold: budget.approvalThreshold
  });
});

/**
 * Deduct from budget
 * POST /api/budgets/:twinId/deduct
 */
app.post('/api/budgets/:twinId/deduct', requireAuth, (req, res) => {
  const { tokens = 0, spend = 0, toolCalls = 1, action, loopId, executionId } = req.body || {};
  const budget = budgets.get(req.params.twinId);

  if (!budget) return res.status(404).json({ error: 'budget not found' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  let usageData = usage.get(req.params.twinId);

  // Initialize if needed
  if (!usageData) {
    usageData = { daily: [], monthly: [], allTime: { tokens: 0, spend: 0, toolCalls: 0 } };
    usage.set(req.params.twinId, usageData);
  }

  // Record daily usage
  usageData.daily.push({
    date: today,
    tokens,
    spend,
    toolCalls,
    action,
    loopId,
    executionId,
    timestamp: now.toISOString()
  });

  // Record monthly usage
  const monthEntry = usageData.monthly.find(m => m.month === thisMonth);
  if (monthEntry) {
    monthEntry.tokens += tokens;
    monthEntry.spend += spend;
    monthEntry.toolCalls += toolCalls;
  } else {
    usageData.monthly.push({
      month: thisMonth,
      tokens,
      spend,
      toolCalls
    });
  }

  // Update all-time
  usageData.allTime.tokens += tokens;
  usageData.allTime.spend += spend;
  usageData.allTime.toolCalls += toolCalls;

  // Update budget status
  updateBudgetStatus(budget, req.params.twinId);

  logger.info(`Budget deducted for ${req.params.twinId}: tokens=${tokens}, spend=${spend}`);
  res.json({
    deducted: true,
    twinId: req.params.twinId,
    tokens,
    spend,
    toolCalls,
    newUsage: getUsageSummary(req.params.twinId)
  });
});

/**
 * Get remaining quota
 * GET /api/budgets/:twinId/remaining
 */
app.get('/api/budgets/:twinId/remaining', (req, res) => {
  const budget = budgets.get(req.params.twinId);
  if (!budget) return res.status(404).json({ error: 'budget not found' });

  const usageData = getUsageSummary(req.params.twinId);
  const limits = budget.limits;

  res.json({
    twinId: req.params.twinId,
    daily: {
      tokens: { limit: limits.dailyTokens, used: usageData.daily.tokens, remaining: limits.dailyTokens - usageData.daily.tokens },
      spend: { limit: limits.dailySpend, used: usageData.daily.spend, remaining: limits.dailySpend - usageData.daily.spend },
      toolCalls: { limit: limits.maxToolCalls, used: usageData.daily.toolCalls, remaining: limits.maxToolCalls - usageData.daily.toolCalls }
    },
    monthly: {
      tokens: { limit: limits.monthlyTokens, used: usageData.monthly.tokens, remaining: limits.monthlyTokens - usageData.monthly.tokens },
      spend: { limit: limits.monthlySpend, used: usageData.monthly.spend, remaining: limits.monthlySpend - usageData.monthly.spend }
    }
  });
});

// ── Usage History ────────────────────────────────────────

/**
 * Get usage history
 * GET /api/budgets/:twinId/usage
 */
app.get('/api/budgets/:twinId/usage', (req, res) => {
  const usageData = usage.get(req.params.twinId);
  if (!usageData) return res.status(404).json({ error: 'usage not found' });

  const { period = 'daily', limit = 100 } = req.query;

  if (period === 'daily') {
    const daily = usageData.daily.slice(-Number(limit));
    res.json({ period: 'daily', count: daily.length, entries: daily });
  } else if (period === 'monthly') {
    res.json({ period: 'monthly', count: usageData.monthly.length, entries: usageData.monthly });
  } else {
    res.json({
      daily: usageData.daily.slice(-30),
      monthly: usageData.monthly,
      allTime: usageData.allTime
    });
  }
});

/**
 * Reset budget usage (admin)
 * POST /api/budgets/:twinId/reset
 */
app.post('/api/budgets/:twinId/reset', requireAuth, (req, res) => {
  const { period = 'daily' } = req.body || {};
  const budget = budgets.get(req.params.twinId);

  if (!budget) return res.status(404).json({ error: 'budget not found' });

  const usageData = usage.get(req.params.twinId);
  if (!usageData) return res.status(404).json({ error: 'usage not found' });

  if (period === 'daily') {
    usageData.daily = [];
  } else if (period === 'monthly') {
    usageData.monthly = [];
    usageData.daily = [];
  } else {
    usageData.daily = [];
    usageData.monthly = [];
    usageData.allTime = { tokens: 0, spend: 0, toolCalls: 0 };
  }

  budget.status = BUDGET_STATUS.ACTIVE;
  budget.updatedAt = new Date().toISOString();

  logger.info(`Budget reset for ${req.params.twinId}: ${period}`);
  res.json({ reset: true, period, twinId: req.params.twinId });
});

// ── Budget Allocation ────────────────────────────────────

/**
 * Create budget allocation (e.g., marketing budget to campaigns)
 * POST /api/allocations
 */
app.post('/api/allocations', requireAuth, (req, res) => {
  const { twinId, category, amount, period = 'monthly' } = req.body || {};

  if (!twinId || !category || amount == null) {
    return res.status(400).json({ error: 'twinId, category, and amount are required' });
  }

  const allocation = {
    id: `alloc-${randomUUID().slice(0, 8)}`,
    twinId,
    category,
    amount,
    spent: 0,
    period,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  allocations.set(allocation.id, allocation);
  logger.info(`Budget allocation created: ${allocation.id}`);
  res.status(201).json(allocation);
});

/**
 * Get allocations for twin
 * GET /api/allocations/:twinId
 */
app.get('/api/allocations/:twinId', (req, res) => {
  const twinAllocations = [...allocations.values()].filter(a => a.twinId === req.params.twinId);
  res.json({ count: twinAllocations.length, allocations: twinAllocations });
});

/**
 * Spend from allocation
 * POST /api/allocations/:id/spend
 */
app.post('/api/allocations/:id/spend', requireAuth, (req, res) => {
  const { amount, description } = req.body || {};
  const allocation = allocations.get(req.params.id);

  if (!allocation) return res.status(404).json({ error: 'allocation not found' });
  if (amount == null) return res.status(400).json({ error: 'amount is required' });

  allocation.spent += amount;
  if (allocation.spent >= allocation.amount) {
    allocation.status = 'depleted';
  }

  logger.info(`Allocation ${allocation.id} spent: ${amount}`);
  res.json(allocation);
});

// ── Helper Functions ─────────────────────────────────────

function getUsageSummary(twinId) {
  const usageData = usage.get(twinId);
  if (!usageData) {
    return {
      daily: { tokens: 0, spend: 0, toolCalls: 0 },
      monthly: { tokens: 0, spend: 0, toolCalls: 0 }
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const dailyUsage = usageData.daily.filter(u => u.date === today);
  const monthlyUsage = usageData.monthly.filter(m => m.month === thisMonth);

  return {
    daily: {
      tokens: dailyUsage.reduce((sum, u) => sum + u.tokens, 0),
      spend: dailyUsage.reduce((sum, u) => sum + u.spend, 0),
      toolCalls: dailyUsage.reduce((sum, u) => sum + u.toolCalls, 0)
    },
    monthly: {
      tokens: monthlyUsage.reduce((sum, m) => sum + m.tokens, 0),
      spend: monthlyUsage.reduce((sum, m) => sum + m.spend, 0),
      toolCalls: monthlyUsage.reduce((sum, m) => sum + m.toolCalls, 0)
    }
  };
}

function getBudgetStatus(budget) {
  const usageData = getUsageSummary(budget.twinId);
  const limits = budget.limits;

  const dailyTokenPct = (usageData.daily.tokens / limits.dailyTokens) * 100;
  const dailySpendPct = (usageData.daily.spend / limits.dailySpend) * 100;
  const maxPct = Math.max(dailyTokenPct, dailySpendPct);

  if (maxPct >= 100) return BUDGET_STATUS.EXCEEDED;
  if (maxPct >= 80) return BUDGET_STATUS.WARNING;
  return BUDGET_STATUS.ACTIVE;
}

function updateBudgetStatus(budget, twinId) {
  budget.status = getBudgetStatus(budget);
  budget.updatedAt = new Date().toISOString();
}

function determineRisk(checks, budget) {
  const { tokens, spend, toolCalls } = checks;

  // Calculate utilization percentages
  const tokenPct = (tokens.used + tokens.requested) / tokens.limit;
  const spendPct = (spend.used + spend.requested) / spend.limit;

  // Determine risk
  if (tokenPct > 1 || spendPct > 1) return 'critical';
  if (tokenPct > 0.9 || spendPct > 0.9) return 'high';
  if (tokenPct > 0.7 || spendPct > 0.7) return 'medium';
  return 'low';
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Budget Engine listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
