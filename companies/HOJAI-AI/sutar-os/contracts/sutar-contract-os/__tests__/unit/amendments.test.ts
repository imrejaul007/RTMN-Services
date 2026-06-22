/**
 * SUTAR Contract OS - Amendment Service Unit Tests
 *
 * The amendment service uses module-level state. We use vi.resetModules()
 * + dynamic import to get a fresh store per test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { Contract, AmendmentChange } from '../../src/types/index.js';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/amendments.js');
  return mod.amendmentService;
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: `contract-${Math.random().toString(36).slice(2, 9)}`,
    type: 'service',
    title: 'Amendable',
    terms: 'Original terms',
    clauses: [
      { id: 'c1', title: 'Payment', content: 'Net 30', required: true, category: 'payment', order: 1 },
    ],
    parties: [
      { id: 'p1', name: 'Alice', email: 'alice@example.com', role: 'client', signed: false },
    ],
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    value: 50000,
    status: 'active',
    signatures: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Contract;
}

describe('amendmentService.createAmendment', () => {
  let amendmentService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    amendmentService = await loadService();
  });

  it('creates an amendment with status "pending" and a version', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 'Change payment terms',
      description: 'Switch from Net 30 to Net 45',
      changes: [
        { field: 'terms', path: 'terms', oldValue: 'old', newValue: 'new', changeType: 'modified' },
      ],
      proposedBy: 'alice',
    });
    expect(a.id).toMatch(/^amendment-/);
    expect(a.contractId).toBe('c1');
    expect(a.status).toBe('pending');
    expect(a.proposedBy).toBe('alice');
    expect(a.version).toBeGreaterThanOrEqual(1);
  });

  it('numbers subsequent amendments incrementally per contract', () => {
    amendmentService.createAmendment('c1', {
      title: 'first', description: 'd', changes: [], proposedBy: 'a',
    });
    const second = amendmentService.createAmendment('c1', {
      title: 'second', description: 'd', changes: [], proposedBy: 'a',
    });
    const third = amendmentService.createAmendment('c1', {
      title: 'third', description: 'd', changes: [], proposedBy: 'a',
    });
    expect(second.version).toBe(third.version - 1);
    expect(third.version).toBeGreaterThan(second.version);
  });

  it('versions are independent per contract', () => {
    const a = amendmentService.createAmendment('cA', {
      title: 'a', description: 'd', changes: [], proposedBy: 'x',
    });
    const b = amendmentService.createAmendment('cB', {
      title: 'b', description: 'd', changes: [], proposedBy: 'x',
    });
    // Both should be the first version (1) on their respective contracts
    expect(a.version).toBe(1);
    expect(b.version).toBe(1);
  });
});

describe('amendmentService.approveAmendment / rejectAmendment', () => {
  let amendmentService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    amendmentService = await loadService();
  });

  it('approves a pending amendment', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    const approved = amendmentService.approveAmendment(a.id, 'reviewer');
    expect(approved?.status).toBe('approved');
    expect(approved?.reviewedBy).toBe('reviewer');
    expect(approved?.reviewedAt).toBeTruthy();
  });

  it('rejects a pending amendment with a reason', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    const rejected = amendmentService.rejectAmendment(a.id, 'reviewer', 'not justified');
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.reason).toBe('not justified');
  });

  it('cannot approve an already-approved amendment', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    amendmentService.approveAmendment(a.id, 'r1');
    const second = amendmentService.approveAmendment(a.id, 'r2');
    expect(second).toBeUndefined();
  });

  it('returns undefined for non-existent amendment ids', () => {
    expect(amendmentService.approveAmendment('nope', 'r')).toBeUndefined();
    expect(amendmentService.rejectAmendment('nope', 'r', 'why')).toBeUndefined();
  });
});

describe('amendmentService.applyAmendment', () => {
  let amendmentService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    amendmentService = await loadService();
  });

  it('applies an approved amendment to the contract (terms change)', async () => {
    const contract = makeContract();
    // Backdate createdAt/updatedAt so we can observe a real change.
    contract.createdAt = '2020-01-01T00:00:00.000Z';
    contract.updatedAt = '2020-01-01T00:00:00.000Z';
    const a = amendmentService.createAmendment(contract.id, {
      title: 'terms',
      description: 'd',
      changes: [
        { field: 'terms', path: 'terms', oldValue: contract.terms, newValue: 'New terms', changeType: 'modified' },
      ],
      proposedBy: 'p',
    });
    amendmentService.approveAmendment(a.id, 'r');
    // Snapshot the backdated updatedAt; applyAmendment mutates the contract
    // in place and returns the same object, so the assertion must compare
    // against the pre-call value, not against the contract after the call.
    const before = contract.updatedAt;
    // Wait at least 1 ms so the new ISO timestamp differs from `before`.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = amendmentService.applyAmendment(a.id, contract);
    expect(updated?.terms).toBe('New terms');
    expect(updated?.updatedAt).not.toBe(before);
    expect(updated?.updatedAt).toBe(contract.updatedAt); // same object
  });

  it('refuses to apply a pending (non-approved) amendment', () => {
    const contract = makeContract();
    const a = amendmentService.createAmendment(contract.id, {
      title: 't', description: 'd', changes: [
        { field: 'value', path: 'value', oldValue: 100, newValue: 200, changeType: 'modified' },
      ], proposedBy: 'p',
    });
    const updated = amendmentService.applyAmendment(a.id, contract);
    expect(updated).toBeUndefined();
  });

  it('applies a clause add / remove correctly', () => {
    const contract = makeContract();
    const newClause = { id: 'c2', title: 'Late Fee', content: '5%', required: false, category: 'payment', order: 2 };
    const a = amendmentService.createAmendment(contract.id, {
      title: 'add clause', description: 'd', changes: [
        { field: 'clause', path: 'c2', oldValue: null, newValue: newClause, changeType: 'added' },
      ], proposedBy: 'p',
    });
    amendmentService.approveAmendment(a.id, 'r');
    const updated = amendmentService.applyAmendment(a.id, contract);
    expect(updated?.clauses.length).toBe(2);
    expect(updated?.clauses.find((c) => c.id === 'c2')).toBeDefined();
  });

  it('returns undefined when amendment is missing', () => {
    const contract = makeContract();
    expect(amendmentService.applyAmendment('nope', contract)).toBeUndefined();
  });
});

describe('amendmentService.generateChanges', () => {
  let amendmentService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    amendmentService = await loadService();
  });

  it('detects modified terms / value / endDate', () => {
    const oldC = makeContract({ value: 100, endDate: '2026-12-31' });
    const newC = makeContract({ value: 200, endDate: '2027-06-30', terms: 'changed' });
    const changes = amendmentService.generateChanges(oldC, newC);
    const fields = changes.map((c) => c.field);
    expect(fields).toContain('value');
    expect(fields).toContain('endDate');
    expect(fields).toContain('terms');
  });

  it('detects added, removed, and modified clauses', () => {
    const oldC = makeContract({
      clauses: [
        { id: 'c1', title: 'A', content: 'a', required: true, category: 'x', order: 1 },
      ],
    });
    const newC = makeContract({
      clauses: [
        { id: 'c1', title: 'A', content: 'CHANGED', required: true, category: 'x', order: 1 },
        { id: 'c2', title: 'B', content: 'b', required: false, category: 'y', order: 2 },
      ],
    });
    const changes = amendmentService.generateChanges(oldC, newC);
    const clauseChanges = changes.filter((c) => c.field === 'clause');
    const types = clauseChanges.map((c) => c.changeType);
    expect(types).toContain('added');
    expect(types).toContain('modified');
  });
});

describe('amendmentService.quickAmend / cancelAmendment / getAmendmentStats', () => {
  let amendmentService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    amendmentService = await loadService();
  });

  it('quickAmend creates a single-change amendment', () => {
    const a = amendmentService.quickAmend('c1', 'value', 999, 'p', 'bump price');
    expect(a.title).toContain('value');
    expect(a.changes.length).toBe(1);
    expect(a.changes[0].field).toBe('value');
  });

  it('cancelAmendment marks a pending amendment as rejected', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    expect(amendmentService.cancelAmendment(a.id, 'me')).toBe(true);
    expect(amendmentService.getAmendment(a.id)?.status).toBe('rejected');
  });

  it('cancelAmendment returns false for missing or non-pending amendments', () => {
    expect(amendmentService.cancelAmendment('nope', 'me')).toBe(false);
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    amendmentService.approveAmendment(a.id, 'r');
    expect(amendmentService.cancelAmendment(a.id, 'me')).toBe(false);
  });

  it('stats reflect the current state', () => {
    const a = amendmentService.createAmendment('c1', {
      title: 't', description: 'd', changes: [], proposedBy: 'p',
    });
    amendmentService.approveAmendment(a.id, 'r');

    const stats = amendmentService.getAmendmentStats();
    expect(stats.totalAmendments).toBeGreaterThanOrEqual(1);
    expect(stats.approved).toBeGreaterThanOrEqual(1);
  });
});
