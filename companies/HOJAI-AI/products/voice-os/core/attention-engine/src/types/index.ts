/**
 * Attention Engine Types
 */

export type AttentionState = "focused" | "distracted" | "thinking" | "confused" | "overloaded" | "bored";

export interface DistractionSignal {
  type: "silence" | "wandering" | "repetition" | "energy_drop" | "interrupt";
  confidence: number;
  duration?: number;
  severity: "low" | "medium" | "high";
}

export interface AttentionMetrics {
  state: AttentionState;
  confidence: number;
  signals: DistractionSignal[];
  duration: number; // seconds in current state
  trend: "improving" | "stable" | "declining";
}

export interface ConversationContext {
  userId: string;
  speakingSpeed: number; // words per minute
  pausesCount: number;
  energyLevel: number; // 1-10
  interruptions: number;
  topicCoherence: number; // 0-1
}