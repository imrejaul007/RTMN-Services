// ============================================================================
// HOJAI VOICE GATEWAY - Cartesia TTS Adapter
// ============================================================================
import axios from 'axios';
import { config } from '../../config/index.js';
import type { SynthesisResult } from '../../types/index.js';

export class CartesiaAdapter {
  private client = axios.create({
    baseURL: config.tts.engines.cartesia.url,
    timeout: 30000,
  });

  async synthesize(
    text: string,
    voiceId?: string,
    language?: string
  ): Promise<SynthesisResult> {
    const start = Date.now();
    try {
      const vid = voiceId || config.tts.engines.cartesia.voiceId;

      const response = await this.client.post(
        '/v1/tts/stream',
        {
          model_id: 'sonic-2',
          transcript: text,
          voice: { id: vid },
          language: language || 'en',
          output_format: { container: 'mp4', codec: 'mp3', bit_depth: 16, sample_rate: 44100 },
          temperature: 0.7,
        },
        {
          headers: {
            'X-API-Key': config.tts.engines.cartesia.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mp4',
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audioBase64: Buffer.from(response.data).toString('base64'),
        mimeType: 'audio/mp4',
        engine: 'cartesia',
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      throw new Error(`Cartesia TTS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
