import { describe, it, expect, beforeEach } from 'vitest';

// Mock constants from behavioral-twin
const WORK_PATTERN_TYPES = ['morning', 'evening', 'flexible'];
const COMMUNICATION_PREFERENCES = ['async', 'sync', 'mixed'];
const COLLABORATION_PREFERENCES = ['solo', 'team', 'hybrid'];
const DECISION_SPEEDS = ['fast', 'deliberate', 'data-driven'];
const FEEDBACK_PREFERENCES = ['frequent', 'periodic', 'minimal'];
const MEETING_PREFERENCES = ['back-to-back', 'spaced', 'minimal'];
const ENERGY_LEVELS = ['high', 'low', 'medium'];

describe('Behavioral Twin', () => {
  describe('Work Pattern Types', () => {
    it('should have all work pattern types', () => {
      expect(WORK_PATTERN_TYPES).toContain('morning');
      expect(WORK_PATTERN_TYPES).toContain('evening');
      expect(WORK_PATTERN_TYPES).toContain('flexible');
    });

    it('should have 3 work pattern types', () => {
      expect(WORK_PATTERN_TYPES).toHaveLength(3);
    });
  });

  describe('Communication Preferences', () => {
    it('should have all communication preferences', () => {
      expect(COMMUNICATION_PREFERENCES).toContain('async');
      expect(COMMUNICATION_PREFERENCES).toContain('sync');
      expect(COMMUNICATION_PREFERENCES).toContain('mixed');
    });

    it('should have 3 communication preferences', () => {
      expect(COMMUNICATION_PREFERENCES).toHaveLength(3);
    });
  });

  describe('Collaboration Preferences', () => {
    it('should have all collaboration preferences', () => {
      expect(COLLABORATION_PREFERENCES).toContain('solo');
      expect(COLLABORATION_PREFERENCES).toContain('team');
      expect(COLLABORATION_PREFERENCES).toContain('hybrid');
    });
  });

  describe('Decision Speeds', () => {
    it('should have all decision speeds', () => {
      expect(DECISION_SPEEDS).toContain('fast');
      expect(DECISION_SPEEDS).toContain('deliberate');
      expect(DECISION_SPEEDS).toContain('data-driven');
    });
  });

  describe('Feedback Preferences', () => {
    it('should have all feedback preferences', () => {
      expect(FEEDBACK_PREFERENCES).toContain('frequent');
      expect(FEEDBACK_PREFERENCES).toContain('periodic');
      expect(FEEDBACK_PREFERENCES).toContain('minimal');
    });
  });

  describe('Meeting Preferences', () => {
    it('should have all meeting preferences', () => {
      expect(MEETING_PREFERENCES).toContain('back-to-back');
      expect(MEETING_PREFERENCES).toContain('spaced');
      expect(MEETING_PREFERENCES).toContain('minimal');
    });
  });

  describe('Energy Levels', () => {
    it('should have all energy levels', () => {
      expect(ENERGY_LEVELS).toContain('high');
      expect(ENERGY_LEVELS).toContain('low');
      expect(ENERGY_LEVELS).toContain('medium');
    });
  });

  describe('Work Style Validation', () => {
    const validateWorkStyle = (style: {
      type?: string;
      preferredStartTime?: string;
      preferredEndTime?: string;
      communicationPreference?: string;
      collaborationPreference?: string;
      decisionSpeed?: string;
      riskTolerance?: number;
      autonomyPreference?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (style.type && !WORK_PATTERN_TYPES.includes(style.type)) {
        errors.push(`Invalid work pattern type: ${style.type}`);
      }

      if (style.preferredStartTime) {
        const [h, m] = style.preferredStartTime.split(':').map(Number);
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          errors.push('Invalid start time format');
        }
      }

      if (style.preferredEndTime) {
        const [h, m] = style.preferredEndTime.split(':').map(Number);
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          errors.push('Invalid end time format');
        }
      }

      if (style.communicationPreference && !COMMUNICATION_PREFERENCES.includes(style.communicationPreference)) {
        errors.push(`Invalid communication preference: ${style.communicationPreference}`);
      }

      if (style.collaborationPreference && !COLLABORATION_PREFERENCES.includes(style.collaborationPreference)) {
        errors.push(`Invalid collaboration preference: ${style.collaborationPreference}`);
      }

      if (style.decisionSpeed && !DECISION_SPEEDS.includes(style.decisionSpeed)) {
        errors.push(`Invalid decision speed: ${style.decisionSpeed}`);
      }

      if (style.riskTolerance !== undefined && (style.riskTolerance < 0 || style.riskTolerance > 100)) {
        errors.push('Risk tolerance must be between 0 and 100');
      }

      if (style.autonomyPreference !== undefined && (style.autonomyPreference < 0 || style.autonomyPreference > 100)) {
        errors.push('Autonomy preference must be between 0 and 100');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct work style', () => {
      const result = validateWorkStyle({
        type: 'morning',
        preferredStartTime: '08:00',
        preferredEndTime: '17:00',
        communicationPreference: 'mixed',
        collaborationPreference: 'team',
        decisionSpeed: 'data-driven',
        riskTolerance: 50,
        autonomyPreference: 70
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid work pattern type', () => {
      const result = validateWorkStyle({ type: 'invalid_type' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid work pattern type: invalid_type');
    });

    it('should reject invalid time format', () => {
      const result = validateWorkStyle({ preferredStartTime: '25:00' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid start time format');
    });

    it('should reject invalid risk tolerance', () => {
      const result = validateWorkStyle({ riskTolerance: 150 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk tolerance must be between 0 and 100');
    });

    it('should reject invalid autonomy preference', () => {
      const result = validateWorkStyle({ autonomyPreference: -10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Autonomy preference must be between 0 and 100');
    });
  });

  describe('Optimal Hours Calculation', () => {
    const calculateOptimalHours = (workPatternType: string): string[] => {
      switch (workPatternType) {
        case 'morning':
          return ['06:00-10:00', '10:00-12:00'];
        case 'evening':
          return ['14:00-18:00', '19:00-22:00'];
        case 'flexible':
        default:
          return ['09:00-12:00', '14:00-17:00'];
      }
    };

    it('should calculate morning optimal hours', () => {
      const hours = calculateOptimalHours('morning');
      expect(hours).toContain('06:00-10:00');
      expect(hours).toContain('10:00-12:00');
    });

    it('should calculate evening optimal hours', () => {
      const hours = calculateOptimalHours('evening');
      expect(hours).toContain('14:00-18:00');
      expect(hours).toContain('19:00-22:00');
    });

    it('should calculate flexible optimal hours', () => {
      const hours = calculateOptimalHours('flexible');
      expect(hours).toContain('09:00-12:00');
      expect(hours).toContain('14:00-17:00');
    });

    it('should default to flexible for unknown type', () => {
      const hours = calculateOptimalHours('unknown');
      expect(hours).toContain('09:00-12:00');
      expect(hours).toContain('14:00-17:00');
    });
  });

  describe('Burnout Risk Calculation', () => {
    const calculateBurnoutRisk = (
      meetingHours: number,
      deepWorkHours: number,
      taskLoad: number
    ): number => {
      let risk = 0;

      // High meeting load
      if (meetingHours > 6) risk += 30;
      else if (meetingHours > 4) risk += 15;

      // Low deep work time
      if (deepWorkHours < 2) risk += 25;
      else if (deepWorkHours < 4) risk += 10;

      // High task load
      if (taskLoad > 10) risk += 30;
      else if (taskLoad > 7) risk += 15;

      // Calculate work-life balance
      const totalHours = meetingHours + deepWorkHours;
      if (totalHours > 10) risk += 15;

      return Math.min(100, risk);
    };

    it('should calculate high burnout risk for overloaded employee', () => {
      const risk = calculateBurnoutRisk(7, 1, 12);
      expect(risk).toBe(100);
    });

    it('should calculate medium burnout risk', () => {
      const risk = calculateBurnoutRisk(5, 3, 8);
      expect(risk).toBe(40);
    });

    it('should calculate low burnout risk', () => {
      const risk = calculateBurnoutRisk(2, 5, 4);
      expect(risk).toBe(0);
    });
  });

  describe('Pattern Consistency Update', () => {
    const updatePatternConsistency = (
      currentConsistency: number,
      isInLineWithPattern: boolean
    ): number => {
      const delta = isInLineWithPattern ? 5 : -5;
      return Math.max(0, Math.min(100, currentConsistency + delta));
    };

    it('should increase consistency for in-line behavior', () => {
      expect(updatePatternConsistency(50, true)).toBe(55);
      expect(updatePatternConsistency(95, true)).toBe(100);
    });

    it('should decrease consistency for out-of-pattern behavior', () => {
      expect(updatePatternConsistency(50, false)).toBe(45);
      expect(updatePatternConsistency(5, false)).toBe(0);
    });
  });

  describe('Productivity Score Calculation', () => {
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

    it('should calculate high productivity score', () => {
      const score = calculateProductivityScore(10, 2, 2, 6, 90);
      expect(score).toBeGreaterThanOrEqual(80);
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
  });

  describe('Energy Mapping', () => {
    const mapTaskToEnergy = (
      task: { name: string; requiredFocus: number },
      employeeEnergyLevels: number[]
    ): { task: string; match: number; recommendation: string } => {
      const avgEnergy = employeeEnergyLevels.reduce((a, b) => a + b, 0) / employeeEnergyLevels.length;
      const match = Math.max(0, 100 - Math.abs(task.requiredFocus - avgEnergy));

      let recommendation: string;
      if (match > 80) {
        recommendation = 'Perfect time for this task';
      } else if (match > 50) {
        recommendation = 'Good time, may need extra focus';
      } else {
        recommendation = 'Consider scheduling at a different time';
      }

      return { task: task.name, match, recommendation };
    };

    it('should calculate perfect match for aligned energy and focus', () => {
      const result = mapTaskToEnergy(
        { name: 'Deep Work', requiredFocus: 80 },
        [75, 80, 85, 78, 82]
      );
      expect(result.match).toBeGreaterThan(80);
      expect(result.recommendation).toContain('Perfect');
    });

    it('should calculate poor match for misaligned energy and focus', () => {
      const result = mapTaskToEnergy(
        { name: 'Deep Work', requiredFocus: 90 },
        [30, 35, 40, 32, 38]
      );
      expect(result.match).toBeLessThan(50);
      expect(result.recommendation).toContain('different time');
    });
  });
});
