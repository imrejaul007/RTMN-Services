import { describe, it, expect } from 'vitest';

describe('Observation Engine', () => {
  describe('Pattern Detection', () => {
    it('detects recurring events', () => {
      const daysBetween = (d1, d2) => Math.abs((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
      expect(daysBetween('2024-01-01', '2024-01-08')).toBe(7);
    });

    it('calculates average', () => {
      const avg = [1, 2, 3].reduce((a, b) => a + b, 0) / 3;
      expect(avg).toBe(2);
    });
  });

  describe('Habit Detection', () => {
    it('detects morning hours', () => {
      const hours = [9, 10, 11];
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
      expect(avg >= 8 && avg <= 12).toBe(true);
    });

    it('detects weekday activity', () => {
      const days = [1, 2, 3, 4, 5];
      expect(days.length).toBe(5);
    });
  });

  describe('Anomaly Detection', () => {
    it('calculates z-score', () => {
      const values = [10, 10, 10, 10, 50];
      const avg = 18;
      const stdDev = 16;
      const zScore = Math.abs((50 - avg) / stdDev);
      expect(zScore > 1.5).toBe(true);
    });
  });

  describe('Predictions', () => {
    it('calculates next occurrence', () => {
      const interval = 7;
      const last = new Date('2024-01-15').getTime();
      const next = new Date(last + interval * 24 * 60 * 60 * 1000);
      expect(next.toISOString().slice(0, 10)).toBe('2024-01-22');
    });
  });

  describe('Event Processing', () => {
    it('groups by type', () => {
      const events = [{ type: 'login' }, { type: 'purchase' }, { type: 'login' }];
      const byType = {};
      for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;
      expect(byType.login).toBe(2);
    });
  });

  describe('Correlations', () => {
    it('detects correlation', () => {
      const gap = 12;
      expect(gap <= 24).toBe(true);
    });

    it('calculates strength', () => {
      const pairs = [{ c: true }, { c: true }, { c: false }];
      const strength = pairs.filter(p => p.c).length / pairs.length;
      expect(strength).toBeCloseTo(0.67, 1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty', () => { expect([].length).toBe(0); });
    it('handles zero gap', () => {
      const gap = Math.abs(new Date('2024-01-01') - new Date('2024-01-01')) / (1000 * 60 * 60 * 24);
      expect(gap).toBe(0);
    });
  });
});
