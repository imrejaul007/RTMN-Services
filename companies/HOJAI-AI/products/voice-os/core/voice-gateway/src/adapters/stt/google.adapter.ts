// ============================================================================
// HOJAI VOICE GATEWAY - Google Cloud STT Adapter
// ============================================================================
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import type { TranscriptionResult } from '../../types/index.js';

export class GoogleAdapter {
  private accessToken?: string;
  private tokenExpiry = 0;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credPath = config.stt.engines.google.credentialsPath;
      if (!credPath || !fs.existsSync(credPath)) {
        throw new Error(`Google credentials file not found at: ${credPath}`);
      }
      const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

      // Use service account for token
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const response = await axios.post(tokenUrl, {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.createJwt(credentials),
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken!;
    } catch (err) {
      throw new Error(`Google auth failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private createJwt(credentials: { client_email: string; private_key: string }): string {
    const jwt = require('crypto') as typeof import('crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })).toString('base64url');

    const sign = jwt.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(credentials.private_key, 'base64url');
    return `${header}.${payload}.${signature}`;
  }

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const start = Date.now();
    try {
      const token = await this.getAccessToken();
      const audioContent = audioBuffer.toString('base64');

      const response = await axios.post(
        'https://speech.googleapis.com/v1/speech:recognize',
        {
          config: {
            encoding: this.getEncoding(filename),
            sampleRateHertz: 16000,
            languageCode: language || 'en-US',
            model: config.stt.engines.google.model,
            enableAutomaticPunctuation: true,
            useEnhanced: true,
          },
          audio: { content: audioContent },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const results = response.data.results as Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
      }>;
      const alt = results?.[0]?.alternatives?.[0];

      return {
        text: alt?.transcript?.trim() || '',
        language: language || 'en',
        confidence: alt?.confidence ?? 0.85,
        engine: 'google',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`Google STT failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private getEncoding(filename: string): string {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    const map: Record<string, string> = {
      '.webm': 'WEBM_OPUS', '.mp3': 'MP3', '.mp4': 'MP4',
      '.wav': 'LINEAR16', '.ogg': 'OGG_OPUS', '.flac': 'FLAC',
    };
    return map[ext || ''] || 'WEBM_OPUS';
  }
}
