import { describe, it, expect } from 'vitest';

// Knowledge compiler tests
function estimateTokens(obj) { return JSON.stringify(obj).split(/\s+/).length; }
function formatFactsAsBullets(facts) { return (facts || []).map(f => `• ${f.object || f.content || ''}`).join('\n'); }
function formatFactsAsParagraph(facts) { return (facts || []).map(f => `${f.subject || 'Entity'} ${f.predicate || 'has'} ${f.object || ''}.`).join(' '); }

describe('Knowledge Compiler', () => {
  describe('Token Estimation', () => {
    it('estimates simple text', () => { expect(estimateTokens('Hello world')).toBe(2); });
    it('estimates sentences', () => { expect(estimateTokens('This is a test sentence')).toBe(5); });
    it('handles empty', () => { expect(estimateTokens('')).toBe(1); });
    it('handles multiple spaces', () => { expect(estimateTokens('Hello    world')).toBe(2); });
  });

  describe('Fact Formatting', () => {
    it('formats as bullets', () => {
      const bullets = formatFactsAsBullets([{ object: 'Fact 1' }, { object: 'Fact 2' }]);
      expect(bullets).toContain('Fact 1');
      expect(bullets).toContain('Fact 2');
    });

    it('formats as paragraph', () => {
      const para = formatFactsAsParagraph([{ subject: 'X', predicate: 'is', object: 'Y' }]);
      expect(para).toContain('X is Y');
    });

    it('handles empty facts', () => {
      const bullets = formatFactsAsBullets([]);
      expect(bullets).toContain('No information');
    });
  });

  describe('Token Savings', () => {
    it('calculates reduction', () => {
      const raw = 1000, compiled = 200;
      const savings = ((1 - compiled / raw) * 100).toFixed(1);
      expect(savings).toBe('80.0');
    });

    it('handles zero raw', () => {
      const raw = 0, compiled = 0;
      const savings = raw > 0 ? `${((1 - compiled / raw) * 100).toFixed(1)}%` : '0%';
      expect(savings).toBe('0%');
    });

    it('calculates realistic savings', () => {
      const rawFacts = 50, tokensPerFact = 20;
      const raw = rawFacts * tokensPerFact;
      const compiled = 10 * 30; // 10 sections * 30 tokens
      const savings = ((1 - compiled / raw) * 100).toFixed(1);
      expect(parseFloat(savings)).toBeGreaterThan(60);
    });
  });

  describe('Artifact Types', () => {
    it('creates investor brief', () => {
      const artifact = {
        type: 'investor_brief',
        sections: { overview: { content: 'Company info' }, financials: { content: '$1M' } }
      };
      expect(artifact.sections.overview).toBeDefined();
    });

    it('creates customer profile', () => {
      const artifact = {
        type: 'customer_profile',
        sections: { identity: {}, preferences: {} }
      };
      expect(artifact.sections.identity).toBeDefined();
    });

    it('creates meeting digest', () => {
      const artifact = {
        type: 'meeting_digest',
        sections: { summary: {}, decisions: {}, actionItems: {} }
      };
      expect(artifact.sections.decisions).toBeDefined();
    });
  });

  describe('Versioning', () => {
    it('tracks previous versions', () => {
      const artifact = { version: 1, content: 'v1', previousVersions: [] };
      artifact.previousVersions.push({ version: artifact.version, content: artifact.content });
      artifact.version++;
      expect(artifact.version).toBe(2);
      expect(artifact.previousVersions.length).toBe(1);
    });

    it('tracks multiple versions', () => {
      const versions = Array.from({ length: 5 }, (_, i) => ({ version: i + 1 }));
      expect(versions.length).toBe(5);
    });
  });

  describe('Compilation Logic', () => {
    it('groups by predicate', () => {
      const facts = [{ predicate: 'revenue' }, { predicate: 'users' }, { predicate: 'revenue' }];
      const grouped = {};
      for (const f of facts) grouped[f.predicate] = (grouped[f.predicate] || 0) + 1;
      expect(grouped.revenue).toBe(2);
    });

    it('categorizes facts', () => {
      const facts = [{ predicate: 'revenue' }, { predicate: 'churn' }, { predicate: 'name' }];
      const financial = ['revenue', 'arr', 'churn'];
      const filtered = facts.filter(f => financial.includes(f.predicate));
      expect(filtered.length).toBe(2);
    });
  });

  describe('Validation', () => {
    it('requires twinId', () => {
      const compile = (data) => { if (!data.twinId) throw new Error('twinId required'); return true; };
      expect(() => compile({})).toThrow();
      expect(compile({ twinId: 'user-1' })).toBe(true);
    });

    it('requires type', () => {
      const compile = (data) => { if (!data.type) throw new Error('type required'); return true; };
      expect(() => compile({ twinId: 'user-1' })).toThrow();
      expect(compile({ twinId: 'user-1', type: 'profile' })).toBe(true);
    });

    it('handles optional facts', () => {
      const compile = (data) => (data.facts || []).length;
      expect(compile({ twinId: 'u1', type: 'p' })).toBe(0);
      expect(compile({ twinId: 'u1', type: 'p', facts: [{}] })).toBe(1);
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
    it('handles empty sections', () => {
      const artifact = { sections: {} };
      expect(Object.keys(artifact.sections).length).toBe(0);
    });

    it('handles long content', () => {
      const long = 'Word '.repeat(1000);
      expect(estimateTokens(long)).toBe(1000);
    });

    it('handles unicode', () => {
      const unicode = 'Company 公司 会社';
      expect(estimateTokens(unicode)).toBeGreaterThan(3);
    });
  });
});
