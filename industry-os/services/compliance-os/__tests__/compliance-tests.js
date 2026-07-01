/**
 * ComplianceOS Tests
 * Run with: node --test __tests__/compliance-tests.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

// Import models directly
const {
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
} = require('../src/models/complianceOS');

// ============================================================
// AUDIT TRAIL TESTS
// ============================================================

describe('ComplianceOS - AuditTrail', () => {
  let trail;

  before(() => {
    trail = new AuditTrail();
  });

  it('should add audit logs', () => {
    const log = trail.add({
      userId: 'user-001',
      userName: 'John Doe',
      action: 'CREATE',
      resource: 'invoice',
      resourceId: 'inv-001',
      details: { invoiceNumber: 'INV001' }
    });

    assert.ok(log.id);
    assert.ok(log.timestamp);
    assert.ok(log.hash);
    assert.strictEqual(log.userName, 'John Doe');
  });

  it('should query logs by filter', () => {
    trail.add({ userId: 'u1', action: 'CREATE', resource: 'inv' });
    trail.add({ userId: 'u1', action: 'UPDATE', resource: 'inv' });
    trail.add({ userId: 'u2', action: 'DELETE', resource: 'vendor' });

    const results = trail.query({ action: 'CREATE' });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].action, 'CREATE');
  });

  it('should get logs by resource', () => {
    const results = trail.getByResource('invoice', 'inv-001');
    assert.ok(Array.isArray(results));
  });

  it('should verify integrity', () => {
    const log = trail.add({
      userId: 'u1',
      action: 'UPDATE',
      resource: 'account'
    });

    const result = trail.verifyIntegrity(log.id);
    assert.strictEqual(result.verified, true);
  });

  it('should generate reports', () => {
    trail.add({ userId: 'u1', userName: 'John', action: 'CREATE', resource: 'inv', status: 'success' });
    trail.add({ userId: 'u1', userName: 'John', action: 'CREATE', resource: 'inv', status: 'success' });
    trail.add({ userId: 'u2', userName: 'Jane', action: 'DELETE', resource: 'inv', status: 'failure' });

    const report = trail.generateReport(new Date('2024-01-01'), new Date('2024-12-31'));

    assert.strictEqual(report.totalEvents, 3);
    assert.strictEqual(report.byUser['John'], 2);
    assert.strictEqual(report.byStatus.failure, 1);
    assert.ok(Array.isArray(report.byAction));
  });
});

// ============================================================
// SOX COMPLIANCE TESTS
// ============================================================

describe('ComplianceOS - SOXCompliance', () => {
  let compliance;

  before(() => {
    compliance = new SOXCompliance();
  });

  it('should add controls', () => {
    const control = compliance.addControl({
      controlId: 'SOX-FIN-001',
      title: 'Bank Reconciliation',
      description: 'Monthly bank reconciliation',
      category: 'financial',
      frequency: 'monthly',
      owner: 'CFO',
      ownerEmail: 'cfo@company.com'
    });

    assert.ok(control.id);
    assert.strictEqual(control.controlId, 'SOX-FIN-001');
    assert.strictEqual(control.effectiveness, 'not_tested');
  });

  it('should get control by ID', () => {
    const control = compliance.getControl('SOX-FIN-001');
    assert.ok(control);
    assert.strictEqual(control.title, 'Bank Reconciliation');
  });

  it('should get controls by category', () => {
    compliance.addControl({
      controlId: 'SOX-IT-001',
      title: 'Access Control',
      category: 'it',
      owner: 'CTO'
    });

    const financialControls = compliance.getControlsByCategory('financial');
    const itControls = compliance.getControlsByCategory('it');

    assert.ok(financialControls.length >= 1);
    assert.ok(itControls.length >= 1);
  });

  it('should add test results', () => {
    const control = compliance.getControl('SOX-FIN-001');
    const result = control.addTestResult({
      testedBy: 'External Auditor',
      result: 'pass',
      notes: 'All reconciliations completed on time',
      evidence: ['bank_statement.pdf']
    });

    assert.ok(result.id);
    assert.strictEqual(control.effectiveness, 'effective');
    assert.ok(control.lastTested);
  });

  it('should track deficiencies', () => {
    const control = compliance.addControl({
      controlId: 'SOX-FIN-002',
      title: 'Approval Process',
      category: 'financial',
      owner: 'Controller'
    });

    control.addTestResult({
      testedBy: 'Auditor',
      result: 'fail',
      finding: 'Missing approval signatures',
      severity: 'medium',
      remediation: 'Implement digital approval workflow'
    });

    const summary = control.getDeficiencySummary();
    assert.strictEqual(summary.open, 1);
  });

  it('should get overdue tests', () => {
    const control = compliance.addControl({
      controlId: 'SOX-FIN-003',
      title: 'Test Control',
      category: 'financial',
      frequency: 'monthly',
      owner: 'CFO'
    });

    // Override next test to be in past
    control.nextTest = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const overdue = compliance.getOverdueTests();
    assert.ok(overdue.length > 0);
  });

  it('should generate effectiveness report', () => {
    const report = compliance.getEffectivenessReport();

    assert.ok(report.total >= 0);
    assert.ok(report.byEffectiveness);
    assert.ok(typeof report.effectiveControls === 'number');
  });

  it('should generate SOX certification', () => {
    const cert = compliance.generateCertification({
      period: '2024',
      certifyingOfficer: 'CEO',
      title: 'Chief Executive Officer',
      certification: 'effective'
    });

    assert.ok(cert.id);
    assert.strictEqual(cert.period, '2024');
    assert.ok(cert.controlsAssessed >= 0);
  });
});

// ============================================================
// KYC / KYB TESTS
// ============================================================

describe('ComplianceOS - KYBRecord', () => {
  it('should create KYB record', () => {
    const record = new KYBRecord({
      entityId: 'entity-001',
      entityName: 'ACME Corp',
      entityType: 'company',
      jurisdiction: 'India'
    });

    assert.ok(record.id);
    assert.strictEqual(record.status, 'pending');
    assert.ok(record.checks);
    assert.strictEqual(record.riskLevel, 'low');
  });

  it('should add check results', () => {
    const record = new KYBRecord({
      entityId: 'entity-001',
      entityName: 'ACME Corp',
      entityType: 'company'
    });

    record.addCheck('identity', { status: 'pass', score: 10 });
    record.addCheck('sanctions', { status: 'pass', score: 10 });

    assert.strictEqual(record.checks.identity.status, 'pass');
  });

  it('should recalculate risk score', () => {
    const record = new KYBRecord({
      entityId: 'entity-001',
      entityName: 'Test Company',
      entityType: 'company'
    });

    record.addCheck('sanctions', { status: 'fail', score: 25 });

    assert.ok(record.riskScore > 0);
    assert.ok(record.riskLevel !== 'low');
  });

  it('should verify record', () => {
    const record = new KYBRecord({
      entityId: 'entity-001',
      entityName: 'ACME Corp',
      entityType: 'company'
    });

    // Complete all checks
    record.addCheck('identity', { status: 'pass' });
    record.addCheck('address', { status: 'pass' });
    record.addCheck('business', { status: 'pass' });
    record.addCheck('sanctions', { status: 'pass' });
    record.addCheck('adverseMedia', { status: 'pass' });
    record.addCheck('pep', { status: 'pass' });
    record.addCheck('beneficialOwner', { status: 'pass' });

    const result = record.verify();

    assert.strictEqual(result.verified, true);
    assert.strictEqual(record.status, 'verified');
  });

  it('should reject failed checks', () => {
    const record = new KYBRecord({
      entityId: 'entity-001',
      entityName: 'Bad Company',
      entityType: 'company'
    });

    record.addCheck('sanctions', { status: 'fail' });

    const result = record.verify();

    assert.strictEqual(result.verified, false);
    assert.strictEqual(record.status, 'rejected');
  });
});

// ============================================================
// AML TESTS
// ============================================================

describe('ComplianceOS - AMLMonitoring', () => {
  let monitoring;

  before(() => {
    monitoring = new AMLMonitoring();
  });

  it('should add transaction for monitoring', () => {
    const tx = monitoring.addTransaction({
      customerId: 'cust-001',
      amount: 500000,
      type: 'wire_transfer',
      velocity: 'normal',
      jurisdiction: 'low_risk'
    });

    assert.ok(tx.id);
    assert.ok(tx.riskScore >= 0);
    assert.ok(tx.timestamp);
  });

  it('should detect high-risk transactions', () => {
    const tx = monitoring.addTransaction({
      customerId: 'cust-002',
      amount: 20000000, // 2 Crore
      velocity: 'high',
      jurisdiction: 'high_risk'
    });

    assert.ok(tx.riskScore > 50);
    assert.ok(tx.alerts.length > 0);
  });

  it('should create alerts for large transactions', () => {
    const tx = monitoring.addTransaction({
      customerId: 'cust-003',
      amount: 15000000,
      velocity: 'normal'
    });

    assert.ok(tx.alerts.some(a => a.type === 'large_transaction'));
  });

  it('should create SAR for high risk', () => {
    monitoring.addTransaction({
      customerId: 'cust-004',
      amount: 50000000,
      velocity: 'high',
      pattern: 'structuring'
    });

    const sar = monitoring.getSARReport();

    assert.ok(sar.cases.length > 0);
    assert.ok(sar.cases.some(c => c.type === 'SAR'));
  });

  it('should generate SAR report', () => {
    const sar = monitoring.getSARReport();

    assert.ok(typeof sar.open === 'number');
    assert.ok(typeof sar.closed === 'number');
    assert.ok(sar.generatedAt);
  });
});

// ============================================================
// COMPLIANCE TRACKER TESTS
// ============================================================

describe('ComplianceOS - ComplianceTracker', () => {
  let tracker;

  before(() => {
    tracker = new ComplianceTracker();
  });

  it('should add requirements', () => {
    const req = tracker.addRequirement({
      regulation: 'sox',
      title: 'Quarterly Control Testing',
      description: 'All controls must be tested quarterly',
      frequency: 'quarterly',
      dueDate: '2024-03-31',
      owner: 'Compliance Officer'
    });

    assert.ok(req.id);
    assert.strictEqual(req.status, 'pending');
  });

  it('should get requirements by regulation', () => {
    tracker.addRequirement({
      regulation: 'pci-dss',
      title: 'Network Scan',
      dueDate: '2024-06-30',
      owner: 'IT Security'
    });

    const soxReqs = tracker.getByRegulation('sox');
    const pciReqs = tracker.getByRegulation('pci-dss');

    assert.ok(soxReqs.length >= 1);
    assert.ok(pciReqs.length >= 1);
  });

  it('should get upcoming requirements', () => {
    tracker.addRequirement({
      regulation: 'gdpr',
      title: 'Data Audit',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      owner: 'DPO'
    });

    const upcoming = tracker.getUpcoming(30);
    assert.ok(upcoming.length > 0);
  });

  it('should generate compliance report', () => {
    const report = tracker.getComplianceReport('sox');

    assert.ok(typeof report.total === 'number');
    assert.ok(typeof report.compliant === 'number');
    assert.ok(typeof report.complianceRate === 'string');
  });
});

// ============================================================
// CONTINUOUS AUDIT TESTS
// ============================================================

describe('ComplianceOS - ContinuousAudit', () => {
  let audit;

  before(() => {
    audit = new ContinuousAudit();
  });

  it('should add audit tests', () => {
    const test = audit.addTest({
      name: 'Bank Reconciliation Test',
      description: 'Verify all bank reconciliations are complete',
      type: 'automated',
      frequency: 'daily',
      scope: 'finance'
    });

    assert.ok(test.id);
    assert.strictEqual(test.enabled, true);
  });

  it('should run tests', () => {
    audit.addTest({
      name: 'Test Control',
      type: 'automated',
      frequency: 'continuous'
    });

    const results = audit.runAll({});

    assert.ok(results.length > 0);
    assert.ok(results[0].status);
  });

  it('should get findings by severity', () => {
    audit.addTest({
      name: 'Critical Test',
      type: 'automated',
      frequency: 'continuous'
    });

    audit.runAll({});

    const findings = audit.getFindingsBySeverity();

    assert.ok(Array.isArray(findings.critical));
    assert.ok(Array.isArray(findings.high));
    assert.ok(Array.isArray(findings.medium));
    assert.ok(Array.isArray(findings.low));
  });

  it('should get audit summary', () => {
    const summary = audit.getAuditSummary();

    assert.ok(summary.totalTests >= 0);
    assert.ok(summary.enabled >= 0);
    assert.ok(summary.findings);
    assert.ok(typeof summary.findings.critical === 'number');
  });
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n✅ ComplianceOS Tests Loaded');
console.log('Run with: node --test __tests__/compliance-tests.js\n');
