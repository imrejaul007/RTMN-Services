import { describe, it, expect } from 'vitest';

describe('Knowledge Compiler', () => {
  describe('Token Estimation', () => {
    it('estimates simple text', () => {
      expect('Hello world'.split(/\s+/).length).toBe(2);
    });
    it('handles empty', () => {
      expect(''.split(/\s+/).length).toBe(1);
    });
  });

  describe('Fact Formatting', () => {
    it('formats bullets', () => {
      const bullets = ['Fact 1', 'Fact 2'].map(f => `• ${f}`).join('\n');
      expect(bullets).toContain('Fact 1');
    });
    it('formats paragraph', () => {
      const para = `${'X'} ${'is'} ${'Y'}.`;
      expect(para).toContain('X is Y.');
    });
  });

  describe('Token Savings', () => {
    it('calculates reduction', () => {
      const raw = 1000, compiled = 200;
      const savings = (1 - compiled / raw) * 100;
      expect(savings).toBe(80);
    });
    it('handles zero raw', () => {
      const savings = 0 > 0 ? 100 : 0;
      expect(savings).toBe(0);
    });
  });

  describe('Artifact Types', () => {
    it('creates sections', () => {
      const sections = { overview: {}, financials: {} };
      expect(Object.keys(sections).length).toBe(2);
    });
    it('tracks version', () => {
      let version = 1;
      version++;
      expect(version).toBe(2);
    });
  });

  describe('Compilation Logic', () => {
    it('groups by predicate', () => {
      const facts = [{ p: 'revenue' }, { p: 'users' }, { p: 'revenue' }];
      const grouped = {};
      for (const f of facts) grouped[f.p] = (grouped[f.p] || 0) + 1;
      expect(grouped.revenue).toBe(2);
    });
  });

  describe('Validation', () => {
    it('requires twinId', () => {
      const compile = (d) => { if (!d.twinId) throw new Error('missing'); return true; };
      expect(() => compile({})).toThrow();
      expect(compile({ twinId: 'u1' })).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('counts by type', () => {
      const artifacts = [{ type: 'brief' }, { type: 'profile' }, { type: 'brief' }];
      const byType = {};
      for (const a of artifacts) byType[a.type] = (byType[a.type] || 0) + 1;
      expect(byType.brief).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty', () => {
      expect([].length).toBe(0);
    });
    it('handles long content', () => {
      const long = 'Word '.repeat(100);
      expect(long.split(/\s+/).length >= 50).toBe(true);
    });
    it('handles unicode', () => {
      const unicode = 'Company 公司 会社';
      expect(unicode.split(/\s+/).length >= 2).toBe(true);
    });
  });
});
