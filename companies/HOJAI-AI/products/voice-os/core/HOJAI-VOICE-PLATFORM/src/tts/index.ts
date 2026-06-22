// ============================================================================
// HOJAI VOICE PLATFORM - TTS Factory
// ============================================================================

import { SynthesisResult, SupportedVoice, SupportedLanguage, TTSEngine } from '../types';
import { ElevenLabsAdapter, getElevenLabsAdapter } from './elevenlabs.adapter';
import { CartesiaAdapter, getCartesiaAdapter } from './cartesia.adapter';
import { SarvamTTSAdapter, getSarvamTTSAdapter } from './sarvam-tts.adapter';

/**
 * TTS Factory - Creates and manages TTS adapters
 */
export class TTSFactory {
  private adapters: Map<TTSEngine, {
    adapter: ElevenLabsAdapter | CartesiaAdapter | SarvamTTSAdapter;
    priority: number;
  }>;

  constructor() {
    this.adapters = new Map();
  }

  /**
   * Initialize adapters with priorities
   */
  initialize(): void {
    // ElevenLabs - Primary adapter (best quality)
    this.adapters.set('elevenlabs', {
      adapter: getElevenLabsAdapter(),
      priority: 1,
    });

    // Cartesia - Secondary adapter
    this.adapters.set('cartesia', {
      adapter: getCartesiaAdapter(),
      priority: 2,
    });

    // Sarvam - Best for Indian languages
    this.adapters.set('sarvam', {
      adapter: getSarvamTTSAdapter(),
      priority: 3,
    });
  }

  /**
   * Get adapter by engine type
   */
  getAdapter(engine: TTSEngine): ElevenLabsAdapter | CartesiaAdapter | SarvamTTSAdapter {
    const entry = this.adapters.get(engine);
    if (!entry) {
      throw new Error(`Unknown TTS engine: ${engine}`);
    }
    return entry.adapter;
  }

  /**
   * Get the best adapter for a language
   */
  getBestAdapter(language: SupportedLanguage): {
    adapter: ElevenLabsAdapter | CartesiaAdapter | SarvamTTSAdapter;
    engine: TTSEngine;
  } {
    // Sarvam is best for Indian languages
    const indianLanguages: SupportedLanguage[] = [
      'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'
    ];

    if (indianLanguages.includes(language)) {
      return {
        adapter: this.getAdapter('sarvam'),
        engine: 'sarvam',
      };
    }

    // Default to ElevenLabs for English and others
    return {
      adapter: this.getAdapter('elevenlabs'),
      engine: 'elevenlabs',
    };
  }

  /**
   * Synthesize speech using the specified engine
   */
  async synthesize(
    text: string,
    voiceId: SupportedVoice,
    language: SupportedLanguage,
    engine: TTSEngine,
    options?: {
      speed?: number;
      pitch?: number;
    }
  ): Promise<SynthesisResult> {
    const adapter = this.getAdapter(engine);

    if (engine === 'elevenlabs') {
      return (adapter as ElevenLabsAdapter).synthesize(text, voiceId, language, options);
    }

    if (engine === 'cartesia') {
      return (adapter as CartesiaAdapter).synthesize(text, voiceId, language, options);
    }

    if (engine === 'sarvam') {
      return (adapter as SarvamTTSAdapter).synthesize(text, voiceId, language, options);
    }

    throw new Error(`Unknown TTS engine: ${engine}`);
  }

  /**
   * Get all available engines
   */
  getAvailableEngines(): Array<{ engine: TTSEngine; name: string; priority: number }> {
    return Array.from(this.adapters.entries()).map(([engine, entry]) => ({
      engine,
      name: entry.adapter.getEngineInfo().name,
      priority: entry.priority,
    }));
  }

  /**
   * Get available voices for all engines
   */
  async getAllVoices(): Promise<Record<TTSEngine, Array<{ id: string; name: string; language: string }>>> {
    const results: Partial<Record<TTSEngine, Array<{ id: string; name: string; language: string }>>> = {};

    for (const [engine, entry] of this.adapters.entries()) {
      try {
        results[engine] = await entry.adapter.getVoices();
      } catch (error) {
        console.error(`Failed to get voices from ${engine}:`, error);
        results[engine] = [];
      }
    }

    return results as Record<TTSEngine, Array<{ id: string; name: string; language: string }>>;
  }

  /**
   * Check health of all adapters
   */
  async healthCheck(): Promise<Record<TTSEngine, boolean>> {
    const results: Partial<Record<TTSEngine, boolean>> = {};

    for (const [engine, entry] of this.adapters.entries()) {
      try {
        results[engine] = await entry.adapter.healthCheck();
      } catch {
        results[engine] = false;
      }
    }

    return results as Record<TTSEngine, boolean>;
  }
}

// Singleton instance
let ttsFactoryInstance: TTSFactory | null = null;

export function getTTSFactory(): TTSFactory {
  if (!ttsFactoryInstance) {
    ttsFactoryInstance = new TTSFactory();
    ttsFactoryInstance.initialize();
  }
  return ttsFactoryInstance;
}

export { ElevenLabsAdapter, getElevenLabsAdapter } from './elevenlabs.adapter';
export { CartesiaAdapter, getCartesiaAdapter } from './cartesia.adapter';
export { SarvamTTSAdapter, getSarvamTTSAdapter } from './sarvam-tts.adapter';
