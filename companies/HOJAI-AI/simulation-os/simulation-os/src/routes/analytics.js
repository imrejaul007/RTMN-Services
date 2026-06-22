import express from 'express';
import { twinRegistry, simulationSessions, analyticsStore, logger } from '../index.js';

const router = express.Router();

/**
 * GET /api/analytics
 * Get simulation analytics overview
 */
router.get('/', async (req, res) => {
  try {
    const analytics = {
      overview: {
        totalSimulations: analyticsStore.simulations,
        totalRuntime: analyticsStore.totalRuntime,
        twinUpdates: analyticsStore.twinUpdates,
        activeTwins: Array.from(twinRegistry.values()).filter(t => t.state === 'active').length,
        activeSessions: Array.from(simulationSessions.values()).filter(s => s.status === 'running').length
      },
      performance: {
        avgSimulationTime: analyticsStore.simulations > 0
          ? analyticsStore.totalRuntime / analyticsStore.simulations
          : 0
      },
      twins: aggregateTwinAnalytics(),
      simulations: aggregateSimulationAnalytics()
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function aggregateTwinAnalytics() {
  const twins = Array.from(twinRegistry.values());

  const byType = {};
  const byState = { active: 0, paused: 0, archived: 0, failed: 0 };

  for (const twin of twins) {
    // By type
    if (!byType[twin.type]) {
      byType[twin.type] = { count: 0, totalValue: 0 };
    }
    byType[twin.type].count++;
    byType[twin.type].totalValue += twin.data?.value || 0;

    // By state
    byState[twin.state] = (byState[twin.state] || 0) + 1;
  }

  return { byType, byState };
}

function aggregateSimulationAnalytics() {
  const sessions = Array.from(simulationSessions.values());

  const byType = {};
  const byStatus = { pending: 0, running: 0, paused: 0, completed: 0, failed: 0 };

  for (const session of sessions) {
    // By type
    if (!byType[session.type]) {
      byType[session.type] = { count: 0, totalRuntime: 0 };
    }
    byType[session.type].count++;

    if (session.endTime && session.startTime) {
      const runtime = session.endTime - session.startTime;
      byType[session.type].totalRuntime += runtime;
    }

    // By status
    byStatus[session.status] = (byStatus[session.status] || 0) + 1;
  }

  return { byType, byStatus };
}

/**
 * GET /api/analytics/twins
 * Get detailed twin analytics
 */
router.get('/twins', async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;

    let twins = Array.from(twinRegistry.values());

    if (type) {
      twins = twins.filter(t => t.type === type);
    }

    // Sort by value
    twins.sort((a, b) => (b.data?.value || 0) - (a.data?.value || 0));

    const analytics = twins.slice(0, parseInt(limit)).map(twin => ({
      id: twin.id,
      name: twin.name,
      type: twin.type,
      state: twin.state,
      value: twin.data?.value || 0,
      simulationCount: twin.simulations.length,
      lastUpdated: twin.lastUpdated,
      age: getAge(twin.metadata?.createdAt)
    }));

    res.json({
      success: true,
      count: analytics.length,
      twins: analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getAge(createdAt) {
  if (!createdAt) return null;
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)); // days
}

/**
 * GET /api/analytics/simulations
 * Get simulation performance analytics
 */
router.get('/simulations', async (req, res) => {
  try {
    const sessions = Array.from(simulationSessions.values());

    const analytics = {
      total: sessions.length,
      byType: {},
      byStatus: {},
      performance: {
        avgDuration: 0,
        fastest: null,
        slowest: null
      }
    };

    const durations = [];

    for (const session of sessions) {
      // By type
      if (!analytics.byType[session.type]) {
        analytics.byType[session.type] = { count: 0, totalDuration: 0 };
      }
      analytics.byType[session.type].count++;

      // By status
      analytics.byStatus[session.status] =
        (analytics.byStatus[session.status] || 0) + 1;

      // Duration
      if (session.endTime && session.startTime) {
        const duration = session.endTime - session.startTime;
        durations.push({ id: session.id, duration });

        analytics.byType[session.type].totalDuration += duration;
      }
    }

    // Performance metrics
    if (durations.length > 0) {
      durations.sort((a, b) => a.duration - b.duration);
      analytics.performance.avgDuration =
        durations.reduce((a, b) => a + b.duration, 0) / durations.length;
      analytics.performance.fastest = durations[0];
      analytics.performance.slowest = durations[durations.length - 1];
    }

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/trends
 * Get analytics trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate period
    let periodMs;
    switch (period) {
      case '24h': periodMs = 24 * 60 * 60 * 1000; break;
      case '7d': periodMs = 7 * 24 * 60 * 60 * 1000; break;
      case '30d': periodMs = 30 * 24 * 60 * 60 * 1000; break;
      default: periodMs = 7 * 24 * 60 * 60 * 1000;
    }

    const startTime = Date.now() - periodMs;

    // Get twin creation trends
    const twins = Array.from(twinRegistry.values())
      .filter(t => new Date(t.metadata?.createdAt).getTime() > startTime);

    // Get simulation trends
    const simulations = Array.from(simulationSessions.values())
      .filter(s => s.startTime > startTime);

    const trends = {
      period,
      twinCreations: twins.length,
      simulationRuns: simulations.length,
      byDay: generateDailyTrends(startTime, twins, simulations)
    };

    res.json({
      success: true,
      trends
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateDailyTrends(startTime, twins, simulations) {
  const days = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let t = startTime; t < now; t += dayMs) {
    const dayStart = t;
    const dayEnd = t + dayMs;

    const dayTwins = twins.filter(t =>
      new Date(t.metadata?.createdAt).getTime() >= dayStart &&
      new Date(t.metadata?.createdAt).getTime() < dayEnd
    );

    const daySims = simulations.filter(s =>
      s.startTime >= dayStart && s.startTime < dayEnd
    );

    days.push({
      date: new Date(t).toISOString().split('T')[0],
      twins: dayTwins.length,
      simulations: daySims.length
    });
  }

  return days;
}

/**
 * GET /api/analytics/summary
 * Get summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const twins = Array.from(twinRegistry.values());
    const sessions = Array.from(simulationSessions.values());

    // Twin metrics
    const twinValues = twins.map(t => t.data?.value || 0);
    const twinValueStats = calculateStats(twinValues);

    // Simulation metrics
    const simDurations = sessions
      .filter(s => s.endTime && s.startTime)
      .map(s => s.endTime - s.startTime);
    const simDurationStats = calculateStats(simDurations);

    res.json({
      success: true,
      summary: {
        twins: {
          total: twins.length,
          active: twins.filter(t => t.state === 'active').length,
          value: {
            total: twinValueStats.sum,
            avg: twinValueStats.mean,
            max: twinValueStats.max
          }
        },
        simulations: {
          total: sessions.length,
          completed: sessions.filter(s => s.status === 'completed').length,
          failed: sessions.filter(s => s.status === 'failed').length,
          duration: {
            avg: simDurationStats.mean,
            max: simDurationStats.max
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateStats(values) {
  if (values.length === 0) {
    return { sum: 0, mean: 0, min: 0, max: 0, count: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);

  return {
    sum,
    mean,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length
  };
}

/**
 * GET /api/analytics/health
 * Get system health metrics
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      twins: {
        healthy: Array.from(twinRegistry.values()).filter(t =>
          t.state === 'active' && t.lastUpdated
        ).length,
        total: twinRegistry.size,
        healthScore: twinRegistry.size > 0
          ? (Array.from(twinRegistry.values()).filter(t => t.state === 'active').length / twinRegistry.size * 100)
          : 100
      },
      simulations: {
        successRate: getSimulationSuccessRate(),
        avgLoad: getAverageSimulationLoad()
      },
      uptime: {
        started: new Date().toISOString(),
        // In real system, track actual start time
        uptimeSeconds: 0
      }
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getSimulationSuccessRate() {
  const sessions = Array.from(simulationSessions.values());
  if (sessions.length === 0) return 100;

  const completed = sessions.filter(s => s.status === 'completed').length;
  return (completed / sessions.length * 100).toFixed(1);
}

function getAverageSimulationLoad() {
  // Simplified - in real system track actual load
  return Math.random() * 50; // percentage
}

export default router;
