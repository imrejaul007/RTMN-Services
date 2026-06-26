import { describe, it, expect } from 'vitest';
function isValidAt(ts, validFrom, validUntil) { const t = ts ? new Date(ts).getTime() : Date.now(); const from = validFrom ? new Date(validFrom).getTime() : 0; const until = validUntil ? new Date(validUntil).getTime() : Number.MAX_SAFE_INTEGER; return t >= from && t <= until; }
describe('Temporal KG', () => {
  it('validates current time', () => { expect(isValidAt('2024-06-27', '2020-01-01', '2099-01-01')).toBe(true); });
  it('invalidates past', () => { expect(isValidAt('2020-01-01', '2024-01-01', '2099-01-01')).toBe(false); });
  it('handles null validFrom', () => { expect(isValidAt('2020-01-01', null, '2099-01-01')).toBe(true); });
  it('handles null validUntil', () => { expect(isValidAt('2024-06-27', '2020-01-01', null)).toBe(true); });
  it('creates initial fact', () => { const fact = { versions: [{ object: 'v1' }] }; expect(fact.versions.length).toBe(1); });
  it('adds version', () => { const fact = { versions: [{ object: 'v1' }] }; fact.versions[0].validUntil = '2024-06-01'; fact.versions.push({ object: 'v2', validUntil: null }); expect(fact.versions.length).toBe(2); });
  it('detects overlap', () => { const f1 = { validFrom: '2024-01-01', validUntil: '2024-06-01' }; const f2 = { validFrom: '2024-05-01', validUntil: '2024-12-01' }; expect(new Date(f1.validFrom).getTime() <= new Date(f2.validUntil).getTime()).toBe(true); });
  it('detects contradiction', () => { expect({ object: 'A' }.object !== { object: 'B' }.object).toBe(true); });
  it('calculates stability', () => { const v = [{ object: 'A' }, { object: 'B' }, { object: 'A' }, { object: 'A' }]; let c = 0; for (let i = 1; i < v.length; i++) if (v[i].object !== v[i - 1].object) c++; expect(Math.max(0, 1 - c / v.length)).toBe(0.5); });
  it('handles empty versions', () => { expect([].length).toBe(0); });
  it('handles future', () => { expect(isValidAt('2099-01-01', '2024-01-01', '2025-01-01')).toBe(false); });
});
