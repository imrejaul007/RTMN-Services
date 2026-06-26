import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock deal twin constants
const DEAL_STAGES = ['qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
const DEAL_PRIORITIES = ['low', 'medium', 'high', 'critical'];

describe('Deal Twin', () => {
  describe('Deal Stages', () => {
    it('should have all sales pipeline stages', () => {
      expect(DEAL_STAGES).toContain('qualification');
      expect(DEAL_STAGES).toContain('proposal');
      expect(DEAL_STAGES).toContain('negotiation');
      expect(DEAL_STAGES).toContain('closing');
    });

    it('should have terminal states', () => {
      expect(DEAL_STAGES).toContain('won');
      expect(DEAL_STAGES).toContain('lost');
    });

    it('should have 6 deal stages', () => {
      expect(DEAL_STAGES).toHaveLength(6);
    });
  });

  describe('Deal Priorities', () => {
    it('should have 4 priority levels', () => {
      expect(DEAL_PRIORITIES).toHaveLength(4);
    });

    it('should order priorities correctly', () => {
      const priorityOrder = DEAL_PRIORITIES.indexOf.bind(DEAL_PRIORITIES);
      expect(priorityOrder('critical')).toBeLessThan(priorityOrder('high'));
      expect(priorityOrder('high')).toBeLessThan(priorityOrder('medium'));
    });
  });

  describe('Deal Probability', () => {
    const stageProbabilities: Record<string, number> = {
      qualification: 10,
      proposal: 25,
      negotiation: 50,
      closing: 75,
      won: 100,
      lost: 0,
    };

    it('should have correct probability per stage', () => {
      expect(stageProbabilities['qualification']).toBe(10);
      expect(stageProbabilities['proposal']).toBe(25);
      expect(stageProbabilities['negotiation']).toBe(50);
      expect(stageProbabilities['closing']).toBe(75);
    });

    it('should have 100% for won deals', () => {
      expect(stageProbabilities['won']).toBe(100);
    });

    it('should have 0% for lost deals', () => {
      expect(stageProbabilities['lost']).toBe(0);
    });
  });

  describe('Weighted Pipeline Value', () => {
    const calculateWeightedValue = (
      dealValue: number,
      stageProbability: number
    ): number => {
      return dealValue * (stageProbability / 100);
    };

    it('should calculate weighted value for proposal stage', () => {
      const weighted = calculateWeightedValue(100000, 25);
      expect(weighted).toBe(25000);
    });

    it('should return full value for won deals', () => {
      const weighted = calculateWeightedValue(100000, 100);
      expect(weighted).toBe(100000);
    });

    it('should return zero for lost deals', () => {
      const weighted = calculateWeightedValue(100000, 0);
      expect(weighted).toBe(0);
    });
  });

  describe('Deal Aging', () => {
    const isDealStale = (
      createdAt: Date,
      currentStage: string
    ): boolean => {
      const daysSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const maxDays: Record<string, number> = {
        qualification: 7,
        proposal: 14,
        negotiation: 30,
        closing: 45,
      };
      return daysSinceCreation > (maxDays[currentStage] || 30);
    };

    it('should flag stale qualification deals', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      expect(isDealStale(tenDaysAgo, 'qualification')).toBe(true);
    });

    it('should not flag fresh negotiation deals', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(isDealStale(fiveDaysAgo, 'negotiation')).toBe(false);
    });
  });
});
