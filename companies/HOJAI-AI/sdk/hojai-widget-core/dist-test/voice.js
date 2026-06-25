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
export function isVoiceSupported() {
    if (typeof window === 'undefined')
        return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
export function createVoiceInput(options = {}) {
    let recognition = null;
    let listening = false;
    const SpeechRecognition = (typeof window !== 'undefined') &&
        (window.SpeechRecognition || window.webkitSpeechRecognition);
    function start() {
        if (!SpeechRecognition) {
            options.onError?.('not-supported');
            return;
        }
        if (listening)
            return;
        recognition = new SpeechRecognition();
        recognition.lang = options.lang || 'en-US';
        recognition.continuous = options.continuous ?? false;
        recognition.interimResults = options.interimResults ?? true;
        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                }
                else {
                    interimTranscript += result[0].transcript;
                }
            }
            const text = (finalTranscript + interimTranscript).trim();
            if (text)
                options.onResult?.(text, !!finalTranscript);
        };
        recognition.onerror = (event) => {
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
        }
        catch (err) {
            listening = false;
            options.onStateChange?.(false);
            options.onError?.(err.message || 'start-failed');
        }
    }
    function stop() {
        if (recognition && listening) {
            try {
                recognition.stop();
            }
            catch {
                // ignore
            }
        }
        listening = false;
        options.onStateChange?.(false);
    }
    function abort() {
        if (recognition && listening) {
            try {
                recognition.abort();
            }
            catch {
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
export function mapLanguageToSpeech(lang) {
    const map = {
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
