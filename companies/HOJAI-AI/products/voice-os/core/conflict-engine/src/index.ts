/**
 * Voice Conflict Engine
 * Respectful disagreement for VoiceOS
 */

import { disagreementDetector } from "./services/disagreementDetector.js";
import { perspectiveProvider } from "./services/perspectiveProvider.js";
import type { DisagreementSignal, ConflictResponse, UserValues } from "./types/index.js";

export class VoiceConflictEngine {
  private userValues: Map<string, UserValues> = new Map();

  /**
   * Process user statement for disagreement
   */
  processStatement(
    statement: string,
    userId: string,
    previousStatement?: string
  ): ConflictResponse {
    // Check current statement
    let signal = disagreementDetector.detect(statement);

    // Check for contradictions
    if (!signal && previousStatement) {
      signal = disagreementDetector.detectContradiction(statement, previousStatement);
    }

    if (!signal) {
      return {
        shouldChallenge: false,
        approach: "none",
        message: "",
        offerAlternative: false,
      };
    }

    // Get user values
    const values = this.userValues.get(userId) || {
      priorities: [],
      principles: [],
      longTermGoals: [],
      shortTermGoals: [],
    };

    // Generate respectful response
    const response = perspectiveProvider.challengeRespectfully(signal, values);

    // Align with values if beneficial
    if (response.shouldChallenge && response.message) {
      response.message = perspectiveProvider.alignWithValues(response.message, values);
    }

    return response;
  }

  /**
   * Update user values
   */
  updateUserValues(userId: string, values: Partial<UserValues>): void {
    const current = this.userValues.get(userId) || {
      priorities: [],
      principles: [],
      longTermGoals: [],
      shortTermGoals: [],
    };

    this.userValues.set(userId, { ...current, ...values });
  }

  /**
   * Get user values
   */
  getUserValues(userId: string): UserValues {
    return this.userValues.get(userId) || {
      priorities: [],
      principles: [],
      longTermGoals: [],
      shortTermGoals: [],
    };
  }
}

export const voiceConflictEngine = new VoiceConflictEngine();
export default voiceConflictEngine;