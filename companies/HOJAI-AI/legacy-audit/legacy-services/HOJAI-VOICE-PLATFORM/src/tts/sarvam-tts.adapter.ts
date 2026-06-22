// ============================================================================
// HOJAI VOICE PLATFORM - Sarvam AI TTS Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { ttsConfig } from '../config';
import { SynthesisResult, SupportedVoice, SupportedLanguage, TTSEngine } from '../types';

// Voice configuration for Sarvam TTS
const SARVAM_VOICE_MAP: Record<string, { id: string; gender: string }> = {
  '预设-indian-female-1': { id: 'aura-hindi-bu', gender: 'female' },
  '预设-indian-female-2': { id: 'aura-tamil-bu', gender: 'female' },
  '预设-indian-male-1': { id: 'aura-hindi-bu', gender: 'male' },
  '预设-indian-male-2': { id: 'aura-telugu-bu', gender: 'male' },
  '预设-indian-child-1': { id: 'aura-hindi-bu', gender: 'female' }, // Child voice not available, fallback
};

// Language code mapping for Sarvam
const SARVAM_LANGUAGE_MAP: Record<string, string> = {
  'en-IN': 'en-IN',
  'hi-IN': 'hi-IN',
  'ta-IN': 'ta-IN',
  'te-IN': 'te-IN',
  'bn-IN': 'bn-IN',
  'kn-IN': 'kn-IN',
  'ml-IN': 'ml-IN',
  'mr-IN': 'mr-IN',
  'gu-IN': 'gu-IN',
  'pa-IN': 'pa-IN',
};

export class SarvamTTSAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = ttsConfig.sarvam.apiKey;
    this.model = ttsConfig.sarvam.model;

    this.client = axios.create({
      baseURL: ttsConfig.sarvam.url,
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(
    text: string,
    voiceId: SupportedVoice,
    language: SupportedLanguage,
    options?: {
      speed?: number;
      pitch?: number;
    }
  ): Promise<SynthesisResult> {
    try {
      // Get Sarvam voice configuration
      const voiceConfig = SARVAM_VOICE_MAP[voiceId] || SARVAM_VOICE_MAP['预设-indian-female-1'];

      const requestBody: Record<string, unknown> = {
        inputs: [this.prepareTextForTTS(text, language)],
        target_language: SARVAM_LANGUAGE_MAP[language] || 'en-IN',
        model: this.model,
        voice: {
          name: voiceConfig.id,
        },
      };

      // Add optional parameters
      if (options?.speed !== undefined) {
        requestBody.speaking_rate = options.speed;
      }

      if (options?.pitch !== undefined) {
        requestBody.pitch = options.pitch;
      }

      const response = await this.client.post('/text-to-speech', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
      });

      // Sarvam returns base64 encoded audio directly in some cases
      // or raw audio bytes
      let audioBuffer: Buffer;

      try {
        // Try to parse as JSON first (for base64 response)
        const textResponse = response.data.toString('utf-8');
        const jsonData = JSON.parse(textResponse);
        audioBuffer = Buffer.from(jsonData.audio, 'base64');
      } catch {
        // Otherwise, use raw bytes
        audioBuffer = Buffer.from(response.data);
      }

      const audioUrl = await this.saveAudio(audioBuffer, 'mp3');

      // Estimate duration
      const wordCount = text.split(/\s+/).length;
      const speedFactor = options?.speed || 1.0;
      const estimatedDuration = (wordCount / 150) * 60 / speedFactor;

      return {
        audioUrl,
        duration: estimatedDuration,
        format: 'mp3',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sarvam TTS API error:', error.response?.data || error.message);
        throw new Error(
          `Sarvam TTS synthesis failed: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    return [
      { id: 'aura-hindi-bu', name: 'Hindi (Female)', language: 'hi-IN' },
      { id: 'aura-hindi-bm', name: 'Hindi (Male)', language: 'hi-IN' },
      { id: 'aura-tamil-bu', name: 'Tamil (Female)', language: 'ta-IN' },
      { id: 'aura-telugu-bu', name: 'Telugu (Female)', language: 'te-IN' },
      { id: 'aura-bengali-bf', name: 'Bengali (Female)', language: 'bn-IN' },
      { id: 'aura-kannada-bu', name: 'Kannada (Female)', language: 'kn-IN' },
      { id: 'aura-malayalam-bu', name: 'Malayalam (Female)', language: 'ml-IN' },
      { id: 'aura-marathi-bu', name: 'Marathi (Female)', language: 'mr-IN' },
      { id: 'aura-gujarati-bf', name: 'Gujarati (Female)', language: 'gu-IN' },
      { id: 'aura-punjabi-bf', name: 'Punjabi (Female)', language: 'pa-IN' },
      { id: 'aura-english-us-bu', name: 'English (US Female)', language: 'en-IN' },
    ];
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: TTSEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'sarvam',
      name: 'Sarvam AI TTS',
      supportedLanguages: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'],
    };
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return true; // Assume healthy
    }
  }

  /**
   * Prepare text for TTS
   */
  private prepareTextForTTS(text: string, language: SupportedLanguage): string {
    let processed = text;

    // Remove SSML-like tags
    processed = processed.replace(/<\/?[^>]+(>|$)/g, '');

    // Handle common abbreviations
    processed = processed
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      .replace(/\bRs\./g, 'Rupees');

    // Limit length
    if (processed.length > 1000) {
      processed = processed.substring(0, 1000);
      console.warn('Text truncated to 1000 characters for Sarvam TTS');
    }

    return processed;
  }

  /**
   * Save audio to storage
   */
  private async saveAudio(audioBuffer: Buffer, format: string): Promise<string> {
    const base64 = audioBuffer.toString('base64');
    return `data:audio/${format};base64,${base64}`;
  }
}

// Singleton instance
let sarvamTTSAdapterInstance: SarvamTTSAdapter | null = null;

export function getSarvamTTSAdapter(): SarvamTTSAdapter {
  if (!sarvamTTSAdapterInstance) {
    sarvamTTSAdapterInstance = new SarvamTTSAdapter();
  }
  return sarvamTTSAdapterInstance;
}

export default SarvamTTSAdapter;
