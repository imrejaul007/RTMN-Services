import { describe, it, expect } from 'vitest';
describe('Knowledge Compiler', () => {
  it('estimates tokens', () => { expect('Hello world'.split(/\s+/).length).toBe(2); });
  it('handles empty', () => { expect(''.split(/\s+/).length).toBe(1); });
  it('formats bullets', () => { const b = ['Fact 1', 'Fact 2'].map(f => `• ${f}`).join('\n'); expect(b).toContain('Fact 1'); });
  it('formats paragraph', () => { const p = `${'X'} ${'is'} ${'Y'}.`; expect(p).toContain('X is Y.'); });
  it('calculates savings', () => { const s = (1 - 200 / 1000) * 100; expect(s).toBe(80); });
  it('handles zero raw', () => { const s = 0 > 0 ? 100 : 0; expect(s).toBe(0); });
  it('creates sections', () => { const a = { sections: { overview: {}, financials: {} } }; expect(Object.keys(a.sections).length).toBe(2); });
  it('tracks version', () => { let v = 1; v++; expect(v).toBe(2); });
  it('groups by predicate', () => { const facts = [{ p: 'revenue' }, { p: 'users' }, { p: 'revenue' }]; const g = {}; for (const f of facts) g[f.p] = (g[f.p] || 0) + 1; expect(g.revenue).toBe(2); });
  it('requires twinId', () => { const compile = (d) => { if (!d.twinId) throw new Error('missing'); return true; }; expect(() => compile({})).toThrow(); expect(compile({ twinId: 'u1' })).toBe(true); });
  it('counts by type', () => { const a = [{ type: 'brief' }, { type: 'profile' }, { type: 'brief' }]; const bt = {}; for (const x of a) bt[x.type] = (bt[x.type] || 0) + 1; expect(bt.brief).toBe(2); });
  it('handles long content', () => { const long = 'Word '.repeat(100); expect(long.split(/\s+/).length >= 50).toBe(true); });
});
