// ============================================================================
// HOJAI VOICE GATEWAY - Deepgram STT Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { TranscriptionResult } from '../../types/index.js';

export class DeepgramAdapter {
  private client = axios.create({
    baseURL: config.stt.engines.deepgram.url,
    timeout: 30000,
  });

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const start = Date.now();
    try {
      const params: Record<string, string> = {
        model: 'nova-2',
        language: language || 'en-US',
        smart_format: 'true',
        punctuate: 'true',
        diarize: 'false',
      };

      const response = await this.client.post('/transcribe', audioBuffer, {
        headers: {
          'Authorization': `Token ${config.stt.engines.deepgram.apiKey}`,
          'Content-Type': this.getMimeType(filename),
        },
        params,
      });

      const data = response.data as {
        results?: {
          channels?: Array<{
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
            }>;
          }>;
        };
      };

      const alt = data.results?.channels?.[0]?.alternatives?.[0];

      return {
        text: alt?.transcript?.trim() || '',
        language: language || 'en',
        confidence: alt?.confidence ?? 0.85,
        engine: 'deepgram',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`Deepgram STT failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    const map: Record<string, string> = {
      '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.mp4': 'audio/mp4',
      '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
    };
    return map[ext || ''] || 'audio/webm';
  }
}
