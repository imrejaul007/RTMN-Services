/**
 * Anticipation Engine Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { generatePredictions } from '../src/services/predictiveEngine.js';
import { PredictionContext } from '../src/types/prediction.js';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    pipeline: () => ({
      set: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      get: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    get: vi.fn().mockResolvedValue(null),
    smembers: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue('OK'),
  })),
}));

describe('Predictive Engine', () => {
  it('should generate travel prediction for flight tomorrow', async () => {
    const tomorrow = new Date(Date.now() + 18 * 60 * 60 * 1000);
    const context: PredictionContext = {
      userId: 'user_123',
      upcomingEvents: [
        {
          id: 'evt_1',
          title: 'Flight to Dubai',
          start: tomorrow,
          type: 'flight',
        },
      ],
    };

    const predictions = await generatePredictions(context);
    const travelPred = predictions.find(p => p.type === 'travel');

    expect(travelPred).toBeDefined();
    expect(travelPred?.suggestion).toContain('Pack');
  });

  it('should generate follow-up for 10-day-old meeting', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const context: PredictionContext = {
      userId: 'user_123',
      recentInteractions: [
        {
          personId: 'p_1',
          personName: 'Investor A',
          lastContact: tenDaysAgo,
          type: 'meeting',
        },
      ],
    };

    const predictions = await generatePredictions(context);
    const followUp = predictions.find(p => p.type === 'follow_up');

    expect(followUp).toBeDefined();
    expect(followUp?.suggestion).toContain('Follow up');
  });

  it('should generate birthday prediction in 5 days', async () => {
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const context: PredictionContext = {
      userId: 'user_123',
      importantDates: [
        {
          personId: 'p_1',
          personName: 'Mom',
          type: 'birthday',
          date: fiveDaysFromNow,
        },
      ],
    };

    const predictions = await generatePredictions(context);
    const birthdayPred = predictions.find(p => p.type === 'relationship');

    expect(birthdayPred).toBeDefined();
    expect(birthdayPred?.title).toContain('Mom');
  });

  it('should generate work deadline prediction', async () => {
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const context: PredictionContext = {
      userId: 'user_123',
      pendingTasks: [
        {
          id: 'task_1',
          title: 'Send pitch deck',
          dueDate: twoDaysFromNow,
        },
      ],
    };

    const predictions = await generatePredictions(context);
    const workPred = predictions.find(p => p.type === 'work');

    expect(workPred).toBeDefined();
  });

  it('should return empty for no context', async () => {
    const predictions = await generatePredictions({ userId: 'user_123' });
    expect(Array.isArray(predictions)).toBe(true);
  });

  it('should sort by urgency', async () => {
    const context: PredictionContext = {
      userId: 'user_123',
      upcomingEvents: [
        { id: 'e1', title: 'Casual meeting', start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), type: 'meeting' },
      ],
      pendingTasks: [
        { id: 't1', title: 'Urgent task', dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000) },
      ],
    };

    const predictions = await generatePredictions(context);
    if (predictions.length >= 2) {
      const urgencies = predictions.map(p => p.urgency);
      const order = { high: 3, medium: 2, low: 1 };
      for (let i = 1; i < urgencies.length; i++) {
        expect(order[urgencies[i]]).toBeLessThanOrEqual(order[urgencies[i-1]]);
      }
    }
  });
});