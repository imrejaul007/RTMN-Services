/**
 * Voice input module for HOJAI Widget.
 *
 * Uses the browser's native Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * for speech-to-text. Falls back gracefully when not supported.
 *
 * Public API:
 *   const voice = createVoiceInput({ onResult, onError, lang });
 *   voice.start();
 *   voice.stop();
 *   voice.isSupported(); // boolean
 */

export interface VoiceInputCallbacks {
  /** Called with interim + final transcripts */
  onResult?: (text: string, isFinal: boolean) => void;
  /** Called on speech recognition error */
  onError?: (error: string) => void;
  /** Called when listening starts/stops */
  onStateChange?: (listening: boolean) => void;
}

export interface VoiceInputOptions extends VoiceInputCallbacks {
  /** BCP-47 language code (e.g. 'en-US', 'es-ES') */
  lang?: string;
  /** Continuous recognition (true) vs single-shot (false) */
  continuous?: boolean;
  /** Return interim results while speaking */
  interimResults?: boolean;
}

export interface VoiceInput {
  start: () => void;
  stop: () => void;
  abort: () => void;
  isSupported: () => boolean;
  isListening: () => boolean;
}

// Augment Window for non-standard SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createVoiceInput(options: VoiceInputOptions = {}): VoiceInput {
  let recognition: any = null;
  let listening = false;

  const SpeechRecognition = (typeof window !== 'undefined') &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  function start(): void {
    if (!SpeechRecognition) {
      options.onError?.('not-supported');
      return;
    }
    if (listening) return;

    recognition = new SpeechRecognition();
    recognition.lang = options.lang || 'en-US';
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = options.interimResults ?? true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      const text = (finalTranscript + interimTranscript).trim();
      if (text) options.onResult?.(text, !!finalTranscript);
    };

    recognition.onerror = (event: any) => {
      listening = false;
      options.onStateChange?.(false);
      options.onError?.(event.error || 'unknown');
    };

    recognition.onend = () => {
      listening = false;
      options.onStateChange?.(false);
    };

    try {
      recognition.start();
      listening = true;
      options.onStateChange?.(true);
    } catch (err: any) {
      listening = false;
      options.onStateChange?.(false);
      options.onError?.(err.message || 'start-failed');
    }
  }

  function stop(): void {
    if (recognition && listening) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    listening = false;
    options.onStateChange?.(false);
  }

  function abort(): void {
    if (recognition && listening) {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
    listening = false;
    options.onStateChange?.(false);
  }

  return {
    start,
    stop,
    abort,
    isSupported: () => !!SpeechRecognition,
    isListening: () => listening
  };
}

/**
 * Map a HOJAI widget language code to a BCP-47 speech recognition lang.
 * e.g. 'es' → 'es-ES', 'hi' → 'hi-IN'
 */
export function mapLanguageToSpeech(lang: string): string {
  const map: Record<string, string> = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'hi': 'hi-IN',
    'ar': 'ar-SA',
    'tr': 'tr-TR',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'id': 'id-ID',
    'ms': 'ms-MY',
    'tl': 'tl-PH'
  };
  return map[lang] || 'en-US';
}