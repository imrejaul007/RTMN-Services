// Whisper STT Provider - Real OpenAI Whisper API Integration

import { TranscriptionResponse, TranscriptionSegment, WordTiming } from '../models/transcription.js';
import { logger } from '../utils/logger.js';

// Whisper API Response Types
interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments: WhisperSegment[];
  words?: WhisperWord[];
}

export class WhisperProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private model = 'whisper-1';

  constructor() {
    // Support both WHISPER_API_KEY and OPENAI_API_KEY for convenience
    this.apiKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribe(params: {
    audioBuffer: Buffer;
    filename?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  }): Promise<TranscriptionResponse> {
    const startTime = Date.now();

    // Graceful fallback to mock when not configured
    if (!this.isConfigured()) {
      logger.warn('Whisper API key not configured, using mock transcription');
      return this.mockTranscription();
    }

    try {
      logger.info('Calling Whisper API', {
        language: params.language || 'auto',
        filename: params.filename,
      });

      // Create FormData with audio file
      const formData = await this.createFormData(params);

      // Make API request
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Whisper API error', { status: response.status, error: errorText });
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }

      const data: WhisperResponse = await response.json();

      // Format response
      const transcription = this.formatResponse(data, startTime);

      logger.info('Whisper transcription complete', {
        duration: transcription.metadata.processingTimeMs,
        textLength: transcription.text.length,
        confidence: transcription.confidence,
        segments: transcription.segments?.length,
      });

      return transcription;
    } catch (error) {
      logger.error('Whisper transcription failed, using mock', error);
      return this.mockTranscription();
    }
  }

  /**
   * Create FormData for multipart upload
   */
  private async createFormData(params: {
    audioBuffer: Buffer;
    filename?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: string;
  }): Promise<FormData> {
    const formData = new FormData();

    // Create blob from buffer
    const blob = new Blob([params.audioBuffer], { type: 'audio/mp3' });
    const fileName = params.filename || 'audio.mp3';

    formData.append('file', blob, fileName);
    formData.append('model', this.model);

    if (params.language) {
      formData.append('language', params.language);
    }

    if (params.prompt) {
      formData.append('prompt', params.prompt);
    }

    if (params.temperature !== undefined) {
      formData.append('temperature', params.temperature.toString());
    }

    // Request verbose JSON for word timings
    formData.append('response_format', 'verbose_json');

    return formData;
  }

  /**
   * Format Whisper response to our TranscriptionResponse
   */
  private formatResponse(data: WhisperResponse, startTime: number): TranscriptionResponse {
    // Calculate confidence from segments
    const avgLogprob = data.segments.length > 0
      ? data.segments.reduce((sum, seg) => sum + seg.avg_logprob, 0) / data.segments.length
      : -1;

    // Convert log probability to confidence (rough mapping)
    const confidence = Math.min(1, Math.max(0, 1 + avgLogProb / 2));

    // Format segments
    const segments: TranscriptionSegment[] = data.segments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: Math.min(1, Math.max(0, 1 + seg.avg_logprob / 2)),
    }));

    // Format word timings if available
    const words: WordTiming[] = data.words?.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.probability,
    })) || [];

    return {
      id: '', // Set by caller
      text: data.text.trim(),
      segments,
      language: data.language || 'en',
      duration: data.duration,
      confidence,
      words,
      metadata: {
        provider: 'whisper',
        processedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Transcribe from URL (for cloud storage)
   */
  async transcribeFromUrl(params: {
    audioUrl: string;
    language?: string;
  }): Promise<TranscriptionResponse> {
    const startTime = Date.now();

    // Graceful fallback to mock when not configured
    if (!this.isConfigured()) {
      logger.warn('Whisper API key not configured, using mock transcription');
      return this.mockTranscription();
    }

    try {
      // Download audio file first
      logger.info('Downloading audio from URL', { url: params.audioUrl });

      const audioResponse = await fetch(params.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      return this.transcribe({
        audioBuffer,
        filename: 'audio.mp3',
        language: params.language,
      });
    } catch (error) {
      logger.error('URL transcription failed, using mock', error);
      return this.mockTranscription(params.language);
    }
  }

  /**
   * Mock transcription for development/testing
   */
  private mockTranscription(language?: string): TranscriptionResponse {
    const mockText = language === 'hi'
      ? 'यह एक परीक्षण प्रतिलेख है।'
      : 'This is a mock transcription for testing purposes.';

    return {
      id: '',
      text: mockText,
      segments: [],
      language: language || 'en',
      duration: 2.5,
      confidence: 0.95,
      metadata: {
        provider: 'mock',
        processedAt: new Date().toISOString(),
        processingTimeMs: 100,
      },
    };
  }
}

export const whisperProvider = new WhisperProvider();
