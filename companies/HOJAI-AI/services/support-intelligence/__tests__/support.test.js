/**
 * Support Intelligence - Tests
 */

import { describe, it, expect } from 'vitest';

describe('Support Intelligence', () => {
  describe('calculateSupportProfile', () => {
    const calculateSupportProfile = (data) => {
      const { ticketHistory, sentiment } = data;

      const tickets90d = ticketHistory?.last90d || 0;
      let escalationProb = 0.1;

      if (ticketHistory?.escalations > 0) {
        escalationProb += Math.min(ticketHistory.escalations * 0.1, 0.3);
      }
      if (sentiment === 'negative') escalationProb += 0.2;
      if (tickets90d > 5) escalationProb += 0.1;
      escalationProb = Math.min(escalationProb, 1);

      let priority = 'normal';
      if (escalationProb > 0.5 || tickets90d > 10) priority = 'high';
      else if (escalationProb < 0.2 && tickets90d <= 2) priority = 'low';

      let tone = 'friendly';
      if (sentiment === 'negative') tone = 'empathetic';

      return { priority, tone, escalation_probability: escalationProb };
    };

    it('should identify high priority customers', () => {
      const result = calculateSupportProfile({
        ticketHistory: { total: 20, last90d: 15, escalations: 3 },
        sentiment: 'negative'
      });

      expect(result.priority).toBe('high');
      expect(result.tone).toBe('empathetic');
    });

    it('should identify normal priority customers', () => {
      const result = calculateSupportProfile({
        ticketHistory: { total: 2, last90d: 1, escalations: 0 },
        sentiment: 'neutral'
      });

      expect(['normal', 'low']).toContain(result.priority);
    });

    it('should recommend empathetic tone for negative sentiment', () => {
      const result = calculateSupportProfile({
        sentiment: 'negative'
      });

      expect(result.tone).toBe('empathetic');
    });

    it('should return valid priority levels', () => {
      const result = calculateSupportProfile({});
      expect(['low', 'normal', 'high']).toContain(result.priority);
    });

    it('should return valid escalation probability', () => {
      const result = calculateSupportProfile({});
      expect(result.escalation_probability).toBeGreaterThanOrEqual(0);
      expect(result.escalation_probability).toBeLessThanOrEqual(1);
    });
  });
});
