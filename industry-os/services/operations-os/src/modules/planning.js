/**
 * Operations OS - Strategic Planning Module
 * Long-term planning and goal setting
 */

const { db } = require('../db/database');

class StrategicPlanning {
  constructor() {
    this.db = db;
  }

  /**
   * Create a strategic plan
   */
  createPlan(data) {
    const id = this.db.generateId('PLAN');

    const plan = {
      id,
      name: data.name,
      type: data.type || 'strategic', // strategic, annual, quarterly, departmental
      horizon: data.horizon || '3_year', // 1_year, 3_year, 5_year, 10_year
      status: 'draft', // draft, active, completed, archived
      vision: data.vision || '',
      mission: data.mission || '',
      values: data.values || [],
      objectives: data.objectives || [],
      strategies: data.strategies || [],
      initiatives: data.initiatives || [],
      kpis: data.kpis || [],
      milestones: data.milestones || [],
      stakeholders: data.stakeholders || [],
      budget: data.budget || 0,
      allocatedBudget: 0,
      department: data.department || null,
      owner: data.owner || data.userId,
      approvedBy: null,
      approvedAt: null,
      timeline: {
        startDate: data.startDate,
        endDate: data.endDate,
        currentPhase: data.currentPhase || 1,
        totalPhases: data.totalPhases || 1,
      },
      progress: 0,
      risks: data.risks || [],
      assumptions: data.assumptions || [],
      dependencies: data.dependencies || [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.userId,
    };

    this.db.set('strategicPlans', id, plan);
    return plan;
  }

  /**
   * Add objective to plan
   */
  addObjective(planId, objectiveData) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    const objective = {
      id: this.db.generateId('OBJ'),
      planId,
      title: objectiveData.title,
      description: objectiveData.description || '',
      priority: objectiveData.priority || 'medium',
      status: 'not_started', // not_started, in_progress, completed, deferred
      owner: objectiveData.owner || null,
      department: objectiveData.department || plan.department,
      targetDate: objectiveData.targetDate,
      keyResults: objectiveData.keyResults || [],
      initiatives: objectiveData.initiatives || [],
      metrics: {
        baseline: objectiveData.metrics?.baseline || 0,
        current: objectiveData.metrics?.baseline || 0,
        target: objectiveData.metrics?.target || 100,
      },
      progress: 0,
      risks: objectiveData.risks || [],
      dependencies: objectiveData.dependencies || [],
      createdAt: new Date().toISOString(),
    };

    this.db.set('planObjectives', objective.id, objective);
    plan.objectives.push(objective.id);
    this.db.set('strategicPlans', planId, plan);

    return objective;
  }

  /**
   * Add initiative to plan
   */
  addInitiative(planId, initiativeData) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    const initiative = {
      id: this.db.generateId('INIT'),
      planId,
      objectiveId: initiativeData.objectiveId || null,
      title: initiativeData.title,
      description: initiativeData.description || '',
      type: initiativeData.type || 'project', // project, program, task
      status: 'planned', // planned, approved, in_progress, completed, cancelled
      priority: initiativeData.priority || 'medium',
      owner: initiativeData.owner || null,
      team: initiativeData.team || [],
      startDate: initiativeData.startDate,
      endDate: initiativeData.endDate,
      budget: initiativeData.budget || 0,
      allocatedBudget: 0,
      progress: 0,
      milestones: initiativeData.milestones || [],
      deliverables: initiativeData.deliverables || [],
      kpis: initiativeData.kpis || [],
      resources: initiativeData.resources || [],
      risks: initiativeData.risks || [],
      dependencies: initiativeData.dependencies || [],
      createdAt: new Date().toISOString(),
    };

    this.db.set('planInitiatives', initiative.id, initiative);
    plan.initiatives.push(initiative.id);
    this.db.set('strategicPlans', planId, plan);

    return initiative;
  }

  /**
   * Update KPI progress
   */
  updateKPIProgress(planId, kpiId, value) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    const kpi = plan.kpis.find(k => k.id === kpiId);
    if (!kpi) return null;

    kpi.current = value;
    kpi.lastUpdated = new Date().toISOString();

    // Recalculate progress
    this.calculatePlanProgress(planId);

    this.db.set('strategicPlans', planId, plan);
    return plan;
  }

  /**
   * Calculate overall plan progress
   */
  calculatePlanProgress(planId) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    // Calculate based on KPIs
    if (plan.kpis && plan.kpis.length > 0) {
      const totalProgress = plan.kpis.reduce((sum, kpi) => {
        if (kpi.target && kpi.target > 0) {
          return sum + (kpi.current / kpi.target) * 100;
        }
        return sum;
      }, 0);
      plan.progress = Math.round(totalProgress / plan.kpis.length);
    }

    // Update status based on progress
    if (plan.progress >= 100) {
      plan.status = 'completed';
    } else if (plan.progress > 0) {
      plan.status = 'active';
    }

    this.db.set('strategicPlans', planId, plan);
    return plan;
  }

  /**
   * Add milestone
   */
  addMilestone(planId, milestoneData) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    const milestone = {
      id: this.db.generateId('MS'),
      planId,
      title: milestoneData.title,
      description: milestoneData.description || '',
      targetDate: milestoneData.targetDate,
      status: 'upcoming', // upcoming, achieved, missed, extended
      actualDate: null,
      metrics: milestoneData.metrics || {},
      createdAt: new Date().toISOString(),
    };

    plan.milestones.push(milestone.id);
    this.db.set('planMilestones', milestone.id, milestone);
    this.db.set('strategicPlans', planId, plan);

    return milestone;
  }

  /**
   * Get plan with full details
   */
  getPlanWithDetails(planId) {
    const plan = this.db.get('strategicPlans', planId);
    if (!plan) return null;

    const objectives = (plan.objectives || [])
      .map(id => this.db.get('planObjectives', id))
      .filter(Boolean);

    const initiatives = (plan.initiatives || [])
      .map(id => this.db.get('planInitiatives', id))
      .filter(Boolean);

    const milestones = (plan.milestones || [])
      .map(id => this.db.get('planMilestones', id))
      .filter(Boolean);

    return {
      ...plan,
      objectives,
      initiatives,
      milestones,
      budgetUtilization: plan.budget > 0
        ? Math.round((plan.allocatedBudget / plan.budget) * 100)
        : 0,
    };
  }

  /**
   * Get strategic alignment
   */
  getAlignment() {
    const plans = this.db.getAll('strategicPlans')
      .filter(p => p.status === 'active');

    const alignment = {
      company: plans.filter(p => p.type === 'strategic'),
      departments: {},
      quarterly: plans.filter(p => p.type === 'quarterly'),
    };

    plans.forEach(plan => {
      if (plan.department) {
        if (!alignment.departments[plan.department]) {
          alignment.departments[plan.department] = [];
        }
        alignment.departments[plan.department].push({
          id: plan.id,
          name: plan.name,
          progress: plan.progress,
          status: plan.status,
        });
      }
    });

    return alignment;
  }

  /**
   * Get planning dashboard
   */
  getDashboard() {
    const plans = this.db.getAll('strategicPlans');
    const active = plans.filter(p => p.status === 'active');

    const summary = {
      total: plans.length,
      active: active.length,
      completed: plans.filter(p => p.status === 'completed').length,
      draft: plans.filter(p => p.status === 'draft').length,
      totalBudget: active.reduce((sum, p) => sum + (p.budget || 0), 0),
      allocatedBudget: active.reduce((sum, p) => sum + (p.allocatedBudget || 0), 0),
      avgProgress: active.length > 0
        ? Math.round(active.reduce((sum, p) => sum + p.progress, 0) / active.length)
        : 0,
    };

    const topPlans = active
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    const upcomingMilestones = this.db.getAll('planMilestones')
      .filter(m => m.status === 'upcoming')
      .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
      .slice(0, 10);

    return {
      summary,
      topPlans: topPlans.map(p => ({
        id: p.id,
        name: p.name,
        progress: p.progress,
        status: p.status,
      })),
      upcomingMilestones,
    };
  }
}

// Express routes
function registerPlanningRoutes(app) {
  const planning = new StrategicPlanning();

  // Create plan
  app.post('/api/planning/plans', (req, res) => {
    const plan = planning.createPlan({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(plan);
  });

  // Get all plans
  app.get('/api/planning/plans', (req, res) => {
    const { type, status, department } = req.query;
    let plans = db.getAll('strategicPlans');

    if (type) plans = plans.filter(p => p.type === type);
    if (status) plans = plans.filter(p => p.status === status);
    if (department) plans = plans.filter(p => p.department === department);

    res.json({ plans, total: plans.length });
  });

  // Get plan with details
  app.get('/api/planning/plans/:id', (req, res) => {
    const plan = planning.getPlanWithDetails(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  });

  // Update plan
  app.patch('/api/planning/plans/:id', (req, res) => {
    const existing = db.get('strategicPlans', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    db.set('strategicPlans', req.params.id, updated);
    res.json(updated);
  });

  // Add objective
  app.post('/api/planning/plans/:id/objectives', (req, res) => {
    const objective = planning.addObjective(req.params.id, req.body);
    if (!objective) return res.status(404).json({ error: 'Plan not found' });
    res.status(201).json(objective);
  });

  // Add initiative
  app.post('/api/planning/plans/:id/initiatives', (req, res) => {
    const initiative = planning.addInitiative(req.params.id, req.body);
    if (!initiative) return res.status(404).json({ error: 'Plan not found' });
    res.status(201).json(initiative);
  });

  // Add milestone
  app.post('/api/planning/plans/:id/milestones', (req, res) => {
    const milestone = planning.addMilestone(req.params.id, req.body);
    if (!milestone) return res.status(404).json({ error: 'Plan not found' });
    res.status(201).json(milestone);
  });

  // Update KPI
  app.patch('/api/planning/plans/:id/kpis/:kpiId', (req, res) => {
    const { value } = req.body;
    const plan = planning.updateKPIProgress(req.params.id, req.params.kpiId, value);
    if (!plan) return res.status(404).json({ error: 'Plan or KPI not found' });
    res.json(plan);
  });

  // Get alignment
  app.get('/api/planning/alignment', (req, res) => {
    const alignment = planning.getAlignment();
    res.json(alignment);
  });

  // Get dashboard
  app.get('/api/planning/dashboard', (req, res) => {
    const dashboard = planning.getDashboard();
    res.json(dashboard);
  });
}

module.exports = { StrategicPlanning, registerPlanningRoutes };
