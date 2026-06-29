/**
 * Support Intelligence Tests
 */

import { describe, it, expect } from 'vitest';

function calculateSupportProfile(data) {
  const { ticketHistory, refundRequests, sentiment, channelHistory } = data || {};

  const tickets90d = ticketHistory?.last90d || 0;
  const refundRate = refundRequests && refundRequests.total > 0
    ? refundRequests.denied / refundRequests.total
    : 0;

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
  else if (sentiment === 'positive') tone = 'friendly';
  else tone = 'formal';

  let channel = 'whatsapp';
  if (channelHistory) {
    const channels = Object.entries(channelHistory).sort((a, b) => b[1] - a[1]);
    if (channels.length > 0) channel = channels[0][0];
  }

  let agent = 'ai';
  if (escalationProb > 0.5 || refundRate > 0.3) agent = 'human';
  if (tickets90d > 10) agent = 'specialist';

  let resolution = 'apology';
  if (refundRate > 0.3) resolution = 'refund';
  else if (escalationProb > 0.5) resolution = 'escalate';
  else if (sentiment === 'positive') resolution = 'thank_you';

  return {
    tickets_90d: tickets90d,
    refund_rate: Math.round(refundRate * 100) / 100,
    sentiment: sentiment || 'neutral',
    escalation_probability: Math.round(escalationProb * 100) / 100,
    priority,
    recommended_tone: tone,
    preferred_channel: channel,
    recommended_agent: agent,
    likely_resolution: resolution,
    wait_time_tolerance: escalationProb > 0.5 ? 'low' : 'medium'
  };
}

describe('Support Intelligence', () => {
  describe('Escalation Probability', () => {
    it('should start at 0.1 baseline', () => {
      const result = calculateSupportProfile({});
      expect(result.escalation_probability).toBe(0.1);
    });

    it('should increase with escalations', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 2, last90d: 5 }
      });
      expect(result.escalation_probability).toBeGreaterThan(0.1);
    });

    it('should cap at 1.0', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 20, last90d: 20 },
        sentiment: 'negative'
      });
      expect(result.escalation_probability).toBe(1);
    });
  });

  describe('Priority', () => {
    it('should default to normal', () => {
      const result = calculateSupportProfile({});
      expect(result.priority).toBe('normal');
    });

    it('should be high with many tickets', () => {
      const result = calculateSupportProfile({
        ticketHistory: { last90d: 15 }
      });
      expect(result.priority).toBe('high');
    });
  });

  describe('Recommended Tone', () => {
    it('should be empathetic for negative sentiment', () => {
      const result = calculateSupportProfile({ sentiment: 'negative' });
      expect(result.recommended_tone).toBe('empathetic');
    });

    it('should be friendly for positive sentiment', () => {
      const result = calculateSupportProfile({ sentiment: 'positive' });
      expect(result.recommended_tone).toBe('friendly');
    });
  });

  describe('Recommended Agent', () => {
    it('should default to ai', () => {
      const result = calculateSupportProfile({});
      expect(result.recommended_agent).toBe('ai');
    });

    it('should recommend human for high escalation', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 5 }
      });
      expect(result.recommended_agent).toBe('human');
    });
  });
});
