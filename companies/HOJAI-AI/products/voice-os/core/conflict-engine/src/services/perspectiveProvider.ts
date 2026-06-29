/**
 * Perspective Provider
 * Offers alternative viewpoints respectfully
 */

import { ConflictResponse, UserValues } from "../types/index.js";

export class PerspectiveProvider {
  /**
   * Generate respectful challenge
   */
  challengeRespectfully(
    signal: any,
    userValues: UserValues
  ): ConflictResponse {
    if (!signal) {
      return { shouldChallenge: false, approach: "none", message: "", offerAlternative: false };
    }

    switch (signal.type) {
      case "harmful":
        return {
          shouldChallenge: true,
          approach: "empathetic",
          message: signal.message,
          offerAlternative: true,
          alternative: signal.alternative,
        };

      case "unrealistic":
        return {
          shouldChallenge: true,
          approach: "gentle",
          message: signal.message,
          offerAlternative: true,
          alternative: signal.alternative,
        };

      case "risky":
        return {
          shouldChallenge: true,
          approach: "direct",
          message: "I want to make sure we're thinking through this carefully.",
          offerAlternative: true,
          alternative: "What would you do if this doesn't work out?",
        };

      case "contradictory":
        return {
          shouldChallenge: true,
          approach: "gentle",
          message: signal.message,
          offerAlternative: false,
        };

      default:
        return { shouldChallenge: false, approach: "none", message: "", offerAlternative: false };
    }
  }

  /**
   * Align with user values
   */
  alignWithValues(
    response: string,
    values: UserValues
  ): string {
    // Inject value-alignment language
    if (values.longTermGoals.length > 0) {
      const goal = values.longTermGoals[0];
      response += ` How does this connect to your goal of ${goal}?`;
    }
    return response;
  }
}

export const perspectiveProvider = new PerspectiveProvider();