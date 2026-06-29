/**
 * Attention Engine
 */

export interface AttentionContext {
  userId: string;
  speakingSpeed: number;
  pausesCount: number;
  energyLevel: number;
  interruptions: number;
  topicCoherence: number;
}

export interface AttentionMetrics {
  state: string;
  confidence: number;
  signals: any[];
  duration: number;
  trend: string;
}

export class AttentionEngine {
  analyzeAttention(context: AttentionContext): AttentionMetrics {
    // Detect distraction
    let state = "focused";

    if (context.speakingSpeed < 80) state = "thinking";
    if (context.pausesCount > 5) state = "distracted";
    if (context.interruptions > 3) state = "overloaded";
    if (context.energyLevel < 4) state = "tired";

    return {
      state,
      confidence: 0.8,
      signals: [],
      duration: 0,
      trend: "stable",
    };
  }

  getResponseLength(metrics: { state: string }): "short" | "medium" | "long" {
    if (["distracted", "overloaded", "tired"].includes(metrics.state)) {
      return "short";
    }
    return "medium";
  }

  getEngagementResponse(state: string): string | null {
    const responses: Record<string, string> = {
      distracted: "I sense you might have something on your mind.",
      overloaded: "That's a lot. Should we focus on one thing?",
      tired: "You've had a long day. Keep it brief.",
      thinking: "Take your time. I'm here.",
    };
    return responses[state] || null;
  }
}

export const voiceAttentionEngine = new AttentionEngine();