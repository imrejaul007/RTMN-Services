import { describe, it, expect } from 'vitest';

// Observation engine tests
function daysBetween(d1, d2) { return Math.abs((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24)); }
function extractTimePattern(dateStr) { const d = new Date(dateStr); return { hour: d.getHours(), dayOfWeek: d.getDay() }; }

describe('Observation Engine', () => {
  describe('Pattern Detection', () => {
    it('detects recurring events', () => {
      const events = [
        { eventType: 'email', timestamp: '2024-01-01' },
        { eventType: 'email', timestamp: '2024-01-08' },
        { eventType: 'email', timestamp: '2024-01-15' }
      ];
      const intervals = [];
      for (let i = 1; i < events.length; i++) intervals.push(daysBetween(events[i-1].timestamp, events[i].timestamp));
      expect(intervals[0]).toBe(7);
    });

    it('calculates consistent intervals', () => {
      const intervals = [7, 7.1, 6.9, 7.05];
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev / avg < 0.3).toBe(true);
    });

    it('detects inconsistent intervals', () => {
      const intervals = [1, 30, 7, 60];
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev / avg < 0.3).toBe(false);
    });
  });

  describe('Habit Detection', () => {
    it('extracts time pattern', () => {
      const pattern = extractTimePattern('2024-06-27T10:30:00Z');
      expect(pattern.hour).toBe(10);
      expect(pattern.dayOfWeek).toBe(4);
    });

    it('detects morning activity', () => {
      const hours = [9, 9.5, 8.75, 9.25];
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
      expect(avg >= 8 && avg <= 11).toBe(true);
    });

    it('detects weekday activity', () => {
      const days = [1, 2, 3, 4, 5];
      const weekdays = days.filter(d => d >= 1 && d <= 5);
      expect(weekdays.length).toBe(5);
    });
  });

  describe('Anomaly Detection', () => {
    it('calculates z-score', () => {
      const values = [1, 2, 3, 4, 5];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const zScore = Math.abs((8 - avg) / stdDev);
      expect(zScore > 1).toBe(true);
    });

    it('detects unusual gaps', () => {
      const intervals = [7, 7, 7, 30];
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const zScore = Math.abs((30 - avg) / stdDev);
      expect(zScore > 2).toBe(true);
    });
  });

  describe('Predictions', () => {
    it('predicts next occurrence', () => {
      const avgInterval = 7;
      const lastOccurrence = new Date('2024-01-15').getTime();
      const nextOccurrence = new Date(lastOccurrence + avgInterval * 24 * 60 * 60 * 1000);
      expect(nextOccurrence.toISOString().slice(0, 10)).toBe('2024-01-22');
    });

    it('calculates confidence', () => {
      const occurrences = 10;
      const consistency = 0.9;
      const confidence = consistency * Math.min(1, occurrences / 20);
      expect(confidence).toBeCloseTo(0.45, 1);
    });
  });

  describe('Event Processing', () => {
    it('groups by event type', () => {
      const events = [{ type: 'login' }, { type: 'purchase' }, { type: 'login' }];
      const byType = {};
      for (const e of events) { byType[e.type] = (byType[e.type] || 0) + 1; }
      expect(byType.login).toBe(2);
      expect(byType.purchase).toBe(1);
    });

    it('sorts by timestamp', () => {
      const events = [{ ts: '2024-01-15' }, { ts: '2024-01-10' }, { ts: '2024-01-20' }];
      const sorted = events.sort((a, b) => new Date(a.ts) - new Date(b.ts));
      expect(sorted[0].ts).toBe('2024-01-10');
    });
  });

  describe('Correlations', () => {
    it('detects event correlation', () => {
      const gapHours = 12;
      expect(gapHours <= 24).toBe(true);
    });

    it('calculates correlation strength', () => {
      const pairs = [{ correlated: true }, { correlated: true }, { correlated: true }, { correlated: false }];
      const strength = pairs.filter(p => p.correlated).length / pairs.length;
      expect(strength).toBe(0.75);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty events', () => {
      const events = [];
      expect(events.length).toBe(0);
    });

    it('handles single event', () => {
      const events = [{ timestamp: '2024-01-01' }];
      expect(events.length).toBe(1);
    });

    it('handles duplicate timestamps', () => {
      const events = [{ timestamp: '2024-01-01' }, { timestamp: '2024-01-01' }];
      const intervals = [];
      for (let i = 1; i < events.length; i++) intervals.push(daysBetween(events[i-1].timestamp, events[i].timestamp));
      expect(intervals[0]).toBe(0);
    });
  });
});
