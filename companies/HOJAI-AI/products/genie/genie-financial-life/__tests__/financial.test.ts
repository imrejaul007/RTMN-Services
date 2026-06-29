/**
 * Financial LifeOS Tests
 */

import { describe, it, expect } from 'vitest';
import { simulate } from '../src/services/futureSimulator.js';

describe('Future Simulator', () => {
  it('should calculate simple savings (no return)', () => {
    const result = simulate('user_123', 1000, 1, 0);
    expect(result.projectedValue).toBe(12000); // 1000 × 12
  });

  it('should calculate compound savings', () => {
    const result = simulate('user_123', 1000, 5, 0.10);
    // Should be greater than 60000 (simple) due to compound interest
    expect(result.projectedValue).toBeGreaterThan(60000);
  });

  it('should generate milestones for each year', () => {
    const result = simulate('user_123', 5000, 10, 0.08);
    expect(result.milestones.length).toBe(10);
    expect(result.milestones[0].year).toBe(1);
    expect(result.milestones[9].year).toBe(10);
  });

  it('should handle 50-year horizon', () => {
    const result = simulate('user_123', 10000, 50, 0.10);
    expect(result.projectedValue).toBeGreaterThan(0);
    expect(result.milestones.length).toBe(50);
  });

  it('should produce increasing milestone values', () => {
    const result = simulate('user_123', 1000, 5, 0.08);
    for (let i = 1; i < result.milestones.length; i++) {
      expect(result.milestones[i].value).toBeGreaterThanOrEqual(result.milestones[i-1].value);
    }
  });
});