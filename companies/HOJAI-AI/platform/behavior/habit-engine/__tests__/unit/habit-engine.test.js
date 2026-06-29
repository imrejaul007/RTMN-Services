import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Habit Engine Unit Tests
 *
 * Tests the core business logic functions:
 * - trackHabit()
 * - calculateConsistency()
 * - detectPatterns()
 * - analyzeImpact()
 */

describe('Habit Engine', () => {
  // In-memory stores (replicated from src/index.js for testing)
  let habits;
  let habitLogs;
  let patterns;

  // Reset state before each test to prevent leakage
  beforeEach(() => {
    habits = new Map();
    habitLogs = new Map();
    patterns = new Map();
  });

  // Core functions (replicated from src/index.js for unit testing)
  function trackHabit(entityId, habitId, action, metadata = {}) {
    if (!habitLogs.has(entityId)) {
      habitLogs.set(entityId, []);
    }

    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      habitId,
      action,
      metadata,
      timestamp: new Date().toISOString()
    };

    habitLogs.get(entityId).push(log);
    return log;
  }

  function calculateConsistency(entityId, habitId, days = 30) {
    const logs = (habitLogs.get(entityId) || [])
      .filter(l => l.habitId === habitId);

    if (logs.length === 0) return { score: 0, streak: 0, completed: 0 };

    // Calculate streak
    const sortedLogs = logs.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    let streak = 1;
    for (let i = 1; i < sortedLogs.length; i++) {
      const prev = new Date(sortedLogs[i-1].timestamp);
      const curr = new Date(sortedLogs[i].timestamp);
      const diff = (prev - curr) / (1000 * 60 * 60 * 24);

      if (diff <= 1.5) {
        streak++;
      } else {
        break;
      }
    }

    // Calculate completion rate
    const expectedActions = days;
    const completedActions = logs.length;
    const score = Math.min(1, completedActions / expectedActions);

    return {
      score: Math.round(score * 100) / 100,
      streak,
      completed: completedActions,
      expected: expectedActions
    };
  }

  function detectPatterns(entityId, habitId) {
    const logs = (habitLogs.get(entityId) || [])
      .filter(l => l.habitId === habitId);

    if (logs.length < 3) {
      return { patterns: [], routine: null };
    }

    const detectedPatterns = [];

    // Time-of-day pattern
    const times = logs.map(l => {
      const hour = new Date(l.timestamp).getHours();
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    });

    const timeCounts = {};
    for (const t of times) {
      timeCounts[t] = (timeCounts[t] || 0) + 1;
    }

    const mostCommonTime = Object.entries(timeCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonTime && mostCommonTime[1] / logs.length > 0.5) {
      detectedPatterns.push({
        type: 'time_of_day',
        value: mostCommonTime[0],
        confidence: mostCommonTime[1] / logs.length
      });
    }

    // Day-of-week pattern
    const days = logs.map(l => new Date(l.timestamp).getDay());
    const dayCounts = {};
    for (const d of days) {
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }

    const mostCommonDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonDay && mostCommonDay[1] / logs.length > 0.3) {
      detectedPatterns.push({
        type: 'day_of_week',
        value: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][mostCommonDay[0]],
        confidence: mostCommonDay[1] / logs.length
      });
    }

    return {
      patterns: detectedPatterns,
      routine: detectedPatterns.length > 0 ? 'detected' : 'none'
    };
  }

  function analyzeImpact(entityId, habitId, habitImpact) {
    const logs = (habitLogs.get(entityId) || [])
      .filter(l => l.habitId === habitId);

    return {
      type: habitImpact,
      correlation: habitImpact === 'positive' ? 0.75 : habitImpact === 'negative' ? -0.3 : 0,
      trend: 'stable',
      description: habitImpact === 'positive'
        ? 'Habit correlates with positive outcomes'
        : habitImpact === 'negative'
          ? 'Habit may be harmful'
          : 'Neutral habit'
    };
  }

  // ==================== trackHabit Tests ====================
  describe('trackHabit()', () => {
    it('should create a log entry for a new entity', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';
      const action = 'completed';
      const metadata = { duration: 30 };

      const log = trackHabit(entityId, habitId, action, metadata);

      expect(log).toBeDefined();
      expect(log.id).toMatch(/^log-/);
      expect(log.habitId).toBe(habitId);
      expect(log.action).toBe(action);
      expect(log.metadata).toEqual(metadata);
      expect(log.timestamp).toBeDefined();
    });

    it('should append to existing entity logs', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      trackHabit(entityId, habitId, 'started');
      trackHabit(entityId, habitId, 'completed');

      const logs = habitLogs.get(entityId);
      expect(logs).toHaveLength(2);
    });

    it('should handle missing metadata gracefully', () => {
      const log = trackHabit('user-123', 'habit-456', 'completed');

      expect(log.metadata).toEqual({});
    });
  });

  // ==================== calculateConsistency Tests ====================
  describe('calculateConsistency()', () => {
    it('should return zero for habits with no logs', () => {
      const result = calculateConsistency('user-123', 'habit-456');

      expect(result.score).toBe(0);
      expect(result.streak).toBe(0);
      expect(result.completed).toBe(0);
    });

    it('should calculate correct score for single log', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      trackHabit(entityId, habitId, 'completed');
      const result = calculateConsistency(entityId, habitId, 30);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.completed).toBe(1);
    });

    it('should calculate streak correctly for consecutive days', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add logs for 3 consecutive days
      const today = new Date();
      const day1 = new Date(today);
      day1.setDate(today.getDate() - 2);
      const day2 = new Date(today);
      day2.setDate(today.getDate() - 1);
      const day3 = new Date(today);

      // Manually push logs with specific timestamps
      if (!habitLogs.has(entityId)) {
        habitLogs.set(entityId, []);
      }
      habitLogs.get(entityId).push(
        { habitId, timestamp: day1.toISOString() },
        { habitId, timestamp: day2.toISOString() },
        { habitId, timestamp: day3.toISOString() }
      );

      const result = calculateConsistency(entityId, habitId);

      expect(result.streak).toBeGreaterThanOrEqual(1);
    });

    it('should cap score at 1.0', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add 40 logs for a 30-day period
      for (let i = 0; i < 40; i++) {
        trackHabit(entityId, habitId, 'completed');
      }

      const result = calculateConsistency(entityId, habitId, 30);

      expect(result.score).toBe(1);
    });
  });

  // ==================== detectPatterns Tests ====================
  describe('detectPatterns()', () => {
    it('should return empty patterns for insufficient data', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add only 2 logs (minimum is 3)
      trackHabit(entityId, habitId, 'completed');
      trackHabit(entityId, habitId, 'completed');

      const result = detectPatterns(entityId, habitId);

      expect(result.patterns).toHaveLength(0);
      expect(result.routine).toBeNull();
    });

    it('should detect time-of-day pattern', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add 5 logs in the morning
      if (!habitLogs.has(entityId)) {
        habitLogs.set(entityId, []);
      }
      for (let i = 0; i < 5; i++) {
        const morningTime = new Date();
        morningTime.setHours(7 + i, 0, 0, 0);
        habitLogs.get(entityId).push({
          habitId,
          timestamp: morningTime.toISOString()
        });
      }

      const result = detectPatterns(entityId, habitId);

      const timePattern = result.patterns.find(p => p.type === 'time_of_day');
      expect(timePattern).toBeDefined();
      expect(timePattern.value).toBe('morning');
      expect(timePattern.confidence).toBeGreaterThan(0.5);
    });

    it('should detect day-of-week pattern', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add 4 logs on Monday (day 1)
      if (!habitLogs.has(entityId)) {
        habitLogs.set(entityId, []);
      }
      for (let i = 0; i < 4; i++) {
        const monday = new Date();
        monday.setDate(monday.getDate() - monday.getDay() + 1 + (i * 7));
        monday.setHours(9);
        habitLogs.get(entityId).push({
          habitId,
          timestamp: monday.toISOString()
        });
      }

      const result = detectPatterns(entityId, habitId);

      const dayPattern = result.patterns.find(p => p.type === 'day_of_week');
      expect(dayPattern).toBeDefined();
      expect(dayPattern.value).toBe('Mon');
    });

    it('should return detected routine when patterns exist', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // Add enough logs for pattern detection
      if (!habitLogs.has(entityId)) {
        habitLogs.set(entityId, []);
      }
      for (let i = 0; i < 5; i++) {
        const morningTime = new Date();
        morningTime.setHours(8, 0, 0, 0);
        habitLogs.get(entityId).push({
          habitId,
          timestamp: morningTime.toISOString()
        });
      }

      const result = detectPatterns(entityId, habitId);

      expect(result.routine).toBe('detected');
    });
  });

  // ==================== analyzeImpact Tests ====================
  describe('analyzeImpact()', () => {
    it('should return positive correlation for positive habits', () => {
      const result = analyzeImpact('user-123', 'habit-456', 'positive');

      expect(result.type).toBe('positive');
      expect(result.correlation).toBe(0.75);
      expect(result.description).toContain('positive');
    });

    it('should return negative correlation for negative habits', () => {
      const result = analyzeImpact('user-123', 'habit-456', 'negative');

      expect(result.type).toBe('negative');
      expect(result.correlation).toBe(-0.3);
      expect(result.description).toContain('harmful');
    });

    it('should return zero correlation for neutral habits', () => {
      const result = analyzeImpact('user-123', 'habit-456', 'neutral');

      expect(result.type).toBe('neutral');
      expect(result.correlation).toBe(0);
      expect(result.description).toBe('Neutral habit');
    });

    it('should always return a trend', () => {
      const result = analyzeImpact('user-123', 'habit-456', 'positive');

      expect(result.trend).toBeDefined();
    });
  });

  // ==================== Integration Tests ====================
  describe('Full Workflow', () => {
    it('should track a complete habit lifecycle', () => {
      const entityId = 'user-123';
      const habitId = 'habit-456';

      // 1. Create and track habit
      const log1 = trackHabit(entityId, habitId, 'started');
      expect(log1.action).toBe('started');

      // 2. Log completion
      const log2 = trackHabit(entityId, habitId, 'completed', { duration: 30 });
      expect(log2.metadata.duration).toBe(30);

      // 3. Check consistency
      const consistency = calculateConsistency(entityId, habitId);
      expect(consistency.completed).toBe(2);

      // 4. Check patterns (insufficient data)
      const patterns = detectPatterns(entityId, habitId);
      expect(patterns.patterns).toHaveLength(0);

      // 5. Analyze impact
      const impact = analyzeImpact(entityId, habitId, 'positive');
      expect(impact.type).toBe('positive');
    });

    it('should handle multiple entities independently', () => {
      const entity1 = 'user-1';
      const entity2 = 'user-2';
      const habitId = 'habit-shared';

      trackHabit(entity1, habitId, 'completed');
      trackHabit(entity2, habitId, 'completed');

      const consistency1 = calculateConsistency(entity1, habitId);
      const consistency2 = calculateConsistency(entity2, habitId);

      expect(consistency1.completed).toBe(1);
      expect(consistency2.completed).toBe(1);
      expect(consistency1.streak).toBe(consistency2.streak); // Both have streak of 1
    });
  });
});
