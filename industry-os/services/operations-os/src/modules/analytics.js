/**
 * Operations OS - Analytics & Prediction Module
 * KPI tracking, root cause analysis, and predictive analytics
 */

const { db } = require('../db/database');

class AnalyticsEngine {
  constructor() {
    this.db = db;
  }

  /**
   * Create KPI
   */
  createKPI(data) {
    const id = this.db.generateId('KPI');

    const kpi = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'general', // operational, financial, quality, hr
      type: data.type || 'numeric', // numeric, percentage, currency, boolean
      entity: data.entity || null, // process, project, resource, etc.
      entityId: data.entityId || null,
      formula: data.formula || null,
      target: data.target || 100,
      baseline: data.baseline || 0,
      current: data.current || 0,
      unit: data.unit || '',
      direction: data.direction || 'higher_is_better', // higher_is_better, lower_is_better
      frequency: data.frequency || 'daily', // hourly, daily, weekly, monthly, quarterly
      owner: data.owner || data.userId,
      department: data.department || null,
      status: 'active', // active, archived
      thresholds: data.thresholds || {
        red: 0.5,    // < 50% of target
        yellow: 0.75, // 50-75%
        green: 0.9,  // > 90%
      },
      history: [{
        value: data.current || 0,
        timestamp: new Date().toISOString(),
      }],
      alerts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('kpis', id, kpi);
    return kpi;
  }

  /**
   * Update KPI value
   */
  updateValue(kpiId, value) {
    const kpi = this.db.get('kpis', kpiId);
    if (!kpi) return null;

    kpi.current = value;
    kpi.history.push({
      value,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 365 data points
    if (kpi.history.length > 365) {
      kpi.history = kpi.history.slice(-365);
    }

    // Check alerts
    const progress = this.calculateProgress(kpi);
    this.checkAlerts(kpi, progress);

    kpi.updatedAt = new Date().toISOString();
    this.db.set('kpis', kpiId, kpi);

    return kpi;
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(kpi) {
    if (kpi.target === 0) return 0;

    const progress = kpi.direction === 'higher_is_better'
      ? kpi.current / kpi.target
      : kpi.baseline > 0
        ? (kpi.baseline - kpi.current) / kpi.baseline
        : 0;

    return Math.min(1, Math.max(0, progress));
  }

  /**
   * Get KPI status
   */
  getStatus(kpi) {
    const progress = this.calculateProgress(kpi);

    if (progress >= kpi.thresholds.green) return 'green';
    if (progress >= kpi.thresholds.yellow) return 'yellow';
    if (progress >= kpi.thresholds.red) return 'red';
    return 'critical';
  }

  /**
   * Check and trigger alerts
   */
  checkAlerts(kpi, progress) {
    if (progress < kpi.thresholds.red && kpi.alerts.indexOf('critical') === -1) {
      kpi.alerts.push('critical');
    } else if (progress < kpi.thresholds.yellow && kpi.alerts.indexOf('warning') === -1) {
      kpi.alerts.push('warning');
    }
  }

  /**
   * Root cause analysis
   */
  analyzeRootCause(effect) {
    const analysis = {
      id: this.db.generateId('RCA'),
      effect: effect.description || effect.title,
      entityType: effect.entityType,
      entityId: effect.entityId,
      severity: effect.severity || 'medium',
      whyChain: [],
      rootCause: null,
      contributingFactors: [],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };

    // Use 5 Whys methodology
    let currentCause = effect.cause || 'Initial observation';
    const depth = 5;

    for (let i = 0; i < depth; i++) {
      const why = {
        level: i + 1,
        question: `Why is "${currentCause}" happening?`,
        answer: this.findCause(currentCause, effect),
      };

      analysis.whyChain.push(why);

      if (why.answer && why.answer.isRoot) {
        analysis.rootCause = why.answer.cause;
        break;
      }

      if (why.answer) {
        currentCause = why.answer.cause;
      }
    }

    // If no root cause found, use last answer
    if (!analysis.rootCause && analysis.whyChain.length > 0) {
      analysis.rootCause = analysis.whyChain[analysis.whyChain.length - 1].answer?.cause || 'Unknown';
    }

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Find cause (placeholder for AI integration)
   */
  findCause(currentCause, effect) {
    // This would be replaced with AI/LLM analysis
    const commonCauses = {
      'delay': { cause: 'Resource constraint', isRoot: false },
      'resource constraint': { cause: 'Poor planning', isRoot: false },
      'poor planning': { cause: 'Lack of visibility into capacity', isRoot: true },
      'error': { cause: 'Process gap', isRoot: false },
      'process gap': { cause: 'No documentation', isRoot: true },
      'low quality': { cause: 'Insufficient training', isRoot: false },
      'budget overrun': { cause: 'Scope creep', isRoot: false },
      'scope creep': { cause: 'Unclear requirements', isRoot: true },
    };

    const cause = commonCauses[currentCause.toLowerCase()];
    return cause || { cause: 'Unknown factor', isRoot: false };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Based on root cause
    if (analysis.rootCause) {
      const lower = analysis.rootCause.toLowerCase();

      if (lower.includes('planning') || lower.includes('visibility')) {
        recommendations.push({
          type: 'process',
          priority: 'high',
          title: 'Improve capacity planning',
          description: 'Implement better visibility into resource capacity and demand forecasting',
        });
      }

      if (lower.includes('training') || lower.includes('skill')) {
        recommendations.push({
          type: 'training',
          priority: 'high',
          title: 'Invest in training',
          description: 'Develop comprehensive training programs to address skill gaps',
        });
      }

      if (lower.includes('documentation') || lower.includes('process')) {
        recommendations.push({
          type: 'documentation',
          priority: 'medium',
          title: 'Document processes',
          description: 'Create and maintain SOPs for all critical processes',
        });
      }

      if (lower.includes('requirements') || lower.includes('scope')) {
        recommendations.push({
          type: 'governance',
          priority: 'high',
          title: 'Strengthen requirements process',
          description: 'Implement better requirements gathering and scope management',
        });
      }
    }

    // General recommendations
    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      title: 'Set up monitoring',
      description: 'Implement real-time monitoring to catch issues earlier',
    });

    return recommendations;
  }

  /**
   * Predict outcome
   */
  predict(projectId) {
    const project = this.db.get('projects', projectId);
    if (!project) return null;

    const prediction = {
      projectId,
      projectName: project.name,
      currentProgress: project.progress || 0,
      currentSpend: project.spent || 0,
      budget: project.budget || 0,
      endDate: project.endDate,
      predictions: {},
      riskFactors: [],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    };

    // Calculate burn rate
    const startDate = new Date(project.createdAt || Date.now());
    const daysElapsed = (Date.now() - startDate) / (1000 * 60 * 60 * 24);
    const dailyBurnRate = daysElapsed > 0 ? project.spent / daysElapsed : 0;

    // Predict completion date
    const remainingWork = 100 - project.progress;
    const dailyProgress = project.progress / daysElapsed;
    const daysToComplete = dailyProgress > 0 ? remainingWork / dailyProgress : 0;
    const predictedEndDate = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);

    prediction.predictions.completionDate = predictedEndDate.toISOString();
    prediction.predictions.daysRemaining = Math.round(daysToComplete);
    prediction.predictions.onSchedule = new Date(project.endDate) > predictedEndDate;

    // Predict final cost
    const daysRemaining = daysToComplete;
    const predictedSpend = project.spent + (dailyBurnRate * daysRemaining);
    prediction.predictions.finalCost = Math.round(predictedSpend);
    prediction.predictions.overBudget = predictedSpend > project.budget;

    // Risk factors
    if (project.progress < 20 && daysElapsed > 30) {
      prediction.riskFactors.push('Slow start - may impact deadline');
    }

    if (predictedSpend > project.budget * 1.2) {
      prediction.riskFactors.push('High risk of significant budget overrun');
    }

    if (daysRemaining < 14 && remainingWork > 30) {
      prediction.riskFactors.push('Tight deadline with significant work remaining');
    }

    // Recommendations
    if (prediction.predictions.overBudget) {
      prediction.recommendations.push({
        type: 'budget',
        priority: 'high',
        title: 'Review scope or budget',
        description: 'Consider reducing scope or increasing budget allocation',
      });
    }

    if (!prediction.predictions.onSchedule) {
      prediction.recommendations.push({
        type: 'timeline',
        priority: 'high',
        title: 'Accelerate delivery',
        description: 'Consider adding resources or reducing scope to meet deadline',
      });
    }

    return prediction;
  }

  /**
   * Get executive dashboard
   */
  getExecutiveDashboard() {
    const projects = this.db.getAll('projects');
    const tasks = this.db.getAll('tasks');
    const incidents = this.db.getAll('incidents');
    const kpis = this.db.getAll('kpis');
    const resources = this.db.getAll('resources');

    const summary = {
      projects: {
        total: projects.length,
        onTrack: projects.filter(p => p.progress >= 50).length,
        atRisk: projects.filter(p => p.progress < 50 && p.progress > 20).length,
        critical: projects.filter(p => p.progress <= 20).length,
        avgProgress: projects.length > 0
          ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
          : 0,
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
        completionRate: tasks.length > 0
          ? Math.round(tasks.filter(t => t.status === 'completed').length / tasks.length * 100)
          : 0,
      },
      incidents: {
        open: incidents.filter(i => i.status !== 'resolved').length,
        critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
        avgResolution: this.calculateAvgResolution(incidents),
      },
      kpis: {
        total: kpis.filter(k => k.status === 'active').length,
        onTarget: kpis.filter(k => {
          const progress = k.current / k.target;
          return progress >= 0.9;
        }).length,
        atRisk: kpis.filter(k => {
          const progress = k.current / k.target;
          return progress >= 0.5 && progress < 0.9;
        }).length,
        critical: kpis.filter(k => k.current / k.target < 0.5).length,
      },
      resources: {
        total: resources.length,
        avgUtilization: resources.length > 0
          ? Math.round(resources.reduce((sum, r) => sum + (r.utilization || 0), 0) / resources.length)
          : 0,
        underUtilized: resources.filter(r => r.utilization < 30).length,
      },
    };

    return summary;
  }

  /**
   * Calculate average resolution time
   */
  calculateAvgResolution(incidents) {
    const resolved = incidents.filter(i => i.status === 'resolved' && i.resolvedAt);
    if (resolved.length === 0) return 0;

    const totalTime = resolved.reduce((sum, i) => {
      const start = new Date(i.reportedAt || i.createdAt).getTime();
      const end = new Date(i.resolvedAt).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / resolved.length / (1000 * 60 * 60)); // hours
  }

  /**
   * Trend analysis
   */
  getTrends(metric, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    let data;
    switch (metric) {
      case 'projects':
        data = this.db.getAll('projects').map(p => ({
          date: p.updatedAt,
          value: p.progress,
          status: p.status,
        }));
        break;
      case 'tasks':
        data = this.db.getAll('tasks').map(t => ({
          date: t.updatedAt,
          value: t.status === 'completed' ? 1 : 0,
        }));
        break;
      case 'kpis':
        data = this.db.getAll('kpis').flatMap(k =>
          k.history.map(h => ({
            date: h.timestamp,
            value: k.type === 'percentage' ? h.value : h.value / k.target * 100,
          }))
        );
        break;
      default:
        data = [];
    }

    return data
      .filter(d => new Date(d.date) >= since)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

// Express routes
function registerAnalyticsRoutes(app) {
  const analytics = new AnalyticsEngine();

  // ============ KPIs ============

  // Create KPI
  app.post('/api/analytics/kpis', (req, res) => {
    const kpi = analytics.createKPI({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(kpi);
  });

  // Get KPIs
  app.get('/api/analytics/kpis', (req, res) => {
    const { category, status, department } = req.query;
    let kpis = db.getAll('kpis');

    if (category) kpis = kpis.filter(k => k.category === category);
    if (status) kpis = kpis.filter(k => k.status === status);
    if (department) kpis = kpis.filter(k => k.department === department);

    // Add status
    kpis = kpis.map(k => ({
      ...k,
      status: analytics.getStatus(k),
      progress: analytics.calculateProgress(k),
    }));

    res.json({ kpis, total: kpis.length });
  });

  // Get KPI
  app.get('/api/analytics/kpis/:id', (req, res) => {
    const kpi = db.get('kpis', req.params.id);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });
    res.json({
      ...kpi,
      status: analytics.getStatus(kpi),
      progress: analytics.calculateProgress(kpi),
    });
  });

  // Update KPI value
  app.patch('/api/analytics/kpis/:id', (req, res) => {
    const { value } = req.body;
    const kpi = analytics.updateValue(req.params.id, value);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });
    res.json({
      ...kpi,
      status: analytics.getStatus(kpi),
      progress: analytics.calculateProgress(kpi),
    });
  });

  // ============ ROOT CAUSE ============

  // Analyze root cause
  app.post('/api/analytics/root-cause', (req, res) => {
    const analysis = analytics.analyzeRootCause(req.body);
    res.status(201).json(analysis);
  });

  // ============ PREDICTIONS ============

  // Predict project outcome
  app.get('/api/analytics/predict/:projectId', (req, res) => {
    const prediction = analytics.predict(req.params.projectId);
    if (!prediction) return res.status(404).json({ error: 'Project not found' });
    res.json(prediction);
  });

  // ============ DASHBOARD ============

  // Executive dashboard
  app.get('/api/analytics/dashboard', (req, res) => {
    const dashboard = analytics.getExecutiveDashboard();
    res.json(dashboard);
  });

  // Trends
  app.get('/api/analytics/trends', (req, res) => {
    const { metric, days = 30 } = req.query;
    const trends = analytics.getTrends(metric, parseInt(days));
    res.json({ trends, total: trends.length });
  });
}

module.exports = { AnalyticsEngine, registerAnalyticsRoutes };
