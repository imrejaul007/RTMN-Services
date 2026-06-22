/**
 * Hojai Flow - Voice Layer Service
 *
 * Core voice processing:
 * - Voice Activity Detection (VAD)
 * - Language Detection
 * - Speech Recognition (ASR)
 * - Personal Dictionary
 */

import { v4 as uuid } from 'uuid';

export interface Transcript {
  id: string;
  text: string;
  confidence: number;
  language: string;
  timestamp: Date;
  duration: number;
  speaker?: string;
}

export interface VoiceSegment {
  start: number;
  end: number;
  audio: Buffer;
  isSpeech: boolean;
}

export type SupportedLanguage =
  | 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'pa' | 'gu' | 'or' | 'as'
  | 'hinglish' | 'mixed';

export interface VoiceConfig {
  sampleRate: number;
  channels: number;
  vadThreshold: number;
  minSpeechDuration: number;
  maxSilenceDuration: number;
}

// Language detection patterns for Indian languages
const LANGUAGE_PATTERNS: Record<SupportedLanguage, RegExp[]> = {
  en: [/\b(the|a|an|is|are|was|were|have|has|had|will|would|could|should|can|may|might)\b/i],
  hi: [/[ऀ-ॿ]/, /\b(है|हैं|का|के|की|को|में|से|पर|नहीं|हाँ|ज़|क़|ख़|ग़|ज़)\b/],
  bn: [/[ঀ-৿]/],
  ta: [/[஀-௿]/],
  te: [/[ఀ-౿]/],
  kn: [/[ಀ-೿]/],
  ml: [/[ഀ-ൿ]/],
  mr: [/[௠-௿]/],
  pa: [/[਀-੿]/],
  gu: [/[઀-૿]/],
  or: [/[଀-୿]/],
  as: [/[ঀ-৿]/],
  hinglish: [/[ऀ-ॿ]/i, /\b(acha|accha|kya|kyu|kab|kaun|kaise|yeh|woh|voh|nahi|haan|bilkul|dekho|suno|batao)\b/i],
  mixed: [/[ऀ-ॿ].*[a-zA-Z]|[a-zA-Z].*[ऀ-ॿ]/],
};

export class VoiceService {
  private config: VoiceConfig;
  private personalDictionary: Map<string, string>;
  private languageModels: Map<string, number>;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      vadThreshold: 0.5,
      minSpeechDuration: 100, // ms
      maxSilenceDuration: 500, // ms
      ...config,
    };

    this.personalDictionary = new Map();
    this.languageModels = new Map();
  }

  /**
   * Voice Activity Detection
   * Detects speech vs silence in audio stream
   */
  async detectVoiceActivity(audioBuffer: Buffer): Promise<VoiceSegment[]> {
    const segments: VoiceSegment[] = [];
    const chunkSize = Math.floor(this.config.sampleRate * 0.1); // 100ms chunks

    let isSpeech = false;
    let speechStart = 0;

    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      const energy = this.calculateAudioEnergy(chunk);
      const hasSpeech = energy > this.config.vadThreshold;

      if (hasSpeech && !isSpeech) {
        isSpeech = true;
        speechStart = i / this.config.sampleRate;
      } else if (!hasSpeech && isSpeech) {
        const speechEnd = i / this.config.sampleRate;
        if ((speechEnd - speechStart) * 1000 >= this.config.minSpeechDuration) {
          segments.push({
            start: speechStart,
            end: speechEnd,
            audio: audioBuffer.slice(
              Math.floor(speechStart * this.config.sampleRate),
              Math.floor(speechEnd * this.config.sampleRate)
            ),
            isSpeech: true,
          });
        }
        isSpeech = false;
      }
    }

    // Handle trailing speech
    if (isSpeech) {
      const speechEnd = audioBuffer.length / this.config.sampleRate;
      segments.push({
        start: speechStart,
        end: speechEnd,
        audio: audioBuffer.slice(
          Math.floor(speechStart * this.config.sampleRate),
          audioBuffer.length
        ),
        isSpeech: true,
      });
    }

    return segments;
  }

  /**
   * Calculate audio energy (RMS)
   */
  private calculateAudioEnergy(buffer: Buffer): number {
    let sum = 0;
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }

    return Math.sqrt(sum / samples.length) / 32768;
  }

  /**
   * Detect language from text
   */
  detectLanguage(text: string): SupportedLanguage {
    const scores: Record<SupportedLanguage, number> = {
      en: 0, hi: 0, bn: 0, ta: 0, te: 0, kn: 0, ml: 0, mr: 0, pa: 0, gu: 0, or: 0, as: 0, hinglish: 0, mixed: 0,
    };

    // Check for Devanagari script (Hindi)
    if (/[ऀ-ॿ]/.test(text)) {
      scores.hi += 2;
    }

    // Check Bengali script
    if (/[ঀ-৿]/.test(text)) {
      scores.bn += 2;
    }

    // Check Tamil script
    if (/[஀-௿]/.test(text)) {
      scores.ta += 2;
    }

    // Check for Hinglish indicators
    const hinglishIndicators = /\b(kya|kyu|kab|kaun|kaise|acha|accha|dekho|suno|batao|nahi|haan)\b/i;
    if (hinglishIndicators.test(text) && /[a-zA-Z]/.test(text)) {
      scores.hinglish += 3;
    }

    // Check for English patterns
    const englishWords = text.match(/\b(the|a|an|is|are|was|have|has|will|would|could|should)\b/gi);
    if (englishWords) {
      scores.en += englishWords.length;
    }

    // Check for mixed script
    if ((/[ऀ-ॿ]/.test(text) && /[a-zA-Z]/.test(text)) ||
        (/[ऀ-ॿ]/.test(text) && /[ঀ-৿]/.test(text))) {
      scores.mixed += 2;
    }

    // Find highest score
    let maxLang: SupportedLanguage = 'en';
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxLang = lang as SupportedLanguage;
      }
    }

    return maxLang;
  }

  /**
   * Speech Recognition (ASR)
   * Note: In production, this would call an external ASR service
   * Supported: Google Speech-to-Text, Whisper, Deepgram, AssemblyAI
   */
  async recognizeSpeech(
    audioBuffer: Buffer,
    language: SupportedLanguage = 'en'
  ): Promise<Transcript> {
    const id = uuid();
    const startTime = Date.now();

    // This is a mock implementation
    // In production, integrate with:
    // - Google Cloud Speech-to-Text
    // - OpenAI Whisper API
    // - Deepgram
    // - AssemblyAI

    const mockTranscript = {
      id,
      text: '', // Would be filled by ASR
      confidence: 0.95,
      language,
      timestamp: new Date(),
      duration: audioBuffer.length / this.config.sampleRate,
    };

    // Simulate ASR processing
    // const result = await this.callASRProvider(audioBuffer, language);
    // return result;

    return mockTranscript;
  }

  /**
   * Process streaming audio
   */
  async processStream(
    audioStream: AsyncIterable<Buffer>,
    onTranscript: (transcript: Transcript) => void,
    onSegment: (segment: VoiceSegment) => void
  ): Promise<void> {
    let buffer = Buffer.alloc(0);

    for await (const chunk of audioStream) {
      buffer = Buffer.concat([buffer, chunk]);

      // Process voice segments
      const segments = await this.detectVoiceActivity(buffer);
      for (const segment of segments) {
        onSegment(segment);

        if (segment.isSpeech) {
          const transcript = await this.recognizeSpeech(segment.audio);
          onTranscript(transcript);
        }
      }
    }
  }

  /**
   * Personal Dictionary Management
   */
  addToDictionary(term: string, replacement: string): void {
    this.personalDictionary.set(term.toLowerCase(), replacement);
  }

  removeFromDictionary(term: string): void {
    this.personalDictionary.delete(term.toLowerCase());
  }

  getDictionary(): Map<string, string> {
    return new Map(this.personalDictionary);
  }

  /**
   * Apply personal dictionary to transcript
   */
  applyDictionary(text: string): string {
    let result = text;

    for (const [term, replacement] of this.personalDictionary) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      result = result.replace(regex, replacement);
    }

    return result;
  }

  /**
   * Learn from corrections
   */
  learnCorrection(original: string, corrected: string): void {
    // Simple learning: if user corrects a word, remember it
    const words = original.toLowerCase().split(' ');
    const correctedWords = corrected.toLowerCase().split(' ');

    for (let i = 0; i < Math.min(words.length, correctedWords.length); i++) {
      if (words[i] !== correctedWords[i]) {
        this.addToDictionary(words[i], correctedWords[i]);
      }
    }
  }

  /**
   * Style Learning
   */
  learnStyle(text: string): void {
    // Track language usage patterns
    const lang = this.detectLanguage(text);
    const current = this.languageModels.get(lang) || 0;
    this.languageModels.set(lang, current + 1);
  }

  getPreferredLanguage(): SupportedLanguage {
    let maxLang: SupportedLanguage = 'en';
    let maxCount = 0;

    for (const [lang, count] of this.languageModels) {
      if (count > maxCount) {
        maxCount = count;
        maxLang = lang as SupportedLanguage;
      }
    }

    return maxLang;
  }

  /**
   * Batch transcript processing
   */
  async processBatch(
    audioBuffers: Buffer[],
    language?: SupportedLanguage
  ): Promise<Transcript[]> {
    const transcripts: Transcript[] = [];

    for (const buffer of audioBuffers) {
      const lang = language || this.getPreferredLanguage();
      const transcript = await this.recognizeSpeech(buffer, lang);
      transcript.text = this.applyDictionary(transcript.text);
      this.learnStyle(transcript.text);
      transcripts.push(transcript);
    }

    return transcripts;
  }
}

// Singleton export
export const voiceService = new VoiceService();

export default voiceService;
