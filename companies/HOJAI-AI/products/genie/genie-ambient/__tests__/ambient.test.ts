/**
 * Ambient Intelligence Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { checkWellness } from '../src/services/wellnessChecker.js';
import { checkRelationships } from '../src/services/relationshipChecker.js';
import { AmbientSignals } from '../src/types/alert.js';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    set: vi.fn().mockResolvedValue('OK'),
    sadd: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    smembers: vi.fn().mockResolvedValue([]),
  })),
}));

describe('Wellness Checker', () => {
  it('should alert for sleep < 6 hours', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      sleep: { hours: 5, quality: 'poor', trend: 'declining' },
    };

    const alerts = await checkWellness(signals);
    const tiredAlert = alerts.find(a => a.title.includes('tired'));

    expect(tiredAlert).toBeDefined();
    expect(tiredAlert?.severity).toBe('urgent');
  });

  it('should alert for declining sleep trend', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      sleep: { hours: 7, quality: 'fair', trend: 'declining' },
    };

    const alerts = await checkWellness(signals);
    const trendAlert = alerts.find(a => a.title.includes('declining'));

    expect(trendAlert).toBeDefined();
  });

  it('should alert for meeting overload', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      calendar: {
        meetingsToday: 10,
        meetingsThisWeek: 40,
        focusTime: 0,
        overdueTasks: 0,
      },
    };

    const alerts = await checkWellness(signals);
    const overloadAlert = alerts.find(a => a.title.includes('overload'));

    expect(overloadAlert).toBeDefined();
  });

  it('should alert for overdue tasks', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      calendar: {
        meetingsToday: 2,
        meetingsThisWeek: 8,
        focusTime: 120,
        overdueTasks: 5,
      },
    };

    const alerts = await checkWellness(signals);
    const overdueAlert = alerts.find(a => a.title.includes('overdue'));

    expect(overdueAlert).toBeDefined();
  });

  it('should return empty for healthy signals', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      sleep: { hours: 8, quality: 'good', trend: 'stable' },
      calendar: { meetingsToday: 2, meetingsThisWeek: 8, focusTime: 240, overdueTasks: 0 },
    };

    const alerts = await checkWellness(signals);
    expect(alerts.length).toBe(0);
  });
});

describe('Relationship Checker', () => {
  it('should alert for long contact gap with important person', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      relationships: {
        longestContactGap: {
          personId: 'p_1',
          personName: 'Mom',
          days: 20,
        },
        upcomingBirthdays: [],
      },
    };

    const alerts = await checkRelationships(signals);
    const callAlert = alerts.find(a => a.title.includes('Mom'));

    expect(callAlert).toBeDefined();
    expect(callAlert?.severity).toBe('gentle');
  });

  it('should make urgent for 30+ day gap', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      relationships: {
        longestContactGap: {
          personId: 'p_1',
          personName: 'Dad',
          days: 45,
        },
        upcomingBirthdays: [],
      },
    };

    const alerts = await checkRelationships(signals);
    const callAlert = alerts.find(a => a.title.includes('Dad'));

    expect(callAlert?.severity).toBe('urgent');
  });

  it('should not alert for short gaps', async () => {
    const signals: AmbientSignals = {
      userId: 'user_123',
      relationships: {
        longestContactGap: {
          personId: 'p_1',
          personName: 'Coworker',
          days: 5,
        },
        upcomingBirthdays: [],
      },
    };

    const alerts = await checkRelationships(signals);
    expect(alerts.length).toBe(0);
  });
});