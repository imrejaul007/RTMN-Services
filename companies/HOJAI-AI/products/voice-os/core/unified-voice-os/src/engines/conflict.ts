/**
 * Conflict Engine
 */

export interface ConflictResponse {
  shouldChallenge: boolean;
  approach: string;
  message: string;
  offerAlternative: boolean;
  alternative?: string;
}

export class ConflictEngine {
  processStatement(text: string, userId: string): ConflictResponse {
    const lower = text.toLowerCase();

    // Unrealistic patterns
    if (/\b(guaranteed|100%|always|never fail\b/.test(lower)) {
      return {
        shouldChallenge: true,
        approach: "gentle",
        message: "That might be harder than it sounds. What would a more realistic version look like?",
        offerAlternative: true,
        alternative: "Let's think through the challenges first.",
      };
    }

    // Harmful patterns
    if (/\b(burn all savings|give up everything|risk everything\b/.test(lower)) {
      return {
        shouldChallenge: true,
        approach: "empathetic",
        message: "I care about your wellbeing. That sounds risky. What outcome are you really after?",
        offerAlternative: true,
        alternative: "What if we found a safer path to the same goal?",
      };
    }

    // Risky patterns
    if (/invest.*all/i.test(lower)) {
      return {
        shouldChallenge: true,
        approach: "direct",
        message: "Have you considered the downside? What if it doesn't work out?",
        offerAlternative: true,
        alternative: "What would a more measured approach look like?",
      };
    }

    return {
      shouldChallenge: false,
      approach: "none",
      message: "",
      offerAlternative: false,
    };
  }

  updateUserValues(userId: string, values: string[]): void {
    // Store user values for alignment
  }
}

export const voiceConflictEngine = new ConflictEngine();