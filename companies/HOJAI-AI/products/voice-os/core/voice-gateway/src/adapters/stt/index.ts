// ============================================================================
// HOJAI VOICE GATEWAY - STT Adapter Registry
// ============================================================================
export { WhisperAdapter } from './whisper.adapter.js';
export { DeepgramAdapter } from './deepgram.adapter.js';
export { GoogleAdapter } from './google.adapter.js';
export { SarvamAdapter } from './sarvam.adapter.js';
export { HojaiSTTAdapter } from './hojai.adapter.js';

import { WhisperAdapter } from './whisper.adapter.js';
import { DeepgramAdapter } from './deepgram.adapter.js';
import { GoogleAdapter } from './google.adapter.js';
import { SarvamAdapter } from './sarvam.adapter.js';
import { HojaiSTTAdapter } from './hojai.adapter.js';
import type { STTEngine, TranscriptionResult } from '../../types/index.js';

export type { TranscriptionResult };
export interface ISTTAdapter {
  transcribe(audioBuffer: Buffer, filename: string, language?: string): Promise<TranscriptionResult>;
}

export const sttAdapters: Record<STTEngine, ISTTAdapter> = {
  whisper: new WhisperAdapter(),
  deepgram: new DeepgramAdapter(),
  google: new GoogleAdapter(),
  sarvam: new SarvamAdapter(),
  hojai: new HojaiSTTAdapter(),
};

export function isSTTEngine(val: string): val is STTEngine {
  return ['whisper', 'deepgram', 'google', 'sarvam', 'hojai'].includes(val);
}
