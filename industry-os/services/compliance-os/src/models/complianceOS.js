/**
 * ComplianceOS + AuditOS - Complete Compliance & Audit System
 *
 * Modules:
 * - SOX Controls
 * - AML/KYC
 * - Audit Trail
 * - Regulatory Compliance
 * - Continuous Audit
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// AUDIT TRAIL MODELS
// ============================================================

class AuditLog {
  constructor(data) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.userId = data.userId;
    this.userName = data.userName;
    this.action = data.action;
    this.resource = data.resource;
    this.resourceId = data.resourceId;
    this.details = data.details || {};
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.changes = data.changes || {};
    this.previousValue = data.previousValue;
    this.newValue = data.newValue;
    this.metadata = data.metadata || {};
    this.status = data.status || 'success'; // success, failure, pending
    this.hash = this.generateHash();
  }

  generateHash() {
    const content = `${this.id}${this.timestamp}${this.userId}${this.action}${this.resource}${JSON.stringify(this.details)}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  toImmutableRecord() {
    return {
      ...this,
      _immutable: true,
      _hashVerified: false
    };
  }
}

class AuditTrail {
  constructor() {
    this.logs = [];
    this.retentionDays = 2555; // ~7 years for compliance
  }

  add(data) {
    const log = new AuditLog(data);
    this.logs.push(log);
    return log;
  }

  query(filters = {}) {
    let results = [...this.logs];

    if (filters.userId) {
      results = results.filter(l => l.userId === filters.userId);
    }
    if (filters.action) {
      results = results.filter(l => l.action === filters.action);
    }
    if (filters.resource) {
      results = results.filter(l => l.resource === filters.resource);
    }
    if (filters.startDate) {
      results = results.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      results = results.filter(l => new Date(l.timestamp) <= new Date(filters.endDate));
    }
    if (filters.status) {
      results = results.filter(l => l.status === filters.status);
    }

    return results;
  }

  getByResource(resource, resourceId) {
    return this.logs
      .filter(l => l.resource === resource && l.resourceId === resourceId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  verifyIntegrity(logId) {
    const log = this.logs.find(l => l.id === logId);
    if (!log) return { verified: false, error: 'Log not found' };

    const originalHash = log.hash;
    const currentHash = log.generateHash();

    return {
      verified: originalHash === currentHash,
      originalHash,
      currentHash,
      logId
    };
  }

  generateReport(startDate, endDate, options = {}) {
    const logs = this.query({ startDate, endDate });

    const report = {
      period: { start: startDate, end: endDate },
      generatedAt: new Date().toISOString(),
      totalEvents: logs.length,
      byAction: {},
      byUser: {},
      byResource: {},
      byStatus: { success: 0, failure: 0, pending: 0 },
      changes: [],
      anomalies: []
    };

    logs.forEach(log => {
      // By action
      report.byAction[log.action] = (report.byAction[log.action] || 0) + 1;

      // By user
      report.byUser[log.userName] = (report.byUser[log.userName] || 0) + 1;

      // By resource
      report.byResource[log.resource] = (report.byResource[log.resource] || 0) + 1;

      // By status
      report.byStatus[log.status]++;

      // Track changes
      if (log.changes && Object.keys(log.changes).length > 0) {
        report.changes.push({
          timestamp: log.timestamp,
          user: log.userName,
          resource: log.resource,
          changes: log.changes
        });
      }
    });

    // Detect anomalies
    const userActionCounts = {};
    logs.forEach(log => {
      const key = `${log.userId}_${log.action}`;
      userActionCounts[key] = (userActionCounts[key] || 0) + 1;
    });

    Object.entries(userActionCounts).forEach(([key, count]) => {
      if (count > 100 && options.detectAnomalies) {
        const [userId, action] = key.split('_');
        report.anomalies.push({
          type: 'high_frequency',
          userId,
          action,
          count,
          threshold: 100
        });
      }
    });

    return report;
  }
}

// ============================================================
// SOX COMPLIANCE MODELS
// ============================================================

class SOXControl {
  constructor(data) {
    this.id = uuidv4();
    this.controlId = data.controlId; // e.g., 'SOX-FIN-001'
    this.title = data.title;
    this.description = data.description;
    this.category = data.category; // 'financial', 'it', 'operations'
    this.frequency = data.frequency || 'quarterly'; // daily, weekly, monthly, quarterly, annually
    this.owner = data.owner;
    this.ownerEmail = data.ownerEmail;
    this.effectiveness = 'not_tested'; // not_tested, effective, ineffective, needs_improvement
    this.lastTested = null;
    this.nextTest = this.calculateNextTest();
    this.testResults = [];
    this.evidence = [];
    this.deficiencies = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  calculateNextTest() {
    const now = new Date();
    const frequencies = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annually: 365
    };
    const days = frequencies[this.frequency] || 90;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  addTestResult(result) {
    const test = {
      id: uuidv4(),
      date: new Date(),
      testedBy: result.testedBy,
      result: result.result, // pass, fail, exception
      notes: result.notes,
      evidence: result.evidence || [],
      finding: result.finding,
      remediation: result.remediation
    };

    this.testResults.push(test);
    this.lastTested = test.date;
    this.nextTest = this.calculateNextTest();
    this.effectiveness = result.result === 'pass' ? 'effective' : 'ineffective';
    this.updatedAt = new Date();

    if (result.result !== 'pass') {
      this.deficiencies.push({
        id: uuidv4(),
        testId: test.id,
        date: new Date(),
        severity: result.severity || 'medium',
        description: result.finding,
        status: 'open',
        remediation: result.remediation,
        resolvedAt: null
      });
    }

    return test;
  }

  getDeficiencySummary() {
    return {
      open: this.deficiencies.filter(d => d.status === 'open').length,
      inProgress: this.deficiencies.filter(d => d.status === 'in_progress').length,
      resolved: this.deficiencies.filter(d => d.status === 'resolved').length
    };
  }
}

class SOXCompliance {
  constructor() {
    this.controls = [];
    this.deficiencies = [];
    this.auditPeriod = null;
  }

  addControl(data) {
    const control = new SOXControl(data);
    this.controls.push(control);
    return control;
  }

  getControl(controlId) {
    return this.controls.find(c => c.controlId === controlId);
  }

  getControlsByCategory(category) {
    return this.controls.filter(c => c.category === category);
  }

  getControlsByOwner(owner) {
    return this.controls.filter(c => c.owner === owner);
  }

  getOverdueTests() {
    const now = new Date();
    return this.controls.filter(c => c.nextTest < now);
  }

  getEffectivenessReport() {
    const report = {
      total: this.controls.length,
      byEffectiveness: {
        effective: this.controls.filter(c => c.effectiveness === 'effective').length,
        ineffective: this.controls.filter(c => c.effectiveness === 'ineffective').length,
        not_tested: this.controls.filter(c => c.effectiveness === 'not_tested').length,
        needs_improvement: this.controls.filter(c => c.effectiveness === 'needs_improvement').length
      },
      byCategory: {},
      overdueTests: this.getOverdueTests().length,
      openDeficiencies: this.deficiencies.filter(d => d.status === 'open').length
    };

    ['financial', 'it', 'operations'].forEach(cat => {
      const controls = this.getControlsByCategory(cat);
      report.byCategory[cat] = {
        total: controls.length,
        effective: controls.filter(c => c.effectiveness === 'effective').length
      };
    });

    return report;
  }

  generateCertification(data) {
    return {
      id: uuidv4(),
      period: data.period || `${new Date().getFullYear()}`,
      certifyingOfficer: data.certifyingOfficer,
      title: data.title,
      controlsAssessed: this.controls.length,
      effectiveControls: this.controls.filter(c => c.effectiveness === 'effective').length,
      ineffectiveControls: this.controls.filter(c => c.effectiveness === 'ineffective').length,
      openDeficiencies: this.deficiencies.filter(d => d.status === 'open').length,
      certification: data.certification, // 'effective', 'ineffective', 'effective_with_exception'
      exceptions: data.exceptions || [],
      signature: null,
      signedAt: null,
      createdAt: new Date()
    };
  }
}

// ============================================================
// AML / KYC MODELS
// ============================================================

class KYBRecord {
  constructor(data) {
    this.id = uuidv4();
    this.entityId = data.entityId;
    this.entityName = data.entityName;
    this.entityType = data.entityType; // 'individual', 'company', 'partnership'
    this.jurisdiction = data.jurisdiction;
    this.status = 'pending'; // pending, in_review, verified, rejected, expired
    this.verificationLevel = data.verificationLevel || 'standard'; // basic, standard, enhanced
    this.checks = this.initializeChecks();
    this.documents = [];
    this.riskScore = 0;
    this.riskLevel = 'low'; // low, medium, high, critical
    this.lastVerified = null;
    this.nextReview = this.calculateNextReview();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  initializeChecks() {
    return {
      identity: { status: 'pending', completedAt: null },
      address: { status: 'pending', completedAt: null },
      business: { status: 'pending', completedAt: null },
      sanctions: { status: 'pending', completedAt: null },
      adverseMedia: { status: 'pending', completedAt: null },
      pep: { status: 'pending', completedAt: null },
      beneficialOwner: { status: 'pending', completedAt: null }
    };
  }

  calculateNextReview() {
    const frequencies = { low: 365, medium: 180, high: 90, critical: 30 };
    const days = frequencies[this.riskLevel] || 180;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  addCheck(checkType, result) {
    if (!this.checks[checkType]) return false;

    this.checks[checkType] = {
      status: result.status, // pass, fail, pending, not_applicable
      completedAt: new Date(),
      result: result.details,
      score: result.score
    };

    this.recalculateRiskScore();
    this.updatedAt = new Date();
    return true;
  }

  addDocument(doc) {
    this.documents.push({
      id: uuidv4(),
      type: doc.type,
      name: doc.name,
      url: doc.url,
      verified: false,
      uploadedAt: new Date()
    });
  }

  recalculateRiskScore() {
    let score = 0;

    // Based on checks
    Object.values(this.checks).forEach(check => {
      if (check.status === 'fail') score += 25;
      if (check.status === 'pending') score += 5;
      if (check.score) score += check.score;
    });

    // Based on entity type
    if (this.entityType === 'company') score += 10;
    if (this.entityType === 'partnership') score += 15;

    this.riskScore = Math.min(100, score);

    // Determine risk level
    if (this.riskScore >= 75) this.riskLevel = 'critical';
    else if (this.riskScore >= 50) this.riskLevel = 'high';
    else if (this.riskScore >= 25) this.riskLevel = 'medium';
    else this.riskLevel = 'low';

    this.nextReview = this.calculateNextReview();
    return { riskScore: this.riskScore, riskLevel: this.riskLevel };
  }

  verify() {
    const allChecksComplete = Object.values(this.checks)
      .every(c => c.status !== 'pending');

    if (!allChecksComplete) {
      return { verified: false, reason: 'All checks must be complete' };
    }

    const anyFailed = Object.values(this.checks)
      .some(c => c.status === 'fail');

    if (anyFailed) {
      this.status = 'rejected';
      return { verified: false, reason: 'One or more checks failed' };
    }

    this.status = 'verified';
    this.lastVerified = new Date();
    return { verified: true };
  }
}

class AMLMonitoring {
  constructor() {
    this.transactions = [];
    this.alerts = [];
    this.cases = [];
  }

  addTransaction(tx) {
    const transaction = {
      id: uuidv4(),
      ...tx,
      timestamp: new Date(),
      riskScore: 0,
      alerts: []
    };

    // Calculate risk score
    transaction.riskScore = this.calculateTransactionRisk(tx);

    // Generate alerts
    transaction.alerts = this.generateAlerts(transaction);

    this.transactions.push(transaction);

    // Create cases for high risk
    if (transaction.riskScore > 70) {
      this.createCase(transaction);
    }

    return transaction;
  }

  calculateTransactionRisk(tx) {
    let score = 0;

    // Amount thresholds
    if (tx.amount > 10000000) score += 40; // > ₹1 crore
    else if (tx.amount > 1000000) score += 20; // > ₹10 lakhs
    else if (tx.amount > 100000) score += 10;

    // Velocity
    if (tx.velocity === 'high') score += 30;
    else if (tx.velocity === 'medium') score += 15;

    // Geographic risk
    if (tx.jurisdiction === 'high_risk') score += 25;
    else if (tx.jurisdiction === 'medium_risk') score += 10;

    // Counterparty risk
    if (tx.counterpartyRisk === 'high') score += 20;
    else if (tx.counterpartyRisk === 'medium') score += 10;

    return Math.min(100, score);
  }

  generateAlerts(tx) {
    const alerts = [];

    if (tx.amount > 10000000) {
      alerts.push({
        type: 'large_transaction',
        severity: 'high',
        description: `Transaction exceeds ₹1 crore: ₹${(tx.amount / 10000000).toFixed(2)} Cr`,
        threshold: 10000000
      });
    }

    if (tx.velocity === 'high') {
      alerts.push({
        type: 'velocity_spike',
        severity: 'medium',
        description: 'Unusual transaction velocity detected'
      });
    }

    if (tx.pattern === 'structuring') {
      alerts.push({
        type: 'structuring',
        severity: 'critical',
        description: 'Potential structuring detected (multiple transactions just below reporting threshold)'
      });
    }

    return alerts;
  }

  createCase(transaction) {
    const case_ = {
      id: uuidv4(),
      transactionId: transaction.id,
      type: transaction.riskScore > 80 ? 'SAR' : 'Review',
      status: 'open',
      priority: transaction.riskScore > 80 ? 'urgent' : 'normal',
      assignedTo: null,
      alerts: transaction.alerts,
      timeline: [{
        action: 'case_created',
        timestamp: new Date(),
        details: 'Case created from transaction alert'
      }],
      decisions: [],
      createdAt: new Date()
    };

    this.cases.push(case_);
    this.alerts.push(...transaction.alerts.map(a => ({
      ...a,
      caseId: case_.id,
      transactionId: transaction.id
    })));

    return case_;
  }

  getSARReport() {
    return {
      cases: this.cases.filter(c => c.type === 'SAR'),
      open: this.cases.filter(c => c.status === 'open').length,
      closed: this.cases.filter(c => c.status === 'closed').length,
      generatedAt: new Date()
    };
  }
}

// ============================================================
// REGULATORY COMPLIANCE MODELS
// ============================================================

class ComplianceRequirement {
  constructor(data) {
    this.id = uuidv4();
    this.regulation = data.regulation; // 'sox', 'pci-dss', 'gdpr', 'iso27001'
    this.title = data.title;
    this.description = data.description;
    this.frequency = data.frequency; // one-time, monthly, quarterly, annually
    this.dueDate = data.dueDate;
    this.status = 'pending'; // pending, in_progress, compliant, non_compliant, waived
    this.evidence = [];
    this.owner = data.owner;
    this.lastCompliance = null;
    this.createdAt = new Date();
  }

  addEvidence(evidence) {
    this.evidence.push({
      id: uuidv4(),
      type: evidence.type,
      description: evidence.description,
      uploadedBy: evidence.uploadedBy,
      uploadedAt: new Date(),
      verified: false
    });
  }

  markCompliant() {
    this.status = 'compliant';
    this.lastCompliance = new Date();
  }
}

class ComplianceTracker {
  constructor() {
    this.requirements = [];
    this.frameworks = ['sox', 'pci-dss', 'gdpr', 'iso27001', 'nist'];
  }

  addRequirement(data) {
    const req = new ComplianceRequirement(data);
    this.requirements.push(req);
    return req;
  }

  getByRegulation(regulation) {
    return this.requirements.filter(r => r.regulation === regulation);
  }

  getByStatus(status) {
    return this.requirements.filter(r => r.status === status);
  }

  getUpcoming(withinDays = 30) {
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    return this.requirements
      .filter(r => r.status !== 'compliant' && new Date(r.dueDate) <= cutoff)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  getComplianceReport(regulation) {
    const reqs = this.getByRegulation(regulation);
    return {
      regulation,
      total: reqs.length,
      compliant: reqs.filter(r => r.status === 'compliant').length,
      nonCompliant: reqs.filter(r => r.status === 'non_compliant').length,
      pending: reqs.filter(r => r.status === 'pending').length,
      inProgress: reqs.filter(r => r.status === 'in_progress').length,
      complianceRate: reqs.length > 0
        ? ((reqs.filter(r => r.status === 'compliant').length / reqs.length) * 100).toFixed(2)
        : 0
    };
  }
}

// ============================================================
// CONTINUOUS AUDIT MODELS
// ============================================================

class AuditTest {
  constructor(data) {
    this.id = uuidv4();
    this.name = data.name;
    this.description = data.description;
    this.type = data.type; // 'automated', 'manual', 'hybrid'
    this.frequency = data.frequency; // continuous, daily, weekly, monthly
    this.scope = data.scope; // what this test covers
    this.lastRun = null;
    this.nextRun = this.calculateNextRun();
    this.results = [];
    this.thresholds = data.thresholds || {};
    this.enabled = true;
    this.createdAt = new Date();
  }

  calculateNextRun() {
    if (this.frequency === 'continuous') return new Date();

    const frequencies = {
      daily: 1,
      weekly: 7,
      monthly: 30
    };
    const days = frequencies[this.frequency] || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  run(data) {
    const result = {
      id: uuidv4(),
      timestamp: new Date(),
      duration: 0,
      status: 'pass', // pass, fail, error
      findings: [],
      metrics: {}
    };

    const startTime = Date.now();

    // Run test logic
    try {
      const testResult = this.executeTest(data);
      result.status = testResult.status;
      result.findings = testResult.findings || [];
      result.metrics = testResult.metrics || {};
    } catch (error) {
      result.status = 'error';
      result.findings.push({
        severity: 'high',
        description: `Test execution error: ${error.message}`
      });
    }

    result.duration = Date.now() - startTime;
    this.lastRun = result.timestamp;
    this.nextRun = this.calculateNextRun();
    this.results.push(result);

    return result;
  }

  executeTest(data) {
    // Override in subclasses or implement custom logic
    return { status: 'pass', findings: [], metrics: {} };
  }
}

class ContinuousAudit {
  constructor() {
    this.tests = [];
    this.findings = [];
  }

  addTest(data) {
    const test = new AuditTest(data);
    this.tests.push(test);
    return test;
  }

  runAll(data) {
    const results = [];
    this.tests
      .filter(t => t.enabled)
      .forEach(test => {
        const result = test.run(data);
        results.push(result);

        // Track findings
        if (result.findings.length > 0) {
          this.findings.push({
            testId: test.id,
            testName: test.name,
            timestamp: result.timestamp,
            findings: result.findings
          });
        }
      });

    return results;
  }

  getFindingsBySeverity() {
    const bySeverity = { critical: [], high: [], medium: [], low: [] };

    this.findings.forEach(f => {
      f.findings.forEach(finding => {
        if (bySeverity[finding.severity]) {
          bySeverity[finding.severity].push({
            ...finding,
            testId: f.testId,
            testName: f.testName,
            timestamp: f.timestamp
          });
        }
      });
    });

    return bySeverity;
  }

  getAuditSummary() {
    return {
      totalTests: this.tests.length,
      enabled: this.tests.filter(t => t.enabled).length,
      lastRun: this.tests
        .filter(t => t.lastRun)
        .sort((a, b) => new Date(b.lastRun) - new Date(a.lastRun))[0]?.lastRun,
      findings: {
        critical: this.getFindingsBySeverity().critical.length,
        high: this.getFindingsBySeverity().high.length,
        medium: this.getFindingsBySeverity().medium.length,
        low: this.getFindingsBySeverity().low.length
      }
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  AuditLog,
  AuditTrail,
  SOXControl,
  SOXCompliance,
  KYBRecord,
  AMLMonitoring,
  ComplianceRequirement,
  ComplianceTracker,
  AuditTest,
  ContinuousAudit
};
