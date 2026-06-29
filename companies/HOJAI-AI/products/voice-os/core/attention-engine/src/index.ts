/**
 * Voice Attention Engine
 * Track user attention and engagement
 */

import { distractionDetector } from "./services/distractionDetector.js";
import { engagementEngine } from "./services/engagementEngine.js";
import type { AttentionState, AttentionMetrics, ConversationContext } from "./types/index.js";

export class VoiceAttentionEngine {
  /**
   * Analyze user attention
   */
  analyzeAttention(context: ConversationContext): AttentionMetrics {
    // Detect distraction signals
    const signals = distractionDetector.detect(context);

    // Determine state
    const { state, confidence } = engagementEngine.determineState(signals, context);

    // Track state
    engagementEngine.trackState(context.userId, state);

    // Get trend
    const trend = engagementEngine.getTrend(context.userId);

    // Calculate duration in state
    const duration = this.getStateDuration(context.userId);

    return {
      state,
      confidence,
      signals,
      duration,
      trend,
    };
  }

  /**
   * Get engagement response if needed
   */
  getEngagementResponse(state: AttentionState): string | null {
    return engagementEngine.getEngagementResponse(state);
  }

  /**
   * Get state duration
   */
  private getStateDuration(userId: string): number {
    return 0; // Simplified
  }

  /**
   * Should adjust response based on attention?
   */
  shouldAdjustResponse(metrics: AttentionMetrics): boolean {
    // Don't interrupt if focused
    if (metrics.state === "focused") return false;

    // Don't be too aggressive with responses
    if (metrics.confidence < 0.6) return false;

    return true;
  }

  /**
   * Get adjusted response length
   */
  getResponseLength(metrics: AttentionMetrics): "short" | "medium" | "long" {
    switch (metrics.state) {
      case "distracted":
      case "bored":
        return "short";
      case "overloaded":
        return "short";
      case "thinking":
      case "confused":
        return "medium";
      default:
        return "medium";
    }
  }
}

export const voiceAttentionEngine = new VoiceAttentionEngine();
export default voiceAttentionEngine;