/**
 * Presence Detector Service
 * ====================
 * Detects human presence state and generates adaptations.
 */

import type {
  PresenceState,
  EnergyState,
  EnergyLevel,
  HumanPresence,
  PresenceAdaptation,
  PresenceContext,
  AttentionPattern,
  CuriosityPattern
} from '../types/index.js';

export class PresenceDetector {
  /**
   * Detect presence state from context and signals
   */
  static detectState(
    context: Partial<PresenceContext>,
    energyScore: number,
    attentionLevel: number
  ): PresenceState {
    // Calendar-based detection
    if (context.calendarStatus === 'in-meeting') {
      return 'focused';
    }

    // Time-based patterns
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return 'relaxed';
    }

    // Energy-based detection
    if (energyScore < 30) {
      return 'tired';
    }

    // Attention-based detection
    if (attentionLevel < 40) {
      return 'distracted';
    }

    if (attentionLevel > 80 && energyScore > 60) {
      return 'focused';
    }

    // Default
    return 'active';
  }

  /**
   * Calculate energy level
   */
  static calculateEnergy(
    signals: {
      speakingPace?: number;
      pauseFrequency?: number;
      voiceTone?: string;
      vocabulary?: string[];
    }
  ): EnergyState {
    let mental = 50;
    let physical = 50;
    let emotional = 50;
    let social = 50;

    // Adjust based on speaking pace (faster = more energy)
    if (signals.speakingPace) {
      if (signals.speakingPace > 150) mental = 80;
      else if (signals.speakingPace > 120) mental = 60;
      else if (signals.speakingPace < 80) mental = 30;
    }

    // Adjust based on pauses (more pauses = lower energy)
    if (signals.pauseFrequency && signals.pauseFrequency > 5) {
      physical = Math.max(20, physical - 20);
      mental = Math.max(20, mental - 10);
    }

    // Emotional inference from tone
    if (signals.voiceTone) {
      if (signals.voiceTone.includes('energetic') || signals.voiceTone.includes('excited')) {
        emotional = 80;
        mental = 70;
      }
      if (signals.voiceTone.includes('monotone') || signals.voiceTone.includes('tired')) {
        emotional = 40;
        physical = 40;
      }
    }

    // Calculate overall
    const overall = Math.round((mental + physical + emotional + social) / 4);

    return {
      mental: this.scoreToLevel(mental),
      physical: this.scoreToLevel(physical),
      emotional: this.scoreToLevel(emotional),
      social: this.scoreToLevel(social),
      overall: this.scoreToLevel(overall),
      score: Math.round((mental + physical + emotional + social) / 4),
      trend: 'stable',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Score to level conversion
   */
  private static scoreToLevel(score: number): EnergyLevel {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'critical';
  }

  /**
   * Generate presence adaptation
   */
  static generateAdaptation(presence: HumanPresence): PresenceAdaptation {
    const energy = presence.energy.score;
    const state = presence.state;

    // Response pace based on energy
    let responsePace = 120; // words per minute
    if (energy < 30) responsePace = 80;
    else if (energy < 50) responsePace = 100;
    else if (energy > 70) responsePace = 140;

    // Response length based on attention
    let responseLength: 'short' | 'medium' | 'long' = 'medium';
    if (presence.attention.level < 50) responseLength = 'short';
    else if (presence.attention.level > 80 && energy > 60) responseLength = 'long';

    // Formality based on context
    let formality = 0.5;
    if (presence.context.location === 'office') formality = 0.7;
    if (presence.context.location === 'home') formality = 0.2;
    if (presence.context.socialContext === 'family') formality = 0.1;

    // Warmth based on relationship
    let warmth = 0.5;
    if (presence.context.socialContext === 'family') warmth = 0.9;
    if (presence.context.socialContext === 'friends') warmth = 0.8;
    if (presence.context.socialContext === 'colleagues') warmth = 0.4;

    // Interruptions based on state
    let interruptions: 'allowed' | 'minimal' | 'none' = 'minimal';
    if (state === 'focused') interruptions = 'none';
    if (state === 'relaxed') interruptions = 'allowed';

    // Humor based on state
    let humor: 'none' | 'light' | 'moderate' | 'high' = 'light';
    if (state === 'relaxed') humor = 'moderate';
    if (presence.attention.level > 80) humor = 'light'; // Serious when focused
    if (state === 'tired') humor = 'none'; // Respect energy

    // Emotion
    let emotion: 'neutral' | 'empathetic' | 'warm' | 'professional' = 'neutral';
    if (state === 'tired' || state === 'stressed') emotion = 'empathetic';
    if (presence.context.socialContext === 'family') emotion = 'warm';
    if (presence.context.location === 'office') emotion = 'professional';

    // Recommended tone
    let recommendedTone = 'friendly';
    if (state === 'focused') recommendedTone = 'concise and professional';
    if (state === 'tired') recommendedTone = 'gentle and patient';
    if (state === 'stressed') recommendedTone = 'calm and supportive';
    if (presence.context.location === 'office') recommendedTone = 'professional but approachable';

    return {
      responsePace,
      responseLength,
      formality,
      warmth,
      interruptions,
      humor,
      emotion,
      recommendedTone
    };
  }

  /**
   * Detect attention pattern from conversation signals
   */
  static detectAttentionPattern(
    pauseFrequency: number,
    questionFrequency: number,
    topicChanges: number
  ): AttentionPattern {
    if (pauseFrequency > 10 && topicChanges > 3) return 'scattered';
    if (pauseFrequency > 5 && topicChanges > 1) return 'shallow';
    if (pauseFrequency < 2 && questionFrequency > 3) return 'deep-focus';
    if (questionFrequency > 5 && pauseFrequency < 3) return 'flow';
    return 'recovering';
  }

  /**
   * Detect curiosity from signals
   */
  static detectCuriosity(
    questionsAsked: number,
    followUpQuestions: number,
    topicsExplored: number
  ): CuriosityPattern {
    if (questionsAsked > 5 && followUpQuestions > 3) return 'exploratory';
    if (questionsAsked > 2 && topicsExplored < 2) return 'focused';
    if (questionsAsked < 1 && topicsExplored < 2) return 'passive';
    return 'engaged';
  }
}
