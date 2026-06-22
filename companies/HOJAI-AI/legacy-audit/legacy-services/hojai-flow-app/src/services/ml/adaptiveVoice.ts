/**
 * Adaptive Voice - Continuous Learning System
 *
 * Features:
 * - Learns from user corrections
 * - Adapts to accent/speaking style
 * - Improves over time
 * - Personalized dictionary
 * - Voice profile
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { localWhisper } from '../voice/whisperLocal';

const ADAPTIVE_KEY = 'hojai_adaptive';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceProfile {
  accent: string;
  speakingSpeed: number;
  commonPhrases: string[];
  languageMix: string[];
  corrections: Correction[];
}

export interface Correction {
  original: string;
  corrected: string;
  timestamp: number;
}

export interface WordCorrection {
  word: string;
  correction: string;
  count: number;
}

export interface AdaptiveConfig {
  enableLearning: boolean;
  enableCorrections: boolean;
  confidenceThreshold: number;
}

// ============================================================================
// ADAPTIVE VOICE
// ============================================================================

class AdaptiveVoice {
  private profile: VoiceProfile | null = null;
  private dictionary: WordCorrection[] = [];
  private config: AdaptiveConfig = {
    enableLearning: true,
    enableCorrections: true,
    confidenceThreshold: 0.8,
  };
  private isLoaded = false;

  /**
   * Initialize
   */
  async init(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load profile
      const stored = await AsyncStorage.getItem(`${ADAPTIVE_KEY}_profile`);
      if (stored) {
        this.profile = JSON.parse(stored);
      } else {
        this.profile = this.getDefaultProfile();
      }

      // Load dictionary
      const dict = await AsyncStorage.getItem(`${ADAPTIVE_KEY}_dictionary`);
      if (dict) {
        this.dictionary = JSON.parse(dict);
      }

      this.isLoaded = true;
      console.log('[Adaptive] Initialized with', this.dictionary.length, 'word corrections');
    } catch (error) {
      console.error('[Adaptive] Init failed:', error);
      this.profile = this.getDefaultProfile();
    }
  }

  /**
   * Get default profile
   */
  private getDefaultProfile(): VoiceProfile {
    return {
      accent: 'neutral',
      speakingSpeed: 1.0,
      commonPhrases: [],
      languageMix: ['en'],
      corrections: [],
    };
  }

  // ============================================================================
  // TRANSCRIPTION CORRECTION
  // ============================================================================

  /**
   * Apply corrections to transcript
   */
  async correctTranscript(transcript: string): Promise<string> {
    await this.init();

    let corrected = transcript;

    // Apply dictionary corrections
    for (const item of this.dictionary) {
      const regex = new RegExp(`\\b${item.word}\\b`, 'gi');
      corrected = corrected.replace(regex, item.correction);
    }

    return corrected;
  }

  /**
   * Learn correction from user
   */
  async learnCorrection(original: string, corrected: string): Promise<void> {
    await this.init();

    if (!this.config.enableCorrections) return;

    // Find existing or create new
    const existing = this.dictionary.find(
      (d) => d.word.toLowerCase() === original.toLowerCase()
    );

    if (existing) {
      // Update if different
      if (existing.correction !== corrected) {
        existing.correction = corrected;
        existing.count++;
      }
    } else {
      // Add new
      this.dictionary.push({
        word: original,
        correction: corrected,
        count: 1,
      });
    }

    // Also update profile
    if (this.profile) {
      this.profile.corrections.push({
        original,
        corrected,
        timestamp: Date.now(),
      });

      // Keep last 100 corrections
      if (this.profile.corrections.length > 100) {
        this.profile.corrections = this.profile.corrections.slice(-100);
      }
    }

    // Persist
    await this.persist();
  }

  /**
   * Get corrections for a word
   */
  getCorrection(word: string): string | null {
    const found = this.dictionary.find(
      (d) => d.word.toLowerCase() === word.toLowerCase()
    );
    return found?.correction || null;
  }

  // ============================================================================
  // VOICE PROFILE
  // ============================================================================

  /**
   * Analyze voice profile from transcript
   */
  async analyzeProfile(transcript: string): Promise<void> {
    await this.init();

    if (!this.profile || !this.config.enableLearning) return;

    // Analyze speaking speed (words per minute estimate)
    const words = transcript.split(/\s+/).length;
    // Assuming average phrase length
    this.profile.speakingSpeed = words > 50 ? 1.2 : words > 20 ? 1.0 : 0.8;

    // Detect common phrases
    const phrases = this.extractPhrases(transcript);
    for (const phrase of phrases) {
      if (!this.profile.commonPhrases.includes(phrase)) {
        this.profile.commonPhrases.push(phrase);
      }
    }

    // Keep last 50 phrases
    if (this.profile.commonPhrases.length > 50) {
      this.profile.commonPhrases = this.profile.commonPhrases.slice(-50);
    }

    // Detect language mix (Hinglish detection)
    const isHinglish = this.detectHinglish(transcript);
    if (isHinglish && !this.profile.languageMix.includes('hinglish')) {
      this.profile.languageMix.push('hinglish');
    }

    await this.persist();
  }

  /**
   * Extract common phrases (bigrams/trigrams)
   */
  private extractPhrases(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const phrases: string[] = [];

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }

    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }

    return phrases;
  }

  /**
   * Detect Hinglish (Hindi + English)
   */
  private detectHinglish(text: string): boolean {
    const hindiIndicators = /[ऀ-ॿ]/;
    const hinglishWords = /\b(bhai|mera|aur|to|ka|ki|ko|se|le|de|kar|bhejo|bol|yaar|jaldi)\b/i;
    const englishRatio = text.replace(/[^a-zA-Z]/g, '').length / text.length;

    return (
      hindiIndicators.test(text) ||
      (hinglishWords.test(text) && englishRatio > 0.3 && englishRatio < 0.8)
    );
  }

  /**
   * Get voice profile
   */
  getProfile(): VoiceProfile | null {
    return this.profile;
  }

  /**
   * Update profile
   */
  async updateProfile(updates: Partial<VoiceProfile>): Promise<void> {
    await this.init();

    if (this.profile) {
      this.profile = { ...this.profile, ...updates };
      await this.persist();
    }
  }

  // ============================================================================
  // WHISPER OPTIMIZATION
  // ============================================================================

  /**
   * Optimize Whisper for user
   */
  async optimizeWhisper(): Promise<void> {
    await this.init();

    const profile = this.profile;
    if (!profile) return;

    // Set language based on mix
    if (profile.languageMix.includes('hinglish')) {
      await localWhisper.setLanguage('hinglish');
    } else if (profile.languageMix.includes('hi')) {
      await localWhisper.setLanguage('hi');
    } else {
      await localWhisper.setLanguage('en');
    }

    console.log('[Adaptive] Whisper optimized for:', profile.languageMix);
  }

  // ============================================================================
  // CONFIDENCE HANDLING
  // ============================================================================

  /**
   * Handle low confidence transcription
   */
  async handleLowConfidence(
    transcript: string,
    confidence: number
  ): Promise<{ text: string; needsCorrection: boolean }> {
    if (confidence >= this.config.confidenceThreshold) {
      return { text: transcript, needsCorrection: false };
    }

    // Apply corrections
    const corrected = await this.correctTranscript(transcript);

    return {
      text: corrected,
      needsCorrection: corrected !== transcript,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Persist all data
   */
  private async persist(): Promise<void> {
    try {
      // Profile
      if (this.profile) {
        await AsyncStorage.setItem(
          `${ADAPTIVE_KEY}_profile`,
          JSON.stringify(this.profile)
        );
      }

      // Dictionary
      await AsyncStorage.setItem(
        `${ADAPTIVE_KEY}_dictionary`,
        JSON.stringify(this.dictionary)
      );
    } catch (error) {
      console.error('[Adaptive] Persist failed:', error);
    }
  }

  /**
   * Export data
   */
  async export(): Promise<string> {
    await this.init();

    return JSON.stringify({
      profile: this.profile,
      dictionary: this.dictionary,
    });
  }

  /**
   * Import data
   */
  async import(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);

      if (parsed.profile) {
        this.profile = parsed.profile;
      }

      if (parsed.dictionary) {
        this.dictionary = parsed.dictionary;
      }

      await this.persist();
    } catch (error) {
      console.error('[Adaptive] Import failed:', error);
    }
  }

  /**
   * Clear all learned data
   */
  async clear(): Promise<void> {
    this.profile = this.getDefaultProfile();
    this.dictionary = [];

    await AsyncStorage.removeItem(`${ADAPTIVE_KEY}_profile`);
    await AsyncStorage.removeItem(`${ADAPTIVE_KEY}_dictionary`);

    console.log('[Adaptive] Cleared all learned data');
  }

  // ============================================================================
  // STATS
  // ============================================================================

  /**
   * Get stats
   */
  getStats(): {
    correctionsCount: number;
    phrasesLearned: number;
    profileAccent: string;
  } {
    return {
      correctionsCount: this.dictionary.reduce((sum, d) => sum + d.count, 0),
      phrasesLearned: this.profile?.commonPhrases.length || 0,
      profileAccent: this.profile?.accent || 'neutral',
    };
  }
}

export const adaptiveVoice = new AdaptiveVoice();
export default adaptiveVoice;
