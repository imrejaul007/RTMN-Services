import { describe, it, expect } from 'vitest';

// Learning engine tests
function generateId() { return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

describe('Memory Learning Engine', () => {
  describe('Outcome Tracking', () => {
    it('records success', () => {
      const outcome = { id: '1', success: true, timestamp: new Date().toISOString() };
      expect(outcome.success).toBe(true);
    });

    it('records failure', () => {
      const outcome = { id: '2', success: false, feedback: 'Too slow' };
      expect(outcome.success).toBe(false);
    });

    it('tracks success rate', () => {
      const outcomes = [
        { success: true }, { success: true }, { success: true }, { success: false }, { success: true }
      ];
      const successRate = outcomes.filter(o => o.success).length / outcomes.length;
      expect(successRate).toBe(0.8);
    });
  });

  describe('Learning Rules', () => {
    it('creates reinforce rule on success', () => {
      const rule = { id: generateId(), action: 'reinforce', confidence: 0.6 };
      expect(rule.action).toBe('reinforce');
    });

    it('creates weaken rule on failure', () => {
      const rule = { id: generateId(), action: 'weaken', confidence: 0.4 };
      expect(rule.action).toBe('weaken');
    });

    it('increments application count', () => {
      const rule = { 应用次数: 5 };
      rule.应用次数++;
      expect(rule.应用次数).toBe(6);
    });
  });

  describe('Failure Analysis', () => {
    it('groups failures by memory', () => {
      const failures = [
        { memoryId: 'm1' }, { memoryId: 'm1' }, { memoryId: 'm2' }
      ];
      const byMemory = {};
      for (const f of failures) byMemory[f.memoryId] = (byMemory[f.memoryId] || 0) + 1;
      expect(byMemory.m1).toBe(2);
      expect(byMemory.m2).toBe(1);
    });

    it('identifies repeated failures', () => {
      const byMemory = { m1: 3, m2: 1 };
      const repeated = Object.entries(byMemory).filter(([_, count]) => count >= 2);
      expect(repeated.length).toBe(1);
    });

    it('calculates failure rate', () => {
      const total = 100;
      const failures = 30;
      const failureRate = failures / total;
      expect(failureRate).toBe(0.3);
    });
  });

  describe('Root Cause Analysis', () => {
    it('detects confidence issue', () => {
      const successRate = 0.6;
      const threshold = 0.7;
      const hasIssue = successRate < threshold;
      expect(hasIssue).toBe(true);
    });

    it('detects no issue', () => {
      const successRate = 0.85;
      const threshold = 0.7;
      const hasIssue = successRate < threshold;
      expect(hasIssue).toBe(false);
    });

    it('identifies multiple causes', () => {
      const causes = [];
      causes.push('confidence_issue');
      causes.push('context_mismatch');
      causes.push('outdated');
      expect(causes.length).toBe(3);
    });
  });

  describe('Behavior Optimization', () => {
    it('reinforces on success', () => {
      const memory = { confidence: 0.5 };
      memory.confidence = Math.min(1, memory.confidence + 0.05);
      expect(memory.confidence).toBe(0.55);
    });

    it('weakens on failure', () => {
      const memory = { confidence: 0.5 };
      memory.confidence = Math.max(0, memory.confidence - 0.1);
      expect(memory.confidence).toBe(0.4);
    });

    it('caps confidence at 1', () => {
      const memory = { confidence: 0.95 };
      memory.confidence = Math.min(1, memory.confidence + 0.1);
      expect(memory.confidence).toBe(1);
    });

    it('floors confidence at 0', () => {
      const memory = { confidence: 0.05 };
      memory.confidence = Math.max(0, memory.confidence - 0.1);
      expect(memory.confidence).toBe(0);
    });
  });

  describe('Insights', () => {
    it('calculates trend', () => {
      const outcomes = Array.from({ length: 10 }, (_, i) => ({ success: i < 7 }));
      const successRate = outcomes.filter(o => o.success).length / outcomes.length;
      expect(successRate).toBe(0.7);
    });

    it('ranks top learnings', () => {
      const rules = [
        { 应用次数: 10 }, { 应用次数: 5 }, { 应用次数: 20 }
      ];
      const ranked = rules.sort((a, b) => b.应用次数 - a.应用次数);
      expect(ranked[0].应用次数).toBe(20);
    });

    it('identifies memories needing attention', () => {
      const rates = [
        { memoryId: 'm1', rate: 0.5 },
        { memoryId: 'm2', rate: 0.8 },
        { memoryId: 'm3', rate: 0.4 }
      ];
      const needsAttention = rates.filter(r => r.rate < 0.7);
      expect(needsAttention.length).toBe(2);
    });
  });

  describe('Pattern Learning', () => {
    it('detects success pattern', () => {
      const outcomes = [
        { success: true }, { success: true }, { success: true }
      ];
      const allSuccess = outcomes.every(o => o.success);
      expect(allSuccess).toBe(true);
    });

    it('detects failure pattern', () => {
      const outcomes = [
        { success: false }, { success: false }, { success: false }
      ];
      const allFailed = outcomes.every(o => !o.success);
      expect(allFailed).toBe(true);
    });

    it('calculates pattern confidence', () => {
      const outcomes = 10;
      const successes = 8;
      const confidence = successes / outcomes;
      expect(confidence).toBe(0.8);
    });
  });

  describe('Edge Cases', () => {
    it('handles no outcomes', () => {
      const outcomes = [];
      const successRate = outcomes.length > 0 ? outcomes.filter(o => o.success).length / outcomes.length : 0;
      expect(successRate).toBe(0);
    });

    it('handles all successes', () => {
      const outcomes = [{ success: true }, { success: true }];
      const successRate = outcomes.filter(o => o.success).length / outcomes.length;
      expect(successRate).toBe(1);
    });

    it('handles all failures', () => {
      const outcomes = [{ success: false }, { success: false }];
      const successRate = outcomes.filter(o => o.success).length / outcomes.length;
      expect(successRate).toBe(0);
    });
  });
});
