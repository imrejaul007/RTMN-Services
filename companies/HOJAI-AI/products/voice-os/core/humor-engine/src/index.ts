/**
 * Voice Humor Engine
 * Relationship-driven humor for VoiceOS
 */

import { humorDetector } from "./services/humorDetector.js";
import { laughTracker } from "./services/laughTracker.js";
import { insideJokeManager } from "./services/insideJokeManager.js";
import type { HumorContext, HumorResponse, InsideJoke } from "./types/index.js";

export class VoiceHumorEngine {
  /**
   * Process user humor attempt and generate response
   */
  async processHumor(
    text: string,
    context: HumorContext
  ): Promise<HumorResponse> {
    // Detect humor
    const attempt = humorDetector.detectHumor(text);

    if (!attempt.detected) {
      return { humor: "none", timing: 0 };
    }

    // Track laughter
    if (laughTracker.detectLaughter(text)) {
      laughTracker.trackLaugh(context.userId, new Date());
    }

    // Get user's humor pattern
    const pattern = laughTracker.getPattern(context.userId);

    // Generate appropriate response
    switch (attempt.type) {
      case "joke":
        return this.handleJoke(attempt, context, pattern.frequency);

      case "sarcasm":
        return this.handleSarcasm(attempt, context);

      case "self-deprecating":
        return this.handleSelfDeprecating(attempt, context);

      case "wordplay":
        return this.handleWordplay(attempt, context);

      default:
        return { humor: "supportive", timing: 200 };
    }
  }

  /**
   * Handle joke response
   */
  private handleJoke(
    attempt: any,
    context: HumorContext,
    frequency: string
  ): HumorResponse {
    if (!humorDetector.isMoodSuitableForHumor(context.userMood)) {
      return {
        humor: "gentle",
        message: "I appreciate you sharing that with me.",
        timing: 300,
      };
    }

    // Try to recall inside joke
    if (attempt.topic) {
      const joke = insideJokeManager.recallJoke(
        context.relationshipId,
        attempt.topic
      );
      if (joke) {
        return {
          humor: "matching",
          message: joke.content,
          laughResponse: "That's a good one!",
          timing: 500,
        };
      }
    }

    return {
      humor: "matching",
      message: this.getRandomJokeResponse(frequency),
      laughResponse: "Ha!",
      timing: 300,
    };
  }

  /**
   * Handle sarcasm
   */
  private handleSarcasm(attempt: any, context: HumorContext): HumorResponse {
    // Acknowledge without reinforcing negativity
    const responses = [
      "I hear you. That sounds challenging.",
      "I can see why that would be frustrating.",
      "That's an interesting perspective.",
    ];
    return {
      humor: "none",
      message: responses[Math.floor(Math.random() * responses.length)],
      timing: 400,
    };
  }

  /**
   * Handle self-deprecating humor
   */
  private handleSelfDeprecating(attempt: any, context: HumorContext): HumorResponse {
    return {
      humor: "supportive",
      message: "Hey, you're doing better than you think. I've seen your progress.",
      timing: 500,
    };
  }

  /**
   * Handle wordplay
   */
  private handleWordplay(attempt: any, context: HumorContext): HumorResponse {
    return {
      humor: "matching",
      message: "Nice wordplay! You're clever.",
      laughResponse: "Ha! I see what you did there.",
      timing: 400,
    };
  }

  /**
   * Get random joke response
   */
  private getRandomJokeResponse(frequency: string): string {
    const responses = [
      "That's a good one! 😂",
      "Ha! Made me smile.",
      "You're funny today!",
      "I appreciate the humor!",
      "That's hilarious!",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Add inside joke to relationship
   */
  addInsideJoke(relationshipId: string, content: string, context: string): InsideJoke {
    return insideJokeManager.addJoke(relationshipId, content, context);
  }

  /**
   * Get inside jokes for relationship
   */
  getInsideJokes(relationshipId: string): InsideJoke[] {
    return insideJokeManager.getJokes(relationshipId);
  }
}

export const voiceHumorEngine = new VoiceHumorEngine();
export default voiceHumorEngine;