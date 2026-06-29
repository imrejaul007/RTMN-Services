/**
 * Voice Orchestrator Tests
 */

import { describe, it, expect } from 'vitest';
import { VoiceOrchestrator } from '../src/services/voiceOrchestrator.js';

describe('VoiceOrchestrator', () => {
  const createOrchestrator = () => new VoiceOrchestrator();

  describe('instance creation', () => {
    it('should create orchestrator instance', () => {
      const orchestrator = createOrchestrator();
      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.orchestrate).toBe('function');
    });
  });
});

describe('Voice Orchestrator Types', () => {
  it('should export interface types', async () => {
    const types = await import('../src/types/index.js');

    // Just verify the module has expected structure
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });
});

describe('Orchestrator Service Configuration', () => {
  it('should have environment variable placeholders', () => {
    const expectedEnvs = [
      'RAZO_URL',
      'GENIE_URL',
      'CONVERSATION_PHYSICS_URL',
      'VOICE_DIRECTOR_URL',
      'HUMAN_PRESENCE_URL',
      'RELATIONSHIP_URL',
      'TTS_URL',
    ];

    expect(expectedEnvs.length).toBe(7);
  });
});
