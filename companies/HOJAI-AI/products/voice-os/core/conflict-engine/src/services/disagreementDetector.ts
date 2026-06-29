/**
 * Disagreement Detector
 * Detects statements that need gentle pushback
 */

import { DisagreementSignal } from "../types/index.js";

const UNREALISTIC_PATTERNS = [
  /\b(always|never|every time|100%|guaranteed)\b/i,
  /\b(no risk|zero risk|impossible to fail)\b/i,
  /\b(work 20 hours|work 7 days)\b/i,
  /\b(quit everything|stake everything)\b/i,
];

const HARMFUL_PATTERNS = [
  /\b(give up|abandon|fire everyone|cut all spending)\b/i,
  /\b(burn bridges|burn all savings)\b/i,
  /\b(risk everything|put all money)\b/i,
  /\b(mirror trading|copy trading)\b/i,
];

const RISKY_PATTERNS = [
  /\b(no backup|no savings|debt|loan)\b.*\b(all|everything)\b/i,
  /\b(invest|put|spend)\b.*\b(savings|bills|rent)\b/i,
];

export class DisagreementDetector {
  /**
   * Detect statements needing pushback
   */
  detect(statement: string): DisagreementSignal | null {
    const normalized = statement.toLowerCase();

    // Check for unrealistic claims
    for (const pattern of UNREALISTIC_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          type: "unrealistic",
          severity: "medium",
          message: "I want to be honest with you - that might be harder than it sounds.",
          alternative: "What would a more realistic version look like?",
        };
      }
    }

    // Check for harmful suggestions
    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          type: "harmful",
          severity: "high",
          message: "I care about you. I don't think that's the best approach.",
          alternative: "What outcome are you really trying to achieve?",
        };
      }
    }

    // Check for risky patterns
    for (const pattern of RISKY_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          type: "risky",
          severity: "medium",
          message: "That could be risky. Have you considered the downside?",
          alternative: "What would a safer approach look like?",
        };
      }
    }

    return null;
  }

  /**
   * Detect self-contradiction
   */
  detectContradiction(current: string, previous: string): DisagreementSignal | null {
    // Simple pattern matching for contradictions
    if (
      (current.includes("yes") && previous.includes("no")) ||
      (current.includes("do it") && previous.includes("don't")) ||
      (current.includes("will") && previous.includes("won't"))
    ) {
      return {
        type: "contradictory",
        severity: "low",
        message: "I noticed you mentioned something different earlier. What's changed?",
        alternative: undefined,
      };
    }
    return null;
  }
}

export const disagreementDetector = new DisagreementDetector();