import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock employee twin constants
const EMPLOYEE_STATUS = ['active', 'on_leave', 'suspended', 'terminated'];
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const PERFORMANCE_TIERS = ['below_expectations', 'meets_expectations', 'exceeds_expectations', 'outstanding'];

describe('Employee Twin', () => {
  describe('Employee Status', () => {
    it('should have all employment statuses', () => {
      expect(EMPLOYEE_STATUS).toContain('active');
      expect(EMPLOYEE_STATUS).toContain('on_leave');
      expect(EMPLOYEE_STATUS).toContain('suspended');
      expect(EMPLOYEE_STATUS).toContain('terminated');
    });

    it('should have 4 employee statuses', () => {
      expect(EMPLOYEE_STATUS).toHaveLength(4);
    });
  });

  describe('Skill Levels', () => {
    it('should have 4 proficiency levels', () => {
      expect(SKILL_LEVELS).toHaveLength(4);
    });

    it('should order skill levels correctly', () => {
      const levelIndex = SKILL_LEVELS.indexOf.bind(SKILL_LEVELS);
      expect(levelIndex('beginner')).toBeLessThan(levelIndex('intermediate'));
      expect(levelIndex('advanced')).toBeLessThan(levelIndex('expert'));
    });
  });

  describe('Performance Tiers', () => {
    it('should have all performance categories', () => {
      expect(PERFORMANCE_TIERS).toContain('below_expectations');
      expect(PERFORMANCE_TIERS).toContain('meets_expectations');
      expect(PERFORMANCE_TIERS).toContain('exceeds_expectations');
      expect(PERFORMANCE_TIERS).toContain('outstanding');
    });
  });

  describe('Performance Score Calculation', () => {
    const calculatePerformanceScore = (
      goalsAchieved: number,
      totalGoals: number,
      peerRating: number,
      managerRating: number
    ): number => {
      const goalScore = (goalsAchieved / totalGoals) * 40;
      const peerScore = (peerRating / 5) * 30;
      const managerScore = (managerRating / 5) * 30;
      return Math.round(goalScore + peerScore + managerScore);
    };

    it('should calculate weighted performance score', () => {
      const score = calculatePerformanceScore(8, 10, 4, 5);
      expect(score).toBe(86); // function returns 86
    });

    it('should return max score for perfect performance', () => {
      const score = calculatePerformanceScore(10, 10, 5, 5);
      expect(score).toBe(100);
    });

    it('should return minimum score for poor performance', () => {
      const score = calculatePerformanceScore(0, 10, 1, 1);
      expect(score).toBe(12);
    });
  });

  describe('Skill Gap Analysis', () => {
    const identifySkillGaps = (
      currentSkills: Record<string, number>,
      requiredSkills: Record<string, number>
    ): string[] => {
      const gaps: string[] = [];
      for (const [skill, required] of Object.entries(requiredSkills)) {
        const current = currentSkills[skill] || 0;
        if (current < required) {
          gaps.push(`${skill}: need ${required}, have ${current}`);
        }
      }
      return gaps;
    };

    it('should identify missing skills', () => {
      const current = { javascript: 3, typescript: 2 };
      const required = { javascript: 3, typescript: 4, python: 3 };
      const gaps = identifySkillGaps(current, required);
      expect(gaps).toHaveLength(2);
    });

    it('should return empty when skills match', () => {
      const current = { javascript: 4, typescript: 3 };
      const required = { javascript: 4, typescript: 3 };
      const gaps = identifySkillGaps(current, required);
      expect(gaps).toHaveLength(0);
    });
  });

  describe('Attrition Risk', () => {
    const calculateAttritionRisk = (
      tenure: number,
      satisfactionScore: number,
      recentRaises: number
    ): 'low' | 'medium' | 'high' => {
      if (tenure < 1 && satisfactionScore < 3) return 'high';
      if (tenure < 2 && satisfactionScore < 3 && recentRaises === 0) return 'high';
      if (satisfactionScore >= 4 && recentRaises > 0) return 'low';
      return 'medium';
    };

    it('should flag high risk for new dissatisfied employees', () => {
      expect(calculateAttritionRisk(0.5, 2, 0)).toBe('high');
    });

    it('should flag low risk for satisfied long-tenured employees', () => {
      expect(calculateAttritionRisk(5, 4, 1)).toBe('low');
    });

    it('should return medium for borderline cases', () => {
      expect(calculateAttritionRisk(1.5, 3, 0)).toBe('medium');
    });
  });
});
