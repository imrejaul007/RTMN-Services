/**
 * Operations OS - Process Mining Module
 * Analyzes event logs to discover, monitor, and improve real processes
 */

const { db } = require('../db/database');

class ProcessMining {
  constructor() {
    this.db = db;
  }

  /**
   * Ingest event log
   */
  ingestLog(processId, events) {
    const logEntries = events.map(event => ({
      id: this.db.generateId('LOG'),
      processId,
      caseId: event.caseId,
      activity: event.activity,
      timestamp: new Date(event.timestamp).toISOString(),
      resource: event.resource || null,
      duration: event.duration || 0,
      cost: event.cost || 0,
      attributes: event.attributes || {},
      source: event.source || 'manual',
      ingestedAt: new Date().toISOString(),
    }));

    logEntries.forEach(entry => {
      this.db.set('processLogs', entry.id, entry);
    });

    return { ingested: logEntries.length, logIds: logEntries.map(e => e.id) };
  }

  /**
   * Discover process model from logs
   */
  discoverProcess(processId) {
    const logs = this.db.getAll('processLogs')
      .filter(log => log.processId === processId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (logs.length === 0) {
      return { error: 'No logs found for process' };
    }

    // Build process map
    const caseActivities = {};
    const activityCounts = {};
    const transitions = {};
    const resources = {};

    logs.forEach(log => {
      // Group by case
      if (!caseActivities[log.caseId]) {
        caseActivities[log.caseId] = [];
      }
      caseActivities[log.caseId].push(log);

      // Count activities
      activityCounts[log.activity] = (activityCounts[log.activity] || 0) + 1;

      // Track resources
      if (log.resource) {
        resources[log.resource] = (resources[log.resource] || 0) + 1;
      }
    });

    // Build transitions
    Object.values(caseActivities).forEach(activities => {
      for (let i = 0; i < activities.length - 1; i++) {
        const from = activities[i].activity;
        const to = activities[i + 1].activity;
        const key = `${from} → ${to}`;

        transitions[key] = (transitions[key] || 0) + 1;
      }
    });

    // Calculate DFG (Directly-Follows Graph)
    const dfg = Object.entries(transitions).map(([path, count]) => {
      const [from, to] = path.split(' → ');
      return { from, to, count };
    }).sort((a, b) => b.count - a.count);

    // Start activities
    const startActivities = Object.entries(activityCounts).filter(([activity]) => {
      const firstActivities = Object.values(caseActivities).map(acts => acts[0]?.activity);
      return firstActivities.includes(activity);
    });

    // End activities
    const endActivities = Object.entries(activityCounts).filter(([activity]) => {
      const lastActivities = Object.values(caseActivities).map(acts => acts[acts.length - 1]?.activity);
      return lastActivities.includes(activity);
    });

    return {
      processId,
      totalEvents: logs.length,
      totalCases: Object.keys(caseActivities).length,
      activities: Object.entries(activityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      dfg,
      startActivities: startActivities.map(([name]) => name),
      endActivities: endActivities.map(([name]) => name),
      resources: Object.entries(resources)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      variants: this.calculateVariants(caseActivities),
      discoveredAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate process variants
   */
  calculateVariants(caseActivities) {
    const variantCounts = {};

    Object.values(caseActivities).forEach(activities => {
      const path = activities.map(a => a.activity).join(' → ');
      variantCounts[path] = (variantCounts[path] || 0) + 1;
    });

    return Object.entries(variantCounts)
      .map(([path, count]) => {
        const activities = path.split(' → ');
        return { path, count, activities };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze bottlenecks
   */
  analyzeBottlenecks(processId) {
    const logs = this.db.getAll('processLogs')
      .filter(log => log.processId === processId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Group by case and calculate durations
    const caseDurations = {};
    const activityDurations = {};

    logs.forEach(log => {
      if (!caseDurations[log.caseId]) {
        caseDurations[log.caseId] = [];
      }
      caseDurations[log.caseId].push(log);
    });

    // Calculate duration between activities
    Object.entries(caseDurations).forEach(([caseId, activities]) => {
      for (let i = 0; i < activities.length - 1; i++) {
        const current = activities[i];
        const next = activities[i + 1];
        const duration = new Date(next.timestamp) - new Date(current.timestamp);

        const key = `${current.activity} → ${next.activity}`;
        if (!activityDurations[key]) {
          activityDurations[key] = { durations: [], from: current.activity, to: next.activity };
        }
        activityDurations[key].durations.push(duration);
      }
    });

    // Calculate statistics
    const bottlenecks = Object.entries(activityDurations).map(([key, data]) => {
      const durations = data.durations.sort((a, b) => a - b);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const median = durations[Math.floor(durations.length / 2)];
      const p95 = durations[Math.floor(durations.length * 0.95)];

      return {
        from: data.from,
        to: data.to,
        count: durations.length,
        avgDuration: Math.round(avg),
        medianDuration: median,
        p95Duration: p95,
        isBottleneck: avg > 3600000, // > 1 hour
      };
    }).filter(b => b.isBottleneck)
      .sort((a, b) => b.avgDuration - a.avgDuration);

    return {
      processId,
      bottlenecks,
      totalBottlenecks: bottlenecks.length,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate conformance
   */
  checkConformance(processId, expectedModel) {
    const logs = this.db.getAll('processLogs')
      .filter(log => log.processId === processId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const caseActivities = {};
    logs.forEach(log => {
      if (!caseActivities[log.caseId]) {
        caseActivities[log.caseId] = [];
      }
      caseActivities[log.caseId].push(log.activity);
    });

    const deviations = [];

    Object.entries(caseActivities).forEach(([caseId, activities]) => {
      // Check for skipped activities
      const expected = expectedModel.steps || [];
      for (let i = 0; i < expected.length - 1; i++) {
        if (!activities.includes(expected[i])) {
          deviations.push({
            caseId,
            type: 'skipped',
            activity: expected[i],
            expectedAfter: expected[i + 1] || activities[0],
          });
        }
      }

      // Check for extra activities
      activities.forEach((activity, i) => {
        if (!expected.includes(activity)) {
          deviations.push({
            caseId,
            type: 'extra',
            activity,
            position: i,
          });
        }
      });
    });

    const conformanceScore = Math.max(0, 100 - (deviations.length / logs.length * 100));

    return {
      processId,
      totalCases: Object.keys(caseActivities).length,
      totalDeviations: deviations.length,
      conformanceScore: Math.round(conformanceScore),
      deviations: deviations.slice(0, 20),
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate cycle time
   */
  getCycleTime(processId) {
    const logs = this.db.getAll('processLogs')
      .filter(log => log.processId === processId);

    const caseStartEnd = {};

    logs.forEach(log => {
      if (!caseStartEnd[log.caseId]) {
        caseStartEnd[log.caseId] = { start: null, end: null };
      }

      const timestamp = new Date(log.timestamp).getTime();
      if (!caseStartEnd[log.caseId].start || timestamp < caseStartEnd[log.caseId].start) {
        caseStartEnd[log.caseId].start = timestamp;
      }
      if (!caseStartEnd[log.caseId].end || timestamp > caseStartEnd[log.caseId].end) {
        caseStartEnd[log.caseId].end = timestamp;
      }
    });

    const cycleTimes = Object.values(caseStartEnd)
      .map(c => c.end - c.start)
      .filter(t => t > 0);

    if (cycleTimes.length === 0) {
      return { processId, error: 'No complete cases found' };
    }

    const sorted = cycleTimes.sort((a, b) => a - b);

    return {
      processId,
      avgCycleTime: Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length),
      medianCycleTime: sorted[Math.floor(sorted.length / 2)],
      minCycleTime: sorted[0],
      maxCycleTime: sorted[sorted.length - 1],
      p95CycleTime: sorted[Math.floor(sorted.length * 0.95)],
      totalCases: cycleTimes.length,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get resource utilization
   */
  getResourceUtilization(processId) {
    const logs = this.db.getAll('processLogs')
      .filter(log => log.processId === processId && log.resource);

    const resourceActivities = {};
    const resourceDurations = {};

    logs.forEach(log => {
      if (!resourceActivities[log.resource]) {
        resourceActivities[log.resource] = 0;
        resourceDurations[log.resource] = [];
      }
      resourceActivities[log.resource]++;
      if (log.duration) {
        resourceDurations[log.resource].push(log.duration);
      }
    });

    return {
      processId,
      resources: Object.entries(resourceActivities).map(([resource, count]) => ({
        resource,
        activityCount: count,
        avgDuration: resourceDurations[resource].length > 0
          ? Math.round(resourceDurations[resource].reduce((a, b) => a + b, 0) / resourceDurations[resource].length)
          : 0,
      })).sort((a, b) => b.activityCount - a.activityCount),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate process insights
   */
  getInsights(processId) {
    const discovery = this.discoverProcess(processId);
    const bottlenecks = this.analyzeBottlenecks(processId);
    const cycleTime = this.getCycleTime(processId);
    const resources = this.getResourceUtilization(processId);

    const insights = [];

    // Bottleneck insights
    if (bottlenecks.bottlenecks.length > 0) {
      const worst = bottlenecks.bottlenecks[0];
      insights.push({
        type: 'bottleneck',
        severity: 'high',
        message: `"${worst.from}" → "${worst.to}" is a bottleneck with avg wait time of ${Math.round(worst.avgDuration / 60000)} minutes`,
        recommendation: 'Consider parallel processing or automation for this transition',
      });
    }

    // Variant insights
    if (discovery.variants.length > 5) {
      insights.push({
        type: 'complexity',
        severity: 'medium',
        message: `Process has ${discovery.variants.length} variants, indicating potential complexity`,
        recommendation: 'Standardize the process or document alternative paths',
      });
    }

    // Cycle time insights
    if (cycleTime.avgCycleTime && cycleTime.avgCycleTime > 86400000) {
      insights.push({
        type: 'cycle_time',
        severity: 'medium',
        message: `Average cycle time is ${Math.round(cycleTime.avgCycleTime / 3600000)} hours`,
        recommendation: 'Identify and eliminate non-value-adding steps',
      });
    }

    // Resource insights
    const overloaded = resources.resources.filter(r => r.activityCount > 100);
    if (overloaded.length > 0) {
      insights.push({
        type: 'resource',
        severity: 'low',
        message: `Resource "${overloaded[0].resource}" handles ${overloaded[0].activityCount} activities`,
        recommendation: 'Consider redistributing work or adding capacity',
      });
    }

    return {
      processId,
      insights,
      summary: {
        totalCases: discovery.totalCases,
        totalVariants: discovery.variants.length,
        bottleneckCount: bottlenecks.totalBottlenecks,
        avgCycleTimeHours: cycleTime.avgCycleTime
          ? Math.round(cycleTime.avgCycleTime / 3600000 * 10) / 10
          : null,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

// Express routes
function registerProcessMiningRoutes(app) {
  const mining = new ProcessMining();

  // Ingest logs
  app.post('/api/mining/:processId/ingest', (req, res) => {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' });
    }
    const result = mining.ingestLog(req.params.processId, events);
    res.status(201).json(result);
  });

  // Discover process
  app.get('/api/mining/:processId/discover', (req, res) => {
    const result = mining.discoverProcess(req.params.processId);
    res.json(result);
  });

  // Analyze bottlenecks
  app.get('/api/mining/:processId/bottlenecks', (req, res) => {
    const result = mining.analyzeBottlenecks(req.params.processId);
    res.json(result);
  });

  // Check conformance
  app.post('/api/mining/:processId/conformance', (req, res) => {
    const { model } = req.body;
    if (!model) {
      return res.status(400).json({ error: 'model required' });
    }
    const result = mining.checkConformance(req.params.processId, model);
    res.json(result);
  });

  // Get cycle time
  app.get('/api/mining/:processId/cycletime', (req, res) => {
    const result = mining.getCycleTime(req.params.processId);
    res.json(result);
  });

  // Get resource utilization
  app.get('/api/mining/:processId/resources', (req, res) => {
    const result = mining.getResourceUtilization(req.params.processId);
    res.json(result);
  });

  // Get insights
  app.get('/api/mining/:processId/insights', (req, res) => {
    const result = mining.getInsights(req.params.processId);
    res.json(result);
  });

  // Get logs for process
  app.get('/api/mining/:processId/logs', (req, res) => {
    const { limit = 100 } = req.query;
    const logs = db.getAll('processLogs')
      .filter(log => log.processId === req.params.processId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    res.json({ logs, total: logs.length });
  });
}

module.exports = { ProcessMining, registerProcessMiningRoutes };
