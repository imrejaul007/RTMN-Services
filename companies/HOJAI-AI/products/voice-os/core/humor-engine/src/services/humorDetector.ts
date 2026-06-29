/**
 * Humor Detector
 * Detects user's humor attempts in real-time
 */

import { HumorAttempt, HumorMood } from "../types/index.js";

// Humor patterns
const JOKE_PATTERNS = [
  /\b(joke|funny|hilarious|lol|lmao|rofl|haha|hehe)\b/i,
  /[?!][?!]/,  // Multiple question/exclamation marks
  /that's (so |really |very )*(funny|stupid|crazy|wild)/i,
  /can you (believe|believe it|make a|tell a)/i,
  /why did (the |a )/i,
  /what do you call/i,
];

const SARCASTIC_PATTERNS = [
  /yeah (right|sure|great|awesome|fantastic)/i,
  /oh (great|wonderful|fantastic|perfect|how (nice|wonderful))/i,
  /(obviously|clearly|definitely) not/i,
  /that's (exactly|just) what I (needed|wanted|was thinking)/i,
];

const SELF_DEPRECATING_PATTERNS = [
  /(I am|I'm|me and) (so |really |such )*(stupid|dumb|clumsy|forgetful|bad)/i,
  /I (always|never) (do|can|get|make)/i,
  /(who|what|how) (me|I|myself)/i,
  /classic (me|I|myself)/i,
];

const WORDPLAY_PATTERNS = [
  /(a|The) (pun|wordplay|riddle|tongue twister)/i,
  /(get it|see what I did there|double meaning)/i,
  /(that's|here's) (my|your) (cue|sign|queue)/i,
];

export class HumorDetector {
  /**
   * Detect humor attempt in user speech
   */
  detectHumor(text: string): HumorAttempt {
    const normalizedText = text.toLowerCase().trim();

    // Check joke patterns
    for (const pattern of JOKE_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return {
          detected: true,
          type: "joke",
          confidence: 0.9,
          topic: this.extractTopic(normalizedText),
        };
      }
    }

    // Check sarcasm
    for (const pattern of SARCASTIC_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return {
          detected: true,
          type: "sarcasm",
          confidence: 0.85,
          topic: this.extractTopic(normalizedText),
        };
      }
    }

    // Check self-deprecating
    for (const pattern of SELF_DEPRECATING_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return {
          detected: true,
          type: "self-deprecating",
          confidence: 0.8,
          topic: this.extractTopic(normalizedText),
        };
      }
    }

    // Check wordplay
    for (const pattern of WORDPLAY_PATTERNS) {
      if (pattern.test(normalizedText)) {
        return {
          detected: true,
          type: "wordplay",
          confidence: 0.75,
        };
      }
    }

    return {
      detected: false,
      type: "joke",
      confidence: 0,
    };
  }

  /**
   * Extract topic from humor attempt
   */
  private extractTopic(text: string): string | undefined {
    const topics = ["work", "family", "money", "food", "travel", "technology", "relationships", "health"];
    for (const topic of topics) {
      if (text.includes(topic)) return topic;
    }
    return undefined;
  }

  /**
   * Check if user is in a mood suitable for humor
   */
  isMoodSuitableForHumor(mood: HumorMood): boolean {
    // Don't force humor when user is very sad or stressed
    const unsuitableMoods: HumorMood[] = ["sad", "stressed"];
    return !unsuitableMoods.includes(mood);
  }
}

export const humorDetector = new HumorDetector();