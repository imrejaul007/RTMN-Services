/**
 * Unified Voice OS Types
 */

export interface VoiceContext {
  userId: string;
  relationship?: string;
  presence?: "alone" | "with-others" | "meeting" | "commuting";
  emotion?: string;
  energy?: "high" | "medium" | "low";
}

export interface VoiceResponse {
  text: string;
  audioBase64?: string;
  emotion: string;
  directives: VoiceDirectives;
  actions: Action[];
  conversationState: ConversationState;
  latencyMs: number;
}

export interface VoiceDirectives {
  pace: number;
  volume: "soft" | "normal" | "loud";
  emotion: string;
  pauses: number;
  emphasis: string[];
  smile: boolean;
}

export interface Action {
  type: string;
  params: Record<string, any>;
  confidence: number;
}

export interface ConversationState {
  turnComplete: boolean;
  backchannel?: string;
  repairNeeded?: boolean;
}

export interface VoiceCommand {
  text: string;
  userId: string;
  timestamp: Date;
}

// Re-export from engines
export type { ConversationTurn, SilenceSignal } from "./engines/conversation-physics.js";
export type { VoiceDirective } from "./engines/voice-director.js";
export type { LifeChapter, Milestone, TimelineEvent } from "./engines/life-timeline.js";
export type { PresenceContext, PresenceState } from "./engines/human-presence.js";
export type { VoiceIdentity, VoiceConsent } from "./engines/voice-identity.js";
export type { GrowthMetrics, SkillProgress, HabitProgress } from "./engines/human-growth.js";
export type { HumorResponse, InsideJoke } from "./engines/humor.js";
export type { CuriosityContext, CuriosityResponse } from "./engines/curiosity.js";
export type { AttentionMetrics, AttentionContext } from "./engines/attention.js";
export type { RelationshipProfile, SharedMemory } from "./engines/social-intelligence.js";
export type { ConflictResponse, UserValues } from "./engines/conflict.js";
export type { VoiceAgent, VoiceCommand as AgentCommand, OrchestratedResponse } from "./engines/multi-agent.js";