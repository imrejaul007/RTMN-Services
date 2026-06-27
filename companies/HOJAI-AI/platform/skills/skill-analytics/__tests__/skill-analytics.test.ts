import { describe, it, expect } from 'vitest';

// Skill Analytics Constants
const METRIC_TYPES = ['usage', 'effectiveness', 'adoption', 'engagement'];
const TIME_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly'];

describe('Skill Analytics', () => {
  describe('Metric Types', () => {
    it('should have all metric types', () => {
      expect(METRIC_TYPES).toContain('usage');
      expect(METRIC_TYPES).toContain('effectiveness');
      expect(METRIC_TYPES).toContain('adoption');
      expect(METRIC_TYPES).toContain('engagement');
    });
  });

  describe('Time Periods', () => {
    it('should have all time periods', () => {
      expect(TIME_PERIODS).toContain('daily');
      expect(TIME_PERIODS).toContain('weekly');
      expect(TIME_PERIODS).toContain('monthly');
    });
  });

  describe('Usage Tracking', () => {
    const trackUsage = (skillId: string, employeeId: string, duration: number) => {
      return {
        skillId,
        employeeId,
        duration,
        timestamp: new Date().toISOString()
      };
    };

    it('should track skill usage', () => {
      const usage = trackUsage('skill-1', 'emp-1', 300);
      expect(usage.skillId).toBe('skill-1');
      expect(usage.employeeId).toBe('emp-1');
      expect(usage.duration).toBe(300);
    });
  });

  describe('Effectiveness Calculation', () => {
    const calculateEffectiveness = (outcomes: Array<{ success: boolean; effort: number }>) => {
      const successful = outcomes.filter(o => o.success);
      const avgEffort = outcomes.length > 0 ? outcomes.reduce((sum, o) => sum + o.effort, 0) / outcomes.length : 0;
      return {
        successRate: outcomes.length > 0 ? (successful.length / outcomes.length) * 100 : 0,
        avgEffort,
        totalOutcomes: outcomes.length
      };
    };

    it('should calculate effectiveness metrics', () => {
      const outcomes = [
        { success: true, effort: 10 },
        { success: true, effort: 15 },
        { success: false, effort: 30 }
      ];
      const result = calculateEffectiveness(outcomes);
      expect(result.successRate).toBeCloseTo(66.67, 0);
      expect(result.avgEffort).toBe(55 / 3);
    });
  });

  describe('Adoption Rate', () => {
    const calculateAdoptionRate = (totalEmployees: number, skillUsers: number) => {
      return totalEmployees > 0 ? (skillUsers / totalEmployees) * 100 : 0;
    };

    it('should calculate adoption rate', () => {
      expect(calculateAdoptionRate(100, 25)).toBe(25);
      expect(calculateAdoptionRate(100, 50)).toBe(50);
      expect(calculateAdoptionRate(0, 0)).toBe(0);
    });
  });

  describe('Engagement Score', () => {
    const calculateEngagement = (sessions: Array<{ duration: number; interactions: number }>) => {
      const totalSessions = sessions.length;
      const avgDuration = sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0;
      const avgInteractions = sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.interactions, 0) / sessions.length : 0;
      return { totalSessions, avgDuration, avgInteractions };
    };

    it('should calculate engagement metrics', () => {
      const sessions = [
        { duration: 300, interactions: 10 },
        { duration: 600, interactions: 20 }
      ];
      const result = calculateEngagement(sessions);
      expect(result.totalSessions).toBe(2);
      expect(result.avgDuration).toBe(450);
    });
  });

  describe('Skill Comparison', () => {
    const compareSkills = (
      skills: Array<{ id: string; usage: number; effectiveness: number }>
    ) => {
      const sorted = [...skills].sort((a, b) => {
        const scoreA = a.usage * 0.3 + a.effectiveness * 0.7;
        const scoreB = b.usage * 0.3 + b.effectiveness * 0.7;
        return scoreB - scoreA;
      });
      return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
    };

    it('should rank skills by combined score', () => {
      const skills = [
        { id: 's1', usage: 100, effectiveness: 60 },
        { id: 's2', usage: 50, effectiveness: 90 },
        { id: 's3', usage: 80, effectiveness: 80 }
      ];
      const ranked = compareSkills(skills);
      expect(ranked[0].id).toBe('s2'); // High effectiveness wins
    });
  });
});