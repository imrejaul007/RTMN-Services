/**
 * Support Intelligence - Tests
 */

import { describe, it, expect } from 'vitest';

function calculateSupportProfile(data) {
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

  let tone = 'friendly';
  if (sentiment === 'negative') tone = 'empathetic';

  return { priority, tone, escalation_probability: escalationProb };
}

describe('Support Intelligence', () => {
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

    expect(result.priority).toBe('normal');
    expect(result.tone).toBe('friendly');
  });
});
