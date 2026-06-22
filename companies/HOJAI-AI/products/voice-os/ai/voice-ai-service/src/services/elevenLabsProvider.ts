// ElevenLabs TTS Provider - Real ElevenLabs API Integration

import { SynthesisResponse } from '../models/synthesis.js';
import { logger } from '../utils/logger.js';

// ElevenLabs API Response Types
interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
}

interface VoicesResponse {
  voices: Voice[];
}

export class ElevenLabsProvider {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Voice[]> {
    if (!this.isConfigured()) {
      logger.warn('ElevenLabs not configured, returning default voices');
      return this.getDefaultVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data: VoicesResponse = await response.json();
      return data.voices;
    } catch (error) {
      logger.error('Failed to get voices', error);
      return this.getDefaultVoices();
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(params: {
    text: string;
    voiceId?: string;
    modelId?: string;
    voiceSettings?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  }): Promise<SynthesisResponse> {
    const startTime = Date.now();
    const voiceId = params.voiceId || this.defaultVoiceId;
    const modelId = params.modelId || 'eleven_multilingual_v2';

    // Graceful fallback when not configured
    if (!this.isConfigured()) {
      logger.warn('ElevenLabs API key not configured, using mock synthesis');
      return this.mockSynthesis(params.text, voiceId);
    }

    try {
      logger.info('Calling ElevenLabs API', {
        voiceId,
        textLength: params.text.length,
      });

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}?optimize_streaming_latency=4`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg', // Binary audio response
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: params.text,
            model_id: modelId,
            voice_settings: params.voiceSettings || {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ElevenLabs API error', { status: response.status, error: errorText });
        // Graceful fallback on API error
        return this.mockSynthesis(params.text, voiceId);
      }

      // ElevenLabs returns binary audio, not JSON
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = audioBuffer.toString('base64');

      // Calculate duration (approx 150 words per minute)
      const wordCount = params.text.split(/\s+/).length;
      const duration = (wordCount / 150) * 60;

      const synthesis: SynthesisResponse = {
        id: '',
        audioBase64,
        duration,
        format: 'mp3',
        metadata: {
          provider: 'elevenlabs',
          voiceId,
          processedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      };

      logger.info('ElevenLabs synthesis complete', {
        duration: synthesis.duration,
        textLength: params.text.length,
        audioSize: audioBuffer.length,
      });

      return synthesis;
    } catch (error) {
      logger.error('ElevenLabs synthesis failed, using mock', error);
      // Graceful fallback on any error
      return this.mockSynthesis(params.text, voiceId);
    }
  }

  /**
   * Get default voices (when API is not configured)
   */
  private getDefaultVoices(): Voice[] {
    return [
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        category: 'premade',
        description: 'Professional female voice',
      },
      {
        voice_id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold',
        category: 'premade',
        description: 'Professional male voice',
      },
    ];
  }

  /**
   * Mock synthesis for development/testing
   */
  private mockSynthesis(text: string, voiceId: string): SynthesisResponse {
    const wordCount = text.split(/\s+/).length;
    const duration = (wordCount / 150) * 60;

    return {
      id: '',
      audioData: undefined,
      audioBase64: undefined,
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
   * Generate healthcare-specific message
   */
  async generateHealthcareMessage(
    type: 'reminder' | 'instruction' | 'alert' | 'summary',
    content: string,
    language: string = 'en'
  ): Promise<SynthesisResponse> {
    const prefixes: Record<string, string> = {
      reminder: 'This is a health reminder. ',
      instruction: 'Please listen carefully to your medical instructions. ',
      alert: 'Important health alert. ',
      summary: 'Here is your health summary. ',
    };

    const text = prefixes[type] + content;

    // Select appropriate voice based on language
    const voiceId = language === 'hi'
      ? 'pqHfZ1aV3L2H2a5dTmUq' // Hindi voice
      : this.defaultVoiceId;

    return this.synthesize({ text, voiceId });
  }
}

export const elevenLabsProvider = new ElevenLabsProvider();
