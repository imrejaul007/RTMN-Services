/**
 * Learning Loop Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { extractPreferencesPattern } from '../src/services/preferenceLearner.js';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    pipeline: () => ({
      set: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    get: vi.fn().mockResolvedValue(null),
    smembers: vi.fn().mockResolvedValue([]),
  })),
}));

describe('Preference Learner (Pattern)', () => {
  it('should extract meeting avoidance', () => {
    const result = extractPreferencesPattern("I don't like meetings after 8 PM");
    expect(result.preferences.length).toBeGreaterThan(0);
    expect(result.preferences[0].pattern).toContain('avoid_meetings');
  });

  it('should extract morning focus', () => {
    const result = extractPreferencesPattern('I work better in morning');
    expect(result.preferences.length).toBeGreaterThan(0);
    expect(result.preferences[0].pattern).toBe('morning_focus');
  });

  it('should extract email preference', () => {
    const result = extractPreferencesPattern('I prefer email over calls');
    expect(result.preferences.length).toBeGreaterThan(0);
    expect(result.preferences[0].pattern).toBe('prefer_email');
  });

  it('should extract sleep target', () => {
    const result = extractPreferencesPattern('I need 7 hours of sleep');
    expect(result.preferences.length).toBeGreaterThan(0);
    expect(result.preferences[0].pattern).toBe('sleep_target');
  });

  it('should return empty for non-preference text', () => {
    const result = extractPreferencesPattern('The weather is nice today');
    expect(result.preferences.length).toBe(0);
  });
});