// ============================================================================
// HOJAI VOICE GATEWAY - ElevenLabs TTS Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { SynthesisResult } from '../../types/index.js';

export class ElevenLabsAdapter {
  private client = axios.create({
    baseURL: config.tts.engines.elevenlabs.url,
    timeout: 30000,
  });

  async synthesize(
    text: string,
    voiceId?: string,
    language?: string
  ): Promise<SynthesisResult> {
    const start = Date.now();
    try {
      const vid = voiceId || config.tts.engines.elevenlabs.voiceId;

      const response = await this.client.post(
        `/text-to-speech/${vid}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          language_code: this.mapLanguage(language || 'en'),
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'xi-api-key': config.tts.engines.elevenlabs.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audioBase64: Buffer.from(response.data).toString('base64'),
        mimeType: 'audio/mpeg',
        engine: 'elevenlabs',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`ElevenLabs TTS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private mapLanguage(lang: string): string {
    const map: Record<string, string> = {
      'en': 'en', 'hi': 'hi', 'es': 'es', 'fr': 'fr', 'de': 'de',
      'pt': 'pt', 'it': 'it', 'pl': 'pl', 'tr': 'tr', 'ru': 'ru',
      'ja': 'ja', 'ko': 'ko', 'zh': 'zh', 'ar': 'ar',
    };
    return map[lang] || 'en';
  }
}
