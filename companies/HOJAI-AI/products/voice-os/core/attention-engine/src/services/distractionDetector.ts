/**
 * Distraction Detector
 * Detects when user is distracted
 */

import { DistractionSignal, ConversationContext } from "../types/index.js";

export class DistractionDetector {
  // Thresholds
  private SILENCE_THRESHOLD_MS = 5000;
  private SLOW_SPEECH_WPM = 80;
  private HIGH_PAUSE_RATIO = 0.3;

  /**
   * Detect distraction signals
   */
  detect(context: ConversationContext): DistractionSignal[] {
    const signals: DistractionSignal[] = [];

    // Check for silence
    if (context.speakingSpeed < this.SLOW_SPEECH_WPM) {
      signals.push({
        type: "energy_drop",
        confidence: 0.7,
        severity: context.speakingSpeed < 50 ? "high" : "medium",
      });
    }

    // Check for repetition/wandering
    if (context.topicCoherence < 0.5) {
      signals.push({
        type: "wandering",
        confidence: 0.8,
        severity: "medium",
      });
    }

    // Check for confusion
    if (context.pausesCount > 5) {
      signals.push({
        type: "silence",
        confidence: 0.6,
        severity: context.pausesCount > 10 ? "high" : "low",
      });
    }

    // Check for overload
    if (context.interruptions > 3) {
      signals.push({
        type: "overloaded",
        confidence: 0.75,
        severity: "high",
      });
    }

    return signals;
  }

  /**
   * Get distraction severity
   */
  getSeverity(signals: DistractionSignal[]): "low" | "medium" | "high" {
    if (signals.some((s) => s.severity === "high")) return "high";
    if (signals.some((s) => s.severity === "medium")) return "medium";
    return "low";
  }
}

export const distractionDetector = new DistractionDetector();