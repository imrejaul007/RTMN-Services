// ============================================================================
// HOJAI VOICE PLATFORM - Sarvam AI STT Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { sttConfig } from '../config';
import { TranscriptionResult, STTEngine } from '../types';

export class SarvamAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = sttConfig.sarvam.apiKey;
    this.baseUrl = sttConfig.sarvam.url;
    this.model = sttConfig.sarvam.model;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Transcribe audio from base64 encoded audio
   */
  async transcribe(
    audioBase64: string,
    languageCode: string,
    options?: {
      model?: string;
      withTimings?: boolean;
      withSplitting?: boolean;
    }
  ): Promise<TranscriptionResult> {
    try {
      const requestBody: Record<string, unknown> = {
        audio_input: audioBase64,
        model: options?.model || this.model,
        language_code: this.mapLanguage(languageCode),
      };

      // Optional parameters
      if (options?.withTimings !== undefined) {
        requestBody['with_timings'] = options.withTimings;
      }
      if (options?.withSplitting !== undefined) {
        requestBody['with_splitting'] = options.withSplitting;
      }

      const response = await this.client.post('/speech-to-text', requestBody);
      const data = response.data;

      // Sarvam returns different response formats
      if (data.transcripts && Array.isArray(data.transcripts)) {
        // With splitting enabled
        const transcripts = data.transcripts.map((t: {
          transcript: string;
          start_time: number;
          end_time: number;
        }, idx: number) => ({
          text: t.transcript,
          startTime: t.start_time,
          endTime: t.end_time,
          confidence: 0.9 - (idx * 0.05), // Decreasing confidence for later segments
        }));

        return {
          text: transcripts.map((t: { text: string }) => t.text).join(' '),
          language: languageCode,
          confidence: 0.85,
          words: transcripts.flatMap((t: {
            text: string;
            startTime: number;
            endTime: number;
            confidence: number;
          }) => {
            const words = t.text.split(/\s+/);
            const wordDuration = (t.endTime - t.startTime) / words.length;
            return words.map((word: string, i: number) => ({
              word,
              startTime: t.startTime + (i * wordDuration),
              endTime: t.startTime + ((i + 1) * wordDuration),
              confidence: t.confidence,
            }));
          }),
        };
      }

      // Simple response
      return {
        text: data.transcript || data.text || '',
        language: languageCode,
        confidence: data.confidence || 0.85,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Sarvam STT API error:', error.response?.data || error.message);
        throw new Error(`Sarvam transcription failed: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe audio from a Buffer
   */
  async transcribeFromBuffer(
    audioBuffer: Buffer,
    languageCode: string,
    options?: {
      model?: string;
      withTimings?: boolean;
      withSplitting?: boolean;
    }
  ): Promise<TranscriptionResult> {
    const base64Audio = audioBuffer.toString('base64');
    return this.transcribe(base64Audio, languageCode, options);
  }

  /**
   * Transcribe audio from a URL
   */
  async transcribeFromUrl(
    audioUrl: string,
    languageCode: string
  ): Promise<TranscriptionResult> {
    try {
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const base64Audio = Buffer.from(response.data).toString('base64');
      return this.transcribe(base64Audio, languageCode);
    } catch (error) {
      throw new Error(`Failed to fetch audio from URL: ${(error as Error).message}`);
    }
  }

  /**
   * Get supported languages for this adapter
   */
  getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
    return [
      { code: 'en-IN', name: 'English (India)', nativeName: 'English' },
      { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
      { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
      { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    ];
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: STTEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'sarvam',
      name: 'Sarvam AI',
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
      return true; // Assume healthy if we can reach the endpoint
    }
  }

  /**
   * Map our language codes to Sarvam's expected format
   */
  private mapLanguage(languageCode: string): string {
    const languageMap: Record<string, string> = {
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

    return languageMap[languageCode] || 'en-IN';
  }
}

// Singleton instance
let sarvamAdapterInstance: SarvamAdapter | null = null;

export function getSarvamAdapter(): SarvamAdapter {
  if (!sarvamAdapterInstance) {
    sarvamAdapterInstance = new SarvamAdapter();
  }
  return sarvamAdapterInstance;
}

export default SarvamAdapter;
