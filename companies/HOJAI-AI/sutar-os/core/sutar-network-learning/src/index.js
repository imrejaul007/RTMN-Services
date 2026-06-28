/**
 * SUTAR OS — Network Learning
 *
 * Learning from agent network outcomes.
 * Tracks what strategies work, optimizes over time.
 *
 * Endpoints:
 *   POST /api/outcomes       — Record an outcome
 *   GET  /api/outcomes      — Query outcomes
 *   GET  /api/insights      — Get learned insights
 *   GET  /api/strategies    — Get optimized strategies
 *   POST /api/strategies    — Register a strategy
 *   GET  /api/performance   — Performance analytics
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-network-learning' });

const PORT = process.env.LEARNING_PORT || 4243;

// ---------- Stores ----------
const outcomes = [];
const strategies = new Map();
const insights = new Map();
const MAX_OUTCOMES = 100000;

// ---------- Outcome Recording ----------
function recordOutcome(params) {
  const id = uuidv4();
  const outcome = {
    id,
    context: params.context || {},
    strategy: params.strategy,
    actions: params.actions || [],
    result: params.result,
    value: params.value || 0,
    success: params.success !== false,
    duration: params.duration || 0,
    agentId: params.agentId,
    negotiationType: params.negotiationType,
    counterpartType: params.counterpartType,
    timestamp: new Date().toISOString(),
    metadata: params.metadata || {},
  };

  outcomes.push(outcome);
  while (outcomes.length > MAX_OUTCOMES) outcomes.shift();

  // Update strategy performance
  updateStrategyPerformance(params.strategy, outcome);

  // Generate insight
  const insight = generateInsight(outcome);
  if (insight) insights.set(insight.id, insight);

  return { outcomeId: id, insight };
}

function updateStrategyPerformance(strategyId, outcome) {
  if (!strategyId) return;
  let strategy = strategies.get(strategyId);
  if (!strategy) {
    strategy = { id: strategyId, attempts: 0, successes: 0, totalValue: 0, avgDuration: 0, contexts: [] };
    strategies.set(strategyId, strategy);
  }
  strategy.attempts++;
  if (outcome.success) strategy.successes++;
  strategy.totalValue += outcome.value || 0;
  strategy.avgDuration = (strategy.avgDuration * (strategy.attempts - 1) + (outcome.duration || 0)) / strategy.attempts;
  if (outcome.context && !strategy.contexts.includes(outcome.context.industry || 'general')) {
    strategy.contexts.push(outcome.context.industry || 'general');
  }
  strategy.successRate = strategy.successes / strategy.attempts;
  strategy.avgValue = strategy.totalValue / strategy.attempts;
}

// ---------- Insight Generation ----------
function generateInsight(outcome) {
  if (!outcome.success && Math.random() > 0.1) return null; // Sample 10% of failures

  const insight = {
    id: uuidv4(),
    type: outcome.success ? 'success_pattern' : 'failure_pattern',
    strategy: outcome.strategy,
    context: outcome.context,
    pattern: extractPattern(outcome),
    recommendation: generateRecommendation(outcome),
    confidence: calculateConfidence(outcome),
    basedOn: 1,
    createdAt: new Date().toISOString(),
  };
  return insight;
}

function extractPattern(outcome) {
  const patterns = [];
  if (outcome.actions?.length > 5) patterns.push('extended_negotiation');
  if (outcome.duration > 3600000) patterns.push('slow_resolution');
  if (outcome.value > 100000) patterns.push('high_value_deal');
  if (outcome.context?.urgency === 'high') patterns.push('urgent_timeline');
  return patterns;
}

function generateRecommendation(outcome) {
  if (outcome.success) {
    return `Continue using strategy ${outcome.strategy} — positive outcome in ${outcome.context?.industry || 'general'} context`;
  }
  return `Avoid strategy ${outcome.strategy} in ${outcome.context?.industry || 'general'} — recommend alternative approach`;
}

function calculateConfidence(outcome) {
  let confidence = 0.5;
  if (outcome.actions?.length > 0) confidence += 0.1;
  if (outcome.value > 0) confidence += 0.1;
  if (outcome.duration > 0) confidence += 0.1;
  if (outcome.success) confidence += 0.2;
  return Math.min(confidence, 0.95);
}

// ---------- Learned Strategies ----------
function getOptimizedStrategies(params) {
  const { context, limit } = params || {};
  const ranked = Array.from(strategies.values())
    .filter(s => s.attempts >= 5) // min sample size
    .map(s => ({
      ...s,
      score: (s.successRate * 0.6) + (Math.min(s.avgValue / 10000, 1) * 0.2) + (Math.min(s.avgDuration / 3600000, 1) * 0.2),
    }))
    .sort((a, b) => b.score - a.score);

  let filtered = ranked;
  if (context?.industry) {
    filtered = ranked.filter(s => s.contexts.includes(context.industry));
  }
  return { total: filtered.length, strategies: filtered.slice(0, limit || 20) };
}

function getInsights(params) {
  const { type, strategy, minConfidence, limit } = params || {};
  let list = Array.from(insights.values());
  if (type) list = list.filter(i => i.type === type);
  if (strategy) list = list.filter(i => i.strategy === strategy);
  if (minConfidence) list = list.filter(i => i.confidence >= parseFloat(minConfidence));
  list.sort((a, b) => b.confidence - a.confidence);
  return { total: insights.size, returned: Math.min(list.length, limit || 50), insights: list.slice(0, limit || 50) };
}

// ---------- Performance Analytics ----------
function getPerformanceAnalytics(params) {
  const { since, strategy, agentId } = params || {};
  let filtered = [...outcomes];
  if (since) filtered = filtered.filter(o => o.timestamp >= since);
  if (strategy) filtered = filtered.filter(o => o.strategy === strategy);
  if (agentId) filtered = filtered.filter(o => o.agentId === agentId);

  const total = filtered.length;
  const successes = filtered.filter(o => o.success).length;
  const totalValue = filtered.reduce((s, o) => s + (o.value || 0), 0);
  const avgDuration = total > 0 ? filtered.reduce((s, o) => s + (o.duration || 0), 0) / total : 0;

  return {
    period: since ? `since ${since}` : 'all_time',
    totalOutcomes: total,
    successRate: total > 0 ? (successes / total * 100).toFixed(2) + '%' : '0%',
    totalValue,
    avgValue: total > 0 ? Math.round(totalValue / total) : 0,
    avgDurationMs: Math.round(avgDuration),
    strategies: Array.from(strategies.values()).map(s => ({
      id: s.id,
      successRate: (s.successRate * 100).toFixed(2) + '%',
      avgValue: Math.round(s.avgValue),
      attempts: s.attempts,
    })),
  };
}

// ---------- Routes ----------
app.post('/api/outcomes', requireAuth, (req, res) => {
  const result = recordOutcome(req.body);
  res.status(201).json(result);
});

app.get('/api/outcomes', requireAuth, (req, res) => {
  const { strategy, agentId, success, since, limit } = req.query;
  let list = [...outcomes];
  if (strategy) list = list.filter(o => o.strategy === strategy);
  if (agentId) list = list.filter(o => o.agentId === agentId);
  if (success !== undefined) list = list.filter(o => o.success === (success === 'true'));
  if (since) list = list.filter(o => o.timestamp >= since);
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  res.json({ total: outcomes.length, returned: Math.min(list.length, pageSize), outcomes: list.slice(0, pageSize) });
});

app.get('/api/insights', requireAuth, (req, res) => {
  res.json(getInsights(req.query));
});

app.get('/api/strategies', requireAuth, (req, res) => {
  res.json(getOptimizedStrategies(req.query));
});

app.post('/api/strategies', requireAuth, (req, res) => {
  const id = uuidv4();
  const strategy = { id, name: req.body.name, description: req.body.description, attempts: 0, successes: 0, createdAt: new Date().toISOString() };
  strategies.set(id, strategy);
  res.status(201).json(strategy);
});

app.get('/api/performance', requireAuth, (req, res) => {
  res.json(getPerformanceAnalytics(req.query));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-network-learning', port: PORT, layer: 'Decision + Execution', outcomes: outcomes.length, strategies: strategies.size, insights: insights.size, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-network-learning] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
