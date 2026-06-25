/**
 * Language Detection — Voice Gateway v1.1
 * ======================================
 * Detects language from audio using a lightweight heuristic.
 * Uses Whisper language codes as the canonical set.
 *
 * In production: wire to a fast language ID model (e.g. langdetect,
 * fasttext lid.176, or use Whisper's built-in language detection).
 */

import type { STTEngine } from '../types/index.js';

// ── Supported languages + Whisper codes ─────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',        whisper: 'en',   indic: false,  latin: true  },
  { code: 'hi', name: 'Hindi',          whisper: 'hi',   indic: true,   latin: false },
  { code: 'bn', name: 'Bengali',        whisper: 'bn',   indic: true,   latin: false },
  { code: 'ta', name: 'Tamil',          whisper: 'ta',   indic: true,   latin: false },
  { code: 'te', name: 'Telugu',         whisper: 'te',   indic: true,   latin: false },
  { code: 'mr', name: 'Marathi',        whisper: 'mr',   indic: true,   latin: false },
  { code: 'kn', name: 'Kannada',        whisper: 'kn',   indic: true,   latin: false },
  { code: 'ml', name: 'Malayalam',      whisper: 'ml',   indic: true,   latin: false },
  { code: 'gu', name: 'Gujarati',       whisper: 'gu',   indic: true,   latin: false },
  { code: 'pa', name: 'Punjabi',        whisper: 'pa',   indic: true,   latin: false },
  { code: 'or', name: 'Odia',            whisper: 'or',   indic: true,   latin: false },
  { code: 'as', name: 'Assamese',       whisper: 'as',   indic: true,   latin: false },
  { code: 'es', name: 'Spanish',        whisper: 'es',   indic: false,  latin: true  },
  { code: 'fr', name: 'French',         whisper: 'fr',   indic: false,  latin: true  },
  { code: 'de', name: 'German',         whisper: 'de',   indic: false,  latin: true  },
  { code: 'pt', name: 'Portuguese',     whisper: 'pt',   indic: false,  latin: true  },
  { code: 'ru', name: 'Russian',         whisper: 'ru',   indic: false,  latin: false },
  { code: 'zh', name: 'Chinese',        whisper: 'zh',   indic: false,  latin: false },
  { code: 'ja', name: 'Japanese',       whisper: 'ja',   indic: false,  latin: false },
  { code: 'ko', name: 'Korean',         whisper: 'ko',   indic: false,  latin: false },
  { code: 'ar', name: 'Arabic',        whisper: 'ar',   indic: false,  latin: false },
  { code: 'id', name: 'Indonesian',     whisper: 'id',   indic: false,  latin: false },
  { code: 'ms', name: 'Malay',          whisper: 'ms',   indic: false,  latin: false },
  { code: 'th', name: 'Thai',           whisper: 'th',   indic: false,  latin: false },
  { code: 'vi', name: 'Vietnamese',     whisper: 'vi',   indic: false,  latin: false },
] as const;

// ── Text-based language detection (for transcribed text) ────────────────────────

/**
 * Simple n-gram frequency based language detection.
 * Works on transcribed text (post-STT).
 *
 * In production: use langdetect, fasttext, or the STT engine's language detection.
 */
export interface LanguageDetectionResult {
  detected: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
  isCodeSwitched: boolean;
  codeSwitchedLanguages?: string[];
}

const HINDI_CHARS = /[ऀ-ॿ]/;
const BENGALI_CHARS = /[ঀ-৿]/;
const TAMIL_CHARS = /[஀-௿]/;
const TELUGU_CHARS = /[ఀ-౿]/;
const MARATHI_CHARS = /[ऀ-ॿ]/; // shares Devanagari
const KANNADA_CHARS = /[ಀ-೿]/;
const MALAYALAM_CHARS = /[ഀ-ൿ]/;
const GUJARATI_CHARS = /[઀-૿]/;
const ARABIC_CHARS = /[؀-ۿ]/;
const THAI_CHARS = /[฀-๿]/;
const CHINESE_CHARS = /[一-鿿]/;
const JAPANESE_CHARS = /[぀-ヿ一-鿿]/;
const KOREAN_CHARS = /[가-힯]/;
const RUSSIAN_CHARS = /[Ѐ-ӿ]/;

const HINDI_WORDS = ['hai', 'hai', 'kaun', 'kya', 'mera', 'tum', 'main', 'ke', 'ki', 'ko', 'se', 'aur', 'nahi', 'sab', 'apna'];
const BENGALI_WORDS = ['ami', 'tumi', 'ke', 'kena', 'amra', 'ei', 'ta', 'theke', 'e', 'o'];
const TAMIL_WORDS = ['nan', 'un', 'enna', 'vanga', 'irukku', 'tha', 'la', 'nu'];
const ENGLISH_WORDS = ['the', 'is', 'are', 'and', 'to', 'of', 'in', 'it', 'you', 'that', 'for', 'a', 'be', 'with', 'have'];

export function detectLanguageFromText(text: string): LanguageDetectionResult {
  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return { detected: 'en', confidence: 0.5, alternatives: [], isCodeSwitched: false };
  }

  const scores: Record<string, { score: number; hits: number; total: number }> = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    scores[lang.code] = { score: 0, hits: 0, total: 0 };
  }

  // Character script detection (strongest signal)
  const charChecks: Array<{ pattern: RegExp; lang: string; weight: number }> = [
    { pattern: HINDI_CHARS,     lang: 'hi', weight: 1.0 },
    { pattern: BENGALI_CHARS,   lang: 'bn', weight: 1.0 },
    { pattern: TAMIL_CHARS,     lang: 'ta', weight: 1.0 },
    { pattern: TELUGU_CHARS,    lang: 'te', weight: 1.0 },
    { pattern: KANNADA_CHARS,   lang: 'kn', weight: 1.0 },
    { pattern: MALAYALAM_CHARS, lang: 'ml', weight: 1.0 },
    { pattern: GUJARATI_CHARS,  lang: 'gu', weight: 1.0 },
    { pattern: ARABIC_CHARS,   lang: 'ar', weight: 1.0 },
    { pattern: THAI_CHARS,     lang: 'th', weight: 1.0 },
    { pattern: CHINESE_CHARS,  lang: 'zh', weight: 0.8 },
    { pattern: JAPANESE_CHARS, lang: 'ja', weight: 0.8 },
    { pattern: KOREAN_CHARS,   lang: 'ko', weight: 0.8 },
    { pattern: RUSSIAN_CHARS, lang: 'ru', weight: 0.9 },
  ];

  let scriptMatchCount = 0;
  for (const { pattern, lang, weight } of charChecks) {
    const matches = (trimmed.match(pattern) || []).length;
    if (matches > 0) {
      scores[lang].score += matches * weight;
      scores[lang].hits++;
      scriptMatchCount += matches;
    }
  }

  // Word-based detection for Latin scripts
  if (scriptMatchCount === 0) {
    const words = trimmed.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (HINDI_WORDS.includes(word)) scores['hi'].hits++;
      if (BENGALI_WORDS.includes(word)) scores['bn'].hits++;
      if (TAMIL_WORDS.includes(word)) scores['ta'].hits++;
      if (ENGLISH_WORDS.includes(word)) scores['en'].hits++;
    }

    for (const lang of ['en', 'hi', 'bn', 'ta']) {
      scores[lang].score = scores[lang].hits / Math.max(1, words.length);
    }
  }

  // Compute confidence
  const totalScriptChars = trimmed.length;
  const sorted = Object.entries(scores)
    .map(([code, s]) => ({ code, score: s.score }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return { detected: 'en', confidence: 0.3, alternatives: [], isCodeSwitched: false };
  }

  const top = sorted[0];
  const second = sorted[1]?.score ?? 0;
  const confidence = second > 0
    ? Math.min(0.99, top.score / (top.score + second))
    : 0.5;

  const alternatives = sorted.slice(1, 4).map(s => ({
    language: s.code,
    confidence: Math.round((s.score / top.score) * confidence * 100) / 100,
  }));

  // Detect code-switching (mix of scripts)
  const scriptsFound = charChecks.filter(({ pattern }) => pattern.test(trimmed)).map(r => r.lang);
  const isCodeSwitched = scriptsFound.length > 1;

  return {
    detected: top.code,
    confidence: Math.round(confidence * 100) / 100,
    alternatives,
    isCodeSwitched,
    codeSwitchedLanguages: isCodeSwitched ? scriptsFound : undefined,
  };
}

// ── Audio-based language detection ──────────────────────────────────────────────

/**
 * Estimate language from audio characteristics.
 * Uses spectral centroid and zero-crossing rate as proxies.
 *
 * In production: use a lightweight audio classifier (e.g. based on MFCCs).
 */
export function detectLanguageFromAudio(audioBuffer: Buffer, format: string): { detected: string; confidence: number } {
  // Very rough heuristic — real implementation would analyze frequency spectrum
  // Indic languages tend to have higher syllable rates
  // Latin languages have distinct rhythm patterns

  const entropy = computeBufferEntropy(audioBuffer);
  const isLowEntropy = entropy < 2.5; // mostly silence or simple tones
  const isHighEntropy = entropy > 5;  // complex / speech-like

  // Zero-crossing rate proxy
  let zeroCrossings = 0;
  for (let i = 1; i < audioBuffer.length; i++) {
    if ((audioBuffer[i - 1] < 128 && audioBuffer[i] >= 128) ||
        (audioBuffer[i - 1] >= 128 && audioBuffer[i] < 128)) {
      zeroCrossings++;
    }
  }
  const zcr = zeroCrossings / audioBuffer.length;

  // Heuristic rules
  if (isLowEntropy) {
    return { detected: 'en', confidence: 0.3 }; // likely silence/noise
  }

  if (zcr > 0.15) {
    // High ZCR → likely tonal (Indic languages)
    return { detected: 'hi', confidence: 0.6 };
  }

  if (zcr > 0.1) {
    return { detected: 'en', confidence: 0.7 };
  }

  return { detected: 'en', confidence: 0.4 };
}

function computeBufferEntropy(buffer: Buffer): number {
  const freq = new Array(256).fill(0);
  for (const byte of buffer) freq[byte]++;
  let entropy = 0;
  for (const count of freq) {
    if (count > 0) {
      const p = count / buffer.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

// ── Language recommendation for routing ─────────────────────────────────────────

export function recommendEngine(language: string): STTEngine {
  // Maps language to the best engine for that language
  const engineMap: Record<string, STTEngine> = {
    en: 'whisper', hi: 'sarvam', bn: 'sarvam', ta: 'sarvam',
    te: 'sarvam', mr: 'sarvam', kn: 'sarvam', ml: 'sarvam',
    gu: 'sarvam', pa: 'sarvam',
    es: 'whisper', fr: 'deepgram', de: 'whisper',
    pt: 'whisper', ru: 'whisper', zh: 'google',
    ja: 'google', ko: 'google', ar: 'whisper',
  };
  return engineMap[language] ?? 'whisper';
}

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name ?? code;
}

export default { detectLanguageFromText, detectLanguageFromAudio, recommendEngine, getLanguageName };
