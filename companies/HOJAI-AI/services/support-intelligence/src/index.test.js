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

    it('should increase with negative sentiment', () => {
      const normal = calculateSupportProfile({});
      const negative = calculateSupportProfile({ sentiment: 'negative' });
      expect(negative.escalation_probability).toBeGreaterThan(normal.escalation_probability);
    });

    it('should increase with high ticket volume', () => {
      const result = calculateSupportProfile({
        ticketHistory: { last90d: 10 }
      });
      expect(result.escalation_probability).toBeGreaterThan(0.1);
    });
  });

  describe('Priority', () => {
    it('should default to normal', () => {
      const result = calculateSupportProfile({});
      expect(result.priority).toBe('normal');
    });

    it('should be high with high escalation prob', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 5 },
        sentiment: 'negative'
      });
      expect(result.priority).toBe('high');
    });

    it('should be high with many tickets', () => {
      const result = calculateSupportProfile({
        ticketHistory: { last90d: 15 }
      });
      expect(result.priority).toBe('high');
    });

    it('should be low with low escalation and few tickets', () => {
      const result = calculateSupportProfile({
        ticketHistory: { last90d: 1, escalations: 0 }
      });
      expect(result.priority).toBe('low');
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

    it('should be formal for neutral sentiment', () => {
      const result = calculateSupportProfile({ sentiment: 'neutral' });
      expect(result.recommended_tone).toBe('formal');
    });
  });

  describe('Preferred Channel', () => {
    it('should default to whatsapp', () => {
      const result = calculateSupportProfile({});
      expect(result.preferred_channel).toBe('whatsapp');
    });

    it('should use most frequent channel', () => {
      const result = calculateSupportProfile({
        channelHistory: { email: 5, whatsapp: 20, phone: 10 }
      });
      expect(result.preferred_channel).toBe('whatsapp');
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

    it('should recommend human for high refund rate', () => {
      const result = calculateSupportProfile({
        refundRequests: { total: 10, denied: 5 }
      });
      expect(result.recommended_agent).toBe('human');
    });

    it('should recommend specialist for very high ticket volume', () => {
      const result = calculateSupportProfile({
        ticketHistory: { last90d: 15 }
      });
      expect(result.recommended_agent).toBe('specialist');
    });
  });

  describe('Likely Resolution', () => {
    it('should default to apology', () => {
      const result = calculateSupportProfile({});
      expect(result.likely_resolution).toBe('apology');
    });

    it('should be refund for high refund rate', () => {
      const result = calculateSupportProfile({
        refundRequests: { total: 10, denied: 5 }
      });
      expect(result.likely_resolution).toBe('refund');
    });

    it('should be escalate for high escalation prob', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 5 },
        sentiment: 'negative'
      });
      expect(result.likely_resolution).toBe('escalate');
    });

    it('should be thank_you for positive sentiment', () => {
      const result = calculateSupportProfile({ sentiment: 'positive' });
      expect(result.likely_resolution).toBe('thank_you');
    });
  });

  describe('Wait Time Tolerance', () => {
    it('should be medium by default', () => {
      const result = calculateSupportProfile({});
      expect(result.wait_time_tolerance).toBe('medium');
    });

    it('should be low for high escalation', () => {
      const result = calculateSupportProfile({
        ticketHistory: { escalations: 5 }
      });
      expect(result.wait_time_tolerance).toBe('low');
    });
  });
});
