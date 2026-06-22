/**
 * Invoice Auditor
 * Port: 4832
 *
 * Role: Invoice verification, error detection, fraud prevention, payment reconciliation
 * Persona: Detail-oriented, skeptical checker, accuracy champion, fraud fighter
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4832;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  vendorId: string;
  date: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'disputed';
  paymentTerms: string;
  notes?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  poReference?: string;
}

interface AuditResult {
  invoiceId: string;
  status: 'pass' | 'warning' | 'fail';
  score: number;
  issues: {
    type: 'error' | 'fraud' | 'compliance' | 'variance';
    severity: 'critical' | 'major' | 'minor';
    message: string;
    field?: string;
    expected?: string;
    actual?: string;
  }[];
  recommendations: string[];
  approved: boolean;
  requiresApproval: boolean;
  approvers?: string[];
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  paymentTerms: string;
  avgInvoiceAmount: number;
  riskScore: number;
  lastInvoice: Date;
  invoicesPaid: number;
  invoicesDisputed: number;
}

// Seed data
const vendors: Vendor[] = [
  { id: 'vendor-1', name: 'TechSupply Co', category: 'IT Equipment', paymentTerms: 'Net 30', avgInvoiceAmount: 25000, riskScore: 15, lastInvoice: new Date('2026-05-15'), invoicesPaid: 45, invoicesDisputed: 1 },
  { id: 'vendor-2', name: 'Office Essentials', category: 'Office Supplies', paymentTerms: 'Net 15', avgInvoiceAmount: 5000, riskScore: 10, lastInvoice: new Date('2026-05-20'), invoicesPaid: 120, invoicesDisputed: 2 },
  { id: 'vendor-3', name: 'CloudServices Ltd', category: 'Software', paymentTerms: 'Net 30', avgInvoiceAmount: 150000, riskScore: 20, lastInvoice: new Date('2026-05-01'), invoicesPaid: 12, invoicesDisputed: 0 }
];

// Validate invoice
function auditInvoice(invoice: Partial<Invoice>): AuditResult {
  const issues: AuditResult['issues'] = [];

  // Check mathematical accuracy
  const calculatedSubtotal = invoice.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const calculatedTax = calculatedSubtotal * 0.18; // 18% GST
  const calculatedTotal = calculatedSubtotal + calculatedTax;

  if (Math.abs(calculatedSubtotal - (invoice.subtotal || 0)) > 0.01) {
    issues.push({
      type: 'error',
      severity: 'major',
      message: 'Subtotal calculation mismatch',
      field: 'subtotal',
      expected: calculatedSubtotal.toFixed(2),
      actual: invoice.subtotal?.toFixed(2)
    });
  }

  if (Math.abs(calculatedTotal - (invoice.total || 0)) > 0.01) {
    issues.push({
      type: 'error',
      severity: 'major',
      message: 'Total calculation mismatch',
      field: 'total',
      expected: calculatedTotal.toFixed(2),
      actual: invoice.total?.toFixed(2)
    });
  }

  // Check for duplicate invoices
  const isDuplicate = Math.random() > 0.9; // Simulate 10% chance
  if (isDuplicate) {
    issues.push({
      type: 'fraud',
      severity: 'critical',
      message: 'Possible duplicate invoice detected',
      field: 'invoiceNumber'
    });
  }

  // Check vendor risk
  const vendor = vendors.find(v => v.name === invoice.vendor);
  if (vendor && vendor.riskScore > 15) {
    issues.push({
      type: 'fraud',
      severity: 'major',
      message: 'High-risk vendor - requires additional verification',
      field: 'vendor'
    });
  }

  // Check for unusual amounts
  if (vendor && invoice.total && invoice.total > vendor.avgInvoiceAmount * 3) {
    issues.push({
      type: 'fraud',
      severity: 'critical',
      message: 'Invoice amount significantly higher than vendor average',
      field: 'total',
      expected: `~${vendor.avgInvoiceAmount}`,
      actual: invoice.total.toString()
    });
  }

  // Check for late submission
  const daysSinceInvoice = invoice.date ? Math.floor((Date.now() - new Date(invoice.date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  if (daysSinceInvoice > 90) {
    issues.push({
      type: 'compliance',
      severity: 'major',
      message: 'Invoice submitted more than 90 days after invoice date',
      field: 'date'
    });
  }

  // Check payment terms
  const validTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt'];
  if (invoice.paymentTerms && !validTerms.some(t => invoice.paymentTerms?.includes(t))) {
    issues.push({
      type: 'compliance',
      severity: 'minor',
      message: 'Non-standard payment terms',
      field: 'paymentTerms'
    });
  }

  // Calculate score
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const majorIssues = issues.filter(i => i.severity === 'major').length;
  const minorIssues = issues.filter(i => i.severity === 'minor').length;

  const score = Math.max(0, 100 - (criticalIssues * 30) - (majorIssues * 15) - (minorIssues * 5));

  const approved = issues.filter(i => i.severity === 'critical' || i.severity === 'major').length === 0;
  const requiresApproval = issues.filter(i => i.severity === 'critical').length > 0 || score < 80;

  return {
    invoiceId: invoice.id || 'unknown',
    status: score >= 90 ? 'pass' : score >= 70 ? 'warning' : 'fail',
    score,
    issues,
    recommendations: issues.map(i => `Address ${i.type} issue: ${i.message}`),
    approved,
    requiresApproval,
    approvers: requiresApproval ? ['finance@company.com', 'manager@company.com'] : undefined
  };
}

// Audit invoice
app.post('/api/audit', (req: Request, res: Response) => {
  const invoice = req.body as Partial<Invoice>;

  const result = auditInvoice(invoice);

  res.json({
    result,
    summary: {
      passed: result.status === 'pass',
      issuesFound: result.issues.length,
      critical: result.issues.filter(i => i.severity === 'critical').length,
      major: result.issues.filter(i => i.severity === 'major').length,
      minor: result.issues.filter(i => i.severity === 'minor').length
    }
  });
});

// Batch audit
app.post('/api/audit/batch', (req: Request, res: Response) => {
  const { invoices } = req.body;

  const results = invoices.map((invoice: Partial<Invoice>) => ({
    invoice,
    result: auditInvoice(invoice)
  }));

  const summary = {
    total: results.length,
    passed: results.filter(r => r.result.status === 'pass').length,
    warnings: results.filter(r => r.result.status === 'warning').length,
    failed: results.filter(r => r.result.status === 'fail').length,
    avgScore: Math.round(results.reduce((sum, r) => sum + r.result.score, 0) / results.length),
    totalIssues: results.reduce((sum, r) => sum + r.result.issues.length, 0),
    totalValueAtRisk: results.filter(r => !r.result.approved).reduce((sum, r) => sum + (r.invoice.total || 0), 0)
  };

  res.json({
    results,
    summary
  });
});

// Create invoice
app.post('/api/invoices', (req: Request, res: Response) => {
  const invoiceData = req.body;

  const invoice: Invoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
    vendor: invoiceData.vendor,
    vendorId: invoiceData.vendorId,
    date: new Date(invoiceData.date),
    dueDate: new Date(invoiceData.dueDate),
    items: invoiceData.items || [],
    subtotal: invoiceData.subtotal,
    tax: invoiceData.tax,
    total: invoiceData.total,
    status: 'pending',
    paymentTerms: invoiceData.paymentTerms || 'Net 30',
    notes: invoiceData.notes
  };

  // Auto-audit
  const auditResult = auditInvoice(invoice);

  res.json({
    invoice,
    audit: auditResult,
    nextSteps: auditResult.approved
      ? ['Review and approve', 'Process for payment']
      : ['Address flagged issues', 'Escalate if needed']
  });
});

// Get invoices
app.get('/api/invoices', (req: Request, res: Response) => {
  const { status, vendor, startDate, endDate } = req.query;

  const invoices: Invoice[] = [
    { id: 'inv-1', invoiceNumber: 'INV-2026-001', vendor: 'TechSupply Co', vendorId: 'vendor-1', date: new Date('2026-05-15'), dueDate: new Date('2026-06-14'), items: [{ id: 'i1', description: 'Laptop', quantity: 5, unitPrice: 50000, total: 250000, category: 'IT' }], subtotal: 250000, tax: 45000, total: 295000, status: 'pending', paymentTerms: 'Net 30' },
    { id: 'inv-2', invoiceNumber: 'INV-2026-002', vendor: 'Office Essentials', vendorId: 'vendor-2', date: new Date('2026-05-20'), dueDate: new Date('2026-06-04'), items: [{ id: 'i2', description: 'Stationery', quantity: 100, unitPrice: 50, total: 5000, category: 'Supplies' }], subtotal: 5000, tax: 900, total: 5900, status: 'approved', paymentTerms: 'Net 15' },
    { id: 'inv-3', invoiceNumber: 'INV-2026-003', vendor: 'CloudServices Ltd', vendorId: 'vendor-3', date: new Date('2026-05-01'), dueDate: new Date('2026-05-31'), items: [{ id: 'i3', description: 'Annual Subscription', quantity: 1, unitPrice: 150000, total: 150000, category: 'Software' }], subtotal: 150000, tax: 27000, total: 177000, status: 'paid', paymentTerms: 'Net 30' }
  ];

  let filtered = invoices;
  if (status) filtered = filtered.filter(i => i.status === status);
  if (vendor) filtered = filtered.filter(i => i.vendor === vendor);

  res.json({
    invoices: filtered,
    summary: {
      total: filtered.length,
      totalValue: filtered.reduce((sum, i) => sum + i.total, 0),
      byStatus: filtered.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Approve invoice
app.patch('/api/invoices/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approvedBy, notes } = req.body;

  const invoice = {
    id,
    status: 'approved' as const,
    approvedBy,
    approvedAt: new Date(),
    notes
  };

  res.json({
    invoice,
    message: 'Invoice approved successfully',
    notification: 'Vendor will be notified of payment processing'
  });
});

// Reject invoice
app.patch('/api/invoices/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, rejectedBy } = req.body;

  const invoice = {
    id,
    status: 'rejected' as const,
    rejectedBy,
    rejectedAt: new Date(),
    rejectionReason: reason
  };

  res.json({
    invoice,
    message: 'Invoice rejected',
    nextActions: ['Vendor notified', 'Dispute resolution process initiated'],
    disputeWorkflow: {
      steps: ['Contact vendor', 'Gather documentation', 'Negotiate resolution', 'Document outcome']
    }
  });
});

// Vendor analysis
app.get('/api/vendors/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const vendor = vendors.find(v => v.id === id) || vendors[0];

  res.json({
    vendor,
    analysis: {
      paymentHistory: {
        onTime: vendor.invoicesPaid - vendor.invoicesDisputed,
        disputed: vendor.invoicesDisputed,
        avgDaysToPay: 28
      },
      riskAssessment: {
        score: vendor.riskScore,
        level: vendor.riskScore < 15 ? 'low' : vendor.riskScore < 30 ? 'medium' : 'high',
        factors: ['Invoice frequency', 'Amount variance', 'Dispute rate']
      },
      recommendations: vendor.riskScore > 20
        ? ['Require additional verification', 'Set lower payment limits']
        : ['Continue current process']
    }
  });
});

// Get vendors
app.get('/api/vendors', (req: Request, res: Response) => {
  res.json({
    vendors,
    summary: {
      total: vendors.length,
      byCategory: vendors.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1;
        return acc;
      }, {}),
      avgRiskScore: Math.round(vendors.reduce((sum, v) => sum + v.riskScore, 0) / vendors.length)
    }
  });
});

// Payment reconciliation
app.post('/api/reconcile', (req: Request, res: Response) => {
  const { bankStatement, invoices } = req.body;

  const reconciliation = {
    matched: [
      { invoiceId: 'inv-1', amount: 295000, transaction: 'TRF-12345', date: '2026-05-18' }
    ],
    unmatchedPayments: [
      { reference: 'TRF-67890', amount: 5000, date: '2026-05-20', description: 'Unknown' }
    ],
    unmatchedInvoices: [
      { invoiceId: 'inv-2', amount: 5900, status: 'awaiting payment' }
    ]
  };

  const totalMatched = reconciliation.matched.reduce((sum, m) => sum + m.amount, 0);
  const totalUnmatched = reconciliation.unmatchedPayments.reduce((sum, u) => sum + u.amount, 0);

  res.json({
    reconciliation,
    summary: {
      matched: reconciliation.matched.length,
      unmatched: reconciliation.unmatchedPayments.length + reconciliation.unmatchedInvoices.length,
      matchRate: `${Math.round((reconciliation.matched.length / (reconciliation.matched.length + reconciliation.unmatchedPayments.length)) * 100)}%`,
      valueMatched: totalMatched,
      valueUnmatched: totalUnmatched
    },
    nextActions: reconciliation.unmatchedPayments.length > 0
      ? ['Investigate unmatched payments', 'Contact vendors if needed']
      : []
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'invoice-auditor',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Invoice Auditor running on port ${PORT}`);
  console.log('Role: Verify invoices, catch errors, prevent fraud');
});

export default app;
