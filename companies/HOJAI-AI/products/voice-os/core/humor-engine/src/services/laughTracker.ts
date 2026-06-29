/**
 * Laugh Tracker
 * Tracks laughter patterns and responses
 */

import { ConversationTurn } from "../types/index.js";

// Laughter patterns
const LAUGH_PATTERNS = [
  /\b(haha|hehe|hoho|ha ha|hee hee|ho ho)\b/i,
  /\blol\b/i,
  /\brofl\b/i,
  /(:\)|;\)|:D|<3)/,
  /\b(chuckle|giggle|laugh|smile)\b/i,
];

export class LaughTracker {
  private laughHistory: Map<string, number[]> = new Map();

  /**
   * Detect laughter in text
   */
  detectLaughter(text: string): boolean {
    const normalized = text.toLowerCase();
    return LAUGH_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /**
   * Track laughter for a user
   */
  trackLaugh(userId: string, timestamp: Date): void {
    const hour = timestamp.getHours();
    const history = this.laughHistory.get(userId) || [];
    history.push(hour);

    // Keep last 100 entries
    if (history.length > 100) history.shift();
    this.laughHistory.set(userId, history);
  }

  /**
   * Get user's laughter patterns
   */
  getPattern(userId: string): {
    averageTime: string;
    frequency: "high" | "medium" | "low";
    commonHours: number[];
  } {
    const history = this.laughHistory.get(userId) || [];

    if (history.length === 0) {
      return { averageTime: "unknown", frequency: "low", commonHours: [] };
    }

    // Calculate average hour
    const avgHour = history.reduce((a, b) => a + b, 0) / history.length;
    const avgTime = avgHour < 12 ? `${Math.round(avgHour)} AM` : `${Math.round(avgHour - 12)} PM`;

    // Calculate frequency
    const frequency = history.length > 50 ? "high" : history.length > 20 ? "medium" : "low";

    return { averageTime: avgTime, frequency, commonHours: history };
  }

  /**
   * Generate laugh response
   */
  generateLaughResponse(frequency: "high" | "medium" | "low"): string {
    switch (frequency) {
      case "high":
        return "You're in good spirits today! 😊";
      case "medium":
        return "I appreciate the good vibes!";
      case "low":
        return "Glad to hear some happiness!";
    }
  }
}

export const laughTracker = new LaughTracker();