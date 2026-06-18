/**
 * Operations OS - Delivery Module
 * Customer delivery management
 */

const deliveryRoutes = (app, db) => {

  // Delivery OS - Customer delivery tracking
  app.get('/api/deliveries', (req, res) => {
    const { status, projectId } = req.query;
    let deliveries = Array.from(db.deliveries?.values() || []);
    if (status) deliveries = deliveries.filter(d => d.status === status);
    if (projectId) deliveries = deliveries.filter(d => d.projectId === projectId);
    res.json({ deliveries, total: deliveries.length });
  });

  app.get('/api/deliveries/:id', (req, res) => {
    const delivery = db.deliveries?.get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json(delivery);
  });

  app.post('/api/deliveries', (req, res) => {
    const { projectId, name, customerId, milestones, dueDate } = req.body;
    const id = `DEL${String((db.deliveries?.size || 0) + 1).padStart(3, '0')}`;
    const delivery = {
      id,
      projectId,
      name,
      customerId,
      status: 'planning',
      milestones: milestones || [],
      currentMilestone: 0,
      dueDate,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    db.deliveries = db.deliveries || new Map();
    db.deliveries.set(id, delivery);
    res.status(201).json(delivery);
  });

  // Planning OS - Strategic and operational planning
  app.get('/api/plans', (req, res) => {
    const { type, period } = req.query;
    let plans = Array.from(db.plans?.values() || []);
    if (type) plans = plans.filter(p => p.type === type);
    if (period) plans = plans.filter(p => p.period === period);
    res.json({ plans, total: plans.length });
  });

  app.post('/api/plans', (req, res) => {
    const { name, type, period, startDate, endDate, objectives } = req.body;
    const id = `PLAN${String((db.plans?.size || 0) + 1).padStart(3, '0')}`;
    const plan = { id, name, type, period, startDate, endDate, objectives: objectives || [], status: 'draft' };
    db.plans = db.plans || new Map();
    db.plans.set(id, plan);
    res.status(201).json(plan);
  });

  // PMO OS - Portfolio and program management
  app.get('/api/pmo/portfolios', (req, res) => {
    const portfolios = Array.from(db.portfolios?.values() || []);
    res.json({ portfolios, total: portfolios.length });
  });

  app.post('/api/pmo/portfolios', (req, res) => {
    const { name, description, projects } = req.body;
    const id = `PORT${String((db.portfolios?.size || 0) + 1).padStart(3, '0')}`;
    const portfolio = {
      id,
      name,
      description,
      projects: projects || [],
      totalBudget: 0,
      totalSpent: 0,
      health: 'healthy',
    };
    db.portfolios = db.portfolios || new Map();
    db.portfolios.set(id, portfolio);
    res.status(201).json(portfolio);
  });

  app.get('/api/pmo/health', (req, res) => {
    const projects = Array.from(db.projects?.values() || []);
    const portfolios = Array.from(db.portfolios?.values() || []);

    const health = {
      totalProjects: projects.length,
      onTrack: projects.filter(p => p.status === 'in_progress' && p.progress > 50).length,
      atRisk: projects.filter(p => p.progress < 30).length,
      delayed: projects.filter(p => new Date(p.endDate) < new Date()).length,
      totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
      totalSpent: projects.reduce((s, p) => s + (p.spent || 0), 0),
      score: 0,
    };
    health.score = Math.round(100 - (health.atRisk * 10) - (health.delayed * 15));

    res.json(health);
  });

  // Change Management OS
  app.get('/api/changes', (req, res) => {
    const changes = Array.from(db.changes?.values() || []);
    res.json({ changes, total: changes.length });
  });

  app.post('/api/changes', (req, res) => {
    const { title, type, description, impact, approvalRequired } = req.body;
    const id = `CHG${String((db.changes?.size || 0) + 1).padStart(3, '0')}`;
    const change = {
      id,
      title,
      type: type || 'system',
      description,
      impact: impact || 'medium',
      status: approvalRequired ? 'pending_approval' : 'approved',
      approvals: [],
      implementedAt: null,
      rolledBackAt: null,
    };
    db.changes = db.changes || new Map();
    db.changes.set(id, change);
    res.status(201).json(change);
  });

  // Knowledge OS - Policies, SOPs, Guidelines
  app.get('/api/knowledge', (req, res) => {
    const { category, search } = req.query;
    let docs = Array.from(db.knowledge?.values() || []);
    if (category) docs = docs.filter(d => d.category === category);
    if (search) {
      const term = search.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(term) || d.content?.toLowerCase().includes(term));
    }
    res.json({ documents: docs, total: docs.length });
  });

  app.post('/api/knowledge', (req, res) => {
    const { title, category, content, tags } = req.body;
    const id = `KND${String((db.knowledge?.size || 0) + 1).padStart(3, '0')}`;
    const doc = { id, title, category, content, tags: tags || [], views: 0, createdAt: new Date().toISOString() };
    db.knowledge = db.knowledge || new Map();
    db.knowledge.set(id, doc);
    res.status(201).json(doc);
  });

  app.get('/api/knowledge/:id', (req, res) => {
    const doc = db.knowledge?.get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    doc.views = (doc.views || 0) + 1;
    db.knowledge.set(req.params.id, doc);
    res.json(doc);
  });

  // Capacity Planning OS
  app.get('/api/capacity', (req, res) => {
    const resources = Array.from(db.resources?.values() || []);
    const capacity = {
      totalResources: resources.length,
      avgUtilization: resources.reduce((s, r) => s + (r.utilization || 0), 0) / (resources.length || 1),
      overloaded: resources.filter(r => r.utilization > 90).length,
      underutilized: resources.filter(r => r.utilization < 50).length,
      available: resources.filter(r => r.utilization < 80).length,
    };
    res.json(capacity);
  });

  app.get('/api/capacity/forecast', (req, res) => {
    const { months = 3 } = req.query;
    const forecast = [];
    for (let i = 1; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      forecast.push({
        month: date.toISOString().slice(0, 7),
        projectedUtilization: 75 + (i * 5), // Growing
        currentCapacity: 100,
        needsHiring: i > 2,
      });
    }
    res.json({ forecast });
  });

  // Quality OS
  app.get('/api/quality/audits', (req, res) => {
    const audits = Array.from(db.qualityAudits?.values() || []);
    res.json({ audits, total: audits.length });
  });

  app.post('/api/quality/audits', (req, res) => {
    const { title, type, department, auditor } = req.body;
    const id = `AUD${String((db.qualityAudits?.size || 0) + 1).padStart(3, '0')}`;
    const audit = {
      id,
      title,
      type,
      department,
      auditor,
      status: 'scheduled',
      findings: [],
      score: 0,
      completedAt: null,
    };
    db.qualityAudits = db.qualityAudits || new Map();
    db.qualityAudits.set(id, audit);
    res.status(201).json(audit);
  });

  // CAPA (Corrective and Preventive Action)
  app.get('/api/quality/capas', (req, res) => {
    const capas = Array.from(db.capas?.values() || []);
    res.json({ capas, total: capas.length });
  });

  app.post('/api/quality/capas', (req, res) => {
    const { title, rootCause, correctiveAction, preventiveAction, deadline } = req.body;
    const id = `CAPA${String((db.capas?.size || 0) + 1).padStart(3, '0')}`;
    const capa = {
      id,
      title,
      rootCause,
      correctiveAction,
      preventiveAction,
      status: 'open',
      deadline,
      completedAt: null,
    };
    db.capas = db.capas || new Map();
    db.capas.set(id, capa);
    res.status(201).json(capa);
  });
};

module.exports = deliveryRoutes;
