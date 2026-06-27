/**
 * HOJAI Widget Core — Text-to-Speech (TTS) module.
 *
 * Uses the browser's native Web Speech API (window.speechSynthesis).
 * Zero dependencies, browser-only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TTSOptions {
  lang?: string;
  rate?: number;      // 0.1 to 10 (default 1)
  pitch?: number;      // 0 to 2 (default 1)
  volume?: number;     // 0 to 1 (default 1)
  voice?: string;      // Voice name
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface TTSInstance {
  speak: (text: string, options?: TTSOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: () => boolean;
  isPaused: () => boolean;
  getVoices: () => SpeechSynthesisVoice[];
  getDefaultVoice: (lang?: string) => SpeechSynthesisVoice | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

function getDefaultVoice(lang?: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  if (lang) {
    // Prefer exact match, then language prefix
    const exact = voices.find(v => v.lang === lang);
    if (exact) return exact;

    const prefix = lang.split('-')[0];
    const partial = voices.find(v => v.lang.startsWith(prefix));
    if (partial) return partial;
  }

  // Fallback to first available
  return voices[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createTTS(defaultOptions?: TTSOptions): TTSInstance {
  if (!isTTSSupported()) {
    console.warn('[hojai-tts] Speech Synthesis not supported in this browser');
    return createNoopTTS();
  }

  let currentUtterance: SpeechSynthesisUtterance | null = null;
  let pausedAt: number | null = null;
  let options: TTSOptions = defaultOptions || {};

  function speak(text: string, opts?: TTSOptions): void {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const merged = { ...options, ...opts };
    const utterance = new SpeechSynthesisUtterance(text);

    if (merged.lang) utterance.lang = merged.lang;
    if (merged.rate !== undefined) utterance.rate = merged.rate;
    if (merged.pitch !== undefined) utterance.pitch = merged.pitch;
    if (merged.volume !== undefined) utterance.volume = merged.volume;

    // Voice selection
    const voice = merged.voice
      ? getVoices().find(v => v.name === merged.voice)
      : getDefaultVoice(merged.lang);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      pausedAt = null;
      merged.onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      merged.onEnd?.();
    };

    utterance.onerror = (event) => {
      // Ignore 'interrupted' and 'canceled' — those are expected
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('[hojai-tts] Error:', event.error);
        merged.onError?.(event.error);
      }
      currentUtterance = null;
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stop(): void {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    pausedAt = null;
  }

  function pause(): void {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      pausedAt = Date.now();
    }
  }

  function resume(): void {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      pausedAt = null;
    }
  }

  function isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }

  function isPaused(): boolean {
    return window.speechSynthesis.paused;
  }

  function getAllVoices(): SpeechSynthesisVoice[] {
    return getVoices();
  }

  function getVoice(lang?: string): SpeechSynthesisVoice | null {
    return getDefaultVoice(lang);
  }

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    getVoices: getAllVoices,
    getDefaultVoice: getVoice,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// No-op TTS (for unsupported browsers)
// ─────────────────────────────────────────────────────────────────────────────

function createNoopTTS(): TTSInstance {
  return {
    speak: () => console.warn('[hojai-tts] TTS not supported'),
    stop: () => {},
    pause: () => {},
    resume: () => {},
    isSpeaking: () => false,
    isPaused: () => false,
    getVoices: () => [],
    getDefaultVoice: () => null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Language to Voice mapping
// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGE_VOICE_PATTERNS: Record<string, string[]> = {
  'en': ['Google US English', 'Microsoft David', 'Samantha', 'Alex'],
  'en-US': ['Google US English', 'Microsoft David', 'Samantha'],
  'en-GB': ['Google UK English', 'Microsoft Hazel', 'Daniel'],
  'en-IN': ['Google Indian English', 'Microsoft Heera'],
  'hi': ['Google Hindi', 'Microsoft Heera', 'Priya'],
  'hi-IN': ['Google Hindi', 'Microsoft Heera'],
  'es': ['Google Spanish', 'Microsoft Pablo', 'Google ES'],
  'es-ES': ['Google Spanish', 'Microsoft Pablo'],
  'fr': ['Google French', 'Microsoft Hortense', 'Google FR'],
  'fr-FR': ['Google French', 'Microsoft Hortense'],
  'de': ['Google German', 'Microsoft Stefan', 'Google DE'],
  'de-DE': ['Google German', 'Microsoft Stefan'],
  'it': ['Google Italian', 'Microsoft Elsa'],
  'pt': ['Google Portuguese', 'Microsoft Maria'],
  'ja': ['Google Japanese', 'Microsoft Ayumi'],
  'ja-JP': ['Google Japanese', 'Microsoft Ayumi'],
  'ko': ['Google Korean', 'Microsoft Heami'],
  'ko-KR': ['Google Korean', 'Microsoft Heami'],
  'zh': ['Google Chinese', 'Microsoft Huihui'],
  'zh-CN': ['Google Chinese (Simplified)', 'Microsoft Huihui'],
  'zh-TW': ['Google Chinese (Traditional)', 'Microsoft Yating'],
  'ar': ['Google Arabic', 'Microsoft Mohammed'],
  'ar-SA': ['Google Arabic', 'Microsoft Mohammed'],
  'ru': ['Google Russian', 'Microsoft Irina'],
  'nl': ['Google Dutch', 'Microsoft Frank'],
  'pl': ['Google Polish', 'Microsoft Adam'],
  'sv': ['Google Swedish', 'Microsoft Anna'],
  'tr': ['Google Turkish', 'Microsoft Tolga'],
};

/**
 * Find the best available voice for a given language code.
 */
export function findBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  // Try patterns for the full lang first, then prefix
  const patterns = LANGUAGE_VOICE_PATTERNS[lang] || LANGUAGE_VOICE_PATTERNS[lang.split('-')[0]] || [];

  for (const pattern of patterns) {
    const voice = voices.find(v => v.name.includes(pattern));
    if (voice) return voice;
  }

  // Fallback: try any voice matching the language
  const prefix = lang.split('-')[0];
  return voices.find(v => v.lang.startsWith(prefix)) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default options
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TTS_OPTIONS: TTSOptions = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};
