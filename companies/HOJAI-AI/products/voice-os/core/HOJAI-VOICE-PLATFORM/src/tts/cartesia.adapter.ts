// ============================================================================
// HOJAI VOICE PLATFORM - Cartesia TTS Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { ttsConfig } from '../config';
import { SynthesisResult, SupportedVoice, SupportedLanguage, TTSEngine } from '../types';

// Voice ID mapping for Cartesia
const VOICE_ID_MAP: Record<string, string> = {
  '预设-indian-female-1': 'cartesia-indian-female-1',
  '预设-indian-female-2': 'cartesia-indian-female-2',
  '预设-indian-male-1': 'cartesia-indian-male-1',
  '预设-indian-male-2': 'cartesia-indian-male-2',
  '预设-indian-child-1': 'cartesia-indian-child',
};

export class CartesiaAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = ttsConfig.cartesia.apiKey;
    this.model = ttsConfig.cartesia.model;

    this.client = axios.create({
      baseURL: ttsConfig.cartesia.url,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
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
      outputFormat?: 'mp3' | 'wav' | 'raw';
    }
  ): Promise<SynthesisResult> {
    try {
      // Get Cartesia voice ID
      const cartesiaVoiceId = VOICE_ID_MAP[voiceId] || VOICE_ID_MAP['预设-indian-female-1'];

      const requestBody: Record<string, unknown> = {
        model_id: this.model,
        transcript: this.prepareTextForTTS(text, language),
        voice: {
          mode: 'id',
          id: cartesiaVoiceId,
        },
        output_format: {
          container: options?.outputFormat || 'mp3',
          bit_rate: 128000,
          sample_rate: 24000,
        },
      };

      // Add speed if specified
      if (options?.speed) {
        requestBody.speed = options.speed;
      }

      const response = await this.client.post('/tts/generate', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/mp3',
        },
      });

      // Convert to base64 for storage
      const audioBuffer = Buffer.from(response.data);
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
        console.error('Cartesia API error:', error.response?.data || error.message);
        throw new Error(
          `Cartesia synthesis failed: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    try {
      const response = await this.client.get('/voices');
      return response.data.voices || [];
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: TTSEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'cartesia',
      name: 'Cartesia AI',
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
      return false;
    }
  }

  /**
   * Prepare text for TTS
   */
  private prepareTextForTTS(text: string, language: SupportedLanguage): string {
    let processed = text;

    // Remove SSML tags
    processed = processed.replace(/<\/?[^>]+(>|$)/g, '');

    // Limit length
    if (processed.length > 5000) {
      processed = processed.substring(0, 5000);
      console.warn('Text truncated to 5000 characters for Cartesia');
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
let cartesiaAdapterInstance: CartesiaAdapter | null = null;

export function getCartesiaAdapter(): CartesiaAdapter {
  if (!cartesiaAdapterInstance) {
    cartesiaAdapterInstance = new CartesiaAdapter();
  }
  return cartesiaAdapterInstance;
}

export default CartesiaAdapter;
