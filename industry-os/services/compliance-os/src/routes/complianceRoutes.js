/**
 * ComplianceOS API Routes
 */

const express = require('express');
const router = express.Router();
const {
  AuditTrail,
  SOXCompliance,
  KYBRecord,
  AMLMonitoring,
  ComplianceTracker,
  ContinuousAudit
} = require('../models/complianceOS');

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const storage = {
  auditTrail: new AuditTrail(),
  soxCompliance: new SOXCompliance(),
  amlMonitoring: new AMLMonitoring(),
  complianceTracker: new ComplianceTracker(),
  continuousAudit: new ContinuousAudit(),
  kybRecords: new Map()
};

// ============================================================
// AUDIT TRAIL ROUTES
// ============================================================

router.post('/audit/log', (req, res) => {
  const { userId, userName, action, resource, resourceId, details, changes } = req.body;

  const log = storage.auditTrail.add({
    userId,
    userName,
    action,
    resource,
    resourceId,
    details,
    changes,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({ log: log.toImmutableRecord() });
});

router.get('/audit/logs', (req, res) => {
  const { userId, action, resource, startDate, endDate, status } = req.query;

  const logs = storage.auditTrail.query({
    userId,
    action,
    resource,
    startDate,
    endDate,
    status
  });

  res.json({ logs, count: logs.length });
});

router.get('/audit/logs/:resource/:resourceId', (req, res) => {
  const logs = storage.auditTrail.getByResource(req.params.resource, req.params.resourceId);

  res.json({ logs, count: logs.length });
});

router.get('/audit/verify/:logId', (req, res) => {
  const result = storage.auditTrail.verifyIntegrity(req.params.logId);

  res.json(result);
});

router.post('/audit/report', (req, res) => {
  const { startDate, endDate, detectAnomalies = true } = req.body;

  const report = storage.auditTrail.generateReport(startDate, endDate, { detectAnomalies });

  res.json(report);
});

// ============================================================
// SOX COMPLIANCE ROUTES
// ============================================================

router.post('/sox/controls', (req, res) => {
  const { controlId, title, description, category, frequency, owner, ownerEmail } = req.body;

  const control = storage.soxCompliance.addControl({
    controlId,
    title,
    description,
    category,
    frequency,
    owner,
    ownerEmail
  });

  res.json({ control });
});

router.get('/sox/controls', (req, res) => {
  const { category, owner } = req.query;

  let controls = storage.soxCompliance.controls;

  if (category) {
    controls = storage.soxCompliance.getControlsByCategory(category);
  }
  if (owner) {
    controls = storage.soxCompliance.getControlsByOwner(owner);
  }

  res.json({ controls, count: controls.length });
});

router.get('/sox/controls/:controlId', (req, res) => {
  const control = storage.soxCompliance.getControl(req.params.controlId);

  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  res.json({ control, deficiencies: control.getDeficiencySummary() });
});

router.post('/sox/controls/:controlId/test', (req, res) => {
  const { testedBy, result, notes, evidence, finding, remediation, severity } = req.body;

  const control = storage.soxCompliance.getControl(req.params.controlId);

  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  const testResult = control.addTestResult({
    testedBy,
    result,
    notes,
    evidence,
    finding,
    remediation,
    severity
  });

  res.json({ testResult, control });
});

router.get('/sox/overdue', (req, res) => {
  const overdue = storage.soxCompliance.getOverdueTests();

  res.json({ controls: overdue, count: overdue.length });
});

router.get('/sox/effectiveness-report', (req, res) => {
  const report = storage.soxCompliance.getEffectivenessReport();

  res.json(report);
});

router.post('/sox/certification', (req, res) => {
  const { period, certifyingOfficer, title, certification, exceptions } = req.body;

  const cert = storage.soxCompliance.generateCertification({
    period,
    certifyingOfficer,
    title,
    certification,
    exceptions
  });

  res.json({ certification: cert });
});

// ============================================================
// AML / KYC ROUTES
// ============================================================

router.post('/kyb', (req, res) => {
  const { entityId, entityName, entityType, jurisdiction, verificationLevel } = req.body;

  const record = new KYBRecord({
    entityId,
    entityName,
    entityType,
    jurisdiction,
    verificationLevel
  });

  storage.kybRecords.set(entityId, record);

  res.json({ record });
});

router.get('/kyb/:entityId', (req, res) => {
  const record = storage.kybRecords.get(req.params.entityId);

  if (!record) {
    return res.status(404).json({ error: 'KYB record not found' });
  }

  res.json({ record });
});

router.post('/kyb/:entityId/check', (req, res) => {
  const { checkType, status, details, score } = req.body;

  const record = storage.kybRecords.get(req.params.entityId);

  if (!record) {
    return res.status(404).json({ error: 'KYB record not found' });
  }

  const result = record.addCheck(checkType, { status, details, score });

  res.json({ result, record });
});

router.post('/kyb/:entityId/verify', (req, res) => {
  const record = storage.kybRecords.get(req.params.entityId);

  if (!record) {
    return res.status(404).json({ error: 'KYB record not found' });
  }

  const result = record.verify();

  res.json({ result, record });
});

// AML Transaction monitoring
router.post('/aml/transaction', (req, res) => {
  const { customerId, amount, type, velocity, jurisdiction, pattern, counterpartyRisk } = req.body;

  const tx = storage.amlMonitoring.addTransaction({
    customerId,
    amount,
    type,
    velocity,
    jurisdiction,
    pattern,
    counterpartyRisk
  });

  res.json({
    transaction: tx,
    alerts: tx.alerts,
    case: tx.alerts.length > 0 && tx.riskScore > 70 ? 'created' : null
  });
});

router.get('/aml/transactions', (req, res) => {
  const { startDate, endDate, riskLevel } = req.query;

  let txs = storage.amlMonitoring.transactions;

  if (startDate) {
    txs = txs.filter(t => new Date(t.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    txs = txs.filter(t => new Date(t.timestamp) <= new Date(endDate));
  }

  res.json({ transactions: txs, count: txs.length });
});

router.get('/aml/alerts', (req, res) => {
  const alerts = storage.amlMonitoring.alerts;

  res.json({ alerts, count: alerts.length });
});

router.get('/aml/sar-report', (req, res) => {
  const report = storage.amlMonitoring.getSARReport();

  res.json(report);
});

// ============================================================
// COMPLIANCE TRACKER ROUTES
// ============================================================

router.post('/compliance/requirement', (req, res) => {
  const { regulation, title, description, frequency, dueDate, owner } = req.body;

  const req_ = storage.complianceTracker.addRequirement({
    regulation,
    title,
    description,
    frequency,
    dueDate,
    owner
  });

  res.json({ requirement: req_ });
});

router.get('/compliance/requirements', (req, res) => {
  const { regulation, status } = req.query;

  let requirements = storage.complianceTracker.requirements;

  if (regulation) {
    requirements = storage.complianceTracker.getByRegulation(regulation);
  }
  if (status) {
    requirements = storage.complianceTracker.getByStatus(status);
  }

  res.json({ requirements, count: requirements.length });
});

router.get('/compliance/upcoming', (req, res) => {
  const { withinDays = 30 } = req.query;

  const upcoming = storage.complianceTracker.getUpcoming(parseInt(withinDays));

  res.json({ requirements: upcoming, count: upcoming.length });
});

router.get('/compliance/:regulation/report', (req, res) => {
  const report = storage.complianceTracker.getComplianceReport(req.params.regulation);

  res.json(report);
});

router.post('/compliance/requirements/:id/comply', (req, res) => {
  const req_ = storage.complianceTracker.requirements.find(r => r.id === req.params.id);

  if (!req_) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  req_.markCompliant();

  res.json({ requirement: req_ });
});

// ============================================================
// CONTINUOUS AUDIT ROUTES
// ============================================================

router.post('/continuous/tests', (req, res) => {
  const { name, description, type, frequency, scope, thresholds } = req.body;

  const test = storage.continuousAudit.addTest({
    name,
    description,
    type,
    frequency,
    scope,
    thresholds
  });

  res.json({ test });
});

router.get('/continuous/tests', (req, res) => {
  const tests = storage.continuousAudit.tests;

  res.json({ tests, count: tests.length });
});

router.post('/continuous/run', (req, res) => {
  const { data } = req.body;

  const results = storage.continuousAudit.runAll(data);

  res.json({ results, count: results.length, summary: storage.continuousAudit.getAuditSummary() });
});

router.get('/continuous/findings', (req, res) => {
  const { severity } = req.query;

  let findings = storage.continuousAudit.getFindingsBySeverity();

  if (severity) {
    findings = { [severity]: findings[severity] || [] };
  }

  res.json(findings);
});

router.get('/continuous/summary', (req, res) => {
  const summary = storage.continuousAudit.getAuditSummary();

  res.json(summary);
});

// ============================================================
// DASHBOARD
// ============================================================

router.get('/dashboard', (req, res) => {
  const soxReport = storage.soxCompliance.getEffectivenessReport();
  const amlAlerts = storage.amlMonitoring.alerts;
  const upcomingCompliance = storage.complianceTracker.getUpcoming(30);
  const auditSummary = storage.continuousAudit.getAuditSummary();

  res.json({
    summary: {
      sox: soxReport,
      aml: {
        alerts: amlAlerts.length,
        highRiskTransactions: storage.amlMonitoring.transactions.filter(t => t.riskScore > 70).length
      },
      compliance: {
        upcoming: upcomingCompliance.length,
        nonCompliant: storage.complianceTracker.getByStatus('non_compliant').length
      },
      audit: auditSummary
    },
    alerts: {
      sox: soxReport.openDeficiencies,
      aml: amlAlerts.slice(0, 10)
    }
  });
});

module.exports = router;
