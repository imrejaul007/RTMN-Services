/**
 * Operations OS - Quality Management System
 * ISO compliance, audits, CAPA, and continuous improvement
 */

const { db } = require('../db/database');

class QualityManagement {
  constructor() {
    this.db = db;
  }

  /**
   * Create quality policy
   */
  createPolicy(data) {
    const id = this.db.generateId('QPOL');

    const policy = {
      id,
      name: data.name,
      code: data.code || `POL-${id.slice(-4)}`,
      type: data.type || 'quality', // quality, safety, environmental, compliance
      category: data.category || 'general',
      description: data.description || '',
      scope: data.scope || '',
      objectives: data.objectives || [],
      procedures: data.procedures || [],
      responsible: data.responsible || null,
      approvalStatus: 'draft', // draft, pending_approval, approved, active, archived
      effectiveDate: data.effectiveDate,
      reviewDate: data.reviewDate,
      version: 1,
      documentControl: {
        author: data.userId,
        createdAt: new Date().toISOString(),
        approver: null,
        approvedAt: null,
        lastReviewed: null,
      },
      relatedPolicies: data.relatedPolicies || [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('qualityPolicies', id, policy);
    return policy;
  }

  /**
   * Create audit
   */
  createAudit(data) {
    const id = this.db.generateId('AUD');

    const audit = {
      id,
      title: data.title,
      type: data.type || 'internal', // internal, external, supplier, certification
      standard: data.standard || 'ISO9001', // ISO9001, ISO14001, SOC2, HIPAA, etc.
      scope: data.scope || '',
      auditor: data.auditor || data.userId,
      leadAuditor: data.leadAuditor || null,
      team: data.team || [],
      entityType: data.entityType || null, // process, department, supplier
      entityId: data.entityId || null,
      status: 'scheduled', // scheduled, in_progress, completed, cancelled
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      actualStart: null,
      actualEnd: null,
      findings: [],
      nonConformances: [],
      observations: [],
      score: 0,
      maxScore: 100,
      duration: 0,
      report: null,
      followUpDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('qualityAudits', id, audit);
    return audit;
  }

  /**
   * Add finding to audit
   */
  addFinding(auditId, findingData) {
    const audit = this.db.get('qualityAudits', auditId);
    if (!audit) return null;

    const finding = {
      id: this.db.generateId('FIND'),
      auditId,
      type: findingData.type || 'non_conformance', // non_conformance, observation, opportunity
      severity: findingData.severity || 'minor', // critical, major, minor, observation
      category: findingData.category || 'general',
      description: findingData.description,
      criteria: findingData.criteria || '',
      evidence: findingData.evidence || [],
      rootCause: null,
      correctiveAction: null,
      preventiveAction: null,
      status: 'open', // open, in_progress, closed, verified
      owner: findingData.owner || null,
      dueDate: findingData.dueDate,
      closedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      createdAt: new Date().toISOString(),
    };

    audit.findings.push(finding);
    audit.nonConformances = audit.findings.filter(f => f.type === 'non_conformance');
    audit.observations = audit.findings.filter(f => f.type === 'observation');

    this.db.set('qualityAudits', auditId, audit);
    return finding;
  }

  /**
   * Calculate audit score
   */
  calculateScore(auditId) {
    const audit = this.db.get('qualityAudits', auditId);
    if (!audit) return null;

    const weights = { critical: 0, major: 0, minor: 0, observation: 0 };
    weights[audit.standard] = weights[audit.standard] || {
      critical: 30,
      major: 20,
      minor: 10,
      observation: 5,
    };

    // Default weights if standard not defined
    const defaultWeights = { critical: 30, major: 20, minor: 10, observation: 5 };
    const w = weights[audit.standard] || defaultWeights;

    const totalDeductions = audit.findings.reduce((sum, f) => {
      return sum + (w[f.severity] || 10);
    }, 0);

    audit.score = Math.max(0, audit.maxScore - totalDeductions);
    this.db.set('qualityAudits', auditId, audit);

    return {
      auditId,
      score: audit.score,
      maxScore: audit.maxScore,
      findings: audit.findings.length,
      bySeverity: {
        critical: audit.findings.filter(f => f.severity === 'critical').length,
        major: audit.findings.filter(f => f.severity === 'major').length,
        minor: audit.findings.filter(f => f.severity === 'minor').length,
        observation: audit.findings.filter(f => f.severity === 'observation').length,
      },
    };
  }

  /**
   * Create CAPA
   */
  createCAPA(data) {
    const id = this.db.generateId('CAPA');

    const capa = {
      id,
      code: `CAPA-${Date.now().toString(36).toUpperCase()}`,
      title: data.title,
      description: data.description || '',
      type: data.type || 'corrective', // corrective, preventive
      source: data.source || 'audit', // audit, incident, complaint, inspection, review
      sourceId: data.sourceId || null,
      severity: data.severity || 'medium',
      priority: data.priority || 'medium',
      status: 'investigation', // investigation, root_cause, action_plan, implementation, verification, closed
      affectedProcesses: data.affectedProcesses || [],
      affectedDepartments: data.affectedDepartments || [],
      investigation: {
        findings: data.investigation?.findings || [],
        analysis: data.investigation?.analysis || '',
        completedAt: null,
      },
      rootCause: {
        analysis: data.rootCause?.analysis || '',
        method: data.rootCause?.method || '5_whys', // 5_whys, fishbone, fault_tree
        causes: data.rootCause?.causes || [],
        completedAt: null,
      },
      correctiveAction: {
        actions: data.correctiveAction?.actions || [],
        responsible: data.correctiveAction?.responsible || null,
        dueDate: data.correctiveAction?.dueDate,
        completedAt: null,
      },
      preventiveAction: {
        actions: data.preventiveAction?.actions || [],
        responsible: data.preventiveAction?.responsible || null,
        dueDate: data.preventiveAction?.dueDate,
        completedAt: null,
      },
      effectiveness: {
        verified: false,
        criteria: data.effectiveness?.criteria || '',
        measuredAt: null,
        result: null,
        verifiedBy: null,
      },
      timeline: {
        createdAt: new Date().toISOString(),
        investigationCompleted: null,
        approvedAt: null,
        implementationStarted: null,
        implementationCompleted: null,
        closedAt: null,
      },
      attachments: [],
      cost: { estimated: data.cost?.estimated || 0, actual: data.cost?.actual || 0 },
      createdBy: data.userId,
    };

    this.db.set('capas', id, capa);
    return capa;
  }

  /**
   * Add root cause to CAPA
   */
  addRootCause(capaId, rootCauseData) {
    const capa = this.db.get('capas', capaId);
    if (!capa) return null;

    const rootCause = {
      id: this.db.generateId('RC'),
      capaId,
      category: rootCauseData.category || 'process', // process, system, people, materials, equipment, environment
      description: rootCauseData.description,
      method: rootCauseData.method || '5_whys',
      whyAnswers: rootCauseData.whyAnswers || [],
      level: rootCauseData.level || 1,
      parentCause: rootCauseData.parentCause || null,
      verified: false,
    };

    capa.rootCause.causes.push(rootCause);
    capa.rootCause.analysis = rootCauseData.analysis || '';
    capa.rootCause.method = rootCauseData.method || capa.rootCause.method;
    capa.rootCause.completedAt = new Date().toISOString();

    this.db.set('capas', capaId, capa);
    return rootCause;
  }

  /**
   * Verify CAPA effectiveness
   */
  verifyCAPA(capaId, verificationData) {
    const capa = this.db.get('capas', capaId);
    if (!capa) return null;

    capa.effectiveness = {
      verified: true,
      criteria: verificationData.criteria || capa.effectiveness.criteria,
      measuredAt: new Date().toISOString(),
      result: verificationData.result || 'effective', // effective, partially_effective, ineffective
      notes: verificationData.notes || '',
      verifiedBy: verificationData.userId,
    };

    if (capa.effectiveness.result === 'effective') {
      capa.status = 'closed';
      capa.timeline.closedAt = new Date().toISOString();
    }

    this.db.set('capas', capaId, capa);
    return capa;
  }

  /**
   * Get compliance dashboard
   */
  getComplianceDashboard() {
    const audits = this.db.getAll('qualityAudits');
    const capas = this.db.getAll('capas');
    const policies = this.db.getAll('qualityPolicies');

    const summary = {
      totalAudits: audits.length,
      completedAudits: audits.filter(a => a.status === 'completed').length,
      avgScore: 0,
      totalFindings: 0,
      openFindings: 0,
      criticalFindings: 0,
      totalCAPAs: capas.length,
      openCAPAs: capas.filter(c => c.status !== 'closed').length,
      overdueCAPAs: 0,
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.approvalStatus === 'active').length,
    };

    // Calculate average score
    const completedAudits = audits.filter(a => a.status === 'completed' && a.score > 0);
    if (completedAudits.length > 0) {
      summary.avgScore = Math.round(
        completedAudits.reduce((sum, a) => sum + a.score, 0) / completedAudits.length
      );
    }

    // Count findings
    audits.forEach(a => {
      summary.totalFindings += a.findings.length;
      summary.openFindings += a.findings.filter(f => f.status === 'open').length;
      summary.criticalFindings += a.findings.filter(f => f.severity === 'critical').length;
    });

    // Count overdue CAPAs
    const now = Date.now();
    capas.forEach(c => {
      if (c.status !== 'closed') {
        const dueDate = new Date(c.correctiveAction?.dueDate || c.preventiveAction?.dueDate);
        if (dueDate && dueDate < now) {
          summary.overdueCAPAs++;
        }
      }
    });

    return summary;
  }

  /**
   * Get audit schedule
   */
  getAuditSchedule(filters = {}) {
    const audits = this.db.getAll('qualityAudits');
    const { year, quarter, month, status } = filters;

    let filtered = audits;

    if (year) {
      filtered = filtered.filter(a => {
        const date = new Date(a.scheduledStart);
        return date.getFullYear() === parseInt(year);
      });
    }

    if (quarter) {
      filtered = filtered.filter(a => {
        const date = new Date(a.scheduledStart);
        const q = Math.floor(date.getMonth() / 3) + 1;
        return q === parseInt(quarter);
      });
    }

    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    return filtered.sort((a, b) =>
      new Date(a.scheduledStart) - new Date(b.scheduledStart)
    );
  }

  /**
   * Get audit trends
   */
  getAuditTrends(days = 365) {
    const audits = this.db.getAll('qualityAudits')
      .filter(a => a.status === 'completed');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filtered = audits.filter(a =>
      new Date(a.completedAt || a.scheduledEnd) >= since
    );

    // Group by month
    const byMonth = {};

    filtered.forEach(a => {
      const date = new Date(a.completedAt || a.scheduledEnd);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth[key]) {
        byMonth[key] = { count: 0, totalScore: 0, findings: 0 };
      }

      byMonth[key].count++;
      byMonth[key].totalScore += a.score || 0;
      byMonth[key].findings += a.findings.length;
    });

    // Calculate averages
    return Object.entries(byMonth).map(([month, data]) => ({
      month,
      audits: data.count,
      avgScore: Math.round(data.totalScore / data.count),
      avgFindings: Math.round(data.findings / data.count * 10) / 10,
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
}

// Express routes
function registerQualityRoutes(app) {
  const quality = new QualityManagement();

  // ============ POLICIES ============

  // Create policy
  app.post('/api/quality/policies', (req, res) => {
    const policy = quality.createPolicy({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(policy);
  });

  // Get all policies
  app.get('/api/quality/policies', (req, res) => {
    const { status, type } = req.query;
    let policies = db.getAll('qualityPolicies');

    if (status) policies = policies.filter(p => p.approvalStatus === status);
    if (type) policies = policies.filter(p => p.type === type);

    res.json({ policies, total: policies.length });
  });

  // Get policy
  app.get('/api/quality/policies/:id', (req, res) => {
    const policy = db.get('qualityPolicies', req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  });

  // ============ AUDITS ============

  // Create audit
  app.post('/api/quality/audits', (req, res) => {
    const audit = quality.createAudit({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(audit);
  });

  // Get all audits
  app.get('/api/quality/audits', (req, res) => {
    const { type, status, standard } = req.query;
    let audits = db.getAll('qualityAudits');

    if (type) audits = audits.filter(a => a.type === type);
    if (status) audits = audits.filter(a => a.status === status);
    if (standard) audits = audits.filter(a => a.standard === standard);

    res.json({ audits, total: audits.length });
  });

  // Get audit
  app.get('/api/quality/audits/:id', (req, res) => {
    const audit = db.get('qualityAudits', req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json(audit);
  });

  // Add finding
  app.post('/api/quality/audits/:id/findings', (req, res) => {
    const finding = quality.addFinding(req.params.id, req.body);
    if (!finding) return res.status(404).json({ error: 'Audit not found' });
    res.status(201).json(finding);
  });

  // Calculate score
  app.get('/api/quality/audits/:id/score', (req, res) => {
    const score = quality.calculateScore(req.params.id);
    if (!score) return res.status(404).json({ error: 'Audit not found' });
    res.json(score);
  });

  // Complete audit
  app.post('/api/quality/audits/:id/complete', (req, res) => {
    const audit = db.get('qualityAudits', req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    audit.status = 'completed';
    audit.actualEnd = new Date().toISOString();
    audit.updatedAt = new Date().toISOString();

    quality.calculateScore(req.params.id);
    db.set('qualityAudits', req.params.id, audit);
    res.json(audit);
  });

  // Get audit schedule
  app.get('/api/quality/audits/schedule', (req, res) => {
    const schedule = quality.getAuditSchedule(req.query);
    res.json({ audits: schedule, total: schedule.length });
  });

  // Get trends
  app.get('/api/quality/audits/trends', (req, res) => {
    const { days = 365 } = req.query;
    const trends = quality.getAuditTrends(parseInt(days));
    res.json({ trends });
  });

  // ============ CAPA ============

  // Create CAPA
  app.post('/api/quality/capas', (req, res) => {
    const capa = quality.createCAPA({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(capa);
  });

  // Get all CAPAs
  app.get('/api/quality/capas', (req, res) => {
    const { status, type, severity } = req.query;
    let capas = db.getAll('capas');

    if (status) capas = capas.filter(c => c.status === status);
    if (type) capas = capas.filter(c => c.type === type);
    if (severity) capas = capas.filter(c => c.severity === severity);

    res.json({ capas, total: capas.length });
  });

  // Get CAPA
  app.get('/api/quality/capas/:id', (req, res) => {
    const capa = db.get('capas', req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    res.json(capa);
  });

  // Add root cause
  app.post('/api/quality/capas/:id/root-cause', (req, res) => {
    const rc = quality.addRootCause(req.params.id, req.body);
    if (!rc) return res.status(404).json({ error: 'CAPA not found' });
    res.status(201).json(rc);
  });

  // Verify CAPA
  app.post('/api/quality/capas/:id/verify', (req, res) => {
    const capa = quality.verifyCAPA(req.params.id, {
      ...req.body,
      userId: req.user?.userId,
    });
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    res.json(capa);
  });

  // ============ DASHBOARD ============

  // Get compliance dashboard
  app.get('/api/quality/dashboard', (req, res) => {
    const dashboard = quality.getComplianceDashboard();
    res.json(dashboard);
  });
}

module.exports = { QualityManagement, registerQualityRoutes };
