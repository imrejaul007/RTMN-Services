/**
 * Twin Analytics Tests - Port 4772
 */
import { describe, it, expect } from 'vitest';

// Analytics types
const INSIGHT_TYPES = ['productivity', 'collaboration', 'growth', 'wellness', 'career'];
const TIME_RANGES = ['day', 'week', 'month', 'quarter', 'year'];
const METRIC_CATEGORIES = ['output', 'efficiency', 'engagement', 'quality', 'velocity'];

describe('Twin Analytics - Constants', () => {
  describe('Insight Types', () => {
    it('should have all insight types', () => {
      expect(INSIGHT_TYPES).toContain('productivity');
      expect(INSIGHT_TYPES).toContain('collaboration');
      expect(INSIGHT_TYPES).toContain('growth');
      expect(INSIGHT_TYPES).toContain('wellness');
      expect(INSIGHT_TYPES).toContain('career');
    });
  });

  describe('Time Ranges', () => {
    it('should have all time ranges', () => {
      expect(TIME_RANGES).toContain('day');
      expect(TIME_RANGES).toContain('week');
      expect(TIME_RANGES).toContain('month');
      expect(TIME_RANGES).toContain('quarter');
      expect(TIME_RANGES).toContain('year');
    });
  });

  describe('Metric Categories', () => {
    it('should have all metric categories', () => {
      METRIC_CATEGORIES.forEach(cat => {
        expect(['output', 'efficiency', 'engagement', 'quality', 'velocity']).toContain(cat);
      });
    });
  });
});

describe('Twin Analytics - Productivity Score', () => {
  const calculateProductivityScore = (
    tasksCompleted: number,
    tasksInProgress: number,
    meetingsHours: number,
    deepWorkHours: number,
    focusScore: number
  ): number => {
    const taskScore = Math.min(40, (tasksCompleted / 10) * 40);
    const meetingPenalty = meetingsHours > 4 ? Math.min(20, (meetingsHours - 4) * 5) : 0;
    const deepWorkBonus = Math.min(20, deepWorkHours * 5);
    const focusBonus = Math.min(20, focusScore * 0.2);
    return Math.round(taskScore + deepWorkBonus + focusBonus - meetingPenalty);
  };

  it('should calculate high productivity for focused work', () => {
    const score = calculateProductivityScore(10, 2, 2, 6, 90);
    expect(score).toBeGreaterThan(80);
  });

  it('should penalize excessive meetings', () => {
    const withMeetings = calculateProductivityScore(8, 1, 7, 2, 70);
    const withoutMeetings = calculateProductivityScore(8, 1, 2, 2, 70);
    expect(withMeetings).toBeLessThan(withoutMeetings);
  });

  it('should reward deep work', () => {
    const withDeepWork = calculateProductivityScore(8, 1, 2, 5, 70);
    const withoutDeepWork = calculateProductivityScore(8, 1, 2, 1, 70);
    expect(withDeepWork).toBeGreaterThan(withoutDeepWork);
  });

  it('should cap score at 100', () => {
    const score = calculateProductivityScore(15, 5, 0, 10, 100);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Twin Analytics - Trend Analysis', () => {
  const calculateTrend = (values: number[]): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
    if (values.length < 2) return { direction: 'stable', percentage: 0 };
    const first = values[0];
    const last = values[values.length - 1];
    const percentage = ((last - first) / first) * 100;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';
    return { direction, percentage: Math.round(percentage) };
  };

  it('should detect upward trend', () => {
    const result = calculateTrend([10, 12, 15, 18, 22]);
    expect(result.direction).toBe('up');
    expect(result.percentage).toBeGreaterThan(0);
  });

  it('should detect downward trend', () => {
    const result = calculateTrend([20, 18, 15, 12, 10]);
    expect(result.direction).toBe('down');
    expect(result.percentage).toBeLessThan(0);
  });

  it('should detect stable trend', () => {
    const result = calculateTrend([10, 10, 11, 10, 10]);
    expect(result.direction).toBe('stable');
  });
});

describe('Twin Analytics - Improvement Calculation', () => {
  const calculateImprovement = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  it('should calculate positive improvement', () => {
    expect(calculateImprovement(120, 100)).toBe(20);
  });

  it('should calculate negative improvement', () => {
    expect(calculateImprovement(80, 100)).toBe(-20);
  });

  it('should handle zero previous value', () => {
    expect(calculateImprovement(50, 0)).toBe(100);
  });
});

describe('Twin Analytics - Benchmark Comparison', () => {
  const compareToBenchmark = (value: number, benchmarks: Record<string, number>): {
    percentile: number;
    comparison: 'above' | 'below' | 'at';
  } => {
    const avg = Object.values(benchmarks).reduce((a, b) => a + b, 0) / Object.values(benchmarks).length;
    const percentile = Math.round(((value - avg) / avg) * 100);
    const comparison = percentile > 5 ? 'above' : percentile < -5 ? 'below' : 'at';
    return { percentile, comparison };
  };

  it('should identify above-benchmark performance', () => {
    const result = compareToBenchmark(120, { team: 100, dept: 90, company: 95 });
    expect(result.comparison).toBe('above');
    expect(result.percentile).toBeGreaterThan(0);
  });

  it('should identify below-benchmark performance', () => {
    const result = compareToBenchmark(70, { team: 100, dept: 90, company: 95 });
    expect(result.comparison).toBe('below');
  });
});

describe('Twin Analytics - Insight Generation', () => {
  const generateInsights = (metrics: {
    productivity: number;
    collaboration: number;
    wellness: number;
    previousProductivity: number;
  }): string[] => {
    const insights: string[] = [];

    if (metrics.productivity > 80) {
      insights.push('Excellent productivity this period');
    } else if (metrics.productivity < 50) {
      insights.push('Productivity may need attention');
    }

    if (metrics.productivity > metrics.previousProductivity * 1.1) {
      insights.push('10%+ productivity improvement detected');
    }

    if (metrics.wellness < 40) {
      insights.push('Consider taking breaks to improve wellness');
    }

    if (metrics.collaboration > 80) {
      insights.push('Strong collaboration patterns');
    }

    return insights;
  };

  it('should generate positive insights for high productivity', () => {
    const insights = generateInsights({
      productivity: 85,
      collaboration: 70,
      wellness: 60,
      previousProductivity: 70
    });
    expect(insights.some(i => i.includes('Excellent'))).toBe(true);
  });

  it('should flag wellness concerns', () => {
    const insights = generateInsights({
      productivity: 60,
      collaboration: 50,
      wellness: 35,
      previousProductivity: 55
    });
    expect(insights.some(i => i.includes('wellness'))).toBe(true);
  });
});
