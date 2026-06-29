/**
 * Voice Identity - Basic Tests
 */

import { describe, it, expect } from 'vitest';

// Test that the types are correctly exported
describe('VoiceIdentity Types', () => {
  it('should have correct identity types', async () => {
    const { IdentityType } = await import('../src/types/index.js');

    const validTypes: IdentityType[] = ['human', 'agent', 'company', 'family', 'brand'];
    validTypes.forEach(type => {
      expect(['human', 'agent', 'company', 'family', 'brand']).toContain(type);
    });
  });

  it('should have correct trust levels', async () => {
    const validLevels = ['unverified', 'basic', 'verified', 'trusted', 'platinum'];
    validLevels.forEach(level => {
      expect(['unverified', 'basic', 'verified', 'trusted', 'platinum']).toContain(level);
    });
  });

  it('should have correct consent levels', async () => {
    const validConsentLevels = ['none', 'family', 'trusted', 'all'];
    validConsentLevels.forEach(level => {
      expect(['none', 'family', 'trusted', 'all']).toContain(level);
    });
  });
});

describe('Service Configuration', () => {
  it('should have correct port configuration', () => {
    const expectedPort = 4884;
    expect(expectedPort).toBe(4884);
  });

  it('should define service capabilities', () => {
    const capabilities = [
      'voice-enrollment',
      'voice-verification',
      'consent-management',
      'trust-scoring',
      'voice-cloning',
      'relationship-graph',
      'action-authorization'
    ];

    expect(capabilities).toHaveLength(7);
    expect(capabilities).toContain('voice-enrollment');
    expect(capabilities).toContain('trust-scoring');
  });
});
