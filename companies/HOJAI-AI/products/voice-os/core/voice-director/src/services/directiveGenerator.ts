/**
 * Voice Directive Generator
 * =======================
 * Generates voice directives with emotion, pace, pauses, and expressions.
 */

import type {
  VoiceDirective,
  VoiceEmotion,
  VoiceExpression,
  PaceSetting,
  VolumeLevel,
  EnergyLevel,
  PersonalityMode,
  VoiceBlueprint,
  PausePoint,
  ExpressionTiming
} from '../types/index.js';

import { PERSONALITY_MODES } from '../types/index.js';

export class DirectiveGenerator {
  /**
   * Generate a complete voice directive
   */
  static generate(
    emotion: string,
    relationship?: string,
    personalityMode?: string,
    context?: {
      timeOfDay?: string;
      urgency?: string;
      formality?: number;
      warmth?: number;
    }
  ): VoiceDirective {
    // Get base directive from personality mode
    const baseDirective = this.getBaseDirective(personalityMode, relationship);

    // Map emotion string to VoiceEmotion
    const voiceEmotion = this.mapEmotion(emotion);

    // Calculate pace based on emotion and context
    const pace = this.calculatePace(voiceEmotion, context);

    // Calculate volume based on emotion
    const volume = this.calculateVolume(voiceEmotion, context);

    // Calculate pauses based on emotion and text
    const { pauseBeforeMs, pauseAfterMs } = this.calculatePauses(voiceEmotion, context);

    // Determine expressions
    const expressions = this.determineExpressions(voiceEmotion, relationship);

    // Calculate energy
    const energy = this.calculateEnergy(voiceEmotion, context);

    // Calculate warmth and formality
    const warmth = context?.warmth ?? baseDirective.warmth ?? 0.7;
    const formality = context?.formality ?? baseDirective.formality ?? 0.5;

    // Determine if should smile
    const smile = this.shouldSmile(voiceEmotion, relationship);

    return {
      emotion: voiceEmotion,
      pace,
      volume,
      pauseBeforeMs,
      pauseAfterMs,
      emphasis: [],
      expressions,
      smile,
      energy,
      warmth,
      formality
    };
  }

  /**
   * Get base directive from personality mode
   */
  private static getBaseDirective(
    mode?: string,
    relationship?: string
  ): Partial<VoiceDirective> {
    // Try to match by personality mode
    if (mode && mode in PERSONALITY_MODES) {
      return (PERSONALITY_MODES as Record<string, PersonalityMode>)[mode].baseDirective;
    }

    // Try to match by relationship
    if (relationship) {
      for (const [, personality] of Object.entries(PERSONALITY_MODES)) {
        if (personality.relationshipTypes.includes(relationship)) {
          return personality.baseDirective;
        }
      }
    }

    // Default
    return {
      pace: 0.95,
      formality: 0.5,
      warmth: 0.6
    };
  }

  /**
   * Map emotion string to VoiceEmotion
   */
  private static mapEmotion(emotion: string): VoiceEmotion {
    const mappings: Record<string, VoiceEmotion> = {
      // Joy/Happy
      'happy': 'happy',
      'joy': 'happy',
      'excited': 'excited',
      'thrilled': 'excited',
      'grateful': 'warm',
      'proud': 'confident',
      'content': 'calm',
      'peaceful': 'calm',
      'warm': 'warm',

      // Sadness
      'sad': 'concerned',
      'sadness': 'concerned',
      'lonely': 'empathetic',
      'grieving': 'empathetic',
      'disappointed': 'concerned',

      // Anger
      'angry': 'serious',
      'frustrated': 'serious',
      'annoyed': 'serious',

      // Fear
      'scared': 'concerned',
      'anxious': 'concerned',
      'worried': 'concerned',
      'stressed': 'serious',

      // Love
      'love': 'warm',
      'loved': 'warm',
      'connected': 'warm',
      'appreciated': 'warm',

      // Professional
      'professional': 'professional',
      'formal': 'professional',
      'business': 'professional',

      // Celebration
      'celebrate': 'celebratory',
      'celebratory': 'celebratory',
      'congratulations': 'celebratory',

      // Motivation
      'motivational': 'motivational',
      'encouraging': 'motivational',

      // Reflection
      'thoughtful': 'reflective',
      'reflective': 'reflective',
      'thinking': 'reflective',

      // Playful
      'playful': 'playful',
      'funny': 'playful',
      'humorous': 'playful',

      // Neutral
      'neutral': 'calm',
      'okay': 'calm',
      'fine': 'calm',

      // Hope
      'hopeful': 'hopeful',
      'optimistic': 'hopeful',

      // Empathy
      'empathetic': 'empathetic',
      'sympathetic': 'empathetic',
      'compassionate': 'empathetic'
    };

    const lower = emotion.toLowerCase().trim();
    return mappings[lower] || 'calm';
  }

  /**
   * Calculate pace based on emotion and context
   */
  private static calculatePace(
    emotion: VoiceEmotion,
    context?: { timeOfDay?: string; urgency?: string }
  ): number {
    let basePace = 0.95;

    // Emotion adjustments
    switch (emotion) {
      case 'excited':
        basePace = 1.15;
        break;
      case 'celebratory':
        basePace = 1.1;
        break;
      case 'motivational':
        basePace = 1.05;
        break;
      case 'playful':
        basePace = 1.1;
        break;
      case 'confident':
        basePace = 1.0;
        break;
      case 'happy':
        basePace = 1.05;
        break;

      case 'sadness':
      case 'empathetic':
        basePace = 0.8;
        break;
      case 'concerned':
        basePace = 0.85;
        break;
      case 'whispering':
        basePace = 0.7;
        break;
      case 'reflective':
        basePace = 0.85;
        break;

      case 'warm':
        basePace = 0.95;
        break;
      case 'comforting':
        basePace = 0.85;
        break;

      case 'serious':
      case 'professional':
        basePace = 0.95;
        break;

      case 'hopeful':
        basePace = 1.0;
        break;

      default:
        basePace = 0.95;
    }

    // Time of day adjustment
    if (context?.timeOfDay === 'night') {
      basePace *= 0.9; // Slower at night
    }
    if (context?.timeOfDay === 'morning') {
      basePace *= 1.05; // Slightly faster in morning
    }

    // Urgency adjustment
    if (context?.urgency === 'high') {
      basePace = Math.min(1.3, basePace * 1.15);
    }

    // Clamp to valid range
    return Math.max(0.5, Math.min(1.5, basePace));
  }

  /**
   * Calculate volume based on emotion
   */
  private static calculateVolume(
    emotion: VoiceEmotion,
    context?: { urgency?: string }
  ): VolumeLevel {
    // Urgency override
    if (context?.urgency === 'high') {
      return 'loud';
    }

    switch (emotion) {
      case 'excited':
      case 'celebratory':
        return 'loud';
      case 'motivational':
        return 'loud';
      case 'whispering':
        return 'very_soft';
      case 'sadness':
      case 'empathetic':
      case 'comforting':
      case 'warm':
        return 'soft';
      case 'concerned':
        return 'soft';
      default:
        return 'normal';
    }
  }

  /**
   * Calculate pause timing based on emotion
   */
  private static calculatePauses(
    emotion: VoiceEmotion,
    context?: { timeOfDay?: string }
  ): { pauseBeforeMs: number; pauseAfterMs: number } {
    let before = 200;
    let after = 250;

    switch (emotion) {
      case 'sadness':
      case 'empathetic':
        before = 400;
        after = 350;
        break;
      case 'concerned':
        before = 300;
        after = 300;
        break;
      case 'reflective':
        before = 350;
        after = 300;
        break;
      case 'excited':
      case 'celebratory':
        before = 100;
        after = 150;
        break;
      case 'whispering':
        before = 250;
        after = 200;
        break;
      case 'warm':
      case 'comforting':
        before = 250;
        after = 300;
        break;
      case 'professional':
        before = 150;
        after = 200;
        break;
      default:
        before = 200;
        after = 250;
    }

    // Night time = more pauses for thoughtfulness
    if (context?.timeOfDay === 'night') {
      before = Math.round(before * 1.3);
      after = Math.round(after * 1.2);
    }

    return { pauseBeforeMs: before, pauseAfterMs: after };
  }

  /**
   * Determine appropriate expressions
   */
  private static determineExpressions(
    emotion: VoiceEmotion,
    relationship?: string
  ): VoiceExpression[] {
    const expressions: VoiceExpression[] = [];

    switch (emotion) {
      case 'excited':
        expressions.push('EXCITED', 'BREATH');
        break;
      case 'happy':
        expressions.push('SMILE');
        break;
      case 'celebratory':
        expressions.push('EXCITED', 'SMILE');
        break;
      case 'sadness':
      case 'empathetic':
        expressions.push('THOUGHTFUL');
        break;
      case 'concerned':
        expressions.push('CONCERNED');
        break;
      case 'warm':
      case 'comforting':
        expressions.push('WARM', 'SMILE');
        break;
      case 'playful':
        expressions.push('CHUCKLE');
        break;
      case 'whispering':
        expressions.push('WHISPER');
        break;
      case 'motivational':
        expressions.push('EMPHATIC');
        break;
      case 'reflective':
        expressions.push('THOUGHTFUL');
        break;
      case 'hopeful':
        expressions.push('SMILE', 'WARM');
        break;
    }

    // Add relationship-based expressions
    if (relationship === 'mother' || relationship === 'family') {
      if (!expressions.includes('WARM')) {
        expressions.push('WARM');
      }
    }
    if (relationship === 'friend') {
      if (!expressions.includes('CHUCKLE')) {
        expressions.push('CHUCKLE');
      }
    }

    return expressions;
  }

  /**
   * Calculate energy level
   */
  private static calculateEnergy(
    emotion: VoiceEmotion,
    context?: { urgency?: string }
  ): EnergyLevel {
    if (context?.urgency === 'high') {
      return 'high';
    }

    switch (emotion) {
      case 'excited':
      case 'celebratory':
      case 'motivational':
        return 'high';
      case 'happy':
      case 'playful':
      case 'confident':
        return 'medium';
      case 'sadness':
      case 'concerned':
      case 'empathetic':
      case 'whispering':
      case 'reflective':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Determine if should smile
   */
  private static shouldSmile(emotion: VoiceEmotion, relationship?: string): boolean {
    // Positive emotions generally get smile
    const smileEmotions: VoiceEmotion[] = [
      'happy', 'excited', 'warm', 'comforting', 'playful',
      'celebratory', 'hopeful', 'confident', 'motivational'
    ];

    if (smileEmotions.includes(emotion)) {
      return true;
    }

    // Family/mother always gets warmth
    if (relationship === 'mother' || relationship === 'family') {
      return true;
    }

    // Neutral/serious emotions don't smile
    return false;
  }
}
