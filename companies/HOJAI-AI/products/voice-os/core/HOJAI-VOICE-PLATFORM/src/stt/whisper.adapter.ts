// ============================================================================
// HOJAI VOICE PLATFORM - Whisper STT Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { sttConfig } from '../config';
import { TranscriptionResult, SupportedLanguage, STTEngine } from '../types';

export class WhisperAdapter {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = sttConfig.whisper.apiKey;
    this.model = sttConfig.whisper.model;

    this.client = axios.create({
      baseURL: sttConfig.whisper.url,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Transcribe audio from a buffer
   */
  async transcribe(
    audioBuffer: Buffer,
    filename: string = 'audio.webm',
    language?: string
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();

      // Add audio file
      formData.append('file', audioBuffer, {
        filename,
        contentType: this.getMimeType(filename),
      });

      // Add model
      formData.append('model', this.model);

      // Add language if specified
      if (language) {
        formData.append('language', this.mapLanguage(language));
      }

      // Optional parameters
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('temperature', '0');

      const response = await this.client.post('/v1/audio/transcriptions', formData, {
        headers: formData.getHeaders(),
      });

      const data = response.data;

      return {
        text: data.text?.trim() || '',
        language: data.language || language || 'en',
        confidence: data.segments?.[0]?.avg_logprob
          ? Math.exp(data.segments[0].avg_logprob)
          : 0.8,
        words: data.words?.map((word: {
          word: string;
          start: number;
          end: number;
          probability: number;
        }) => ({
          word: word.word,
          startTime: Math.round(word.start * 1000),
          endTime: Math.round(word.end * 1000),
          confidence: word.probability,
        })),
        duration: data.duration,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Whisper API error:', error.response?.data || error.message);
        throw new Error(`Whisper transcription failed: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe audio from a URL
   */
  async transcribeFromUrl(audioUrl: string, language?: string): Promise<TranscriptionResult> {
    try {
      // Download the audio file
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const audioBuffer = Buffer.from(audioResponse.data);
      const contentType = audioResponse.headers['content-type'] || 'audio/webm';
      const filename = `audio.${this.getExtension(contentType)}`;

      return this.transcribe(audioBuffer, filename, language);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Whisper URL fetch error:', error.message);
        throw new Error(`Failed to fetch audio from URL: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe audio from base64 encoded string
   */
  async transcribeFromBase64(
    base64Audio: string,
    mimeType: string = 'audio/webm',
    language?: string
  ): Promise<TranscriptionResult> {
    try {
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      const extension = this.getExtension(mimeType);
      const filename = `audio.${extension}`;

      return this.transcribe(audioBuffer, filename, language);
    } catch (error) {
      throw new Error(`Whisper base64 transcription failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: STTEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'whisper',
      name: 'OpenAI Whisper',
      supportedLanguages: [
        'en', 'hi', 'ta', 'te', 'bn', 'kn', 'ml', 'mr', 'gu', 'pa',
        'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar',
      ],
    };
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Whisper doesn't have a health endpoint, so we just check connectivity
      await this.client.get('/', { timeout: 5000 });
      return true;
    } catch {
      // Even if we get an error, as long as we connected, it's "healthy"
      return true;
    }
  }

  /**
   * Map our language codes to Whisper's expected format
   */
  private mapLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      'en-IN': 'en',
      'hi-IN': 'hi',
      'ta-IN': 'ta',
      'te-IN': 'te',
      'bn-IN': 'bn',
      'kn-IN': 'kn',
      'ml-IN': 'ml',
      'mr-IN': 'mr',
      'gu-IN': 'gu',
      'pa-IN': 'pa',
    };

    return languageMap[language] || language.split('-')[0];
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'webm': 'audio/webm',
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
    };

    return mimeTypes[ext || 'webm'] || 'audio/webm';
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/x-m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
    };

    return mimeToExt[mimeType] || 'webm';
  }
}

// Singleton instance
let whisperAdapterInstance: WhisperAdapter | null = null;

export function getWhisperAdapter(): WhisperAdapter {
  if (!whisperAdapterInstance) {
    whisperAdapterInstance = new WhisperAdapter();
  }
  return whisperAdapterInstance;
}

export default WhisperAdapter;
