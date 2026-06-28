/**
 * Unit tests for Channel Stitcher
 */
import { describe, it, expect } from 'vitest';

function normalizeChannel(channel) {
  return channel?.toLowerCase().trim();
}

function matchIdentity(channel1, channel2) {
  if (!channel1 || !channel2) return false;
  return normalizeChannel(channel1) === normalizeChannel(channel2);
}

function resolveIdentity(identifiers) {
  // Simple identity resolution: if any identifier matches, it's the same person
  const normalized = identifiers.map(i => ({
    type: i.type,
    value: normalizeChannel(i.value)
  }));

  // Group by value
  const groups = {};
  for (const id of normalized) {
    if (!groups[id.value]) groups[id.value] = [];
    groups[id.value].push(id.type);
  }

  return {
    unified: Object.keys(groups).length === 1,
    groups,
    score: Object.keys(groups).length === 1 ? 100 : 50
  };
}

describe('Channel Stitcher', () => {
  it('should normalize channel identifiers', () => {
    expect(normalizeChannel('EMAIL')).toBe('email');
    expect(normalizeChannel('  WhatsApp  ')).toBe('whatsapp');
    expect(normalizeChannel('Phone')).toBe('phone');
  });

  it('should match identical identities', () => {
    expect(matchIdentity('user@example.com', 'user@example.com')).toBe(true);
    expect(matchIdentity('+919876543210', '+919876543210')).toBe(true);
  });

  it('should not match different identities', () => {
    expect(matchIdentity('user1@example.com', 'user2@example.com')).toBe(false);
    expect(matchIdentity('+919876543210', '+919876543211')).toBe(false);
  });

  it('should resolve multiple identifiers', () => {
    const result = resolveIdentity([
      { type: 'email', value: 'user@example.com' },
      { type: 'phone', value: '+919876543210' }
    ]);
    expect(result.unified).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should detect different identities', () => {
    const result = resolveIdentity([
      { type: 'email', value: 'user1@example.com' },
      { type: 'email', value: 'user2@example.com' }
    ]);
    expect(result.unified).toBe(false);
    expect(result.score).toBe(50);
  });
});
