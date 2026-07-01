/**
 * Operations OS - Kaizen / Continuous Improvement Module
 * Implements continuous improvement methodologies (Lean, Six Sigma)
 */

const { db } = require('../db/database');

class KaizenEngine {
  constructor() {
    this.db = db;
  }

  /**
   * Create improvement opportunity
   */
  createOpportunity(data) {
    const id = this.db.generateId('KAIZEN');

    const opportunity = {
      id,
      title: data.title,
      description: data.description || '',
      processId: data.processId || null,
      processName: data.processName || null,
      category: data.category || 'general', // efficiency, quality, cost, time, safety
      priority: data.priority || 'medium', // low, medium, high, critical
      status: 'proposed', // proposed, approved, in_progress, completed, rejected
      type: data.type || 'improvement', // improvement, innovation, cost_saving, waste_reduction
      estimatedImpact: data.estimatedImpact || {},
      submitter: data.userId,
      department: data.department || null,
      team: data.team || null,
      votes: 0,
      voters: [],
      comments: [],
      attachments: [],
      timeline: {
        proposedAt: new Date().toISOString(),
        approvedAt: null,
        startedAt: null,
        completedAt: null,
      },
      metrics: {
        before: data.metrics?.before || {},
        after: {},
        improvement: {},
      },
      roi: {
        estimated: data.roi?.estimated || 0,
        actual: data.roi?.actual || 0,
        timeframe: data.roi?.timeframe || 'quarterly',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('kaizenOpportunities', id, opportunity);
    return opportunity;
  }

  /**
   * Vote for an opportunity
   */
  vote(id, userId) {
    const opp = this.db.get('kaizenOpportunities', id);
    if (!opp) return null;

    if (opp.voters.includes(userId)) {
      // Remove vote
      opp.voters = opp.voters.filter(v => v !== userId);
      opp.votes--;
    } else {
      // Add vote
      opp.voters.push(userId);
      opp.votes++;
    }

    this.db.set('kaizenOpportunities', id, opp);
    return opp;
  }

  /**
   * Approve opportunity
   */
  approve(id, approverId, data = {}) {
    const opp = this.db.get('kaizenOpportunities', id);
    if (!opp) return null;

    opp.status = 'approved';
    opp.timeline.approvedAt = new Date().toISOString();
    opp.approvedBy = approverId;
    opp.assignedTo = data.assignedTo || approverId;
    opp.startDate = data.startDate;
    opp.targetDate = data.targetDate;
    opp.updatedAt = new Date().toISOString();

    if (data.roi) {
      opp.roi = { ...opp.roi, ...data.roi };
    }

    this.db.set('kaizenOpportunities', id, opp);
    return opp;
  }

  /**
   * Start implementation
   */
  start(id) {
    const opp = this.db.get('kaizenOpportunities', id);
    if (!opp) return null;

    opp.status = 'in_progress';
    opp.timeline.startedAt = new Date().toISOString();
    opp.updatedAt = new Date().toISOString();

    this.db.set('kaizenOpportunities', id, opp);
    return opp;
  }

  /**
   * Complete with results
   */
  complete(id, results) {
    const opp = this.db.get('kaizenOpportunities', id);
    if (!opp) return null;

    opp.status = 'completed';
    opp.timeline.completedAt = new Date().toISOString();
    opp.metrics.after = results.metrics || {};
    opp.roi.actual = results.actualSavings || 0;
    opp.actualTimeframe = results.actualTimeframe;
    opp.lessonsLearned = results.lessonsLearned;
    opp.updatedAt = new Date().toISOString();

    // Calculate improvement percentage
    if (results.metrics?.before && results.metrics?.after) {
      opp.metrics.improvement = this.calculateImprovement(
        results.metrics.before,
        results.metrics.after
      );
    }

    this.db.set('kaizenOpportunities', id, opp);
    return opp;
  }

  /**
   * Calculate improvement metrics
   */
  calculateImprovement(before, after) {
    const improvements = {};

    Object.keys(after).forEach(key => {
      const beforeVal = before[key] || 0;
      const afterVal = after[key];

      if (typeof afterVal === 'number' && beforeVal !== 0) {
        const percentChange = ((afterVal - beforeVal) / beforeVal) * 100;
        improvements[key] = {
          before: beforeVal,
          after: afterVal,
          change: afterVal - beforeVal,
          percentChange: Math.round(percentChange * 10) / 10,
          direction: percentChange > 0 ? 'improved' : 'degraded',
        };
      }
    });

    return improvements;
  }

  /**
   * Get waste detection suggestions
   */
  detectWaste(processId) {
    const process = this.db.get('processes', processId);
    const executions = this.db.getAll('sopExecutions')
      .filter(exec => exec.processId === processId);

    const wastes = [];

    // Check for long wait times
    const longWaits = executions.filter(exec =>
      exec.duration > 3600000 && exec.type === 'waiting' // > 1 hour
    );
    if (longWaits.length > 0) {
      wastes.push({
        type: 'waiting',
        severity: 'high',
        description: `${longWaits.length} instances of long wait times detected`,
        suggestion: 'Identify dependencies and optimize handoffs',
        potentialSavings: '20-30% cycle time reduction',
      });
    }

    // Check for rework
    const rework = executions.filter(exec => exec.type === 'rework');
    if (rework.length > executions.length * 0.1) {
      wastes.push({
        type: 'rework',
        severity: 'high',
        description: `${rework.length} rework instances detected (${Math.round(rework.length / executions.length * 100)}%)`,
        suggestion: 'Root cause analysis needed for quality issues',
        potentialSavings: '15-25% cost reduction',
      });
    }

    // Check for defects
    const defects = executions.filter(exec => exec.outcome === 'failed');
    if (defects.length > 0) {
      wastes.push({
        type: 'defects',
        severity: 'medium',
        description: `${defects.length} defect instances detected`,
        suggestion: 'Implement quality checkpoints early in process',
        potentialSavings: '10-20% improvement in first-pass yield',
      });
    }

    // Check for over-processing
    const overProcessing = executions.filter(exec =>
      exec.activities && exec.activities.length > 10
    );
    if (overProcessing.length > 0) {
      wastes.push({
        type: 'over_processing',
        severity: 'medium',
        description: 'Process has many steps - potential for consolidation',
        suggestion: 'Review each step for value-add vs non-value-add',
        potentialSavings: '10-15% efficiency gain',
      });
    }

    return {
      processId,
      processName: process?.name,
      wasteCount: wastes.length,
      wastes,
      recommendations: wastes.map(w => w.suggestion),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate AI improvement suggestions
   */
  suggestImprovements(processId) {
    const wasteAnalysis = this.detectWaste(processId);
    const process = this.db.get('processes', processId);

    const suggestions = [];

    // Based on waste analysis
    wasteAnalysis.wastes.forEach(waste => {
      suggestions.push({
        type: waste.type,
        priority: waste.severity,
        title: `${waste.type.replace('_', ' ')} detected`,
        description: waste.description,
        action: waste.suggestion,
        expectedImpact: waste.potentialSavings,
      });
    });

    // Process-specific suggestions
    if (process) {
      if (process.steps && process.steps.length > 8) {
        suggestions.push({
          type: 'consolidation',
          priority: 'medium',
          title: 'Too many process steps',
          description: `Process has ${process.steps.length} steps`,
          action: 'Consider breaking into parallel flows or automating simple steps',
          expectedImpact: '15-20% faster process',
        });
      }

      if (process.automationLevel === 'manual') {
        suggestions.push({
          type: 'automation',
          priority: 'high',
          title: 'Process is fully manual',
          description: 'All steps require human intervention',
          action: 'Identify repetitive steps suitable for automation',
          expectedImpact: '30-50% time savings',
        });
      }

      if (process.approvals && process.approvals.length > 3) {
        suggestions.push({
          type: 'approval_streamlining',
          priority: 'medium',
          title: 'Multiple approval levels',
          description: `Process has ${process.approvals.length} approval steps`,
          action: 'Consider conditional approvals based on value/risk',
          expectedImpact: '1-2 day reduction in cycle time',
        });
      }
    }

    return {
      processId,
      processName: process?.name,
      suggestions: suggestions.sort((a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return priority[a.priority] - priority[b.priority];
      }),
      totalPotentialSavings: suggestions.length > 0 ? 'Significant' : 'Minimal',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(filters = {}) {
    const opportunities = this.db.getAll('kaizenOpportunities');
    const completed = opportunities.filter(opp =>
      opp.status === 'completed' && opp.roi?.actual > 0
    );

    const bySubmitter = {};
    completed.forEach(opp => {
      if (!bySubmitter[opp.submitter]) {
        bySubmitter[opp.submitter] = {
          submitter: opp.submitter,
          count: 0,
          totalSavings: 0,
          averageSavings: 0,
        };
      }
      bySubmitter[opp.submitter].count++;
      bySubmiter[opp.submitter].totalSavings += opp.roi.actual;
    });

    Object.values(bySubmitter).forEach(entry => {
      entry.averageSavings = Math.round(entry.totalSavings / entry.count);
    });

    return Object.values(bySubmitter)
      .sort((a, b) => b.totalSavings - a.totalSavings);
  }

  /**
   * Get dashboard metrics
   */
  getMetrics() {
    const opportunities = this.db.getAll('kaizenOpportunities');

    const byStatus = {};
    opportunities.forEach(opp => {
      byStatus[opp.status] = (byStatus[opp.status] || 0) + 1;
    });

    const completed = opportunities.filter(opp => opp.status === 'completed');
    const totalSavings = completed.reduce((sum, opp) => sum + (opp.roi?.actual || 0), 0);
    const avgSavings = completed.length > 0 ? totalSavings / completed.length : 0;

    return {
      total: opportunities.length,
      byStatus,
      completed: completed.length,
      totalSavings,
      averageSavings: Math.round(avgSavings),
      topVoted: opportunities
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5)
        .map(opp => ({ id: opp.id, title: opp.title, votes: opp.votes })),
      analyzedAt: new Date().toISOString(),
    };
  }
}

// Express routes
function registerKaizenRoutes(app) {
  const kaizen = new KaizenEngine();

  // Create opportunity
  app.post('/api/kaizen/opportunities', (req, res) => {
    const opportunity = kaizen.createOpportunity({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(opportunity);
  });

  // Get all opportunities
  app.get('/api/kaizen/opportunities', (req, res) => {
    const { status, category, processId, sort } = req.query;
    let opportunities = db.getAll('kaizenOpportunities');

    if (status) opportunities = opportunities.filter(o => o.status === status);
    if (category) opportunities = opportunities.filter(o => o.category === category);
    if (processId) opportunities = opportunities.filter(o => o.processId === processId);

    if (sort === 'votes') {
      opportunities.sort((a, b) => b.votes - a.votes);
    } else if (sort === 'savings') {
      opportunities.sort((a, b) => (b.roi?.actual || 0) - (a.roi?.actual || 0));
    }

    res.json({ opportunities, total: opportunities.length });
  });

  // Get opportunity
  app.get('/api/kaizen/opportunities/:id', (req, res) => {
    const opp = db.get('kaizenOpportunities', req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  });

  // Vote
  app.post('/api/kaizen/opportunities/:id/vote', (req, res) => {
    const opp = kaizen.vote(req.params.id, req.user?.userId);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json({ votes: opp.votes });
  });

  // Approve
  app.post('/api/kaizen/opportunities/:id/approve', (req, res) => {
    const opp = kaizen.approve(req.params.id, req.user?.userId, req.body);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  });

  // Start implementation
  app.post('/api/kaizen/opportunities/:id/start', (req, res) => {
    const opp = kaizen.start(req.params.id);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  });

  // Complete
  app.post('/api/kaizen/opportunities/:id/complete', (req, res) => {
    const opp = kaizen.complete(req.params.id, req.body);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opp);
  });

  // Detect waste
  app.get('/api/kaizen/waste/:processId', (req, res) => {
    const analysis = kaizen.detectWaste(req.params.processId);
    res.json(analysis);
  });

  // Suggest improvements
  app.get('/api/kaizen/suggestions/:processId', (req, res) => {
    const suggestions = kaizen.suggestImprovements(req.params.processId);
    res.json(suggestions);
  });

  // Leaderboard
  app.get('/api/kaizen/leaderboard', (req, res) => {
    const leaderboard = kaizen.getLeaderboard();
    res.json({ leaderboard });
  });

  // Dashboard metrics
  app.get('/api/kaizen/metrics', (req, res) => {
    const metrics = kaizen.getMetrics();
    res.json(metrics);
  });
}

module.exports = { KaizenEngine, registerKaizenRoutes };
