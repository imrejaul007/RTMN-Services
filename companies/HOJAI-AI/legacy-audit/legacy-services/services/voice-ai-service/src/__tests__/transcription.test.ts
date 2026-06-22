import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranscriptionService } from '../services/transcriptionService.js';

// Mock the whisper provider at module level
vi.mock('../services/whisperProvider.js', () => ({
  whisperProvider: {
    isConfigured: vi.fn(),
    transcribe: vi.fn(),
    transcribeFromUrl: vi.fn(),
  },
}));

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    service = new TranscriptionService();
    vi.clearAllMocks();
  });

  describe('transcribe', () => {
    it('should return mock transcription when provider is not configured', async () => {
      const { whisperProvider } = await import('../services/whisperProvider.js');
      vi.mocked(whisperProvider.isConfigured).mockReturnValue(false);

      const buffer = Buffer.from('fake audio data');
      const result = await service.transcribe({ audioBuffer: buffer });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.provider).toBeTruthy();
    });

    it('should use Whisper API when configured', async () => {
      const { whisperProvider } = await import('../services/whisperProvider.js');
      vi.mocked(whisperProvider.isConfigured).mockReturnValue(true);
      vi.mocked(whisperProvider.transcribe).mockResolvedValue({
        id: 'test-id',
        text: 'Real Whisper transcription.',
        segments: [],
        confidence: 0.98,
        language: 'en',
        duration: 3.0,
        metadata: {
          provider: 'whisper',
          processedAt: new Date().toISOString(),
          processingTimeMs: 100,
        },
      });

      const buffer = Buffer.from('real audio data');
      const result = await service.transcribe({ audioBuffer: buffer });

      expect(whisperProvider.transcribe).toHaveBeenCalledWith({
        audioBuffer: buffer,
        language: undefined,
      });
      expect(result.text).toBe('Real Whisper transcription.');
      expect(result.confidence).toBe(0.98);
    });

    it('should accept language parameter', async () => {
      const { whisperProvider } = await import('../services/whisperProvider.js');
      vi.mocked(whisperProvider.isConfigured).mockReturnValue(true);
      vi.mocked(whisperProvider.transcribe).mockResolvedValue({
        id: 'test-id',
        text: 'Hindi transcription.',
        segments: [],
        confidence: 0.97,
        language: 'hi',
        duration: 4.0,
        metadata: {
          provider: 'whisper',
          processedAt: new Date().toISOString(),
          processingTimeMs: 100,
        },
      });

      const buffer = Buffer.from('audio data');
      await service.transcribe({ audioBuffer: buffer, language: 'hi' });

      expect(whisperProvider.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'hi' })
      );
    });

    it('should include request ID in result', async () => {
      const buffer = Buffer.from('audio data');
      const result = await service.transcribe({ audioBuffer: buffer });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });
  });

  describe('getWordTimings', () => {
    it('should return word timings', async () => {
      const timings = await service.getWordTimings('test-transcript-id');

      expect(timings).toBeDefined();
      expect(Array.isArray(timings)).toBe(true);
      expect(timings.length).toBeGreaterThan(0);
    });
  });
});
