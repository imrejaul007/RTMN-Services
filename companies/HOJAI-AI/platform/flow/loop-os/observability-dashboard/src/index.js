/**
 * LoopOS Observability Dashboard
 * Visual monitoring for loops, budgets, and trust
 * Port: 4742
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4742;

// Service URLs
const SERVICES = {
  scheduler: process.env.SCHEDULER_URL || 'http://localhost:4731',
  state: process.env.STATE_URL || 'http://localhost:4732',
  verification: process.env.VERIFICATION_URL || 'http://localhost:4733',
  budget: process.env.BUDGET_URL || 'http://localhost:4734',
  fleet: process.env.FLEET_URL || 'http://localhost:4735',
  trust: process.env.TRUST_URL || 'http://localhost:4736',
  outcomes: process.env.OUTCOMES_URL || 'http://localhost:4737'
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Health ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const serviceStatuses = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, url]) => {
      const start = Date.now();
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        return { name, status: 'healthy', latency: Date.now() - start };
      } catch {
        return { name, status: 'unhealthy', latency: null };
      }
    })
  );

  const statuses = serviceStatuses.map(r => r.value);
  const healthy = statuses.filter(s => s.status === 'healthy').length;

  res.json({
    status: healthy === statuses.length ? 'ok' : 'degraded',
    service: 'loopos-observability',
    version: '1.0.0',
    port: PORT,
    services: statuses,
    healthy: `${healthy}/${statuses.length}`
  });
});

// ── Dashboard Overview ─────────────────────────────────

/**
 * Get complete dashboard data
 * GET /api/dashboard
 */
app.get('/api/dashboard', async (_req, res) => {
  try {
    const [
      schedulerHealth,
      stateData,
      budgetData,
      fleetHealth,
      trustSummary
    ] = await Promise.allSettled([
      axios.get(`${SERVICES.scheduler}/health`),
      axios.get(`${SERVICES.state}/health`),
      axios.get(`${SERVICES.budget}/api/budgets`),
      axios.get(`${SERVICES.fleet}/api/fleets`),
      axios.get(`${SERVICES.trust}/api/trust/summary`)
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      overview: {
        loops: schedulerHealth.value?.data?.loops || 0,
        states: stateData.value?.data?.states || 0,
        budgets: budgetData.value?.data?.count || 0,
        fleets: fleetHealth.value?.data?.count || 0,
        trustProfiles: trustSummary.value?.data?.totalProfiles || 0
      }
    });
  } catch (err) {
    logger.error('Dashboard fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ── Loop Metrics ───────────────────────────────────────

/**
 * Get loop metrics
 * GET /api/metrics/loops
 */
app.get('/api/metrics/loops', async (_req, res) => {
  try {
    const [loops, executions] = await Promise.allSettled([
      axios.get(`${SERVICES.scheduler}/api/loops`),
      axios.get(`${SERVICES.state}/api/approvals`) // pending approvals
    ]);

    const loopsData = loops.value?.data || { loops: [] };
    const pendingApprovals = approvals.value?.data?.count || 0;

    // Calculate metrics
    const totalLoops = loopsData.loops.length;
    const activeLoops = loopsData.loops.filter(l => l.enabled).length;
    const pausedLoops = loopsData.loops.filter(l => !l.enabled).length;

    res.json({
      total: totalLoops,
      active: activeLoops,
      paused: pausedLoops,
      pendingApprovals,
      loops: loopsData.loops.map(l => ({
        id: l.id,
        name: l.name,
        status: l.enabled ? 'running' : 'paused',
        lastRun: l.lastRun,
        runCount: l.runCount || 0,
        failureCount: l.failureCount || 0
      }))
    });
  } catch (err) {
    logger.error('Loop metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch loop metrics' });
  }
});

// ── Budget Metrics ────────────────────────────────────

/**
 * Get budget metrics
 * GET /api/metrics/budgets
 */
app.get('/api/metrics/budgets', async (_req, res) => {
  try {
    const response = await axios.get(`${SERVICES.budget}/api/budgets`);
    const budgets = response.data.budgets || [];

    const totalSpend = budgets.reduce((sum, b) => sum + (b.usage?.daily?.spend || 0), 0);
    const totalTokens = budgets.reduce((sum, b) => sum + (b.usage?.daily?.tokens || 0), 0);
    const warningBudgets = budgets.filter(b => b.status === 'warning').length;
    const exceededBudgets = budgets.filter(b => b.status === 'exceeded').length;

    res.json({
      totalBudgets: budgets.length,
      totalSpendToday: Math.round(totalSpend * 100) / 100,
      totalTokensToday: totalTokens,
      warningBudgets,
      exceededBudgets,
      budgets: budgets.slice(0, 20).map(b => ({
        twinId: b.twinId,
        dailySpend: b.usage?.daily?.spend || 0,
        dailyTokens: b.usage?.daily?.tokens || 0,
        status: b.status,
        riskLevel: b.riskLevel
      }))
    });
  } catch (err) {
    logger.error('Budget metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch budget metrics' });
  }
});

// ── Fleet Metrics ─────────────────────────────────────

/**
 * Get fleet metrics
 * GET /api/metrics/fleets
 */
app.get('/api/metrics/fleets', async (_req, res) => {
  try {
    const response = await axios.get(`${SERVICES.fleet}/api/fleets`);
    const fleets = response.data.fleets || [];

    let totalAgents = 0;
    let healthyAgents = 0;

    // Get agent counts per fleet
    const fleetDetails = await Promise.allSettled(
      fleets.slice(0, 10).map(async fleet => {
        try {
          const agentsRes = await axios.get(`${SERVICES.fleet}/api/fleets/${fleet.id}/agents`);
          const agents = agentsRes.data.agents || [];
          return {
            id: fleet.id,
            name: fleet.name,
            department: fleet.department,
            agentCount: agents.length,
            healthyAgents: agents.filter(a => a.health === 'healthy').length
          };
        } catch {
          return { id: fleet.id, name: fleet.name, agentCount: 0, healthyAgents: 0 };
        }
      })
    );

    for (const fleet of fleetDetails) {
      if (fleet.status === 'fulfilled') {
        totalAgents += fleet.value.agentCount;
        healthyAgents += fleet.value.healthyAgents;
      }
    }

    res.json({
      totalFleets: fleets.length,
      totalAgents,
      healthyAgents,
      healthRate: totalAgents > 0 ? Math.round((healthyAgents / totalAgents) * 100) : 100,
      fleets: fleetDetails.filter(f => f.status === 'fulfilled').map(f => f.value)
    });
  } catch (err) {
    logger.error('Fleet metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch fleet metrics' });
  }
});

// ── Trust Metrics ─────────────────────────────────────

/**
 * Get trust metrics
 * GET /api/metrics/trust
 */
app.get('/api/metrics/trust', async (_req, res) => {
  try {
    const response = await axios.get(`${SERVICES.trust}/api/trust/summary`);
    const summary = response.data || {};

    res.json({
      totalProfiles: summary.totalProfiles || 0,
      avgTrustScore: summary.avgTrustScore || 0,
      byAutonomyLevel: summary.byAutonomyLevel || {},
      byDimension: summary.byDimension || {},
      healthDistribution: calculateDistribution(summary.byAutonomyLevel || {})
    });
  } catch (err) {
    logger.error('Trust metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trust metrics' });
  }
});

// ── Outcome Metrics ────────────────────────────────────

/**
 * Get outcome metrics
 * GET /api/metrics/outcomes
 */
app.get('/api/metrics/outcomes', async (_req, res) => {
  try {
    const [today, week] = await Promise.allSettled([
      axios.get(`${SERVICES.outcomes}/api/analytics?period=1d`),
      axios.get(`${SERVICES.outcomes}/api/analytics?period=7d`)
    ]);

    const todayData = today.value?.data || {};
    const weekData = week.value?.data || {};

    res.json({
      today: {
        totalOutcomes: todayData.total || 0,
        successRate: todayData.successRate || 0,
        avgScore: todayData.avgScore || 0
      },
      thisWeek: {
        totalOutcomes: weekData.total || 0,
        successRate: weekData.successRate || 0,
        avgScore: weekData.avgScore || 0
      },
      trends: weekData.trends || []
    });
  } catch (err) {
    logger.error('Outcome metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch outcome metrics' });
  }
});

// ── Alerts ────────────────────────────────────────────

const alerts = [];

/**
 * Get active alerts
 * GET /api/alerts
 */
app.get('/api/alerts', (_req, res) => {
  res.json({ count: alerts.length, alerts: alerts.slice(-50).reverse() });
});

/**
 * Generate alert
 * POST /api/alerts
 */
app.post('/api/alerts', async (req, res) => {
  const { type, severity, source, message, metadata = {} } = req.body || {};

  const alert = {
    id: `alert-${Date.now()}`,
    type,
    severity, // low, medium, high, critical
    source,
    message,
    metadata,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };

  alerts.push(alert);

  // Auto-clear old alerts (keep last 100)
  while (alerts.length > 100) {
    alerts.shift();
  }

  logger.warn(`Alert: [${severity}] ${source}: ${message}`);
  res.status(201).json(alert);
});

/**
 * Acknowledge alert
 * POST /api/alerts/:id/acknowledge
 */
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'alert not found' });

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.body?.by || 'system';

  res.json(alert);
});

// ── Cost Summary ───────────────────────────────────────

/**
 * Get cost summary across all services
 * GET /api/costs
 */
app.get('/api/costs', async (_req, res) => {
  try {
    const [budgets, outcomes] = await Promise.allSettled([
      axios.get(`${SERVICES.budget}/api/budgets`),
      axios.get(`${SERVICES.outcomes}/api/analytics?period=30d`)
    ]);

    const budgetsData = budgets.value?.data?.budgets || [];
    const outcomesData = outcomes.value?.data || {};

    const totalDailySpend = budgetsData.reduce((sum, b) => sum + (b.usage?.daily?.spend || 0), 0);
    const totalMonthlySpend = totalDailySpend * 30;
    const totalTokens = budgetsData.reduce((sum, b) => sum + (b.usage?.daily?.tokens || 0), 0);

    res.json({
      summary: {
        dailySpend: Math.round(totalDailySpend * 100) / 100,
        monthlySpend: Math.round(totalMonthlySpend * 100) / 100,
        dailyTokens,
        budgetedAgents: budgetsData.length
      },
      topSpenders: budgetsData
        .sort((a, b) => (b.usage?.daily?.spend || 0) - (a.usage?.daily?.spend || 0))
        .slice(0, 10)
        .map(b => ({
          twinId: b.twinId,
          dailySpend: b.usage?.daily?.spend || 0,
          monthlySpend: (b.usage?.daily?.spend || 0) * 30
        }))
    });
  } catch (err) {
    logger.error('Cost summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  }
});

// ── Helpers ───────────────────────────────────────────

function calculateDistribution(byLevel) {
  const total = Object.values(byLevel).reduce((sum, count) => sum + count, 0);
  if (total === 0) return {};

  return Object.entries(byLevel).reduce((dist, [level, count]) => {
    dist[`level_${level}`] = {
      count,
      percentage: Math.round((count / total) * 100)
    };
    return dist;
  }, {});
}

// ── Prometheus Metrics ─────────────────────────────────

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
app.get('/metrics', async (_req, res) => {
  const lines = [
    '# HELP loopos_up LoopOS service is up',
    '# TYPE loopos_up gauge'
  ];

  // Service status
  const serviceStatuses = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        await axios.get(`${url}/health`, { timeout: 2000 });
        return { name, status: 1 };
      } catch { return { name, status: 0 }; }
    })
  );

  for (const result of serviceStatuses) {
    if (result.status === 'fulfilled') {
      lines.push(`loopos_up{name="${result.value.name}"} ${result.value.status}`);
    }
  }

  // Loop counts
  try {
    const loopsRes = await axios.get(`${SERVICES.scheduler}/api/loops`);
    const loops = loopsRes.data?.loops || [];
    const active = loops.filter(l => l.enabled).length;
    lines.push('loopos_loops_total ' + loops.length);
    lines.push('loopos_loops_active ' + active);
  } catch {}

  // Budget counts
  try {
    const budgetsRes = await axios.get(`${SERVICES.budget}/api/budgets`);
    lines.push('loopos_budgets_total ' + (budgetsRes.data?.budgets?.length || 0));
  } catch {}

  // Fleet counts
  try {
    const fleetsRes = await axios.get(`${SERVICES.fleet}/api/fleets`);
    lines.push('loopos_fleets_total ' + (fleetsRes.data?.fleets?.length || 0));
  } catch {}

  lines.push('loopos_exporter_timestamp ' + Math.floor(Date.now() / 1000));
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(lines.join('\n'));
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Observability Dashboard listening on port ${PORT}`);
  logger.info(`Prometheus metrics: http://localhost:${PORT}/metrics`);
  logger.info(`Monitoring services: ${Object.keys(SERVICES).join(', ')}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
