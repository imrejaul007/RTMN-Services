/**
 * Engine imports - re-exports from all 12 Voice OS engines
 * This file connects all engines to the unified gateway
 */

// Conversation Physics Engine
export { voiceConversationPhysics } from "@hojai/voice-conversation-physics";
import { voiceConversationPhysics } from "./conversation-physics.js";

// Voice Director Engine
export { voiceDirector } from "@hojai/voice-director";
import { voiceDirector } from "./voice-director.js";

// Life Timeline Engine
export { voiceLifeTimeline } from "@hojai/voice-life-timeline";
import { voiceLifeTimeline } from "./life-timeline.js";

// Human Presence Engine
export { voiceHumanPresence } from "@hojai/voice-human-presence";
import { voiceHumanPresence } from "./human-presence.js";

// Voice Identity Engine
export { voiceIdentity } from "@hojai/voice-identity";
import { voiceIdentity } from "./voice-identity.js";

// Human Growth Engine
export { voiceHumanGrowth } from "@hojai/voice-human-growth";
import { voiceHumanGrowth } from "./human-growth.js";

// Humor Engine
export { voiceHumorEngine } from "@hojai/voice-humor-engine";
import { voiceHumorEngine } from "./humor.js";

// Curiosity Engine
export { voiceCuriosityEngine } from "@hojai/voice-curiosity-engine";
import { voiceCuriosityEngine } from "./curiosity.js";

// Attention Engine
export { voiceAttentionEngine } from "@hojai/voice-attention-engine";
import { voiceAttentionEngine } from "./attention.js";

// Social Intelligence Engine
export { voiceSocialIntelligence } from "@hojai/voice-social-intelligence";
import { voiceSocialIntelligence } from "./social-intelligence.js";

// Conflict Engine
export { voiceConflictEngine } from "@hojai/voice-conflict-engine";
import { voiceConflictEngine } from "./conflict.js";

// Multi-Agent Voice Network
export { voiceMultiAgentNetwork } from "@hojai/voice-multi-agent";
import { voiceMultiAgentNetwork } from "./multi-agent.js";

// Re-export types
export type { ConversationTurn, SilenceSignal, TurnState } from "./conversation-physics.js";
export type { VoiceDirective, SpeechMarkup } from "./voice-director.js";
export type { LifeChapter, Milestone, TimelineEvent } from "./life-timeline.js";
export type { PresenceContext, PresenceState } from "./human-presence.js";
export type { VoiceIdentity, VoiceConsent } from "./voice-identity.js";
export type { GrowthMetrics, SkillProgress } from "./human-growth.js";
export type { HumorContext, HumorResponse, InsideJoke } from "./humor.js";
export type { CuriosityQuestion, ConversationContext as CuriosityContext } from "./curiosity.js";
export type { AttentionState, AttentionMetrics, ConversationContext as AttentionContext } from "./attention.js";
export type { RelationshipType, CommunicationStyle, RelationshipProfile } from "./social-intelligence.js";
export type { DisagreementSignal, ConflictResponse, UserValues } from "./conflict.js";
export type { VoiceAgent, VoiceCommand, OrchestratedResponse } from "./multi-agent.js";