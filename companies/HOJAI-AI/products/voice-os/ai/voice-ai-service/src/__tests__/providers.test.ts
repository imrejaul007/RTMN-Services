import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhisperProvider } from '../services/whisperProvider.js';
import { ElevenLabsProvider } from '../services/elevenLabsProvider.js';

describe('WhisperProvider', () => {
  let provider: WhisperProvider;

  beforeEach(() => {
    provider = new WhisperProvider();
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('WHISPER_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isConfigured', () => {
    it('should return false when no API key is set', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return true when API key is set via OPENAI_API_KEY', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');
      const configuredProvider = new WhisperProvider();
      expect(configuredProvider.isConfigured()).toBe(true);
    });

    it('should return true when API key is set via WHISPER_API_KEY', () => {
      vi.stubEnv('WHISPER_API_KEY', 'sk-test-key');
      const configuredProvider = new WhisperProvider();
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('transcribe', () => {
    it('should return mock transcription when not configured', async () => {
      const result = await provider.transcribe({ audioBuffer: Buffer.from('test') });

      // Graceful fallback - returns mock instead of throwing
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.metadata.provider).toBe('mock');
    });

    it('should gracefully handle API failures', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');
      const configuredProvider = new WhisperProvider();

      // Mock fetch to return a failing response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"error": {"message": "Invalid API key"}}',
      });

      const result = await configuredProvider.transcribe({ audioBuffer: Buffer.from('test') });

      // Should gracefully fallback to mock
      expect(result.metadata.provider).toBe('mock');
    });
  });
});

describe('ElevenLabsProvider', () => {
  let provider: ElevenLabsProvider;

  beforeEach(() => {
    provider = new ElevenLabsProvider();
    vi.stubEnv('ELEVENLABS_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isConfigured', () => {
    it('should return false when no API key is set', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return true when API key is set', () => {
      vi.stubEnv('ELEVENLABS_API_KEY', 'test-api-key');
      const configuredProvider = new ElevenLabsProvider();
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('synthesize', () => {
    it('should return mock synthesis when not configured', async () => {
      const result = await provider.synthesize({ text: 'Hello' });

      // Graceful fallback - returns mock instead of throwing
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata.provider).toBe('mock');
    });

    it('should gracefully handle API failures', async () => {
      vi.stubEnv('ELEVENLABS_API_KEY', 'test-api-key');
      const configuredProvider = new ElevenLabsProvider();

      // Mock fetch to return a failing response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await configuredProvider.synthesize({ text: 'Hello' });

      // Should gracefully fallback to mock
      expect(result.metadata.provider).toBe('mock');
    });
  });

  describe('generateHealthcareMessage', () => {
    it('should generate healthcare message with prefixes', async () => {
      const result = await provider.generateHealthcareMessage('reminder', 'Take medication');

      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata.provider).toBeTruthy();
    });
  });
});
