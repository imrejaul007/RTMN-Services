/**
 * Communication Preference - Tests
 */

import { describe, it, expect } from 'vitest';

function calculateCommunicationPreferences(data) {
  const { channelHistory, sentimentHistory } = data;

  let channel = 'whatsapp';
  if (channelHistory) {
    const channels = [
      { name: 'whatsapp', count: channelHistory.whatsapp || 0 },
      { name: 'email', count: channelHistory.email || 0 }
    ];
    channels.sort((a, b) => b.count - a.count);
    channel = channels[0].name;
  }

  let tone = 'friendly';
  if (sentimentHistory?.negative > sentimentHistory?.positive) {
    tone = 'empathetic';
  }

  return { preferred_channel: channel, preferred_tone: tone };
}

describe('Communication Preference', () => {
  it('should prefer WhatsApp by default', () => {
    const result = calculateCommunicationPreferences({});
    expect(result.preferred_channel).toBe('whatsapp');
  });

  it('should detect channel preference from history', () => {
    const result = calculateCommunicationPreferences({
      channelHistory: { whatsapp: 5, email: 50 }
    });
    expect(result.preferred_channel).toBe('email');
  });

  it('should recommend empathetic tone for negative sentiment', () => {
    const result = calculateCommunicationPreferences({
      sentimentHistory: { positive: 1, negative: 5 }
    });
    expect(result.preferred_tone).toBe('empathetic');
  });
});
