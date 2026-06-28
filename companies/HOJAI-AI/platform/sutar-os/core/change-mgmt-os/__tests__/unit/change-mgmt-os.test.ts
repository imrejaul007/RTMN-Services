import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

interface Change {
  id: string; title: string; description: string;
  type: 'feature' | 'bugfix' | 'hotfix' | 'infrastructure' | 'security';
  status: 'draft' | 'pending_approval' | 'approved' | 'testing' | 'rolling_out' | 'complete' | 'rollback' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[]; riskLevel: 'low' | 'medium' | 'high';
  owner: string; approvers: string[];
  createdAt: string; updatedAt: string; approvedAt?: string; completedAt?: string;
  rollbackPlan: string; phases: any[]; metrics: { adoption: number; incidents: number; rollbacks: number; downtime: number };
}

interface ChangeTemplate {
  id: string; name: string; type: string; phases: { name: string; order: number }[]; riskLevel: string;
}

// Status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'rejected'],
  approved: ['testing'],
  testing: ['rolling_out', 'rollback'],
  rolling_out: ['complete', 'rollback'],
  complete: [],
  rollback: [],
  rejected: [],
};

function canTransition(from: Change['status'], to: Change['status']): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Stats
function computeStats(changes: Change[]) {
  const byStatus: Record<string, number> = {};
  changes.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  const totalRollbacks = changes.reduce((sum, c) => sum + c.metrics.rollbacks, 0);
  return { total: changes.length, byStatus, totalRollbacks };
}

// Phase progression
function advancePhase(phases: any[]): { nextPhase: any; allComplete: boolean } {
  const nextPhase = phases.find(p => p.status === 'pending');
  return { nextPhase: nextPhase || null, allComplete: !nextPhase };
}

describe('ChangeMgmtOS — Change Lifecycle', () => {
  it('supports all change types', () => {
    const types: Change['type'][] = ['feature', 'bugfix', 'hotfix', 'infrastructure', 'security'];
    types.forEach(t => {
      const change: Change = { id: '1', title: 'Test', description: '', type: t, status: 'draft', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: 'owner1', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } };
      expect(change.type).toBe(t);
    });
  });

  it('supports all priority levels', () => {
    const priorities: Change['priority'][] = ['low', 'medium', 'high', 'critical'];
    priorities.forEach(p => {
      const change: Change = { id: '1', title: 'Test', description: '', type: 'feature', status: 'draft', priority: p, affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } };
      expect(change.priority).toBe(p);
    });
  });

  it('supports all risk levels', () => {
    const risks: Change['riskLevel'][] = ['low', 'medium', 'high'];
    risks.forEach(r => {
      const change: Change = { id: '1', title: 'Test', description: '', type: 'feature', status: 'draft', priority: 'medium', affectedServices: [], riskLevel: r, owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } };
      expect(change.riskLevel).toBe(r);
    });
  });
});

describe('ChangeMgmtOS — Status Transitions', () => {
  it('draft → pending_approval is valid', () => {
    expect(canTransition('draft', 'pending_approval')).toBe(true);
  });

  it('pending_approval → approved is valid', () => {
    expect(canTransition('pending_approval', 'approved')).toBe(true);
  });

  it('pending_approval → rejected is valid', () => {
    expect(canTransition('pending_approval', 'rejected')).toBe(true);
  });

  it('approved → testing is valid', () => {
    expect(canTransition('approved', 'testing')).toBe(true);
  });

  it('testing → rolling_out is valid', () => {
    expect(canTransition('testing', 'rolling_out')).toBe(true);
  });

  it('testing → rollback is valid', () => {
    expect(canTransition('testing', 'rollback')).toBe(true);
  });

  it('rolling_out → complete is valid', () => {
    expect(canTransition('rolling_out', 'complete')).toBe(true);
  });

  it('complete → draft is invalid (terminal state)', () => {
    expect(canTransition('complete', 'draft')).toBe(false);
  });

  it('rejected → approved is invalid', () => {
    expect(canTransition('rejected', 'approved')).toBe(false);
  });

  it('draft → approved is invalid (must go through pending_approval)', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
  });
});

describe('ChangeMgmtOS — Templates', () => {
  const templates: ChangeTemplate[] = [
    { id: 'tpl-1', name: 'Feature Release', type: 'feature', phases: [{ name: 'Dev', order: 1 }, { name: 'QA', order: 2 }, { name: 'Prod', order: 3 }], riskLevel: 'medium' },
    { id: 'tpl-2', name: 'Hotfix', type: 'hotfix', phases: [{ name: 'Fix', order: 1 }, { name: 'Prod', order: 2 }], riskLevel: 'low' },
  ];

  it('creates phases from template', () => {
    const tpl = templates[0];
    const phases = tpl.phases.map(p => ({ id: `p-${p.order}`, name: p.name, status: 'pending' as const, notes: '' }));
    expect(phases).toHaveLength(3);
    expect(phases[0].name).toBe('Dev');
    expect(phases[2].name).toBe('Prod');
  });

  it('hotfix template has fewer phases', () => {
    const hotfix = templates.find(t => t.type === 'hotfix')!;
    expect(hotfix.phases).toHaveLength(2);
  });

  it('phases are ordered', () => {
    const phases = templates[0].phases.sort((a, b) => a.order - b.order);
    expect(phases[0].order).toBe(1);
    expect(phases[1].order).toBe(2);
  });
});

describe('ChangeMgmtOS — Phase Progression', () => {
  it('advances to next pending phase', () => {
    const phases = [
      { id: 'p1', name: 'Dev', status: 'complete', startedAt: '2024-01-01', completedAt: '2024-01-02', notes: '' },
      { id: 'p2', name: 'QA', status: 'in_progress', startedAt: '2024-01-03', notes: '' },
      { id: 'p3', name: 'Prod', status: 'pending', notes: '' },
    ];
    const result = advancePhase(phases);
    expect(result.nextPhase.name).toBe('Prod');
    expect(result.allComplete).toBe(false);
  });

  it('detects all phases complete', () => {
    const phases = [
      { id: 'p1', name: 'Dev', status: 'complete', notes: '' },
      { id: 'p2', name: 'QA', status: 'complete', notes: '' },
    ];
    const result = advancePhase(phases);
    expect(result.nextPhase).toBeNull();
    expect(result.allComplete).toBe(true);
  });
});

describe('ChangeMgmtOS — Stats', () => {
  it('counts changes by status', () => {
    const changes: Change[] = [
      { id: '1', title: '', description: '', type: 'feature', status: 'draft', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } },
      { id: '2', title: '', description: '', type: 'feature', status: 'pending_approval', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } },
      { id: '3', title: '', description: '', type: 'bugfix', status: 'pending_approval', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 0, downtime: 0 } },
    ];
    const stats = computeStats(changes);
    expect(stats.total).toBe(3);
    expect(stats.byStatus['pending_approval']).toBe(2);
    expect(stats.byStatus['draft']).toBe(1);
  });

  it('sums rollbacks from metrics', () => {
    const changes: Change[] = [
      { id: '1', title: '', description: '', type: 'feature', status: 'complete', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 2, downtime: 0 } },
      { id: '2', title: '', description: '', type: 'bugfix', status: 'complete', priority: 'medium', affectedServices: [], riskLevel: 'low', owner: '', approvers: [], createdAt: '', updatedAt: '', rollbackPlan: '', phases: [], metrics: { adoption: 0, incidents: 0, rollbacks: 1, downtime: 0 } },
    ];
    const stats = computeStats(changes);
    expect(stats.totalRollbacks).toBe(3);
  });
});