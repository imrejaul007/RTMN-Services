// ============================================================================
// HOJAI VOICE PLATFORM - Synthesis Service
// ============================================================================

import {
  SynthesisResult,
  SupportedVoice,
  SupportedLanguage,
  TTSEngine,
} from '../types';
import { getTTSFactory } from '../tts';

/**
 * Synthesis Service - Handles text-to-speech operations
 */
export class SynthesisService {
  private ttsFactory = getTTSFactory();

  /**
   * Synthesize speech from text
   */
  async synthesize(
    text: string,
    voiceId: SupportedVoice,
    language: SupportedLanguage,
    engine?: TTSEngine,
    options?: {
      speed?: number;
      pitch?: number;
    }
  ): Promise<SynthesisResult> {
    const ttsEngine = engine || 'elevenlabs';

    return this.ttsFactory.synthesize(text, voiceId, language, ttsEngine, options);
  }

  /**
   * Synthesize speech for a specific agent configuration
   */
  async synthesizeForAgent(
    text: string,
    config: {
      voiceId: SupportedVoice;
      language: SupportedLanguage;
      ttsEngine: TTSEngine;
      speed?: number;
      pitch?: number;
    }
  ): Promise<SynthesisResult> {
    return this.synthesize(
      text,
      config.voiceId,
      config.language,
      config.ttsEngine,
      {
        speed: config.speed,
        pitch: config.pitch,
      }
    );
  }

  /**
   * Get available TTS engines
   */
  getAvailableEngines(): Array<{ engine: TTSEngine; name: string; priority: number }> {
    return this.ttsFactory.getAvailableEngines();
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<Record<TTSEngine, Array<{ id: string; name: string; language: string }>>> {
    return this.ttsFactory.getAllVoices();
  }

  /**
   * Get TTS engine health status
   */
  async getEngineHealth(): Promise<Record<TTSEngine, boolean>> {
    return this.ttsFactory.healthCheck();
  }

  /**
   * Get best engine for language
   */
  getBestEngine(language: SupportedLanguage): TTSEngine {
    const { engine } = this.ttsFactory.getBestAdapter(language);
    return engine;
  }
}

// Singleton instance
let synthesisServiceInstance: SynthesisService | null = null;

export function getSynthesisService(): SynthesisService {
  if (!synthesisServiceInstance) {
    synthesisServiceInstance = new SynthesisService();
  }
  return synthesisServiceInstance;
}

export default SynthesisService;
