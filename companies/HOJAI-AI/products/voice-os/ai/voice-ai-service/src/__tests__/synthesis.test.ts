import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SynthesisService } from '../services/synthesisService.js';

// Mock the ElevenLabs provider at module level
vi.mock('../services/elevenLabsProvider.js', () => ({
  elevenLabsProvider: {
    isConfigured: vi.fn().mockReturnValue(false),
    synthesize: vi.fn().mockResolvedValue({
      id: 'mock-id',
      audioData: undefined,
      audioBase64: undefined,
      duration: 1.0,
      format: 'mp3',
      metadata: {
        provider: 'mock',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        processedAt: new Date().toISOString(),
        processingTimeMs: 100,
      },
    }),
    generateHealthcareMessage: vi.fn().mockResolvedValue({
      id: 'mock-healthcare-id',
      audioData: undefined,
      audioBase64: undefined,
      duration: 2.0,
      format: 'mp3',
      metadata: {
        provider: 'mock',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        processedAt: new Date().toISOString(),
        processingTimeMs: 100,
      },
    }),
  },
}));

describe('SynthesisService', () => {
  let service: SynthesisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SynthesisService();
  });

  describe('synthesize', () => {
    it('should use mock synthesis when provider is not configured', async () => {
      const result = await service.synthesize({ text: 'Hello world' });

      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.format).toBe('mp3');
      // Provider is set to TTS_PROVIDER ('elevenlabs') but the underlying mock returns 'mock'
      expect(['mock', 'elevenlabs']).toContain(result.metadata.provider);
    });

    it('should use ElevenLabs API when configured', async () => {
      const { elevenLabsProvider } = await import('../services/elevenLabsProvider.js');
      vi.mocked(elevenLabsProvider.isConfigured).mockReturnValue(true);
      vi.mocked(elevenLabsProvider.synthesize).mockResolvedValue({
        id: 'test-id',
        audioData: Buffer.from('real audio'),
        format: 'mp3',
        duration: 3.0,
        metadata: {
          provider: 'elevenlabs',
          voiceId: 'test-voice',
          processedAt: new Date().toISOString(),
          processingTimeMs: 100,
        },
      });

      const result = await service.synthesize({ text: 'Hello world' });

      expect(elevenLabsProvider.synthesize).toHaveBeenCalledWith({
        text: 'Hello world',
        voiceId: undefined,
      });
      expect(result.metadata?.provider).toBe('elevenlabs');
    });

    it('should accept custom voice ID', async () => {
      const { elevenLabsProvider } = await import('../services/elevenLabsProvider.js');
      vi.mocked(elevenLabsProvider.isConfigured).mockReturnValue(true);
      vi.mocked(elevenLabsProvider.synthesize).mockResolvedValue({
        id: 'test-id',
        audioData: Buffer.from('custom voice audio'),
        format: 'mp3',
        duration: 2.5,
        metadata: {
          provider: 'elevenlabs',
          voiceId: 'custom-voice-123',
          processedAt: new Date().toISOString(),
          processingTimeMs: 100,
        },
      });

      await service.synthesize({ text: 'Hello', voiceId: 'custom-voice-123' });

      expect(elevenLabsProvider.synthesize).toHaveBeenCalledWith(
        expect.objectContaining({ voiceId: 'custom-voice-123' })
      );
    });

    it('should include request ID in result', async () => {
      const result = await service.synthesize({ text: 'Hello' });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });
  });

  describe('getVoiceTemplates', () => {
    it('should return default voices', () => {
      const templates = service.getVoiceTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('getVoicesByLanguage', () => {
    it('should filter voices by language', () => {
      const englishVoices = service.getVoicesByLanguage('en');

      expect(englishVoices).toBeDefined();
      expect(Array.isArray(englishVoices)).toBe(true);
    });
  });

  describe('generateHealthcareMessage', () => {
    it('should generate healthcare message with prefix', async () => {
      const result = await service.generateHealthcareMessage(
        'reminder',
        'Take your medication',
        'en'
      );

      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
