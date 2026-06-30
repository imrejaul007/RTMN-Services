import { describe, it, expect } from 'vitest';

// Company Emotion Unit Tests

function calculateMorale(scores) {
  const weights = { happiness: 0.3, engagement: 0.25, stress: 0.25, trust: 0.2 };
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) {
      total += scores[key] * weight;
      weightSum += weight;
    }
  }
  return Math.round((total / weightSum) * 100) / 100;
}

function getMoraleLevel(score) {
  if (score >= 80) return { level: 'excellent', emoji: '🚀' };
  if (score >= 60) return { level: 'good', emoji: '😊' };
  if (score >= 40) return { level: 'moderate', emoji: '😐' };
  if (score >= 20) return { level: 'concerning', emoji: '😟' };
  return { level: 'critical', emoji: '🚨' };
}

function calculateBurnoutRisk(employee) {
  let risk = 0.3;
  if (employee.avgStress > 60) risk += 0.2;
  else if (employee.avgStress > 40) risk += 0.1;
  if (employee.avgHappiness < 40) risk += 0.2;
  else if (employee.avgHappiness < 60) risk += 0.1;
  return Math.min(1, risk);
}

describe('Company Emotion - Morale Calculation', () => {
  it('should calculate morale correctly', () => {
    const scores = { happiness: 80, engagement: 80, stress: 20, trust: 80 };
    const morale = calculateMorale(scores);
    expect(morale).toBeGreaterThan(50);
    expect(morale).toBeLessThan(100);
  });

  it('should handle partial scores', () => {
    const scores = { happiness: 70 };
    expect(calculateMorale(scores)).toBe(70);
  });
});

describe('Company Emotion - Morale Levels', () => {
  it('should return excellent for score >= 80', () => {
    expect(getMoraleLevel(85).level).toBe('excellent');
  });

  it('should return good for score >= 60', () => {
    expect(getMoraleLevel(65).level).toBe('good');
  });

  it('should return moderate for score >= 40', () => {
    expect(getMoraleLevel(45).level).toBe('moderate');
  });

  it('should return concerning for score >= 20', () => {
    expect(getMoraleLevel(25).level).toBe('concerning');
  });

  it('should return critical for score < 20', () => {
    expect(getMoraleLevel(15).level).toBe('critical');
  });
});

describe('Company Emotion - Burnout Risk', () => {
  it('should calculate high risk for high stress', () => {
    const employee = { avgStress: 70, avgHappiness: 50 };
    const risk = calculateBurnoutRisk(employee);
    expect(risk).toBeGreaterThan(0.3);
  });

  it('should calculate low risk for healthy employee', () => {
    const employee = { avgStress: 20, avgHappiness: 80 };
    const risk = calculateBurnoutRisk(employee);
    expect(risk).toBeLessThan(0.5);
  });
});

describe('Company Emotion - Integration', () => {
  it('should model engineering department', () => {
    const scores = { happiness: 85, engagement: 90, stress: 40, trust: 80 };
    const morale = calculateMorale(scores);
    const level = getMoraleLevel(morale);
    expect(['good', 'excellent']).toContain(level.level);
  });

  it('should model sales team during crunch', () => {
    const scores = { happiness: 40, engagement: 60, stress: 80, trust: 50 };
    const morale = calculateMorale(scores);
    expect(morale).toBeLessThan(70);
  });

  it('should aggregate team morale', () => {
    const teams = [
      { happiness: 80, engagement: 80, stress: 30, trust: 75 },
      { happiness: 70, engagement: 75, stress: 40, trust: 70 }
    ];

    const avgHappiness = teams.reduce((s, t) => s + t.happiness, 0) / teams.length;
    const morale = calculateMorale({ happiness: avgHappiness });
    expect(morale).toBeGreaterThan(60);
  });
});
