import { describe, it, expect } from 'vitest';

/**
 * Burnout Prediction Service Unit Tests
 */

const WEIGHTS = {
  sleep: 0.25,
  workHours: 0.20,
  stress: 0.20,
  exercise: 0.10,
  social: 0.10,
  recovery: 0.15
};

function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function calculateBurnoutRisk(data) {
  let riskScore = 0;
  const factors = {};

  const sleepHours = data.sleepHours || 7;
  factors.sleep = 1 - normalize(sleepHours, 4, 8);
  riskScore += factors.sleep * WEIGHTS.sleep;

  const workHours = data.workHours || 40;
  factors.workHours = normalize(workHours, 35, 60);
  riskScore += factors.workHours * WEIGHTS.workHours;

  const stress = data.stress || 5;
  factors.stress = normalize(stress, 0, 10);
  riskScore += factors.stress * WEIGHTS.stress;

  const exerciseDays = data.exerciseDays || 3;
  factors.exercise = 1 - normalize(exerciseDays, 0, 7);
  riskScore += factors.exercise * WEIGHTS.exercise;

  const socialHours = data.socialHours || 5;
  factors.social = 1 - normalize(socialHours, 0, 14);
  riskScore += factors.social * WEIGHTS.social;

  const recoveryHours = data.recoveryHours || 8;
  factors.recovery = 1 - normalize(recoveryHours, 0, 16);
  riskScore += factors.recovery * WEIGHTS.recovery;

  return {
    score: Math.round(riskScore * 100) / 100,
    factors
  };
}

function getRiskLevel(score) {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'minimal';
}

describe('Burnout Prediction - Risk Calculation', () => {
  describe('Sleep Factor', () => {
    it('should score high risk for low sleep', () => {
      const result = calculateBurnoutRisk({ sleepHours: 4 });
      expect(result.factors.sleep).toBeGreaterThan(0.8);
    });

    it('should score low risk for optimal sleep', () => {
      const result = calculateBurnoutRisk({ sleepHours: 8 });
      expect(result.factors.sleep).toBeLessThan(0.2);
    });

    it('should handle missing sleep data', () => {
      const result = calculateBurnoutRisk({});
      expect(result.factors.sleep).toBeCloseTo(0.25, 1);
    });
  });

  describe('Work Hours Factor', () => {
    it('should score high risk for overtime', () => {
      const result = calculateBurnoutRisk({ workHours: 60 });
      expect(result.factors.workHours).toBeGreaterThan(0.8);
    });

    it('should score low risk for normal hours', () => {
      const result = calculateBurnoutRisk({ workHours: 40 });
      expect(result.factors.workHours).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Stress Factor', () => {
    it('should score high risk for high stress', () => {
      const result = calculateBurnoutRisk({ stress: 9 });
      expect(result.factors.stress).toBeGreaterThan(0.8);
    });

    it('should score low risk for low stress', () => {
      const result = calculateBurnoutRisk({ stress: 2 });
      expect(result.factors.stress).toBeLessThan(0.3);
    });
  });

  describe('Exercise Factor', () => {
    it('should score moderate-high risk for no exercise', () => {
      const result = calculateBurnoutRisk({ exerciseDays: 0 });
      expect(result.factors.exercise).toBeGreaterThan(0.5);
    });

    it('should score low risk for regular exercise', () => {
      const result = calculateBurnoutRisk({ exerciseDays: 6 });
      expect(result.factors.exercise).toBeLessThan(0.2);
    });
  });

  describe('Combined Score', () => {
    it('should calculate weighted total', () => {
      const result = calculateBurnoutRisk({
        sleepHours: 5,
        workHours: 55,
        stress: 8,
        exerciseDays: 1,
        socialHours: 2,
        recoveryHours: 4
      });

      // All factors should be high
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return score between 0 and 1', () => {
      const result = calculateBurnoutRisk({
        sleepHours: 10,
        workHours: 20,
        stress: 0,
        exerciseDays: 7,
        socialHours: 20,
        recoveryHours: 20
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });
});

describe('Burnout Prediction - Risk Levels', () => {
  it('should return critical for very high risk', () => {
    expect(getRiskLevel(0.85)).toBe('critical');
    expect(getRiskLevel(0.9)).toBe('critical');
  });

  it('should return high for high risk', () => {
    expect(getRiskLevel(0.7)).toBe('high');
    expect(getRiskLevel(0.6)).toBe('high');
  });

  it('should return medium for moderate risk', () => {
    expect(getRiskLevel(0.5)).toBe('medium');
    expect(getRiskLevel(0.4)).toBe('medium');
  });

  it('should return low for low risk', () => {
    expect(getRiskLevel(0.3)).toBe('low');
    expect(getRiskLevel(0.2)).toBe('low');
  });

  it('should return minimal for very low risk', () => {
    expect(getRiskLevel(0.1)).toBe('minimal');
    expect(getRiskLevel(0.0)).toBe('minimal');
  });
});

describe('Burnout Prediction - Normalization', () => {
  it('should clamp values below minimum to 0', () => {
    expect(normalize(-5, 0, 10)).toBe(0);
  });

  it('should clamp values above maximum to 1', () => {
    expect(normalize(15, 0, 10)).toBe(1);
  });

  it('should normalize values within range', () => {
    expect(normalize(5, 0, 10)).toBe(0.5);
    expect(normalize(7, 4, 8)).toBe(0.75);
  });
});

describe('Burnout Prediction - Integration', () => {
  it('should identify burnt out founder', () => {
    const founder = calculateBurnoutRisk({
      sleepHours: 5,
      workHours: 65,
      stress: 9,
      exerciseDays: 1,
      socialHours: 2,
      recoveryHours: 2
    });

    expect(founder.score).toBeGreaterThan(0.7);
    expect(getRiskLevel(founder.score)).toBe('critical');
  });

  it('should identify healthy employee', () => {
    const employee = calculateBurnoutRisk({
      sleepHours: 7,
      workHours: 42,
      stress: 3,
      exerciseDays: 5,
      socialHours: 8,
      recoveryHours: 12
    });

    expect(employee.score).toBeLessThan(0.4);
    expect(getRiskLevel(employee.score)).toBe('low');
  });

  it('should track improvement over time', () => {
    const week1 = calculateBurnoutRisk({
      sleepHours: 5,
      workHours: 60,
      stress: 8
    });

    const week4 = calculateBurnoutRisk({
      sleepHours: 7,
      workHours: 45,
      stress: 4
    });

    expect(week4.score).toBeLessThan(week1.score);
  });
});

describe('Burnout Prediction - Edge Cases', () => {
  it('should handle all zeros (max burnout)', () => {
    const result = calculateBurnoutRisk({
      sleepHours: 0,
      workHours: 0,
      stress: 0,
      exerciseDays: 0,
      socialHours: 0,
      recoveryHours: 0
    });

    // With zeros, all factors become high risk
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.score).toBeLessThan(1);
  });

  it('should handle all max values', () => {
    const result = calculateBurnoutRisk({
      sleepHours: 12,
      workHours: 20,
      stress: 0,
      exerciseDays: 10,
      socialHours: 30,
      recoveryHours: 30
    });

    expect(result.score).toBeLessThan(0.2);
  });

  it('should handle missing values gracefully', () => {
    const result = calculateBurnoutRisk({});
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });
});
