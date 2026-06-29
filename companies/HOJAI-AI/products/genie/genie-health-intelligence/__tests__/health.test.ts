/**
 * Health Intelligence Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { predictBurnout, BurnoutRisk } from '../src/services/burnoutPredictor.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

describe('Burnout Predictor', () => {
  it('should return a valid burnout risk object', async () => {
    const risk = await predictBurnout('user_123');
    expect(risk).toHaveProperty('riskLevel');
    expect(risk).toHaveProperty('score');
    expect(risk).toHaveProperty('factors');
    expect(risk).toHaveProperty('recommendations');
  });

  it('should categorize risk levels correctly', async () => {
    const risk = await predictBurnout('user_123');
    expect(['low', 'medium', 'high']).toContain(risk.riskLevel);
  });

  it('should provide recommendations', async () => {
    const risk = await predictBurnout('user_123');
    expect(risk.recommendations).toBeDefined();
    expect(Array.isArray(risk.recommendations)).toBe(true);
  });

  it('should include factor weights', async () => {
    const risk = await predictBurnout('user_123');
    expect(risk.factors.length).toBeGreaterThan(0);
    for (const factor of risk.factors) {
      expect(factor).toHaveProperty('name');
      expect(factor).toHaveProperty('weight');
      expect(factor).toHaveProperty('value');
    }
  });
});