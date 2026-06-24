/**
 * Voice Twin Client (port 4876) — TTS, STT, Voice profiles, Recordings.
 *
 * Specialized surface for the voice twin — text-to-speech, speech-to-text,
 * voice profiles, recording history.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface VoiceProfile {
  id: string;
  ownerId: string;
  name: string;
  language: string;
  /** e.g. 'female-warm', 'male-deep', 'neutral-corporate' */
  voiceId: string;
  pitch?: number;
  speed?: number;
  /** Average user rating 0-5 */
  rating?: number;
  createdAt: string;
}

export interface Recording {
  id: string;
  voiceProfileId: string;
  text: string;
  /** URL to the generated audio file */
  audioUrl: string;
  /** Duration in seconds */
  durationSec: number;
  /** Used character count */
  charCount: number;
  createdAt: string;
}

export interface TranscribeResult {
  text: string;
  language: string;
  /** 0-1 confidence */
  confidence: number;
  /** Word-level timestamps */
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export class VoiceTwinClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4876` }; }

  // ─── Voice profiles ───
  async listProfiles(input: { ownerId?: string; language?: string } = {}): Promise<VoiceProfile[]> {
    return request<VoiceProfile[]>(this.config, 'GET', `/api/profiles${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getProfile(id: string): Promise<VoiceProfile> {
    return request<VoiceProfile>(this.config, 'GET', `/api/profiles/${encodeURIComponent(id)}`);
  }
  async createProfile(input: { ownerId: string; name: string; language: string; voiceId: string; pitch?: number; speed?: number }): Promise<VoiceProfile> {
    return request<VoiceProfile>(this.config, 'POST', '/api/profiles', input);
  }
  async updateProfile(id: string, patch: Partial<VoiceProfile>): Promise<VoiceProfile> {
    return request<VoiceProfile>(this.config, 'PATCH', `/api/profiles/${encodeURIComponent(id)}`, patch);
  }
  async deleteProfile(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/profiles/${encodeURIComponent(id)}`);
  }
  // ─── TTS ───
  async synthesize(input: { voiceProfileId: string; text: string; format?: 'mp3' | 'wav' | 'ogg' }): Promise<Recording> {
    return request<Recording>(this.config, 'POST', '/api/synthesize', input);
  }
  async listRecordings(input: { voiceProfileId?: string; limit?: number } = {}): Promise<Recording[]> {
    return request<Recording[]>(this.config, 'GET', `/api/recordings${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getRecording(id: string): Promise<Recording> {
    return request<Recording>(this.config, 'GET', `/api/recordings/${encodeURIComponent(id)}`);
  }
  // ─── STT ───
  async transcribe(input: { audioUrl: string; language?: string; wordTimestamps?: boolean }): Promise<TranscribeResult> {
    return request<TranscribeResult>(this.config, 'POST', '/api/transcribe', input);
  }
}
