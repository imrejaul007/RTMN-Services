// ============================================================================
// HOJAI VOICE PLATFORM - STT Factory
// ============================================================================

import { TranscriptionResult, STTEngine, SupportedLanguage } from '../types';
import { WhisperAdapter, getWhisperAdapter } from './whisper.adapter';
import { SarvamAdapter, getSarvamAdapter } from './sarvam.adapter';
import { GoogleSTTAdapter, getGoogleSTTAdapter } from './google.adapter';

/**
 * STT Factory - Creates and manages STT adapters
 */
export class STTFactory {
  private adapters: Map<STTEngine, {
    adapter: WhisperAdapter | SarvamAdapter | GoogleSTTAdapter;
    priority: number;
  }>;

  constructor() {
    this.adapters = new Map();
  }

  /**
   * Initialize adapters with priorities
   */
  initialize(): void {
    // Whisper - Primary adapter
    this.adapters.set('whisper', {
      adapter: getWhisperAdapter(),
      priority: 1,
    });

    // Sarvam - Best for Indian languages
    this.adapters.set('sarvam', {
      adapter: getSarvamAdapter(),
      priority: 2,
    });

    // Google - Fallback
    this.adapters.set('google', {
      adapter: getGoogleSTTAdapter(),
      priority: 3,
    });
  }

  /**
   * Get adapter by engine type
   */
  getAdapter(engine: STTEngine): WhisperAdapter | SarvamAdapter | GoogleSTTAdapter {
    const entry = this.adapters.get(engine);
    if (!entry) {
      throw new Error(`Unknown STT engine: ${engine}`);
    }
    return entry.adapter;
  }

  /**
   * Get the best adapter for a language
   */
  getBestAdapter(language: SupportedLanguage): {
    adapter: WhisperAdapter | SarvamAdapter | GoogleSTTAdapter;
    engine: STTEngine;
  } {
    // For Indian languages, prefer Sarvam
    const indianLanguages: SupportedLanguage[] = [
      'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'
    ];

    if (indianLanguages.includes(language)) {
      return {
        adapter: this.getAdapter('sarvam'),
        engine: 'sarvam',
      };
    }

    // Default to Whisper for English and others
    return {
      adapter: this.getAdapter('whisper'),
      engine: 'whisper',
    };
  }

  /**
   * Transcribe audio using the specified engine
   */
  async transcribe(
    audio: Buffer | string,
    language: SupportedLanguage,
    engine: STTEngine,
    options?: {
      filename?: string;
      mimeType?: string;
      withTimings?: boolean;
    }
  ): Promise<TranscriptionResult> {
    const adapter = this.getAdapter(engine);

    if (engine === 'sarvam' && typeof audio !== 'string') {
      // Sarvam needs base64
      const base64 = audio.toString('base64');
      return (adapter as SarvamAdapter).transcribe(base64, language, {
        withTimings: options?.withTimings,
      });
    }

    if (engine === 'google' && typeof audio !== 'string') {
      // Google needs base64
      return (adapter as GoogleSTTAdapter).transcribe(
        audio.toString('base64'),
        language
      );
    }

    if (engine === 'whisper' && Buffer.isBuffer(audio)) {
      // Whisper can handle buffer
      return (adapter as WhisperAdapter).transcribe(
        audio,
        options?.filename || 'audio.webm',
        language
      );
    }

    throw new Error(`Unsupported audio format for engine: ${engine}`);
  }

  /**
   * Transcribe from base64 audio
   */
  async transcribeFromBase64(
    base64Audio: string,
    language: SupportedLanguage,
    engine: STTEngine,
    mimeType?: string
  ): Promise<TranscriptionResult> {
    const adapter = this.getAdapter(engine);

    if (engine === 'sarvam') {
      return (adapter as SarvamAdapter).transcribe(base64Audio, language);
    }

    if (engine === 'google') {
      return (adapter as GoogleSTTAdapter).transcribe(base64Audio, language);
    }

    if (engine === 'whisper') {
      return (adapter as WhisperAdapter).transcribeFromBase64(
        base64Audio,
        mimeType || 'audio/webm',
        language
      );
    }

    throw new Error(`Unknown STT engine: ${engine}`);
  }

  /**
   * Transcribe from URL
   */
  async transcribeFromUrl(
    url: string,
    language: SupportedLanguage,
    engine: STTEngine
  ): Promise<TranscriptionResult> {
    const adapter = this.getAdapter(engine);

    if (engine === 'sarvam') {
      return (adapter as SarvamAdapter).transcribeFromUrl(url, language);
    }

    if (engine === 'google') {
      // Download and convert to base64
      const axios = (await import('axios')).default;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data).toString('base64');
      return (adapter as GoogleSTTAdapter).transcribe(base64, language);
    }

    if (engine === 'whisper') {
      return (adapter as WhisperAdapter).transcribeFromUrl(url, language);
    }

    throw new Error(`Unknown STT engine: ${engine}`);
  }

  /**
   * Get all available engines
   */
  getAvailableEngines(): Array<{ engine: STTEngine; name: string; priority: number }> {
    return Array.from(this.adapters.entries()).map(([engine, entry]) => ({
      engine,
      name: entry.adapter.getEngineInfo().name,
      priority: entry.priority,
    }));
  }

  /**
   * Check health of all adapters
   */
  async healthCheck(): Promise<Record<STTEngine, boolean>> {
    const results: Partial<Record<STTEngine, boolean>> = {};

    for (const [engine, entry] of this.adapters.entries()) {
      try {
        results[engine] = await entry.adapter.healthCheck();
      } catch {
        results[engine] = false;
      }
    }

    return results as Record<STTEngine, boolean>;
  }
}

// Singleton instance
let sttFactoryInstance: STTFactory | null = null;

export function getSTTFactory(): STTFactory {
  if (!sttFactoryInstance) {
    sttFactoryInstance = new STTFactory();
    sttFactoryInstance.initialize();
  }
  return sttFactoryInstance;
}

export { WhisperAdapter, getWhisperAdapter } from './whisper.adapter';
export { SarvamAdapter, getSarvamAdapter } from './sarvam.adapter';
export { GoogleSTTAdapter, getGoogleSTTAdapter } from './google.adapter';
