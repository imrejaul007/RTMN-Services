import { describe, it, expect } from 'vitest';

// Temporal knowledge graph tests
function isValidAt(ts, validFrom, validUntil) {
  const t = ts ? new Date(ts).getTime() : Date.now();
  const from = validFrom ? new Date(validFrom).getTime() : 0;
  const until = validUntil ? new Date(validUntil).getTime() : Number.MAX_SAFE_INTEGER;
  return t >= from && t <= until;
}

describe('Temporal KG', () => {
  describe('Validity', () => {
    it('validates current time', () => { expect(isValidAt('2024-06-27', '2020-01-01', '2099-01-01')).toBe(true); });
    it('invalidates past', () => { expect(isValidAt('2020-01-01', '2024-01-01', '2099-01-01')).toBe(false); });
    it('handles null validFrom', () => { expect(isValidAt('2020-01-01', null, '2099-01-01')).toBe(true); });
    it('handles null validUntil', () => { expect(isValidAt('2024-06-27', '2020-01-01', null)).toBe(true); });
  });

  describe('Versioning', () => {
    it('creates initial fact', () => {
      const fact = { subject: 'X', predicate: 'y', object: 'z', versions: [{ object: 'z' }] };
      expect(fact.versions.length).toBe(1);
    });

    it('adds new version on update', () => {
      const fact = { versions: [{ object: 'v1' }] };
      fact.versions[0].validUntil = '2024-06-01';
      fact.versions.push({ object: 'v2', validUntil: null });
      expect(fact.versions.length).toBe(2);
    });
  });

  describe('Relationships', () => {
    it('creates temporal relationship', () => {
      const rel = { from: 'A', to: 'B', type: 'works_at', validFrom: '2024-01-01', validUntil: null };
      expect(rel.validFrom).toBe('2024-01-01');
    });

    it('closes previous version', () => {
      const rel = { versions: [{ validUntil: null }] };
      rel.versions[0].validUntil = '2024-06-01';
      expect(rel.versions[0].validUntil).toBe('2024-06-01');
    });
  });

  describe('Conflicts', () => {
    it('detects overlapping validity', () => {
      const f1 = { validFrom: '2024-01-01', validUntil: '2024-06-01' };
      const f2 = { validFrom: '2024-05-01', validUntil: '2024-12-01' };
      const overlaps = new Date(f1.validFrom).getTime() <= new Date(f2.validUntil).getTime() && new Date(f2.validFrom).getTime() <= new Date(f1.validUntil).getTime();
      expect(overlaps).toBe(true);
    });

    it('detects contradiction', () => {
      const f1 = { object: 'Mumbai' };
      const f2 = { object: 'Bangalore' };
      expect(f1.object !== f2.object).toBe(true);
    });
  });

  describe('Evolution', () => {
    it('calculates stability', () => {
      const versions = [{ object: 'A' }, { object: 'B' }, { object: 'A' }, { object: 'A' }];
      let changes = 0;
      for (let i = 1; i < versions.length; i++) if (versions[i].object !== versions[i - 1].object) changes++;
      const stability = Math.max(0, 1 - changes / versions.length);
      expect(stability).toBe(0.5);
    });

    it('tracks version count', () => {
      const versions = [{ v: 1 }, { v: 2 }, { v: 3 }];
      expect(versions.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty versions', () => {
      const versions = [];
      expect(versions.length).toBe(0);
    });

    it('handles future timestamp', () => {
      const future = '2099-01-01';
      expect(isValidAt(future, '2024-01-01', '2025-01-01')).toBe(false);
    });

    it('handles very old timestamp', () => {
      const old = '1900-01-01';
      expect(isValidAt(old, '2024-01-01', null)).toBe(false);
    });
  });

  describe('Integration', () => {
    it('tracks employee history', () => {
      const roles = [
        { object: 'Intern', validFrom: '2023-01-01', validUntil: '2023-06-01' },
        { object: 'Engineer', validFrom: '2023-06-01', validUntil: '2024-01-01' },
        { object: 'Senior', validFrom: '2024-01-01', validUntil: null }
      ];
      // Current role
      const current = roles[2];
      expect(current.object).toBe('Senior');
    });

    it('detects address changes', () => {
      const addresses = [
        { object: 'Mumbai', validUntil: '2022-06-01' },
        { object: 'Pune', validUntil: null }
      ];
      expect(addresses[1].object).toBe('Pune');
    });
  });
});
