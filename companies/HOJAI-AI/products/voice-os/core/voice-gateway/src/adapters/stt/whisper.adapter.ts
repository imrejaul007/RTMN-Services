// ============================================================================
// HOJAI VOICE GATEWAY - Whisper STT Adapter
// ============================================================================
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../../config/index.js';
import type { TranscriptionResult } from '../../types/index.js';

export class WhisperAdapter {
  private client = axios.create({
    baseURL: config.stt.engines.whisper.url,
    timeout: 30000,
  });

  private get mimeTypeMap(): Record<string, string> {
    return {
      '.webm': 'audio/webm',
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '.webm';
    return this.mimeTypeMap[ext] || 'audio/webm';
  }

  private mapLanguage(lang: string): string {
    // Whisper uses ISO 639-1 codes
    const langMap: Record<string, string> = {
      'en': 'en', 'hi': 'hi', 'bn': 'bn', 'ta': 'ta', 'te': 'te',
      'mr': 'mr', 'kn': 'kn', 'ml': 'ml', 'gu': 'gu', 'pa': 'pa',
      'or': 'or', 'as': 'as', 'zh': 'zh', 'ja': 'ja', 'ko': 'ko',
      'es': 'es', 'fr': 'fr', 'de': 'de', 'pt': 'pt', 'ru': 'ru',
    };
    return langMap[lang] || lang;
  }

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const start = Date.now();
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename,
        contentType: this.getMimeType(filename),
      });
      formData.append('model', config.stt.engines.whisper.model);
      if (language) {
        formData.append('language', this.mapLanguage(language));
      }
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0');

      const response = await this.client.post('/v1/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${config.stt.engines.whisper.apiKey}`,
        },
      });

      const data = response.data as {
        text?: string;
        language?: string;
        segments?: Array<{ avg_logprob: number }>;
      };

      return {
        text: data.text?.trim() || '',
        language: data.language || language || 'en',
        confidence: data.segments?.[0]?.avg_logprob
          ? Math.exp(data.segments[0].avg_logprob)
          : 0.85,
        engine: 'whisper',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`Whisper STT failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
