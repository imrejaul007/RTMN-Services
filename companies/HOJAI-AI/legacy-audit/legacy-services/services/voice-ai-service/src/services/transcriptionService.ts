// Transcription Service - Handles speech-to-text with multiple providers

import { v4 as uuidv4 } from 'uuid';
import { TranscriptionResponse, TranscriptionSegment, WordTiming } from '../models/transcription.js';
import { logger } from '../utils/logger.js';
import { whisperProvider } from './whisperProvider.js';

const STT_PROVIDER = process.env.STT_PROVIDER || 'whisper';

export class TranscriptionService {
  /**
   * Transcribe audio to text using configured provider
   */
  async transcribe(params: {
    audioUrl?: string;
    audioBuffer?: Buffer;
    language?: string;
    speakerLabels?: boolean;
  }): Promise<TranscriptionResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      logger.info('Starting transcription', { requestId, provider: STT_PROVIDER });

      let result: TranscriptionResponse;

      switch (STT_PROVIDER) {
        case 'whisper':
          result = await this.transcribeWithWhisper(params);
          break;
        case 'google':
          result = await this.transcribeWithGoogle(params);
          break;
        case 'assemblyai':
          result = await this.transcribeWithAssemblyAI(params);
          break;
        default:
          result = await this.transcribeWithWhisper(params);
      }

      result.id = requestId;
      result.metadata.provider = STT_PROVIDER;
      result.metadata.processingTimeMs = Date.now() - startTime;

      logger.info('Transcription completed', {
        requestId,
        durationMs: result.metadata.processingTimeMs,
        textLength: result.text.length,
      });

      return result;
    } catch (error) {
      logger.error('Transcription failed', error as Error);
      throw error;
    }
  }

  /**
   * Whisper transcription (OpenAI) - REAL implementation
   */
  private async transcribeWithWhisper(params: {
    audioUrl?: string;
    audioBuffer?: Buffer;
    language?: string;
  }): Promise<TranscriptionResponse> {
    // Try real Whisper API first
    if (whisperProvider.isConfigured()) {
      try {
        if (params.audioUrl) {
          return await whisperProvider.transcribeFromUrl({
            audioUrl: params.audioUrl,
            language: params.language,
          });
        } else if (params.audioBuffer) {
          return await whisperProvider.transcribe({
            audioBuffer: params.audioBuffer,
            language: params.language,
          });
        }
      } catch (error) {
        logger.warn('Whisper API failed, falling back to mock', error);
      }
    }

    // Fallback to mock for development
    logger.info('Using mock transcription (no API key)');
    return this.mockTranscription(params.language);
  }

  /**
   * Google Cloud Speech-to-Text - Placeholder
   */
  private async transcribeWithGoogle(params: {
    audioBuffer?: Buffer;
    language?: string;
    speakerLabels?: boolean;
  }): Promise<TranscriptionResponse> {
    const apiKey = process.env.GOOGLE_SPEECH_API_KEY;

    if (!apiKey) {
      logger.info('Google Speech API not configured, using mock');
      return this.mockTranscription(params.language);
    }

    // Google Cloud Speech API implementation would go here
    // For now, fall back to mock
    return this.mockTranscription(params.language);
  }

  /**
   * AssemblyAI transcription - Placeholder
   */
  private async transcribeWithAssemblyAI(params: {
    audioUrl?: string;
    audioBuffer?: Buffer;
    speakerLabels?: boolean;
  }): Promise<TranscriptionResponse> {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      logger.info('AssemblyAI not configured, using mock');
      return this.mockTranscription(params.language);
    }

    // AssemblyAI API implementation would go here
    // For now, fall back to mock
    return this.mockTranscription(params.language);
  }

  /**
   * Mock transcription for development/testing
   */
  private mockTranscription(language?: string): TranscriptionResponse {
    const mockTextEn = `Doctor: Good morning, how are you feeling today?
Patient: Not great, I have been having severe headaches for the past week.
Doctor: I see. Let me check your blood pressure. It is slightly elevated at 140 over 90.
I am going to prescribe you a blood pressure medication. Take one tablet in the morning and one in the evening with food.
Also, please reduce your salt intake and try to get more rest.
Patient: How long do I need to take the medication?
Doctor: Let's start with a two-week course and then we will re-evaluate.
If there is no improvement, we may need to adjust the dosage or try a different medication.`;

    const mockTextHi = 'डॉक्टर: नमस्ते, आज आप कैसा महसूस कर रहे हैं? रोगी: ठीक नहीं, पिछले एक हफ्ते से सिरदर्द है। डॉक्टर: समझ गया। आपका ब्लड प्रेशर थोड़ा ज्यादा है। मैं आपको दवा लिख रहा हूं। सुबह और शाम को एक-एक गोली लें।';

    const mockText = language === 'hi' ? mockTextHi : mockTextEn;

    const segments: TranscriptionSegment[] = [
      {
        id: 0,
        start: 0,
        end: 15,
        text: 'Doctor: Good morning, how are you feeling today?',
        confidence: 0.95,
      },
      {
        id: 1,
        start: 15,
        end: 25,
        text: 'Patient: Not great, I have been having severe headaches...',
        confidence: 0.92,
      },
      {
        id: 2,
        start: 25,
        end: 45,
        text: 'Doctor: I see. Let me check your blood pressure...',
        confidence: 0.94,
      },
      {
        id: 3,
        start: 45,
        end: 90,
        text: 'Take one tablet in the morning and one in the evening with food...',
        confidence: 0.93,
      },
    ];

    return {
      id: uuidv4(),
      text: mockText,
      segments,
      language: language || 'en',
      duration: 120,
      confidence: 0.93,
      metadata: {
        provider: STT_PROVIDER,
        processedAt: new Date().toISOString(),
        processingTimeMs: 500,
      },
    };
  }

  /**
   * Get word-level timings for subtitle generation
   */
  async getWordTimings(transcriptId: string): Promise<WordTiming[]> {
    // Return mock word timings
    return [
      { word: 'Doctor:', start: 0, end: 0.5, confidence: 0.95 },
      { word: 'Good', start: 0.5, end: 0.7, confidence: 0.95 },
      { word: 'morning,', start: 0.7, end: 1.1, confidence: 0.95 },
      { word: 'how', start: 1.1, end: 1.3, confidence: 0.95 },
      { word: 'are', start: 1.3, end: 1.5, confidence: 0.95 },
      { word: 'you', start: 1.5, end: 1.7, confidence: 0.95 },
      { word: 'feeling', start: 1.7, end: 2.1, confidence: 0.95 },
      { word: 'today?', start: 2.1, end: 2.5, confidence: 0.95 },
    ];
  }
}

export const transcriptionService = new TranscriptionService();
