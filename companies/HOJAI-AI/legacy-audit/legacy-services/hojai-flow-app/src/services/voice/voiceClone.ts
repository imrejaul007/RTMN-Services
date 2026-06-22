/**
 * Voice Cloning - ElevenLabs Voice Clone
 *
 * Features:
 * - Clone voice from samples
 * - Custom voice creation
 * - Voice management
 */

import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const API_KEY = process.env.ELEVENLABS_API_KEY;

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

interface CloneResult {
  voice_id: string;
  name: string;
  success: boolean;
}

class VoiceCloning {
  /**
   * Check if API key is configured
   */
  private isConfigured(): boolean {
    return !!API_KEY;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Voice[]> {
    if (!this.isConfigured()) {
      return this.getDefaultVoices();
    }

    try {
      const response = await axios.get(`${ELEVENLABS_API}/voices`, {
        headers: { 'xi-api-key': API_KEY },
      });

      return response.data.voices || [];
    } catch (error) {
      console.error('[VoiceClone] Get voices failed:', error);
      return this.getDefaultVoices();
    }
  }

  /**
   * Clone voice from audio samples
   * Requires 30+ minutes of audio for best quality
   */
  async cloneFromSamples(
    name: string,
    audioUris: string[]
  ): Promise<CloneResult | null> {
    if (!this.isConfigured()) {
      console.warn('[VoiceClone] API key not configured');
      return null;
    }

    try {
      const formData = new FormData();

      // Add audio files
      for (const uri of audioUris) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          formData.append('files', {
            uri,
            name: 'sample.mp3',
            type: 'audio/mp3',
          } as unknown as Blob);
        }
      }

      formData.append('name', name);
      formData.append('description', `Cloned voice: ${name}`);

      const response = await axios.post(
        `${ELEVENLABS_API}/voice-creation/upload`,
        formData,
        {
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return {
        voice_id: response.data.voice_id,
        name,
        success: true,
      };
    } catch (error) {
      console.error('[VoiceClone] Clone failed:', error);
      return null;
    }
  }

  /**
   * Delete voice
   */
  async deleteVoice(voiceId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await axios.delete(`${ELEVENLABS_API}/voices/${voiceId}`, {
        headers: { 'xi-api-key': API_KEY },
      });
      return true;
    } catch (error) {
      console.error('[VoiceClone] Delete failed:', error);
      return false;
    }
  }

  /**
   * Get default voices (when API not configured)
   */
  private getDefaultVoices(): Voice[] {
    return [
      {
        voice_id: 'pMszSj1HjHeNapYHGDby',
        name: 'Professional',
        category: 'professional',
        description: 'Clear, authoritative voice',
      },
      {
        voice_id: 'TX3LPaxmHKxFVD7kaB2a',
        name: 'Friendly',
        category: 'friendly',
        description: 'Warm, approachable voice',
      },
      {
        voice_id: 'nPGCFufMG7I00YclqiAT',
        name: 'Casual',
        category: 'conversational',
        description: 'Relaxed, conversational tone',
      },
      {
        voice_id: 'FGY2WhTYpMZRTQGTAVlj',
        name: 'Support',
        category: 'professional',
        description: 'Helpful, patient voice',
      },
    ];
  }

  /**
   * Generate preview audio
   */
  async getPreview(
    voiceId: string,
    text: string = 'Hello, this is a voice preview.'
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.post(
        `${ELEVENLABS_API}/text-to-speech/${voiceId}/stream`,
        { text },
        {
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      // Convert to base64 data URI
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:audio/mpeg;base64,${base64}`;
    } catch (error) {
      console.error('[VoiceClone] Preview failed:', error);
      return null;
    }
  }
}

export const voiceCloning = new VoiceCloning();
export default voiceCloning;
