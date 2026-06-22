// Synthesis Service - Handles text-to-speech with multiple providers

import { v4 as uuidv4 } from 'uuid';
import { SynthesisResponse, VoiceTemplate, DEFAULT_VOICES } from '../models/synthesis.js';
import { logger } from '../utils/logger.js';
import { elevenLabsProvider } from './elevenLabsProvider.js';

const TTS_PROVIDER = process.env.TTS_PROVIDER || 'elevenlabs';

export class SynthesisService {
  /**
   * Synthesize text to speech
   */
  async synthesize(params: {
    text: string;
    voiceId?: string;
    language?: string;
    speed?: number;
    format?: 'mp3' | 'wav' | 'ogg';
  }): Promise<SynthesisResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      logger.info('Starting synthesis', {
        requestId,
        provider: TTS_PROVIDER,
        textLength: params.text.length,
      });

      let result: SynthesisResponse;

      switch (TTS_PROVIDER) {
        case 'elevenlabs':
          result = await this.synthesizeWithElevenLabs(params);
          break;
        case 'google':
          result = await this.synthesizeWithGoogle(params);
          break;
        case 'cartesia':
          result = await this.synthesizeWithCartesia(params);
          break;
        default:
          result = await this.synthesizeWithElevenLabs(params);
      }

      result.id = requestId;
      result.metadata.provider = TTS_PROVIDER;
      result.metadata.voiceId = params.voiceId || DEFAULT_VOICES[0].voiceId;
      result.metadata.processingTimeMs = Date.now() - startTime;

      logger.info('Synthesis completed', {
        requestId,
        durationMs: result.metadata.processingTimeMs,
        audioDuration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error('Synthesis failed', error as Error);
      throw error;
    }
  }

  /**
   * ElevenLabs TTS - REAL implementation
   */
  private async synthesizeWithElevenLabs(params: {
    text: string;
    voiceId?: string;
    speed?: number;
    format?: string;
  }): Promise<SynthesisResponse> {
    // Try real ElevenLabs API first
    if (elevenLabsProvider.isConfigured()) {
      try {
        return await elevenLabsProvider.synthesize({
          text: params.text,
          voiceId: params.voiceId,
        });
      } catch (error) {
        logger.warn('ElevenLabs API failed, falling back to mock', error);
      }
    }

    // Fallback to mock
    logger.info('Using mock synthesis (no API key)');
    const voiceId = params.voiceId || DEFAULT_VOICES[0].voiceId;
    return this.mockSynthesis(params.text, voiceId);
  }

  /**
   * Google TTS - Placeholder
   */
  private async synthesizeWithGoogle(params: {
    text: string;
    language?: string;
  }): Promise<SynthesisResponse> {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      logger.info('Google TTS not configured, using mock');
    }
    return this.mockSynthesis(params.text, 'google-tts');
  }

  /**
   * Cartesia TTS - Placeholder
   */
  private async synthesizeWithCartesia(params: {
    text: string;
    voiceId?: string;
  }): Promise<SynthesisResponse> {
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
      logger.info('Cartesia not configured, using mock');
    }
    return this.mockSynthesis(params.text, params.voiceId || 'cartesia-voice');
  }

  /**
   * Mock synthesis for development
   */
  private mockSynthesis(text: string, voiceId: string): SynthesisResponse {
    // Estimate duration based on text length (average 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const duration = (wordCount / 150) * 60;

    return {
      id: uuidv4(),
      audioUrl: undefined, // Would contain actual audio URL
      audioBase64: undefined, // Would contain base64 audio
      duration,
      format: 'mp3',
      metadata: {
        provider: 'mock',
        voiceId,
        processedAt: new Date().toISOString(),
        processingTimeMs: 200,
      },
    };
  }

  /**
   * Get available voice templates
   */
  getVoiceTemplates(): VoiceTemplate[] {
    return DEFAULT_VOICES;
  }

  /**
   * Get voice by language
   */
  getVoicesByLanguage(language: string): VoiceTemplate[] {
    return DEFAULT_VOICES.filter((v) => v.language === language);
  }

  /**
   * Generate healthcare-specific voice message - REAL implementation
   */
  async generateHealthcareMessage(
    type: 'reminder' | 'instruction' | 'alert' | 'summary',
    content: string,
    language: string = 'en'
  ): Promise<SynthesisResponse> {
    // Try real ElevenLabs for better quality
    if (elevenLabsProvider.isConfigured()) {
      try {
        return await elevenLabsProvider.generateHealthcareMessage(type, content, language);
      } catch (error) {
        logger.warn('ElevenLabs healthcare synthesis failed', error);
      }
    }

    // Fallback to mock
    const voice = this.getVoicesByLanguage(language)[0] || DEFAULT_VOICES[0];

    const prefixes: Record<string, string> = {
      reminder: 'This is a health reminder. ',
      instruction: 'Please listen carefully to your medical instructions. ',
      alert: 'Important health alert. ',
      summary: 'Here is your health summary. ',
    };

    const text = prefixes[type] + content;
    return this.synthesize({ text, voiceId: voice.voiceId, language });
  }
}

export const synthesisService = new SynthesisService();
