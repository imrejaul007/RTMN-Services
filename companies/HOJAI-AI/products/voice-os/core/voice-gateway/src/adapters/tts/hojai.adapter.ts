// ============================================================================
// HOJAI VOICE GATEWAY - HOJAI Own TTS Model Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { SynthesisResult } from '../../types/index.js';

export class HojaiTTSAdapter {
  private client = axios.create({
    baseURL: config.tts.engines.hojai.url,
    timeout: 30000,
  });

  async synthesize(
    text: string,
    voiceId?: string,
    language?: string
  ): Promise<SynthesisResult> {
    const start = Date.now();
    try {
      const response = await this.client.post(
        '/synthesize',
        { text, voiceId, language },
        {
          headers: {
            Authorization: `Bearer ${config.tts.engines.hojai.apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'audio/mp3',
            'X-Hojai-Model': 'internal-tts-v1',
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audioBase64: Buffer.from(response.data).toString('base64'),
        mimeType: 'audio/mp3',
        engine: 'hojai',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`HOJAI TTS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
