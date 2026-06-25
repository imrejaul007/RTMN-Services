// ============================================================================
// HOJAI VOICE GATEWAY - HOJAI Own STT Model Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { TranscriptionResult } from '../../types/index.js';

export class HojaiSTTAdapter {
  private client = axios.create({
    baseURL: config.stt.engines.hojai.url,
    timeout: 30000,
  });

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const start = Date.now();
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, filename);
      if (language) formData.append('language', language);

      const response = await this.client.post('/transcribe', formData, {
        headers: {
          ...(formData as unknown as { getHeaders(): Record<string, string> }).getHeaders(),
          'Authorization': `Bearer ${config.stt.engines.hojai.apiKey}`,
          'X-Hojai-Model': 'internal-stt-v1',
        },
      });

      const data = response.data as {
        text?: string;
        language?: string;
        confidence?: number;
        words?: Array<{ word: string; start: number; end: number }>;
      };

      return {
        text: data.text?.trim() || '',
        language: data.language || language || 'en',
        confidence: data.confidence ?? 0.9,
        words: data.words?.map((w) => ({
          word: w.word,
          startTime: Math.round(w.start * 1000),
          endTime: Math.round(w.end * 1000),
        })),
        engine: 'hojai',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`HOJAI STT failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
