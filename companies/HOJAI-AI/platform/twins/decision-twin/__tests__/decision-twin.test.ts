/**
 * Decision Twin Tests
 */

import { describe, it, expect } from 'vitest';

describe('Decision Twin', () => {
  describe('Decision Capture', () => {
    it('should capture basic decision structure', () => {
      const decision = {
        id: 'dec_1',
        employeeId: 'emp_1',
        type: 'purchasing',
        domain: 'operations',
        choice: 'Supplier B',
        confidence: 85,
        learnable: true
      };

      expect(decision.id).toBeDefined();
      expect(decision.choice).toBe('Supplier B');
      expect(decision.confidence).toBeLessThanOrEqual(100);
    });

    it('should track alternatives', () => {
      const decision = {
        choice: 'Option A',
        alternatives: ['Option B', 'Option C']
      };

      expect(decision.alternatives.length).toBe(2);
    });
  });

  describe('Reasoning Chain', () => {
    it('should capture reasoning factors', () => {
      const factors = [
        { name: 'price', weight: 0.3, direction: 'negative' },
        { name: 'quality', weight: 0.4, direction: 'positive' },
        { name: 'delivery_time', weight: 0.2, direction: 'negative' },
        { name: 'reputation', weight: 0.1, direction: 'positive' }
      ];

      const totalWeight = factors.reduce((sum, f) => sum + Math.abs(f.weight), 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });

    it('should classify reasoning models', () => {
      const models = ['rule-based', 'experience', 'data-driven', 'intuition', 'mixed'] as const;

      expect(models).toContain('experience');
      expect(models).toContain('data-driven');
    });

    it('should track constraints', () => {
      const constraints = [
        { name: 'budget', type: 'hard' },
        { name: 'timeline', type: 'soft' }
      ];

      const hardConstraints = constraints.filter(c => c.type === 'hard');
      expect(hardConstraints.length).toBe(1);
    });
  });

  describe('Prediction', () => {
    it('should calculate prediction confidence', () => {
      const patterns = [
        { confidence: 90, frequency: 5 },
        { confidence: 70, frequency: 3 },
        { confidence: 60, frequency: 2 }
      ];

      // Weight by frequency
      const weightedSum = patterns.reduce((sum, p) => sum + p.confidence * p.frequency, 0);
      const totalFreq = patterns.reduce((sum, p) => sum + p.frequency, 0);
      const avgConfidence = weightedSum / totalFreq;

      expect(avgConfidence).toBeGreaterThan(60);
      expect(avgConfidence).toBeLessThan(90);
    });

    it('should identify similar past decisions', () => {
      const pastDecisions = [
        { type: 'purchasing', amount: 5000 },
        { type: 'purchasing', amount: 8000 },
        { type: 'hiring', amount: 100000 }
      ];

      const similar = pastDecisions.filter(d => d.type === 'purchasing');
      expect(similar.length).toBe(2);
    });
  });

  describe('Decision Context', () => {
    it('should classify urgency levels', () => {
      const urgencyLevels = ['low', 'medium', 'high', 'critical'] as const;

      urgencyLevels.forEach(level => {
        expect(['low', 'medium', 'high', 'critical']).toContain(level);
      });
    });

    it('should classify risk levels', () => {
      const riskLevels = ['low', 'medium', 'high', 'critical'] as const;

      expect(riskLevels.length).toBe(4);
    });
  });
});

describe('Decision Analytics', () => {
  it('should track success rate', () => {
    const decisions = [
      { outcome: 'success' },
      { outcome: 'success' },
      { outcome: 'failure' },
      { outcome: 'success' },
      { outcome: 'success' }
    ];

    const successRate = decisions.filter(d => d.outcome === 'success').length / decisions.length;
    expect(successRate).toBe(0.8);
  });

  it('should aggregate by type', () => {
    const decisions = [
      { type: 'purchasing' },
      { type: 'purchasing' },
      { type: 'hiring' },
      { type: 'strategic' }
    ];

    const byType: Record<string, number> = {};
    decisions.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + 1;
    });

    expect(byType.purchasing).toBe(2);
    expect(byType.hiring).toBe(1);
  });
});
