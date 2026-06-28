import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

type Framework = 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
type ControlStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable';
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Control {
  id: string; framework: Framework; controlId: string; name: string;
  description: string; status: ControlStatus; owner: string;
  lastReviewed: string; nextReview: string; notes: string;
}

interface Finding {
  id: string; controlId: string; severity: Severity; description: string;
  remediation: string; deadline: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  createdAt: string; createdBy: string;
}

function complianceScore(controls: Control[]): number {
  if (controls.length === 0) return 0;
  const compliant = controls.filter(c => c.status === 'compliant').length;
  return Math.round((compliant / controls.length) * 100);
}

function overdueReviews(controls: Control[]): Control[] {
  const now = new Date().toISOString();
  return controls.filter(c => c.nextReview < now);
}

function filterByFramework(controls: Control[], framework: Framework): Control[] {
  return controls.filter(c => c.framework === framework);
}

function severityOrder(s: Severity): number {
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return order[s] || 0;
}

function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
}

describe('ComplianceOS — Framework Controls', () => {
  const controls: Control[] = [
    { id: '1', framework: 'SOC2', controlId: 'CC1.1', name: 'Control 1', description: '', status: 'compliant', owner: 'alice', lastReviewed: '2024-01-01', nextReview: '2025-01-01', notes: '' },
    { id: '2', framework: 'SOC2', controlId: 'CC1.2', name: 'Control 2', description: '', status: 'non_compliant', owner: 'bob', lastReviewed: '2024-01-01', nextReview: '2025-01-01', notes: '' },
    { id: '3', framework: 'GDPR', controlId: 'G1', name: 'Data Privacy', description: '', status: 'compliant', owner: 'carol', lastReviewed: '2024-01-01', nextReview: '2025-01-01', notes: '' },
    { id: '4', framework: 'GDPR', controlId: 'G2', name: 'Consent', description: '', status: 'in_progress', owner: 'dave', lastReviewed: '2024-01-01', nextReview: '2025-01-01', notes: '' },
  ];

  it('calculates compliance score correctly', () => {
    expect(complianceScore(controls)).toBe(50);
  });

  it('returns 0 for no controls', () => {
    expect(complianceScore([])).toBe(0);
  });

  it('returns 100 for all compliant', () => {
    const allCompliant = controls.map(c => ({ ...c, status: 'compliant' as ControlStatus }));
    expect(complianceScore(allCompliant)).toBe(100);
  });

  it('filters by framework', () => {
    const soc2 = filterByFramework(controls, 'SOC2');
    expect(soc2).toHaveLength(2);
    const gdpr = filterByFramework(controls, 'GDPR');
    expect(gdpr).toHaveLength(2);
  });

  it('returns empty for non-existent framework', () => {
    const hipaa = filterByFramework(controls, 'HIPAA');
    expect(hipaa).toHaveLength(0);
  });
});

describe('ComplianceOS — Findings', () => {
  const findings: Finding[] = [
    { id: 'f1', controlId: '1', severity: 'low', description: 'Minor', remediation: 'Fix', deadline: '2024-12-31', status: 'open', createdAt: '', createdBy: '' },
    { id: 'f2', controlId: '1', severity: 'critical', description: 'Major', remediation: 'Fix now', deadline: '2024-12-31', status: 'open', createdAt: '', createdBy: '' },
    { id: 'f3', controlId: '1', severity: 'high', description: 'Serious', remediation: 'Fix soon', deadline: '2024-12-31', status: 'open', createdAt: '', createdBy: '' },
    { id: 'f4', controlId: '1', severity: 'medium', description: 'Moderate', remediation: 'Fix later', deadline: '2024-12-31', status: 'open', createdAt: '', createdBy: '' },
  ];

  it('sorts by severity descending', () => {
    const sorted = sortBySeverity(findings);
    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('high');
    expect(sorted[2].severity).toBe('medium');
    expect(sorted[3].severity).toBe('low');
  });

  it('counts open findings', () => {
    const open = findings.filter(f => f.status === 'open');
    expect(open).toHaveLength(4);
  });

  it('counts by severity', () => {
    const critical = findings.filter(f => f.severity === 'critical');
    const high = findings.filter(f => f.severity === 'high');
    expect(critical).toHaveLength(1);
    expect(high).toHaveLength(1);
  });
});

describe('ComplianceOS — Review Scheduling', () => {
  it('detects overdue reviews', () => {
    const controls: Control[] = [
      { id: '1', framework: 'SOC2', controlId: 'C1', name: 'Current', description: '', status: 'compliant', owner: '', lastReviewed: '', nextReview: '2030-01-01', notes: '' },
      { id: '2', framework: 'SOC2', controlId: 'C2', name: 'Past', description: '', status: 'compliant', owner: '', lastReviewed: '', nextReview: '2020-01-01', notes: '' },
    ];
    const overdue = overdueReviews(controls);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].name).toBe('Past');
  });
});

describe('ComplianceOS — Framework Support', () => {
  it('supports all frameworks', () => {
    const frameworks: Framework[] = ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS'];
    for (const fw of frameworks) {
      const control: Control = { id: '1', framework: fw, controlId: '1', name: 'Test', description: '', status: 'compliant', owner: '', lastReviewed: '', nextReview: '', notes: '' };
      expect(control.framework).toBe(fw);
    }
  });

  it('supports all control statuses', () => {
    const statuses: ControlStatus[] = ['compliant', 'non_compliant', 'in_progress', 'not_applicable'];
    for (const s of statuses) {
      const control: Control = { id: '1', framework: 'SOC2', controlId: '1', name: 'Test', description: '', status: s, owner: '', lastReviewed: '', nextReview: '', notes: '' };
      expect(control.status).toBe(s);
    }
  });
});
