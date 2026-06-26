import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock lead twin constants
const LEAD_SOURCES = ['organic', 'paid', 'referral', 'social', 'email', 'cold_outreach'];
const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
const LEAD_TEMPERATURES = ['cold', 'warm', 'hot'];

describe('Lead Twin', () => {
  describe('Lead Sources', () => {
    it('should have all lead acquisition channels', () => {
      expect(LEAD_SOURCES).toContain('organic');
      expect(LEAD_SOURCES).toContain('paid');
      expect(LEAD_SOURCES).toContain('referral');
      expect(LEAD_SOURCES).toContain('social');
    });

    it('should have 6 lead sources', () => {
      expect(LEAD_SOURCES).toHaveLength(6);
    });
  });

  describe('Lead Stages', () => {
    it('should have full sales pipeline stages', () => {
      expect(LEAD_STAGES).toContain('new');
      expect(LEAD_STAGES).toContain('qualified');
      expect(LEAD_STAGES).toContain('closed_won');
      expect(LEAD_STAGES).toContain('closed_lost');
    });

    it('should have 7 lead stages', () => {
      expect(LEAD_STAGES).toHaveLength(7);
    });
  });

  describe('Lead Temperature', () => {
    it('should have 3 temperature levels', () => {
      expect(LEAD_TEMPERATURES).toHaveLength(3);
    });

    it('should order temperatures by heat', () => {
      expect(LEAD_TEMPERATURES.indexOf('cold')).toBeLessThan(LEAD_TEMPERATURES.indexOf('warm'));
      expect(LEAD_TEMPERATURES.indexOf('warm')).toBeLessThan(LEAD_TEMPERATURES.indexOf('hot'));
    });
  });

  describe('Lead Scoring', () => {
    const scoreLead = (
      engagementScore: number,
      fitScore: number,
      intentSignals: number
    ): number => {
      return Math.min(100, engagementScore + fitScore + intentSignals);
    };

    it('should calculate combined lead score', () => {
      const score = scoreLead(30, 40, 20);
      expect(score).toBe(90);
    });

    it('should cap score at 100', () => {
      const score = scoreLead(50, 50, 50);
      expect(score).toBe(100);
    });
  });

  describe('Lead Qualification', () => {
    const isQualified = (
      budget: number,
      authority: boolean,
      timeline: number,
      fit: boolean
    ): boolean => {
      return budget > 0 && authority && timeline <= 6 && fit;
    };

    it('should qualify leads with BANT', () => {
      expect(isQualified(50000, true, 3, true)).toBe(true);
    });

    it('should reject leads without budget', () => {
      expect(isQualified(0, true, 3, true)).toBe(false);
    });

    it('should reject leads without authority', () => {
      expect(isQualified(50000, false, 3, true)).toBe(false);
    });

    it('should reject leads with long timeline', () => {
      expect(isQualified(50000, true, 12, true)).toBe(false);
    });
  });

  describe('Lead Temperature Detection', () => {
    const detectTemperature = (
      emailOpens: number,
      websiteVisits: number,
      contentDownloads: number,
      meetingBooked: boolean
    ): string => {
      if (meetingBooked || contentDownloads >= 3) return 'hot';
      if (emailOpens >= 5 || websiteVisits >= 10) return 'warm';
      return 'cold';
    };

    it('should detect hot leads', () => {
      expect(detectTemperature(20, 30, 5, false)).toBe('hot');
    });

    it('should detect warm leads', () => {
      expect(detectTemperature(8, 15, 1, false)).toBe('warm');
    });

    it('should detect cold leads', () => {
      expect(detectTemperature(2, 3, 0, false)).toBe('cold');
    });
  });
});
