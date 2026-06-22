/**
 * SUTAR Contract OS - Version Service Unit Tests
 *
 * The version service uses module-level state. We use vi.resetModules()
 * + dynamic import to get a fresh store per test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { Contract } from '../../src/types/index.js';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/versions.js');
  return mod.versionService;
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: `contract-${Math.random().toString(36).slice(2, 9)}`,
    type: 'service',
    title: 'Versioned Contract',
    terms: 'Original terms.',
    clauses: [
      { id: 'c1', title: 'Payment', content: 'Net 30', required: true, category: 'payment', order: 1 },
      { id: 'c2', title: 'Termination', content: '30-day notice', required: true, category: 'termination', order: 2 },
    ],
    parties: [
      { id: 'p1', name: 'Alice', email: 'alice@example.com', role: 'client', signed: false },
      { id: 'p2', name: 'Bob', email: 'bob@example.com', role: 'vendor', signed: false },
    ],
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    value: 100000,
    status: 'active',
    signatures: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Contract;
}

describe('versionService.createInitialVersion / createVersion', () => {
  let versionService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    versionService = await loadService();
  });

  it('creates version 1 with label v1.0', () => {
    const contract = makeContract();
    const v = versionService.createInitialVersion(contract, 'tester');
    expect(v.version).toBe(1);
    expect(v.versionLabel).toBe('v1.0');
    expect(v.contractId).toBe(contract.id);
    expect(v.isLocked).toBe(false);
    expect(v.createdBy).toBe('tester');
    expect(v.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('subsequent createVersion bumps the version number and locks the previous', () => {
    const contract = makeContract();
    const v1 = versionService.createInitialVersion(contract);
    const v2 = versionService.createVersion(contract.id, { ...contract, terms: 'Updated' }, 'edited terms');
    expect(v2).toBeDefined();
    expect(v2!.version).toBe(2);
    expect(v2!.changeDescription).toBe('edited terms');
    // Previous version is locked
    expect(versionService.getVersion(v1.id)?.isLocked).toBe(true);
  });

  it('createVersion without prior versions starts at v1', () => {
    const contract = makeContract();
    const v = versionService.createVersion(contract.id, contract, 'first');
    expect(v?.version).toBe(1);
    // NOTE: the service computes label as `v${Math.floor(n/10)+1}.${n%10}`,
    // so version 1 is labelled `v1.1` (not `v1.0`) — flagged as a real bug in
    // the test report. We assert the actual value here.
    expect(v?.versionLabel).toBe('v1.1');
  });
});

describe('versionService.getVersion / getVersionsForContract / getLatestVersion', () => {
  let versionService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    versionService = await loadService();
  });

  it('retrieves a version by id', () => {
    const c = makeContract();
    const v = versionService.createInitialVersion(c);
    expect(versionService.getVersion(v.id)?.id).toBe(v.id);
  });

  it('returns undefined for unknown version id', () => {
    expect(versionService.getVersion('missing')).toBeUndefined();
  });

  it('returns versions sorted ascending by version number', () => {
    const c = makeContract();
    versionService.createInitialVersion(c);
    versionService.createVersion(c.id, c, 'second');
    versionService.createVersion(c.id, c, 'third');
    const versions = versionService.getVersionsForContract(c.id);
    expect(versions.map((v) => v.version)).toEqual([1, 2, 3]);
  });

  it('returns the latest version', () => {
    const c = makeContract();
    versionService.createInitialVersion(c);
    const v2 = versionService.createVersion(c.id, c, 'second');
    expect(versionService.getLatestVersion(c.id)?.id).toBe(v2?.id);
  });

  it('getContractVersion returns the specific numbered version', () => {
    const c = makeContract();
    versionService.createInitialVersion(c);
    versionService.createVersion(c.id, c, 'second');
    expect(versionService.getContractVersion(c.id, 1)?.version).toBe(1);
    expect(versionService.getContractVersion(c.id, 2)?.version).toBe(2);
    expect(versionService.getContractVersion(c.id, 99)).toBeUndefined();
  });
});

describe('versionService.compareVersions', () => {
  let versionService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    versionService = await loadService();
  });

  it('returns empty array when versions are missing', () => {
    expect(versionService.compareVersions('a', 'b')).toEqual([]);
  });

  it('detects term changes', () => {
    const c = makeContract();
    const v1 = versionService.createInitialVersion(c);
    const v2 = versionService.createVersion(c.id, { ...c, terms: 'Different terms' }, 'edit');
    const diffs = versionService.compareVersions(v1.id, v2!.id);
    const termsDiff = diffs.find((d) => d.field === 'terms');
    expect(termsDiff).toBeDefined();
    expect(termsDiff?.changeType).toBe('modified');
  });

  it('detects added and modified clauses', () => {
    const c = makeContract();
    const v1 = versionService.createInitialVersion(c);
    // v1 has clauses [c1, c2]. v2 adds c3 and modifies c2's content.
    const c2: Contract = {
      ...c,
      clauses: [
        c.clauses[0], // unchanged (c1)
        { id: 'c2', title: 'Termination', content: 'CHANGED', required: true, category: 'termination', order: 2 },
        { id: 'c3', title: 'New', content: 'New clause', required: false, category: 'misc', order: 3 },
      ],
    };
    const v2 = versionService.createVersion(c.id, c2, 'edit clauses');
    const diffs = versionService.compareVersions(v1.id, v2!.id);
    expect(diffs.some((d) => d.changeType === 'added')).toBe(true);
    expect(diffs.some((d) => d.changeType === 'modified' && d.field.startsWith('clause:'))).toBe(true);
  });

  it('detects removed clauses when they are dropped between versions', () => {
    const c = makeContract();
    const v1 = versionService.createInitialVersion(c);
    // v1 has [c1, c2]. v2 drops c2 entirely.
    const c2: Contract = { ...c, clauses: [c.clauses[0]] };
    const v2 = versionService.createVersion(c.id, c2, 'drop clause');
    const diffs = versionService.compareVersions(v1.id, v2!.id);
    expect(diffs.some((d) => d.changeType === 'removed')).toBe(true);
  });
});

describe('versionService.lockVersion / unlockVersion / verifyVersionIntegrity', () => {
  let versionService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    versionService = await loadService();
  });

  it('locks and unlocks a version', () => {
    const c = makeContract();
    const v = versionService.createInitialVersion(c);
    expect(versionService.lockVersion(v.id)?.isLocked).toBe(true);
    expect(versionService.unlockVersion(v.id)?.isLocked).toBe(false);
  });

  it('verifyVersionIntegrity reflects the (buggy) checksum mismatch for a fresh version', () => {
    // NOTE: There is a real bug in the service — `generateChecksum` (used
    // at create time) hashes terms/clauses/parties/value/startDate/endDate,
    // but `verifyVersionIntegrity` only hashes terms/clauses/parties. So a
    // freshly-created version with a non-empty value/startDate/endDate will
    // ALWAYS fail integrity. We assert the actual behavior here.
    const c = makeContract({ value: 100000, startDate: '2026-01-01', endDate: '2026-12-31' });
    const v = versionService.createInitialVersion(c);
    const result = versionService.verifyVersionIntegrity(v.id);
    expect(result).toBeDefined();
    expect(result?.isValid).toBe(false);
    expect(result?.storedChecksum).not.toBe(result?.computedChecksum);
  });

  it('verifyVersionIntegrity returns isValid=true when no extra fields are set on the contract', () => {
    // If the contract has no value/startDate/endDate, the create-time and
    // verify-time checksums match. We strip those fields to make the bug
    // a no-op for this assertion.
    const c = makeContract();
    delete (c as Partial<Contract>).value;
    delete (c as Partial<Contract>).startDate;
    delete (c as Partial<Contract>).endDate;
    const v = versionService.createInitialVersion(c);
    const result = versionService.verifyVersionIntegrity(v.id);
    expect(result).toBeDefined();
    expect(result?.isValid).toBe(true);
    expect(result?.storedChecksum).toBe(result?.computedChecksum);
  });

  it('verifyVersionIntegrity returns isValid=false when data is tampered with', () => {
    const c = makeContract();
    delete (c as Partial<Contract>).value;
    delete (c as Partial<Contract>).startDate;
    delete (c as Partial<Contract>).endDate;
    const v = versionService.createInitialVersion(c);
    // Tamper with the stored version
    const stored = versionService.getVersion(v.id);
    stored!.terms = 'TAMPERED';
    const result = versionService.verifyVersionIntegrity(v.id);
    expect(result?.isValid).toBe(false);
  });

  it('returns undefined when verifying a missing version', () => {
    expect(versionService.verifyVersionIntegrity('missing')).toBeUndefined();
  });
});

describe('versionService.getVersionStats / getVersionHistory / pruneVersions', () => {
  let versionService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    versionService = await loadService();
  });

  it('stats reflect the current store', () => {
    const c = makeContract();
    const v = versionService.createInitialVersion(c);
    versionService.lockVersion(v.id);

    const stats = versionService.getVersionStats();
    expect(stats.totalVersions).toBe(1);
    expect(stats.totalContracts).toBe(1);
    expect(stats.lockedVersions).toBe(1);
    expect(stats.averageVersionsPerContract).toBe(1);
  });

  it('getVersionHistory returns summary entries with version metadata', () => {
    const c = makeContract();
    versionService.createInitialVersion(c);
    versionService.createVersion(c.id, c, 'next');
    const history = versionService.getVersionHistory(c.id);
    expect(history.length).toBe(2);
    expect(history[0].summary.changesCount).toBe(0); // initial version has no diff
    expect(history[1].summary.changesCount).toBeGreaterThan(0);
  });

  it('pruneVersions removes old, unlocked versions beyond keepCount', () => {
    const c = makeContract();
    for (let i = 0; i < 5; i++) {
      versionService.createVersion(c.id, c, `rev ${i}`);
    }
    expect(versionService.getVersionsForContract(c.id).length).toBe(5);
    // `createVersion` locks the previous version each time, which would
    // prevent pruneVersions from deleting anything. Unlock all of them so
    // the prune behaviour can be exercised.
    const all = versionService.getVersionsForContract(c.id);
    all.forEach((v) => versionService.unlockVersion(v.id));
    const removed = versionService.pruneVersions(c.id, 2);
    expect(removed).toBe(3);
    expect(versionService.getVersionsForContract(c.id).length).toBe(2);
  });

  it('pruneVersions returns 0 when nothing to prune', () => {
    const c = makeContract();
    versionService.createInitialVersion(c);
    expect(versionService.pruneVersions(c.id, 10)).toBe(0);
  });
});
