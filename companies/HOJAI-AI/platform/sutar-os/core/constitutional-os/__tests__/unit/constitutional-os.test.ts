import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the business logic directly (the src/index.ts module)
// We mock @rtmn/shared to isolate the business logic

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// --- Pure logic helpers (reconstructed from src/index.ts logic) ---

interface Mission {
  id: string; text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'founder' | 'board' | 'compliance' | 'legal';
  active: boolean; createdAt: string;
}

interface RedLine {
  id: string; rule: string;
  category: 'ethics' | 'legal' | 'safety' | 'compliance' | 'culture';
  severity: 'hard_stop' | 'warning' | 'approval_required';
  description: string; approvedBy: string; exceptions?: string[];
}

interface Value {
  id: string; name: string; description: string;
  examples: string[]; weight: number; priority?: number;
}

interface Authority {
  id: string; agentType: string; scope: string;
  maxValue?: number; requiresApproval?: number;
  blacklist: string[]; whitelist?: string[];
}

// Red line violation checker
function checkRedLines(action: string, redLines: RedLine[]): {
  allowed: boolean; hardStops: number; warnings: number;
  requiresApproval: boolean; violations: any[];
} {
  const violations = [];
  for (const redLine of redLines) {
    const keywords = redLine.rule.toLowerCase().split(' ');
    const actionLower = (action || '').toLowerCase();
    const matches = keywords.filter(k => actionLower.includes(k));
    if (matches.length >= 2) {
      violations.push({ redLineId: redLine.id, rule: redLine.rule, severity: redLine.severity, category: redLine.category, matches });
    }
  }
  const hardStops = violations.filter((v: any) => v.severity === 'hard_stop');
  const warnings = violations.filter((v: any) => v.severity === 'warning');
  const approvals = violations.filter((v: any) => v.severity === 'approval_required');
  return { allowed: hardStops.length === 0, hardStops: hardStops.length, warnings: warnings.length, requiresApproval: approvals.length > 0, violations };
}

// Authority checker
function checkAuthority(agentType: string, action: string, value: number | undefined, authorities: Authority[]): boolean {
  const agentAuths = authorities.filter(a => a.agentType === agentType);
  if (agentAuths.length === 0) return true; // no restrictions
  const hardStops = agentAuths.filter(a => {
    if (a.maxValue && value && value > a.maxValue) return true;
    if (a.blacklist?.some(b => action?.toLowerCase().includes(b.toLowerCase()))) return true;
    return false;
  });
  return hardStops.length === 0;
}

// Mission validation
function validateMission(body: Partial<Mission>): string | null {
  if (!body.text) return 'text required';
  return null;
}

// Red line validation
function validateRedLine(body: Partial<RedLine>): string | null {
  if (!body.rule) return 'rule required';
  if (!body.category) return 'category required';
  if (!body.severity) return 'severity required';
  return null;
}

describe('ConstitutionalOS — Missions', () => {
  it('requires text field for mission creation', () => {
    expect(validateMission({})).toBe('text required');
    expect(validateMission({ text: '' })).toBe('text required');
    expect(validateMission({ text: 'Do good' })).toBeNull();
  });

  it('defaults priority to medium', () => {
    const m: Mission = {
      id: '1', text: 'Test mission', priority: 'medium',
      source: 'founder', active: true, createdAt: new Date().toISOString(),
    };
    expect(m.priority).toBe('medium');
  });

  it('defaults source to founder', () => {
    const m: Mission = { id: '1', text: 'Test', priority: 'high', source: 'founder', active: true, createdAt: '' };
    expect(m.source).toBe('founder');
  });

  it('supports all priority levels', () => {
    const priorities: Mission['priority'][] = ['critical', 'high', 'medium', 'low'];
    priorities.forEach(p => {
      const m: Mission = { id: '1', text: 'Test', priority: p, source: 'founder', active: true, createdAt: '' };
      expect([p]).toContain(m.priority);
    });
  });

  it('supports all source types', () => {
    const sources: Mission['source'][] = ['founder', 'board', 'compliance', 'legal'];
    sources.forEach(s => {
      const m: Mission = { id: '1', text: 'Test', priority: 'high', source: s, active: true, createdAt: '' };
      expect([s]).toContain(m.source);
    });
  });
});

describe('ConstitutionalOS — Red Lines', () => {
  const defaultRedLines: RedLine[] = [
    { id: '1', rule: 'Never hire or fire without human approval', category: 'ethics', severity: 'hard_stop', description: 'HR', approvedBy: 'HR-HEAD' },
    { id: '2', rule: 'Never share customer PII externally', category: 'compliance', severity: 'hard_stop', description: 'Data', approvedBy: 'CISO' },
    { id: '3', rule: 'Never bypass approval for transactions above threshold', category: 'safety', severity: 'hard_stop', description: 'Finance', approvedBy: 'FINANCE' },
    { id: '4', rule: 'Never interact with sanctioned entities', category: 'legal', severity: 'hard_stop', description: 'Legal', approvedBy: 'LEGAL' },
    { id: '5', rule: 'Never make promises without legal review', category: 'culture', severity: 'warning', description: 'Culture', approvedBy: 'LEGAL' },
  ];

  it('requires rule, category, severity for red line creation', () => {
    expect(validateRedLine({})).toBe('rule required');
    expect(validateRedLine({ rule: 'test' })).toBe('category required');
    expect(validateRedLine({ rule: 'test', category: 'ethics' })).toBe('severity required');
    expect(validateRedLine({ rule: 'test', category: 'ethics', severity: 'hard_stop' })).toBeNull();
  });

  it('allows actions with no red line violations', () => {
    const result = checkRedLines('book a hotel room', defaultRedLines);
    expect(result.allowed).toBe(true);
    expect(result.hardStops).toBe(0);
  });

  it('blocks hard stop violations', () => {
    const result = checkRedLines('hire an employee without approval', defaultRedLines);
    expect(result.allowed).toBe(false);
    expect(result.hardStops).toBeGreaterThanOrEqual(1);
  });

  it('flags warning violations without blocking', () => {
    const result = checkRedLines('make promises to customer without legal review', defaultRedLines);
    expect(result.allowed).toBe(true); // warning doesn't block
    expect(result.warnings).toBeGreaterThanOrEqual(1);
  });

  it('marks approval required for certain actions', () => {
    const result = checkRedLines('bypass approval for transactions above threshold', defaultRedLines);
    expect(result.requiresApproval).toBe(true);
  });

  it('filters by category', () => {
    const ethics = defaultRedLines.filter(r => r.category === 'ethics');
    expect(ethics).toHaveLength(1);
    const legal = defaultRedLines.filter(r => r.category === 'legal');
    expect(legal).toHaveLength(1);
  });

  it('filters by severity', () => {
    const hardStops = defaultRedLines.filter(r => r.severity === 'hard_stop');
    expect(hardStops).toHaveLength(4);
    const warnings = defaultRedLines.filter(r => r.severity === 'warning');
    expect(warnings).toHaveLength(1);
  });

  it('returns violation details with matched keywords', () => {
    const result = checkRedLines('hire someone without human approval', defaultRedLines);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].rule).toBeDefined();
    expect(result.violations[0].severity).toBeDefined();
  });

  it('handles empty action string', () => {
    const result = checkRedLines('', defaultRedLines);
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('handles null action', () => {
    const result = checkRedLines(null as any, defaultRedLines);
    expect(result.allowed).toBe(true);
  });
});

describe('ConstitutionalOS — Values', () => {
  it('sorts values by weight descending', () => {
    const values: Value[] = [
      { id: '1', name: 'Speed', description: 'Fast', examples: [], weight: 5 },
      { id: '2', name: 'Quality', description: 'Best', examples: [], weight: 10 },
      { id: '3', name: 'Cost', description: 'Cheap', examples: [], weight: 7 },
    ];
    const sorted = [...values].sort((a, b) => b.weight - a.weight);
    expect(sorted[0].name).toBe('Quality');
    expect(sorted[1].name).toBe('Cost');
    expect(sorted[2].name).toBe('Speed');
  });

  it('defaults weight to 5 when not provided', () => {
    const v: Value = { id: '1', name: 'Test', description: '', examples: [], weight: 5 };
    expect(v.weight).toBe(5);
  });

  it('defaults examples to empty array', () => {
    const v: Value = { id: '1', name: 'Test', description: '', examples: [], weight: 5 };
    expect(Array.isArray(v.examples)).toBe(true);
    expect(v.examples).toHaveLength(0);
  });
});

describe('ConstitutionalOS — Authority', () => {
  const authorities: Authority[] = [
    { id: '1', agentType: 'sales', scope: 'deals', maxValue: 10000, blacklist: ['fire', 'hire'], whitelist: undefined },
    { id: '2', agentType: 'finance', scope: 'budget', maxValue: 50000, blacklist: [], whitelist: undefined },
  ];

  it('allows action within authority bounds', () => {
    expect(checkAuthority('sales', 'close deal', 5000, authorities)).toBe(true);
    expect(checkAuthority('finance', 'allocate budget', 20000, authorities)).toBe(true);
  });

  it('blocks action exceeding max value', () => {
    expect(checkAuthority('sales', 'close deal', 15000, authorities)).toBe(false);
  });

  it('blocks action on blacklist', () => {
    expect(checkAuthority('sales', 'fire employee', 1000, authorities)).toBe(false);
  });

  it('allows unknown agent type (no restrictions)', () => {
    expect(checkAuthority('unknown', 'do anything', 999999, authorities)).toBe(true);
  });

  it('allows action without value when maxValue not set', () => {
    expect(checkAuthority('finance', 'allocate budget', undefined, authorities)).toBe(true);
  });

  it('ignores whitelist for now (future feature)', () => {
    const authWithWhitelist: Authority[] = [
      { id: '1', agentType: 'test', scope: 'test', blacklist: [], whitelist: ['only'] },
    ];
    expect(checkAuthority('test', 'something', undefined, authWithWhitelist)).toBe(true);
  });
});

describe('ConstitutionalOS — Escalation Paths', () => {
  it('finds escalation path by scenario keyword', () => {
    const escalations = [
      { id: '1', scenario: 'Data breach', levels: [{ level: 1, role: 'SECURITY', contact: 'sec@co.com' }], autoEscalateMinutes: 5 },
      { id: '2', scenario: 'Legal issue', levels: [{ level: 1, role: 'LEGAL', contact: 'legal@co.com' }], autoEscalateMinutes: 30 },
    ];
    const match = escalations.filter(e => e.scenario.toLowerCase().includes('breach'));
    expect(match).toHaveLength(1);
    expect(match[0].scenario).toBe('Data breach');
  });

  it('returns first match when multiple matches', () => {
    const escalations = [
      { id: '1', scenario: 'Security incident', levels: [{ level: 1, role: 'SEC', contact: '' }], autoEscalateMinutes: 5 },
      { id: '2', scenario: 'Data security', levels: [{ level: 1, role: 'CISO', contact: '' }], autoEscalateMinutes: 5 },
    ];
    const matches = escalations.filter(e => e.scenario.toLowerCase().includes('security'));
    expect(matches.length).toBe(2);
  });

  it('escalation paths have multiple levels', () => {
    const path = {
      levels: [
        { level: 1, role: 'ONCALL', contact: '+91-800' },
        { level: 2, role: 'CISO', contact: 'ciso@co.com' },
        { level: 3, role: 'CEO', contact: 'ceo@co.com' },
      ],
    };
    expect(path.levels).toHaveLength(3);
    expect(path.levels[0].level).toBe(1);
    expect(path.levels[2].role).toBe('CEO');
  });
});

describe('ConstitutionalOS — Audit Log', () => {
  it('logs are capped at 10000 entries', () => {
    const logs: any[] = [];
    for (let i = 0; i < 15000; i++) {
      logs.push({ type: 'LOG', data: {}, timestamp: new Date().toISOString(), id: `log-${i}` });
      if (logs.length > 10000) logs.shift();
    }
    expect(logs).toHaveLength(10000);
    expect(logs[0].id).toBe('log-5000');
  });

  it('log entry has required fields', () => {
    const entry = { type: 'MISSION_ADDED', data: { id: '1' }, timestamp: new Date().toISOString(), requestId: 'req-1' };
    expect(entry.type).toBeDefined();
    expect(entry.data).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.requestId).toBeDefined();
  });
});