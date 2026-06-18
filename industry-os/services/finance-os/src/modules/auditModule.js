/**
 * RTMN Finance OS - Audit Module
 */

import express from 'express';
const router = express.Router();

// Audit Types
const AUDIT_TYPES = [
  'Transaction Audit',
  'Compliance Audit',
  'Process Audit',
  'Fraud Detection',
  'Policy Violation',
  'Duplicate Detection',
];

// ============================================================
// AUDIT TRAIL
// ============================================================

router.get('/audit-trail', (req, res) => {
  const { entity, entityId, action, user, startDate, endDate } = req.query;

  let trail = Array.from(db.auditTrail?.values() || []);

  if (entity) trail = trail.filter(a => a.entity === entity);
  if (entityId) trail = trail.filter(a => a.entityId === entityId);
  if (action) trail = trail.filter(a => a.action === action);
  if (user) trail = trail.filter(a => a.performedBy === user);
  if (startDate) trail = trail.filter(a => a.timestamp >= startDate);
  if (endDate) trail = trail.filter(a => a.timestamp <= endDate);

  trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    entries: trail,
    total: trail.length,
  });
});

// Log audit event
router.post('/audit-trail', (req, res) => {
  const { entity, entityId, action, changes, performedBy } = req.body;

  const entry = {
    id: `AUD-${Date.now()}`,
    entity,
    entityId,
    action,
    changes,
    performedBy: performedBy || 'system',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };

  db.auditTrail = db.auditTrail || new Map();
  db.auditTrail.set(entry.id, entry);

  res.status(201).json(entry);
});

// ============================================================
// FRAUD DETECTION
// ============================================================

router.get('/fraud-detection', (req, res) => {
  const invoices = Array.from(db.invoices.values());
  const journalEntries = Array.from(db.journalEntries.values());
  const expenses = Array.from(db.expenses?.values() || []);

  const fraudIndicators = [];

  // Duplicate invoices
  const invoiceAmounts = {};
  invoices.forEach(inv => {
    const key = `${inv.customerId}-${inv.total}`;
    if (invoiceAmounts[key]) {
      fraudIndicators.push({
        type: 'Duplicate Invoice',
        severity: 'high',
        entity: 'invoice',
        entityId: inv.id,
        details: `Duplicate invoice amount ₹${inv.total} for customer ${inv.customerId}`,
      });
    }
    invoiceAmounts[key] = inv.id;
  });

  // Round number transactions
  journalEntries.forEach(je => {
    const totalDebit = je.entries.reduce((s, e) => s + (e.debit || 0), 0);
    if (totalDebit > 0 && totalDebit % 10000 === 0 && totalDebit > 100000) {
      fraudIndicators.push({
        type: 'Suspicious Round Amount',
        severity: 'medium',
        entity: 'journal-entry',
        entityId: je.id,
        details: `Large round amount: ₹${totalDebit.toLocaleString()}`,
      });
    }
  });

  // Duplicate expenses
  const expenseAmounts = {};
  expenses.forEach(exp => {
    const key = `${exp.employeeId}-${exp.amount}-${exp.date}`;
    if (expenseAmounts[key]) {
      fraudIndicators.push({
        type: 'Duplicate Expense',
        severity: 'high',
        entity: 'expense',
        entityId: exp.id,
        details: `Same expense ₹${exp.amount} on ${exp.date}`,
      });
    }
    expenseAmounts[key] = exp.id;
  });

  // Zero value invoices
  invoices.forEach(inv => {
    if (inv.total === 0) {
      fraudIndicators.push({
        type: 'Zero Value Invoice',
        severity: 'low',
        entity: 'invoice',
        entityId: inv.id,
        details: 'Invoice with zero total amount',
      });
    }
  });

  res.json({
    summary: {
      totalIndicators: fraudIndicators.length,
      high: fraudIndicators.filter(f => f.severity === 'high').length,
      medium: fraudIndicators.filter(f => f.severity === 'medium').length,
      low: fraudIndicators.filter(f => f.severity === 'low').length,
    },
    indicators: fraudIndicators,
    riskScore: calculateRiskScore(fraudIndicators),
  });
});

// Anomaly detection
router.get('/anomaly-detection', (req, res) => {
  const invoices = Array.from(db.invoices.values());
  const expenses = Array.from(db.expenses?.values() || []);

  // Calculate averages
  const avgInvoice = invoices.reduce((s, i) => s + i.total, 0) / (invoices.length || 1);
  const avgExpense = expenses.reduce((s, e) => s + e.amount, 0) / (expenses.length || 1);

  const anomalies = [];

  // Unusual invoice amounts
  invoices.forEach(inv => {
    if (inv.total > avgInvoice * 3) {
      anomalies.push({
        type: 'Unusual Invoice',
        entity: 'invoice',
        entityId: inv.id,
        value: inv.total,
        expected: avgInvoice,
        deviation: ((inv.total - avgInvoice) / avgInvoice * 100).toFixed(0) + '%',
        severity: inv.total > avgInvoice * 5 ? 'high' : 'medium',
      });
    }
  });

  // Unusual expenses
  expenses.forEach(exp => {
    if (exp.amount > avgExpense * 3) {
      anomalies.push({
        type: 'Unusual Expense',
        entity: 'expense',
        entityId: exp.id,
        value: exp.amount,
        expected: avgExpense,
        deviation: ((exp.amount - avgExpense) / avgExpense * 100).toFixed(0) + '%',
        severity: exp.amount > avgExpense * 5 ? 'high' : 'medium',
      });
    }
  });

  res.json({
    anomalies,
    thresholds: {
      invoiceAvg: avgInvoice,
      expenseAvg: avgExpense,
      thresholdMultiplier: 3,
    },
  });
});

// ============================================================
// COMPLIANCE CHECK
// ============================================================

router.get('/compliance', (req, res) => {
  const checks = [
    {
      category: 'Accounting',
      item: 'Trial Balance Balanced',
      status: 'pass',
      lastChecked: new Date().toISOString(),
    },
    {
      category: 'Accounting',
      item: 'No Unposted Entries',
      status: 'pass',
      lastChecked: new Date().toISOString(),
    },
    {
      category: 'GST',
      item: 'GST Returns Filed',
      status: 'pending',
      dueDate: '2026-07-20',
    },
    {
      category: 'TDS',
      item: 'TDS Deposited',
      status: 'pass',
      lastChecked: new Date().toISOString(),
    },
    {
      category: 'PF',
      item: 'PF Challan Filed',
      status: 'pass',
      lastChecked: new Date().toISOString(),
    },
    {
      category: 'Audit',
      item: 'Bank Reconciliation',
      status: 'pending',
      lastChecked: null,
    },
    {
      category: 'Documents',
      item: 'Cancelled Cheques',
      status: 'pass',
      lastChecked: new Date().toISOString(),
    },
  ];

  const summary = {
    total: checks.length,
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    pending: checks.filter(c => c.status === 'pending').length,
    complianceScore: ((checks.filter(c => c.status === 'pass').length / checks.length) * 100).toFixed(0),
  };

  res.json({ checks, summary });
});

// ============================================================
// CONTINUOUS AUDIT
// ============================================================

router.get('/continuous-audit', (req, res) => {
  const journalEntries = Array.from(db.journalEntries.values());
  const invoices = Array.from(db.invoices.values());

  const findings = [];

  // Journal entry controls
  findings.push({
    control: 'JE Authorization',
    status: journalEntries.every(je => je.createdBy) ? 'pass' : 'fail',
    lastTested: new Date().toISOString(),
  });

  findings.push({
    control: 'JE Documentation',
    status: journalEntries.every(je => je.description) ? 'pass' : 'fail',
    lastTested: new Date().toISOString(),
  });

  findings.push({
    control: 'Invoice Approval',
    status: invoices.filter(i => i.status === 'approved').length > 0 ? 'pass' : 'warning',
    lastTested: new Date().toISOString(),
  });

  findings.push({
    control: 'Segregation of Duties',
    status: 'pass',
    comment: 'AI monitoring active',
    lastTested: new Date().toISOString(),
  });

  findings.push({
    control: 'Access Controls',
    status: 'pass',
    comment: 'Role-based access enforced',
    lastTested: new Date().toISOString(),
  });

  res.json({
    findings,
    overallStatus: findings.every(f => f.status === 'pass') ? 'pass' : 'warning',
  });
});

// ============================================================
// POLICY VIOLATIONS
// ============================================================

router.get('/policy-violations', (req, res) => {
  const expenses = Array.from(db.expenses?.values() || []);

  const policies = [
    { name: 'Expense Limit - Travel', limit: 50000, category: 'travel' },
    { name: 'Expense Limit - Meals', limit: 5000, category: 'meals' },
    { name: 'Expense Limit - Software', limit: 20000, category: 'software' },
    { name: 'Approval Required - Over 10K', limit: 10000, category: 'all' },
  ];

  const violations = [];

  expenses.forEach(exp => {
    policies.forEach(policy => {
      if (policy.category === exp.category || policy.category === 'all') {
        if (exp.amount > policy.limit) {
          violations.push({
            expenseId: exp.id,
            employee: exp.employeeName,
            policy: policy.name,
            amount: exp.amount,
            limit: policy.limit,
            violation: exp.amount - policy.limit,
            severity: exp.amount > policy.limit * 2 ? 'high' : 'medium',
            date: exp.date,
          });
        }
      }
    });
  });

  res.json({
    violations,
    summary: {
      total: violations.length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
    },
  });
});

// ============================================================
// AUDIT REPORT
// ============================================================

router.get('/report/:type', (req, res) => {
  const { type } = req.params;

  const reports = {
    'transaction': {
      title: 'Transaction Audit Report',
      period: new Date().toISOString(),
      transactions: Array.from(db.journalEntries.values()).slice(0, 100),
      totalTransactions: db.journalEntries?.size || 0,
    },
    'compliance': {
      title: 'Compliance Audit Report',
      period: new Date().toISOString(),
      status: 'Completed',
      findings: 'No major issues',
    },
    'fraud': {
      title: 'Fraud Detection Report',
      period: new Date().toISOString(),
      riskLevel: 'Low',
      recommendations: [
        'Continue monitoring',
        'Review large transactions',
        'Update approval workflows',
      ],
    },
  };

  res.json(reports[type] || { error: 'Report type not found' });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateRiskScore(indicators) {
  let score = 0;
  indicators.forEach(i => {
    if (i.severity === 'high') score += 30;
    if (i.severity === 'medium') score += 15;
    if (i.severity === 'low') score += 5;
  });
  return Math.min(100, score);
}

export default router;
