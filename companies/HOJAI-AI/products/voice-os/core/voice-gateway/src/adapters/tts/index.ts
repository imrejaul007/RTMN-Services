// ============================================================================
// HOJAI VOICE GATEWAY - TTS Adapter Registry
// ============================================================================
export { ElevenLabsAdapter } from './elevenlabs.adapter.js';
export { CartesiaAdapter } from './cartesia.adapter.js';
export { HojaiTTSAdapter } from './hojai.adapter.js';

import { ElevenLabsAdapter } from './elevenlabs.adapter.js';
import { CartesiaAdapter } from './cartesia.adapter.js';
import { HojaiTTSAdapter } from './hojai.adapter.js';
import type { TTSEngine, SynthesisResult } from '../../types/index.js';

export interface ITTSAdapter {
  synthesize(text: string, voiceId?: string, language?: string): Promise<SynthesisResult>;
}

export const ttsAdapters: Record<TTSEngine, ITTSAdapter> = {
  elevenlabs: new ElevenLabsAdapter(),
  cartesia: new CartesiaAdapter(),
  hojai: new HojaiTTSAdapter(),
};

export function isTTSEngine(val: string): val is TTSEngine {
  return ['elevenlabs', 'cartesia', 'hojai'].includes(val);
}
