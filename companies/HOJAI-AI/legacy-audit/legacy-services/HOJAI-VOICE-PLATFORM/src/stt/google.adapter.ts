// ============================================================================
// HOJAI VOICE PLATFORM - Google Cloud Speech-to-Text Adapter
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { sttConfig } from '../config';
import { TranscriptionResult, STTEngine } from '../types';
import { GoogleAuth } from 'google-auth-library';

// Language code mapping for Google Cloud Speech
const GOOGLE_LANGUAGE_MAP: Record<string, string> = {
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

export class GoogleSTTAdapter {
  private client: AxiosInstance;
  private auth: GoogleAuth | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://speech.googleapis.com/v1',
      timeout: 30000,
    });

    this.initializeAuth();
  }

  /**
   * Initialize Google Auth
   */
  private async initializeAuth(): Promise<void> {
    if (sttConfig.google.credentialsPath) {
      try {
        const { GoogleAuth } = await import('google-auth-library');
        this.auth = new GoogleAuth({
          credentials: sttConfig.google.credentialsPath,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
      } catch (error) {
        console.warn('Google Auth not available:', error);
      }
    }
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (this.auth) {
      const client = await this.auth.getClient();
      const tokenResponse = await client.getAccessToken();
      this.accessToken = tokenResponse.token || '';
      this.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      return this.accessToken;
    }

    throw new Error('Google credentials not configured');
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text
   */
  async transcribe(
    audioContent: string, // Base64 encoded audio
    languageCode: string,
    options?: {
      sampleRateHertz?: number;
      encoding?: string;
      model?: string;
      useEnhanced?: boolean;
    }
  ): Promise<TranscriptionResult> {
    try {
      const token = await this.getAccessToken();

      const requestBody: Record<string, unknown> = {
        config: {
          encoding: options?.encoding || 'WEBM_OPUS',
          sampleRateHertz: options?.sampleRateHertz || sttConfig.google.sampleRate,
          languageCode: GOOGLE_LANGUAGE_MAP[languageCode] || 'en-IN',
          model: options?.model || 'latest_long',
          useEnhanced: options?.useEnhanced ?? true,
          enableWordTimeOffsets: true,
          enableAutomaticPunctuation: true,
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 2,
        },
        audio: {
          content: audioContent,
        },
      };

      const response = await this.client.post(
        '/speech:recognize',
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      if (!data.results || data.results.length === 0) {
        return {
          text: '',
          language: languageCode,
          confidence: 0,
        };
      }

      const result = data.results[0];
      const transcription = result.alternatives?.[0] || {};

      return {
        text: transcription.transcript || '',
        language: languageCode,
        confidence: result.alternatives?.length > 1
          ? this.calculateConfidence(result.alternatives)
          : 0.9,
        words: transcription.words?.map((word: {
          word: string;
          startTime: { seconds: string | number; nanos?: number };
          endTime: { seconds: string | number; nanos?: number };
          confidence: number;
        }) => ({
          word: word.word,
          startTime: this.parseGoogleTime(word.startTime),
          endTime: this.parseGoogleTime(word.endTime),
          confidence: word.confidence || 0.9,
        })),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Google STT API error:', error.response?.data || error.message);
        throw new Error(`Google transcription failed: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transcribe streaming audio (for WebSocket connections)
   */
  async transcribeStreaming(
    audioChunks: string[], // Array of base64 audio chunks
    languageCode: string
  ): Promise<TranscriptionResult[]> {
    const results: TranscriptionResult[] = [];

    for (const chunk of audioChunks) {
      const result = await this.transcribe(chunk, languageCode);
      results.push(result);
    }

    return results;
  }

  /**
   * Get engine info
   */
  getEngineInfo(): { engine: STTEngine; name: string; supportedLanguages: string[] } {
    return {
      engine: 'google',
      name: 'Google Cloud Speech-to-Text',
      supportedLanguages: Object.keys(GOOGLE_LANGUAGE_MAP),
    };
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      await this.client.get('/operations', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Parse Google time format to milliseconds
   */
  private parseGoogleTime(time: { seconds: string | number; nanos?: number }): number {
    const seconds = typeof time.seconds === 'string' ? parseInt(time.seconds, 10) : time.seconds;
    const nanos = time.nanos || 0;
    return (seconds * 1000) + Math.round(nanos / 1000000);
  }

  /**
   * Calculate confidence from multiple alternatives
   */
  private calculateConfidence(alternatives: Array<{ transcript: string; confidence?: number }>): number {
    // If we have explicit confidence scores, use the first one
    if (alternatives[0]?.confidence !== undefined) {
      return alternatives[0].confidence;
    }
    // Otherwise, use a default high confidence
    return 0.9;
  }
}

// Singleton instance
let googleAdapterInstance: GoogleSTTAdapter | null = null;

export function getGoogleSTTAdapter(): GoogleSTTAdapter {
  if (!googleAdapterInstance) {
    googleAdapterInstance = new GoogleSTTAdapter();
  }
  return googleAdapterInstance;
}

export default GoogleSTTAdapter;
