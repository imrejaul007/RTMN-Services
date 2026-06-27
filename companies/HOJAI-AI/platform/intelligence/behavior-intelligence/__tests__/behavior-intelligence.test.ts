import { describe, it, expect } from 'vitest';

// Behavior Intelligence Constants
const BEHAVIOR_TYPES = ['task_completion', 'communication', 'decision', 'learning', 'collaboration'];
const PATTERN_STATES = ['new', 'forming', 'stable', 'declining', 'archived'];

describe('Behavior Intelligence', () => {
  describe('Behavior Types', () => {
    it('should have all behavior types', () => {
      expect(BEHAVIOR_TYPES).toContain('task_completion');
      expect(BEHAVIOR_TYPES).toContain('communication');
      expect(BEHAVIOR_TYPES).toContain('decision');
      expect(BEHAVIOR_TYPES).toContain('learning');
      expect(BEHAVIOR_TYPES).toContain('collaboration');
    });
  });

  describe('Pattern States', () => {
    it('should have all pattern states', () => {
      expect(PATTERN_STATES).toContain('new');
      expect(PATTERN_STATES).toContain('forming');
      expect(PATTERN_STATES).toContain('stable');
      expect(PATTERN_STATES).toContain('declining');
    });
  });

  describe('Pattern Detection', () => {
    const detectPattern = (events: Array<{ type: string; timestamp: string }>): string => {
      const typeCounts: Record<string, number> = {};
      events.forEach(e => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      });
      const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || 'unknown';
    };

    it('should detect most frequent behavior', () => {
      const events = [
        { type: 'communication', timestamp: '2026-06-01' },
        { type: 'communication', timestamp: '2026-06-02' },
        { type: 'task_completion', timestamp: '2026-06-03' }
      ];
      expect(detectPattern(events)).toBe('communication');
    });
  });

  describe('Trend Analysis', () => {
    const analyzeTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
      if (values.length < 2) return 'stable';
      const first = values.slice(0, Math.floor(values.length / 2));
      const second = values.slice(Math.floor(values.length / 2));
      const avg1 = first.reduce((a, b) => a + b, 0) / first.length;
      const avg2 = second.reduce((a, b) => a + b, 0) / second.length;
      const diff = (avg2 - avg1) / avg1;
      if (diff > 0.1) return 'increasing';
      if (diff < -0.1) return 'decreasing';
      return 'stable';
    };

    it('should detect increasing trend', () => {
      expect(analyzeTrend([10, 11, 12, 13, 20, 21, 22])).toBe('increasing');
    });

    it('should detect decreasing trend', () => {
      expect(analyzeTrend([22, 21, 20, 13, 12, 11, 10])).toBe('decreasing');
    });

    it('should detect stable trend', () => {
      expect(analyzeTrend([10, 11, 10, 11, 10, 11])).toBe('stable');
    });
  });

  describe('Anomaly Detection', () => {
    const isAnomaly = (value: number, mean: number, stdDev: number): boolean => {
      const zScore = Math.abs((value - mean) / stdDev);
      return zScore > 2;
    };

    it('should detect values beyond 2 standard deviations', () => {
      expect(isAnomaly(100, 50, 10)).toBe(true);
      expect(isAnomaly(55, 50, 10)).toBe(false);
    });
  });

  describe('Collaboration Score', () => {
    const calculateCollaborationScore = (interactions: Array<{ type: string; participants: string[] }>): number => {
      const collaborationTypes = ['meeting', 'review', 'discussion'];
      const collabCount = interactions.filter(i => collaborationTypes.includes(i.type)).length;
      const uniquePairs = new Set(
        interactions.flatMap(i =>
          i.participants.flatMap((a, idx) =>
            i.participants.slice(idx + 1).map(b => [a, b].sort().join('-'))
          )
        )
      );
      return Math.min(100, Math.round((collabCount * 10 + uniquePairs.size * 5)));
    };

    it('should calculate collaboration score', () => {
      const interactions = [
        { type: 'meeting', participants: ['alice', 'bob'] },
        { type: 'review', participants: ['bob', 'charlie'] }
      ];
      const score = calculateCollaborationScore(interactions);
      expect(score).toBeGreaterThan(0);
    });
  });
});