// ============================================================================
// HOJAI VOICE GATEWAY - Sarvam AI STT Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { TranscriptionResult } from '../../types/index.js';

export class SarvamAdapter {
  private client = axios.create({
    baseURL: config.stt.engines.sarvam.url,
    timeout: 30000,
    headers: {
      'api-subscription-key': config.stt.engines.sarvam.apiKey,
    },
  });

  private languageCodeMap: Record<string, string> = {
    'en': 'en-IN', 'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN',
    'te': 'te-IN', 'mr': 'mr-IN', 'kn': 'kn-IN', 'ml': 'ml-IN',
  };

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const start = Date.now();
    try {
      const mappedLang = language
        ? this.languageCodeMap[language] || `${language}-IN`
        : 'en-IN';

      const formData = new FormData();
      formData.append('file', audioBuffer, filename);
      formData.append('model', 'saarika:v2');
      formData.append('language_code', mappedLang);
      formData.append('with_timestamps', 'false');
      formData.append('with_speaker_labels', 'false');

      const response = await this.client.post('/speech-to-text', formData, {
        headers: (formData as unknown as { getHeaders(): Record<string, string> }).getHeaders(),
      });

      const data = response.data as {
        transcript?: string;
        language_code?: string;
        confidence?: number;
      };

      return {
        text: data.transcript?.trim() || '',
        language: data.language_code || mappedLang,
        confidence: data.confidence ?? 0.82,
        engine: 'sarvam',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`Sarvam STT failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
