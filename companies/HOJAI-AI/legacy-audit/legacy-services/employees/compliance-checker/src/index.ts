/**
 * Compliance Checker
 * Port: 4833
 *
 * Role: Regulatory compliance, audit readiness, policy enforcement, risk assessment
 * Persona: Thorough examiner, rule follower, risk avoider, documentation expert
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4833;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface ComplianceRegulation {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'financial' | 'operational' | 'industry';
  region: string;
  effectiveDate: Date;
  requirements: string[];
  penalties: string;
}

interface ComplianceCheck {
  id: string;
  regulationId: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  score: number;
  findings: {
    type: 'critical' | 'major' | 'minor' | 'observation';
    description: string;
    requirement: string;
    evidence?: string;
    remediation?: string;
  }[];
  lastChecked: Date;
  nextAudit?: Date;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  version: number;
  effectiveDate: Date;
  owner: string;
  reviewDate: Date;
  complianceScore: number;
  violations: number;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  complianceRelevant: boolean;
  details: string;
}

// Compliance regulations
const regulations: ComplianceRegulation[] = [
  {
    id: 'reg-1',
    name: 'GDPR',
    description: 'General Data Protection Regulation',
    category: 'data',
    region: 'EU',
    effectiveDate: new Date('2018-05-25'),
    requirements: [
      'Data consent management',
      'Right to access',
      'Right to erasure',
      'Data breach notification (72 hours)',
      'Privacy by design',
      'Data protection officer appointment'
    ],
    penalties: 'Up to €20 million or 4% of global turnover'
  },
  {
    id: 'reg-2',
    name: 'SOC 2 Type II',
    description: 'Service Organization Control 2',
    category: 'operational',
    region: 'Global',
    effectiveDate: new Date('2017-01-01'),
    requirements: [
      'Security controls',
      'Availability controls',
      'Processing integrity',
      'Confidentiality',
      'Privacy controls'
    ],
    penalties: 'Loss of certification, customer trust'
  },
  {
    id: 'reg-3',
    name: 'ISO 27001',
    description: 'Information Security Management',
    category: 'data',
    region: 'Global',
    effectiveDate: new Date('2013-09-01'),
    requirements: [
      'ISMS implementation',
      'Risk assessment',
      'Security policies',
      'Access control',
      'Incident management',
      'Continuous improvement'
    ],
    penalties: 'Loss of certification, legal liability'
  },
  {
    id: 'reg-4',
    name: 'PCI DSS',
    description: 'Payment Card Industry Data Security Standard',
    category: 'financial',
    region: 'Global',
    effectiveDate: new Date('2022-03-31'),
    requirements: [
      'Firewall configuration',
      'Password policies',
      'Data encryption',
      'Access monitoring',
      'Vulnerability management',
      'Network testing'
    ],
    penalties: 'Fines from $5,000 to $100,000 per month'
  },
  {
    id: 'reg-5',
    name: 'DPDP Act 2023',
    description: 'Digital Personal Data Protection Act (India)',
    category: 'data',
    region: 'India',
    effectiveDate: new Date('2023-08-11'),
    requirements: [
      'Consent management',
      'Purpose limitation',
      'Data accuracy',
      'Storage limitation',
      'Data fiduciary obligations',
      'Grievance redressal'
    ],
    penalties: 'Up to ₹250 crore for data breaches'
  }
];

// Perform compliance check
function performComplianceCheck(regulationId: string): ComplianceCheck {
  const regulation = regulations.find(r => r.id === regulationId);

  if (!regulation) {
    return {
      id: `check-${Date.now()}`,
      regulationId,
      status: 'not_applicable',
      score: 0,
      findings: [],
      lastChecked: new Date()
    };
  }

  const findings = [];
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;

  // Simulate findings based on regulation
  if (regulation.name === 'GDPR') {
    findings.push({
      type: 'major' as const,
      description: 'Consent forms do not have clear opt-out mechanism',
      requirement: 'Consent must be as easy to withdraw as to give',
      evidence: 'consent_form_v1.pdf',
      remediation: 'Update consent forms with clear withdrawal option'
    });
    majorCount++;
  }

  if (regulation.name === 'SOC 2') {
    findings.push({
      type: 'minor' as const,
      description: 'Password rotation policy not documented for service accounts',
      requirement: 'All passwords must have rotation policy',
      evidence: 'security_policy.pdf page 12',
      remediation: 'Document rotation policy'
    });
    minorCount++;
  }

  if (regulation.name === 'PCI DSS') {
    findings.push({
      type: 'critical' as const,
      description: 'Cardholder data found in unencrypted logs',
      requirement: 'Cardholder data must be encrypted at rest',
      evidence: 'log_analysis_2026-05.pdf',
      remediation: 'Immediate encryption of logs, purge sensitive data'
    });
    criticalCount++;
  }

  if (regulation.name === 'DPDP Act') {
    findings.push({
      type: 'major' as const,
      description: 'Privacy policy not updated for new consent requirements',
      requirement: 'Privacy policy must reflect current practices',
      remediation: 'Update privacy policy and obtain legal review'
    });
    majorCount++;
  }

  const score = Math.max(0, 100 - (criticalCount * 30) - (majorCount * 15) - (minorCount * 5));

  return {
    id: `check-${Date.now()}`,
    regulationId,
    status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non_compliant',
    score,
    findings,
    lastChecked: new Date(),
    nextAudit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  };
}

// Get compliance overview
app.get('/api/compliance', (req: Request, res: Response) => {
  const checks = regulations.map(reg => performComplianceCheck(reg.id));

  const summary = {
    total: checks.length,
    compliant: checks.filter(c => c.status === 'compliant').length,
    partial: checks.filter(c => c.status === 'partial').length,
    nonCompliant: checks.filter(c => c.status === 'non_compliant').length,
    avgScore: Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)
  };

  res.json({
    regulations,
    checks,
    summary,
    riskLevel: summary.nonCompliant > 0 ? 'high' : summary.partial > 1 ? 'medium' : 'low'
  });
});

// Check specific regulation
app.get('/api/compliance/:regulationId', (req: Request, res: Response) => {
  const { regulationId } = req.params;

  const regulation = regulations.find(r => r.id === regulationId);
  const check = performComplianceCheck(regulationId);

  res.json({
    regulation,
    check,
    controls: [
      { name: 'Access Control', status: 'compliant' },
      { name: 'Data Encryption', status: 'non_compliant' },
      { name: 'Incident Response', status: 'compliant' },
      { name: 'Audit Logging', status: 'compliant' },
      { name: 'Vulnerability Management', status: 'partial' }
    ]
  });
});

// Run compliance check
app.post('/api/compliance/check', (req: Request, res: Response) => {
  const { regulationId, scope } = req.body;

  const check = performComplianceCheck(regulationId);

  res.json({
    check,
    recommendations: check.findings.map(f => ({
      priority: f.type,
      action: f.remediation || 'Review and address finding',
      timeline: f.type === 'critical' ? 'Immediate' : f.type === 'major' ? 'Within 30 days' : 'Within 90 days'
    })),
    auditTrail: {
      checkId: check.id,
      timestamp: check.lastChecked,
      auditor: 'compliance-system',
      scope: scope || 'Full regulation'
    }
  });
});

// Get policies
app.get('/api/policies', (req: Request, res: Response) => {
  const policies: Policy[] = [
    { id: 'pol-1', name: 'Data Privacy Policy', description: 'Handling of personal data', category: 'Privacy', version: 3, effectiveDate: new Date('2026-01-01'), owner: 'Legal', reviewDate: new Date('2026-12-31'), complianceScore: 85, violations: 2 },
    { id: 'pol-2', name: 'Information Security Policy', description: 'Security controls and procedures', category: 'Security', version: 5, effectiveDate: new Date('2026-03-01'), owner: 'CISO', reviewDate: new Date('2027-03-01'), complianceScore: 92, violations: 0 },
    { id: 'pol-3', name: 'Acceptable Use Policy', description: 'IT resource usage guidelines', category: 'IT', version: 2, effectiveDate: new Date('2025-06-01'), owner: 'IT', reviewDate: new Date('2026-06-01'), complianceScore: 78, violations: 5 },
    { id: 'pol-4', name: 'Code of Conduct', description: 'Employee behavior standards', category: 'HR', version: 4, effectiveDate: new Date('2026-01-15'), owner: 'HR', reviewDate: new Date('2027-01-15'), complianceScore: 95, violations: 1 },
    { id: 'pol-5', name: 'Financial Controls Policy', description: 'Financial reporting controls', category: 'Finance', version: 2, effectiveDate: new Date('2026-02-01'), owner: 'CFO', reviewDate: new Date('2027-02-01'), complianceScore: 88, violations: 0 }
  ];

  res.json({
    policies,
    summary: {
      total: policies.length,
      avgCompliance: Math.round(policies.reduce((sum, p) => sum + p.complianceScore, 0) / policies.length),
      dueForReview: policies.filter(p => new Date(p.reviewDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length
    }
  });
});

// Create/update policy
app.post('/api/policies', (req: Request, res: Response) => {
  const policyData = req.body;

  const policy: Policy = {
    id: `pol-${Date.now()}`,
    name: policyData.name,
    description: policyData.description,
    category: policyData.category,
    version: 1,
    effectiveDate: new Date(),
    owner: policyData.owner,
    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    complianceScore: 100,
    violations: 0
  };

  res.json({
    policy,
    workflow: {
      approvalRequired: true,
      approvers: ['Legal', 'Compliance'],
      effectiveAfter: 'Upon approval'
    }
  });
});

// Audit log
app.get('/api/audit-log', (req: Request, res: Response) => {
  const { startDate, endDate, user, action } = req.query;

  const logs: AuditLog[] = [
    { id: 'log-1', timestamp: new Date(), user: 'admin@company.com', action: 'DATA_EXPORT', resource: 'Customer database', complianceRelevant: true, details: 'Exported customer data for GDPR request' },
    { id: 'log-2', timestamp: new Date(Date.now() - 60 * 60 * 1000), user: 'user@company.com', action: 'LOGIN', resource: 'System', complianceRelevant: false, details: 'Successful login' },
    { id: 'log-3', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), user: 'admin@company.com', action: 'PERMISSION_CHANGE', resource: 'Finance module', complianceRelevant: true, details: 'Modified user permissions' },
    { id: 'log-4', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), user: 'system', action: 'DATA_ACCESS', resource: 'PII fields', complianceRelevant: true, details: 'Automated data processing' }
  ];

  res.json({
    logs,
    summary: {
      total: logs.length,
      complianceRelevant: logs.filter(l => l.complianceRelevant).length,
      byAction: logs.reduce((acc, l) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Risk assessment
app.get('/api/risk-assessment', (req: Request, res: Response) => {
  const risks = [
    { id: 'risk-1', name: 'Data Breach', likelihood: 'medium', impact: 'critical', mitigation: 'Encryption, access controls, monitoring', status: 'managed' },
    { id: 'risk-2', name: 'Regulatory Non-Compliance', likelihood: 'low', impact: 'critical', mitigation: 'Compliance monitoring, regular audits', status: 'managed' },
    { id: 'risk-3', name: 'Insider Threat', likelihood: 'low', impact: 'high', mitigation: 'Access controls, monitoring, training', status: 'monitoring' },
    { id: 'risk-4', name: 'Third-Party Risk', likelihood: 'medium', impact: 'medium', mitigation: 'Vendor assessment, SLAs, audits', status: 'mitigation' },
    { id: 'risk-5', name: 'System Outage', likelihood: 'low', impact: 'high', mitigation: 'DR plan, redundancy, monitoring', status: 'managed' }
  ];

  res.json({
    risks,
    overallRiskLevel: 'medium',
    riskAppetite: 'medium',
    coverage: {
      identified: risks.length,
      mitigated: risks.filter(r => r.status === 'managed').length,
      monitoring: risks.filter(r => r.status === 'monitoring').length,
      accepting: risks.filter(r => r.status === 'accepting').length
    }
  });
});

// Training compliance
app.get('/api/training', (req: Request, res: Response) => {
  const training = [
    { name: 'Data Privacy Fundamentals', requirement: 'All employees', completion: 92, dueDate: '2026-06-30' },
    { name: 'Security Awareness', requirement: 'All employees', completion: 88, dueDate: '2026-06-30' },
    { name: 'GDPR Essentials', requirement: 'EU-facing roles', completion: 95, dueDate: '2026-05-31' },
    { name: 'PCI DSS Training', requirement: 'Finance team', completion: 100, dueDate: '2026-04-30' },
    { name: 'Anti-Bribery & Corruption', requirement: 'All employees', completion: 78, dueDate: '2026-06-30' }
  ];

  res.json({
    training,
    summary: {
      overallCompletion: Math.round(training.reduce((sum, t) => sum + t.completion, 0) / training.length),
      overdue: training.filter(t => t.completion < 100).length,
      upcoming: training.filter(t => t.completion < 80).length
    },
    recommendations: ['Send reminders for overdue training', 'Schedule sessions for low completion courses']
  });
});

// Generate compliance report
app.get('/api/report', (req: Request, res: Response) => {
  const checks = regulations.map(reg => performComplianceCheck(reg.id));

  res.json({
    report: {
      title: 'Quarterly Compliance Report',
      period: 'Q2 2026',
      generatedAt: new Date(),
      summary: {
        overallScore: Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length),
        compliantRegulations: checks.filter(c => c.status === 'compliant').length,
        pendingIssues: checks.reduce((sum, c) => sum + c.findings.length, 0),
        criticalIssues: checks.reduce((sum, c) => sum + c.findings.filter(f => f.type === 'critical').length, 0)
      },
      byRegulation: checks.map(c => ({
        regulation: regulations.find(r => r.id === c.regulationId)?.name,
        score: c.score,
        status: c.status,
        findings: c.findings.length
      })),
      findings: checks.flatMap(c => c.findings).slice(0, 10),
      recommendations: [
        'Address critical findings immediately',
        'Schedule training for low completion areas',
        'Update policies before next audit cycle'
      ]
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'compliance-checker',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Compliance Checker running on port ${PORT}`);
  console.log('Role: Ensure regulatory compliance, audit readiness');
});

export default app;
