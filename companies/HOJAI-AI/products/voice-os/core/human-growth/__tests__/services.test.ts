/**
 * Human Growth Engine - Service Tests
 */

import { describe, it, expect } from 'vitest';
import { GrowthTracker } from '../src/services/growthTracker.js';

describe('GrowthTracker', () => {
  const createTracker = () => new GrowthTracker();

  it('should create new metric when tracking first time', () => {
    const tracker = createTracker();
    const metric = tracker.track('user-1', 'skills', 'coding', 7, 'Great session');

    expect(metric.userId).toBe('user-1');
    expect(metric.category).toBe('skills');
    expect(metric.name).toBe('coding');
    expect(metric.currentLevel).toBe(7);
    expect(typeof metric.totalSessions).toBe('number');
  });

  it('should update existing metric', () => {
    const tracker = createTracker();
    tracker.track('user-1', 'skills', 'coding', 5);
    const updated = tracker.track('user-1', 'skills', 'coding', 7);

    expect(updated.totalSessions).toBeGreaterThanOrEqual(1);
    expect(updated.currentLevel).toBe(7);
  });

  it('should add to history', () => {
    const tracker = createTracker();
    tracker.track('user-1', 'habits', 'meditation', 6);
    const updated = tracker.track('user-1', 'habits', 'meditation', 8);

    expect(updated.history.length).toBeGreaterThanOrEqual(1);
  });

  it('should return undefined for non-existent metric', () => {
    const tracker = createTracker();
    const result = tracker.get('user-1', 'skills', 'non-existent');
    expect(result).toBeUndefined();
  });

  it('should return existing metric', () => {
    const tracker = createTracker();
    tracker.track('user-1', 'health', 'exercise', 8);
    const result = tracker.get('user-1', 'health', 'exercise');
    expect(result).toBeDefined();
  });

  it('should return all metrics for user', () => {
    const tracker = createTracker();
    tracker.track('user-1', 'skills', 'coding', 7);
    tracker.track('user-1', 'habits', 'reading', 5);
    tracker.track('user-2', 'health', 'exercise', 8);

    const user1Metrics = tracker.getAllForUser('user-1');
    expect(user1Metrics.length).toBe(2);
  });

  it('should return stable trend for insufficient data', () => {
    const tracker = createTracker();
    const metric = tracker.track('user-1', 'skills', 'test', 5);
    const trend = tracker.calculateTrend(metric);
    expect(trend).toBe('stable');
  });

  it('should generate weekly summary', () => {
    const tracker = createTracker();
    tracker.track('user-1', 'skills', 'coding', 5);
    tracker.track('user-1', 'skills', 'coding', 7);

    const summary = tracker.generateSummary('user-1', 7);
    expect(summary.userId).toBe('user-1');
    expect(summary.period).toBe('week');
  });
});
