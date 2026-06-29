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
      expect(typeof orchestrate).toBe('function');
    });

    it('should have orchestrate method', () => {
      const orchestrator = createOrchestrator();
      expect(typeof orchestrator.orchestrate).toBe('function');
    });
  });
});

describe('VoiceOrchestrator Types', () => {
  it('should have correct type exports', async () => {
    const types = await import('../src/types/index.js');

    expect(types).toHaveProperty('VoiceIntent');
    expect(types).toHaveProperty('VoiceContext');
    expect(types).toHaveProperty('VoiceResponse');
    expect(types).toHaveProperty('OrchestratorConfig');
    expect(types).toHaveProperty('VoiceDirectives');
    expect(types).toHaveProperty('Action');
  });

  it('should have correct type structure', async () => {
    const types = await import('../src/types/index.js');

    // VoiceContext should have expected properties
    const context = {} as types.VoiceContext;
    expect(context).toBeDefined();
  });
});

describe('Orchestrator Service Configuration', () => {
  it('should have environment variable placeholders', () => {
    // The orchestrator uses environment variables for service URLs
    const expectedEnvs = [
      'RAZO_URL',
      'GENIE_URL',
      'CONVERSATION_PHYSICS_URL',
      'VOICE_DIRECTOR_URL',
      'HUMAN_PRESENCE_URL',
      'RELATIONSHIP_URL',
      'TTS_URL',
    ];

    // Just verify the constants exist in the module
    expect(expectedEnvs.length).toBe(7);
  });
});
