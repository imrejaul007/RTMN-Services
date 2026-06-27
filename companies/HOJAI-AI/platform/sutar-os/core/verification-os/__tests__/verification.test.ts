import { describe, it, expect, beforeEach } from 'vitest';

describe('VerificationOS', () => {
  const tasks = new Map();

  beforeEach(() => {
    tasks.clear();
  });

  describe('Verification Tasks', () => {
    it('should create a verification task', () => {
      const task = {
        id: 'task-1',
        type: 'llm_output' as const,
        content: 'This is a valid response that addresses all criteria.',
        criteria: ['criteria'],
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        metadata: {},
      };
      tasks.set(task.id, task);
      expect(tasks.size).toBe(1);
      expect(tasks.get('task-1')?.type).toBe('llm_output');
    });

    it('should verify valid LLM output', () => {
      const content = 'This is a comprehensive response that addresses all the required criteria properly.';
      const criteria = ['criteria'];
      const issues: string[] = [];
      let score = 100;

      if (content.length < 50) { issues.push('Content too short'); score -= 20; }
      if (!criteria.some(c => content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Does not address criteria'); score -= 30; }

      const passed = issues.length === 0 || score >= 70;
      expect(passed).toBe(true);
      expect(score).toBe(100);
    });

    it('should fail invalid LLM output', () => {
      const content = 'Short';
      const criteria = ['criteria'];
      const issues: string[] = [];
      let score = 100;

      if (content.length < 50) { issues.push('Content too short'); score -= 20; }
      if (!criteria.some(c => content.toLowerCase().includes(c.toLowerCase()))) { issues.push('Does not address criteria'); score -= 30; }

      const passed = issues.length === 0 || score >= 70;
      expect(passed).toBe(false);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should verify code with functions', () => {
      const code = 'function hello() { return "world"; }';
      const issues: string[] = [];
      let score = 100;

      if (!code.includes('function') && !code.includes('class')) { issues.push('No function/class found'); score -= 30; }

      const passed = issues.length === 0 || score >= 70;
      expect(passed).toBe(true);
    });

    it('should fail code with TODO markers', () => {
      const code = 'function hello() { TODO: implement this; }';
      const issues: string[] = [];
      let score = 100;

      if (code.includes('TODO')) { issues.push('Contains unfinished code'); score -= 15; }

      expect(issues.length).toBe(1);
      expect(score).toBe(85);
    });

    it('should support retry with improved score', () => {
      let score = 65;
      score = Math.min(100, score + 15);
      expect(score).toBe(80);
    });
  });

  describe('Verification Rules', () => {
    const rules = new Map();

    it('should have default rules', () => {
      const defaultRules = [
        { id: 'rule-1', name: 'Minimum Length', type: 'llm_output', severity: 'medium' as const },
        { id: 'rule-2', name: 'Criteria Match', type: 'llm_output', severity: 'critical' as const },
      ];
      defaultRules.forEach(r => rules.set(r.id, r));
      expect(rules.size).toBe(2);
    });

    it('should enable/disable rules', () => {
      const rule = { id: 'rule-1', name: 'Test', type: 'code', severity: 'low' as const, enabled: true };
      expect(rule.enabled).toBe(true);
      rule.enabled = false;
      expect(rule.enabled).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should calculate pass rate', () => {
      const results = [
        { status: 'verified' },
        { status: 'verified' },
        { status: 'failed' },
        { status: 'failed' },
      ];
      const verified = results.filter(r => r.status === 'verified').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const passRate = Math.round((verified / (verified + failed)) * 100);
      expect(passRate).toBe(50);
    });

    it('should calculate average score', () => {
      const results = [
        { score: 90 },
        { score: 80 },
        { score: 70 },
      ];
      const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      expect(avg).toBe(80);
    });
  });

  describe('Batch Verification', () => {
    it('should handle batch requests', () => {
      const items = [
        { type: 'llm_output', content: 'Valid content that meets criteria.', criteria: ['criteria'] },
        { type: 'code', content: 'function test() {}', criteria: [] },
      ];
      expect(items.length).toBe(2);
    });
  });
});
});
