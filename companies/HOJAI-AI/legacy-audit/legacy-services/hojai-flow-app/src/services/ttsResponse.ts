/**
 * TTS Response - Voice Output
 *
 * Converts AI responses to speech
 * Supports:
 * - ElevenLabs voices
 * - Custom persona voices
 * - Streaming audio
 */

import axios from 'axios';
import { Audio } from 'expo-av';

const TTS_URL = process.env.TTS_URL || 'http://localhost:4033';
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

interface VoiceConfig {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

interface PersonaVoice {
  personal: VoiceConfig;
  founder: VoiceConfig;
  sales: VoiceConfig;
  support: VoiceConfig;
  hr: VoiceConfig;
}

const PERSONA_VOICES: PersonaVoice = {
  personal: {
    voiceId: 'pMszSj1HjHeNapYHGDby',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.3,
  },
  founder: {
    voiceId: 'TX3LPaxmHKxFVD7kaB2a',
    stability: 0.4,
    similarityBoost: 0.8,
    style: 0.5,
  },
  sales: {
    voiceId: 'nPGCFufMG7I00YclqiAT',
    stability: 0.6,
    similarityBoost: 0.7,
    style: 0.4,
  },
  support: {
    voiceId: 'FGY2WhTYpMZRTQGTAVlj',
    stability: 0.7,
    similarityBoost: 0.65,
    style: 0.2,
  },
  hr: {
    voiceId: '6wHNSbK7mKXqsN3GjAjF',
    stability: 0.55,
    similarityBoost: 0.7,
    style: 0.3,
  },
};

class TTSService {
  private sound: Audio.Sound | null = null;

  /**
   * Speak text with persona voice
   */
  async speak(text: string, persona: keyof PersonaVoice = 'personal'): Promise<void> {
    try {
      const voice = PERSONA_VOICES[persona];

      // Get audio URL from TTS service
      const audioUrl = await this.textToSpeech(text, voice);

      // Play audio
      await this.playAudio(audioUrl);
    } catch (error) {
      console.error('[TTS] Speak failed:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech
   */
  private async textToSpeech(text: string, voice: VoiceConfig): Promise<string> {
    try {
      // Try our TTS service first
      const response = await axios.post(`${TTS_URL}/api/tts`, {
        text,
        voice_id: voice.voiceId,
        settings: {
          stability: voice.stability,
          similarity_boost: voice.similarityBoost,
          style: voice.style,
        },
      }, { timeout: 30000 });

      return response.data.audioUrl;
    } catch {
      // Fallback to ElevenLabs directly
      return this.elevenLabsTTS(text, voice);
    }
  }

  /**
   * ElevenLabs direct API
   */
  private async elevenLabsTTS(text: string, voice: VoiceConfig): Promise<string> {
    const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_KEY) {
      console.warn('[TTS] No ElevenLabs API key');
      return '';
    }

    try {
      const response = await axios.post(
        `${ELEVENLABS_API}/text-to-speech/${voice.voiceId}/stream`,
        {
          text,
          voice_settings: {
            stability: voice.stability,
            similarity_boost: voice.similarityBoost,
            style: voice.style,
          },
        },
        {
          headers: {
            'xi-api-key': ELEVENLABS_KEY,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      // Convert arraybuffer to base64 audio
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:audio/mpeg;base64,${base64}`;
    } catch (error) {
      console.error('[TTS] ElevenLabs failed:', error);
      return '';
    }
  }

  /**
   * Play audio from URL
   */
  private async playAudio(audioUrl: string): Promise<void> {
    if (!audioUrl) return;

    try {
      // Unload previous sound
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Load and play
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('[TTS] Play failed:', error);
    }
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  /**
   * Get voice preview URL
   */
  async getPreviewUrl(persona: keyof PersonaVoice): Promise<string> {
    const voice = PERSONA_VOICES[persona];
    return `${TTS_URL}/api/tts/preview?voice_id=${voice.voiceId}`;
  }

  /**
   * Clone voice from sample
   * Requires 30+ minutes of audio
   */
  async cloneVoice(
    name: string,
    audioFiles: string[]
  ): Promise<string> {
    const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_KEY) {
      throw new Error('ElevenLabs API key required');
    }

    try {
      const formData = new FormData();

      for (const file of audioFiles) {
        formData.append('files', {
          uri: file,
          type: 'audio/mp3',
          name: 'sample.mp3',
        } as unknown as Blob);
      }

      formData.append('name', name);

      const response = await axios.post(
        `${ELEVENLABS_API}/voice-creation/upload`,
        formData,
        {
          headers: {
            'xi-api-key': ELEVENLABS_KEY,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.voice_id;
    } catch (error) {
      console.error('[TTS] Clone failed:', error);
      throw error;
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
