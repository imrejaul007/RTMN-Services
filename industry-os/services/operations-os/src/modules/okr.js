/**
 * Operations OS - OKR System
 * Objectives and Key Results tracking
 */

const { db } = require('../db/database');

class OKRManager {
  constructor() {
    this.db = db;
  }

  /**
   * Create a new OKR
   */
  async createOKR(data) {
    const id = this.db.generateId('OKR');

    const okr = {
      id,
      objective: data.objective,
      description: data.description || '',
      type: data.type || 'company', // company, department, team, individual
      parentId: data.parentId || null, // Link to parent OKR
      department: data.department || null,
      ownerId: data.ownerId || data.userId,
      quarter: data.quarter || this.getCurrentQuarter(),
      year: data.year || new Date().getFullYear(),
      keyResults: (data.keyResults || []).map((kr, i) => ({
        id: `${id}-kr-${i + 1}`,
        ...kr,
        current: kr.current || 0,
        target: kr.target || 100,
        unit: kr.unit || '%',
        status: 'at_risk', // on_track, at_risk, behind
        progress: this.calculateKRProgress(kr),
      })),
      initiatives: data.initiatives || [],
      status: 'active', // draft, active, completed, cancelled
      startDate: data.startDate || this.getQuarterStart(),
      endDate: data.endDate || this.getQuarterEnd(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('okrs', id, okr);
    return okr;
  }

  /**
   * Calculate key result progress
   */
  calculateKRProgress(kr) {
    if (!kr.target || kr.target === 0) return 0;
    const current = kr.current || 0;
    return Math.min(100, Math.round((current / kr.target) * 100));
  }

  /**
   * Update key result progress
   */
  async updateKRProgress(okrId, krId, current) {
    const okr = this.db.get('okrs', okrId);
    if (!okr) return null;

    const kr = okr.keyResults.find(k => k.id === krId);
    if (!kr) return null;

    kr.current = current;
    kr.progress = this.calculateKRProgress(kr);
    kr.updatedAt = new Date().toISOString();

    // Update KR status
    if (kr.progress >= 70) {
      kr.status = 'on_track';
    } else if (kr.progress >= 40) {
      kr.status = 'at_risk';
    } else {
      kr.status = 'behind';
    }

    okr.updatedAt = new Date().toISOString();
    this.db.set('okrs', okrId, okr);

    return { okr, kr };
  }

  /**
   * Calculate overall OKR progress
   */
  calculateOKRProgress(okr) {
    if (!okr.keyResults || okr.keyResults.length === 0) return 0;

    const total = okr.keyResults.reduce((sum, kr) => {
      const progress = this.calculateKRProgress(kr);
      return sum + progress;
    }, 0);

    return Math.round(total / okr.keyResults.length);
  }

  /**
   * Get OKR with children
   */
  async getOKRWithChildren(okrId) {
    const okr = this.db.get('okrs', okrId);
    if (!okr) return null;

    const children = this.db.getAll('okrs').filter(o => o.parentId === okrId);
    const progress = this.calculateOKRProgress(okr);

    return {
      ...okr,
      progress,
      children: children.map(c => ({
        ...c,
        progress: this.calculateOKRProgress(c),
      })),
    };
  }

  /**
   * Get alignment tree
   */
  async getAlignmentTree() {
    const all = this.db.getAll('okrs');

    // Find root (company-level) OKRs
    const roots = all.filter(o => !o.parentId && o.type === 'company');

    const buildTree = (okr) => {
      const children = all.filter(o => o.parentId === okr.id);
      return {
        ...okr,
        progress: this.calculateOKRProgress(okr),
        children: children.map(buildTree),
      };
    };

    return roots.map(buildTree);
  }

  /**
   * Check OKR health
   */
  async checkHealth(okrId) {
    const okr = this.db.get('okrs', okrId);
    if (!okr) return null;

    const progress = this.calculateOKRProgress(okr);
    const now = new Date();
    const start = new Date(okr.startDate);
    const end = new Date(okr.endDate);

    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);
    const expectedProgress = Math.round((elapsedDays / totalDays) * 100);

    let health = 'on_track';
    if (progress < expectedProgress - 20) {
      health = 'behind';
    } else if (progress < expectedProgress) {
      health = 'at_risk';
    }

    return {
      okrId,
      progress,
      expectedProgress,
      health,
      daysRemaining: Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24))),
      isOnTrack: progress >= expectedProgress,
    };
  }

  /**
   * Get quarterly OKR dashboard
   */
  async getQuarterlyDashboard(quarter = null, year = null) {
    const q = quarter || this.getCurrentQuarter();
    const y = year || new Date().getFullYear();

    const all = this.db.getAll('okrs')
      .filter(o => o.quarter === q && o.year === y);

    const company = all.filter(o => o.type === 'company');
    const departments = all.filter(o => o.type === 'department');
    const teams = all.filter(o => o.type === 'team');

    const calculateAvgProgress = (okrs) => {
      if (okrs.length === 0) return 0;
      const total = okrs.reduce((sum, o) => sum + this.calculateOKRProgress(o), 0);
      return Math.round(total / okrs.length);
    };

    return {
      quarter: q,
      year: y,
      summary: {
        totalOKRs: all.length,
        companyOKRs: company.length,
        departmentOKRs: departments.length,
        teamOKRs: teams.length,
        companyProgress: calculateAvgProgress(company),
        overallProgress: calculateAvgProgress(all),
      },
      byDepartment: this.groupBy(departments, 'department'),
      byStatus: this.groupBy(all, 'status'),
    };
  }

  /**
   * Group items by key
   */
  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      if (!groups[value]) groups[value] = [];
      groups[value].push({ ...item, progress: this.calculateOKRProgress(item) });
      return groups;
    }, {});
  }

  /**
   * Get current quarter
   */
  getCurrentQuarter() {
    const month = Math.floor(new Date().getMonth() / 3) + 1;
    return `Q${month}`;
  }

  /**
   * Get quarter start date
   */
  getQuarterStart() {
    const month = Math.floor(new Date().getMonth() / 3) * 3;
    return new Date(new Date().getFullYear(), month, 1).toISOString();
  }

  /**
   * Get quarter end date
   */
  getQuarterEnd() {
    const month = Math.floor(new Date().getMonth() / 3) * 3 + 3;
    return new Date(new Date().getFullYear(), month, 0).toISOString();
  }
}

// Express routes
function registerOKRRoutes(app) {
  const okrs = new OKRManager();

  // Create OKR
  app.post('/api/okrs', async (req, res) => {
    const okr = await okrs.createOKR({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(okr);
  });

  // Get all OKRs
  app.get('/api/okrs', (req, res) => {
    const { quarter, year, type, department, status } = req.query;
    let all = db.getAll('okrs');

    if (quarter) all = all.filter(o => o.quarter === quarter);
    if (year) all = all.filter(o => o.year === parseInt(year));
    if (type) all = all.filter(o => o.type === type);
    if (department) all = all.filter(o => o.department === department);
    if (status) all = all.filter(o => o.status === status);

    const withProgress = all.map(o => ({
      ...o,
      progress: okrs.calculateOKRProgress(o),
    }));

    res.json({ okrs: withProgress, total: withProgress.length });
  });

  // Get OKR with children
  app.get('/api/okrs/:id', async (req, res) => {
    const okr = await okrs.getOKRWithChildren(req.params.id);
    if (!okr) return res.status(404).json({ error: 'OKR not found' });
    res.json(okr);
  });

  // Update KR progress
  app.patch('/api/okrs/:id/kr/:krId', async (req, res) => {
    const { current } = req.body;
    if (current === undefined) return res.status(400).json({ error: 'current value required' });

    const result = await okrs.updateKRProgress(req.params.id, req.params.krId, current);
    if (!result) return res.status(404).json({ error: 'OKR or KR not found' });
    res.json(result);
  });

  // Get health
  app.get('/api/okrs/:id/health', async (req, res) => {
    const health = await okrs.checkHealth(req.params.id);
    if (!health) return res.status(404).json({ error: 'OKR not found' });
    res.json(health);
  });

  // Get alignment tree
  app.get('/api/okrs/tree', async (req, res) => {
    const tree = await okrs.getAlignmentTree();
    res.json({ tree });
  });

  // Get quarterly dashboard
  app.get('/api/okrs/dashboard', async (req, res) => {
    const { quarter, year } = req.query;
    const dashboard = await okrs.getQuarterlyDashboard(quarter, year);
    res.json(dashboard);
  });

  // Check-in (update progress with note)
  app.post('/api/okrs/:id/checkin', async (req, res) => {
    const { krId, current, note } = req.body;

    if (!krId || current === undefined) {
      return res.status(400).json({ error: 'krId and current required' });
    }

    const result = await okrs.updateKRProgress(req.params.id, krId, current);
    if (!result) return res.status(404).json({ error: 'OKR or KR not found' });

    // Add check-in note if provided
    if (note) {
      const okr = db.get('okrs', req.params.id);
      okr.checkIns = okr.checkIns || [];
      okr.checkIns.push({
        krId,
        current,
        note,
        userId: req.user?.userId,
        timestamp: new Date().toISOString(),
      });
      db.set('okrs', req.params.id, okr);
    }

    res.json(result);
  });
}

module.exports = { OKRManager, registerOKRRoutes };
