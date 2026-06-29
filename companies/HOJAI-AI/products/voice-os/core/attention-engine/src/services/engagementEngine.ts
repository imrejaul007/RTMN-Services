/**
 * Engagement Engine
 * Maintains user engagement
 */

import { AttentionState, AttentionMetrics } from "../types/index.js";

export class EngagementEngine {
  private userStates: Map<string, AttentionState> = new Map();
  private stateDurations: Map<string, number> = new Map();

  /**
   * Determine attention state
   */
  determineState(
    signals: any[],
    context: any
  ): { state: AttentionState; confidence: number } {
    // High confidence signals
    if (context.overloaded) {
      return { state: "overloaded", confidence: 0.9 };
    }

    if (context.wandering) {
      return { state: "confused", confidence: 0.85 };
    }

    // Positive signals
    if (context.energyLevel > 7 && context.speakingSpeed > 120) {
      return { state: "focused", confidence: 0.8 };
    }

    if (context.energyLevel < 4) {
      return { state: "bored", confidence: 0.75 };
    }

    if (context.speakingSpeed < 80) {
      return { state: "thinking", confidence: 0.7 };
    }

    return { state: "focused", confidence: 0.6 };
  }

  /**
   * Get engagement response based on state
   */
  getEngagementResponse(state: AttentionState): string | null {
    switch (state) {
      case "distracted":
        return "I sense you might have something on your mind. Take your time.";
      case "confused":
        return "Let me clarify. Would that help?";
      case "overloaded":
        return "This is a lot to process. Should we take a break or focus on one thing?";
      case "bored":
        return "Would you like to switch topics, or shall I keep it brief?";
      case "thinking":
        return "Take your time. I'm here.";
      default:
        return null;
    }
  }

  /**
   * Track state change
   */
  trackState(userId: string, state: AttentionState): void {
    this.userStates.set(userId, state);
    this.stateDurations.set(userId, Date.now());
  }

  /**
   * Get state trend
   */
  getTrend(userId: string): "improving" | "stable" | "declining" {
    // Simplified - would need more history in production
    return "stable";
  }
}

export const engagementEngine = new EngagementEngine();